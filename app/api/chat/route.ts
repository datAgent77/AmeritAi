import { OpenAI } from 'openai';
import { getAdminDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";
import { generateAIResponse, saveMessageToSession, analyzeSentiment } from "@/lib/ai-service";
import { trackAiUsage } from "@/lib/usage-tracker";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limiter";
import { isAppointmentConfirmation, extractAppointmentData } from "@/lib/appointment-extractor";

export const runtime = 'nodejs';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            console.error("Chat API: Firebase Admin SDK not initialized");
            return new Response(JSON.stringify({ error: "Service unavailable" }), { status: 503 });
        }
        // Rate limiting check
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            || req.headers.get("x-real-ip")
            || "unknown";

        const body = await req.json();
        const { messages, chatbotId, sessionId, context, language, isVoice, shouldStream = true, userId } = body;

        const rateLimitResult = checkRateLimit(ip, sessionId);

        if (!rateLimitResult.allowed) {
            console.log(`Chat API: Rate limited - ${rateLimitResult.reason} for IP: ${ip}`);
            return new Response(
                JSON.stringify({
                    error: "Çok fazla istek gönderdiniz. Lütfen bir dakika bekleyin.",
                    errorEn: "Too many requests. Please wait a minute.",
                    retryAfter: Math.ceil(rateLimitResult.resetIn / 1000)
                }),
                {
                    status: 429,
                    headers: {
                        "Content-Type": "application/json",
                        ...getRateLimitHeaders(rateLimitResult)
                    }
                }
            );
        }

        console.log("Chat API: Request received");

        // 0. Check if Session is Paused
        if (sessionId) {
            if (!adminDb) throw new Error("Firebase Admin not initialized");
            const sessionRef = adminDb.collection("chat_sessions").doc(sessionId);
            const sessionSnap = await sessionRef.get();
            if (sessionSnap.exists && sessionSnap.data()?.isPaused) {
                console.log("Chat API: Session is paused, skipping AI generation");
                // Just save the user message
                const currentMessages = sessionSnap.data()?.messages || [];
                currentMessages.push({
                    id: messages[messages.length - 1].id || Date.now().toString(),
                    role: "user",
                    content: messages[messages.length - 1].content,
                    createdAt: new Date().toISOString()
                });
                await sessionRef.update({ messages: currentMessages });
                return new Response("", { status: 200 });
            }
        }

        // Parallelize: Save user message and start generating AI response simultaneously
        const lastMessage = messages[messages.length - 1];
        const messageId = lastMessage.id || Date.now().toString();

        const [saveResult, result] = await Promise.all([
            sessionId && lastMessage.role === "user"
                ? saveMessageToSession(sessionId, chatbotId, { ...lastMessage, id: messageId, role: "user", sentiment: "Neutral" }, userId)
                : Promise.resolve(),
            generateAIResponse(chatbotId, messages, sessionId, shouldStream, context, isVoice, language)
        ]);

        // Fire-and-forget Sentiment Analysis (updates the message later)
        if (sessionId && lastMessage.role === "user") {
            analyzeSentiment(lastMessage.content).then(async (sentiment) => {
                try {
                    // We need to find the specific message in the array and update it. 
                    // Firestore array updates are tricky for specific fields. 
                    // Actually, 'saveMessageToSession' appends to array. 
                    // Updating a specific item in an array is hard without reading.
                    // A better approach for "Perfect" analytics is to store messages as Subcollection, but that's a big refactor.
                    // For now, I will skip complex update to avoid race conditions or high reads.
                    // I will just log it for now, or maybe we accept "Neutral" is fine for speed.
                    // correct: Cloud Functions is better for this.
                    // BUT, I can at least try to log it.
                    console.log(`Sentiment for ${messageId}: ${sentiment}`);
                } catch (e) { console.error(e) }
            });
        }

        // Estimate Input Tokens (approx 4 chars = 1 token)
        const inputContent = messages.map((m: any) => m.content).join(" ");
        const estimatedInputTokens = Math.ceil(inputContent.length / 4);


        if (result.isStream) {
            // For streaming responses, we need to use the new ai SDK approach
            // The generateAIResponse returns an OpenAI stream, we need to convert it
            const stream = (result as any).stream;

            // Create a readable stream from the OpenAI response
            const encoder = new TextEncoder();
            let fullContent = '';

            const readableStream = new ReadableStream({
                async start(controller) {
                    try {
                        // Iterate over normalized stream (yields strings)
                        for await (const content of stream) {
                            if (content) {
                                fullContent += content;
                                controller.enqueue(encoder.encode(content));
                            }
                        }

                        // Save assistant response after stream completes
                        if (sessionId && fullContent) {
                            await saveMessageToSession(sessionId, chatbotId, {
                                role: "assistant",
                                content: fullContent
                            }, userId);

                            // Check if this is an appointment confirmation and save it
                            if (isAppointmentConfirmation(fullContent)) {
                                console.log("Chat API: ✅ Appointment confirmation detected!");

                                try {
                                    // Extract appointment data using the clean extractor
                                    const extractedData = extractAppointmentData(messages, fullContent);

                                    // Validate we have minimum required data
                                    if (!extractedData.customerEmail && !extractedData.customerPhone) {
                                        console.log("Chat API: ⚠️ No contact info found, skipping save");
                                    } else {
                                        // Double-check adminDb is available
                                        if (!adminDb) {
                                            console.error("Chat API: ❌ adminDb is null!");
                                            throw new Error("Database not available");
                                        }

                                        const appointmentData = {
                                            chatbotId,
                                            customerName: extractedData.customerName,
                                            customerEmail: extractedData.customerEmail,
                                            customerPhone: extractedData.customerPhone,
                                            date: extractedData.date,
                                            time: extractedData.time,
                                            type: "Chatbot Reservation",
                                            notes: `Session: ${sessionId}`,
                                            sessionId,
                                            status: "pending",
                                            source: "chatbot",
                                            createdAt: new Date().toISOString()
                                        };

                                        console.log("Chat API: 📝 Saving appointment:", JSON.stringify(appointmentData, null, 2));

                                        const docRef = await adminDb.collection("appointments").add(appointmentData);
                                        console.log("Chat API: ✅ Appointment saved with ID:", docRef.id);
                                    }
                                } catch (extractError: any) {
                                    console.error("Chat API: ❌ Appointment save failed:", extractError?.message || extractError);
                                }
                            }
                        }

                        // Track Usage (Async, Fire-and-forget)
                        const estimatedOutputTokens = Math.ceil(fullContent.length / 4);
                        // TODO: Pass actual model used from result.modelUsed
                        const modelUsed = (result as any).modelUsed || "gpt-3.5-turbo";
                        trackAiUsage(chatbotId, estimatedInputTokens, estimatedOutputTokens, modelUsed);


                        controller.close();
                    } catch (error) {
                        controller.error(error);
                    }
                }
            });

            return new Response(readableStream, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Transfer-Encoding': 'chunked',
                },
            });
        } else {
            return new Response(result.content, { status: 200 });
        }

    } catch (error) {
        console.error("Chat API Error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) }), { status: 500 });
    }
}
