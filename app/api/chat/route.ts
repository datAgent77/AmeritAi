import { OpenAI } from 'openai';
import { getAdminDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";
import { generateAIResponse, saveMessageToSession, analyzeSentiment } from "@/lib/ai-service";
import { trackAiUsage } from "@/lib/usage-tracker";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limiter";
import { isAppointmentConfirmation, extractAppointmentData } from "@/lib/appointment-extractor";
import { isLeadConfirmation, extractLeadData } from "@/lib/lead-extractor";

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
        const { messages, chatbotId, sessionId, context, language, isVoice, shouldStream = true, userId, visualAnalysisContext, assistantMessageId } = body;

        // Rate limiting check
        const rateLimitResult = checkRateLimit(ip, sessionId);
        if (!rateLimitResult.allowed) {
            return new Response(
                JSON.stringify({ error: "Too many requests", reason: rateLimitResult.reason }),
                { status: 429, headers: { ...getRateLimitHeaders(rateLimitResult), 'Content-Type': 'application/json' } }
            );
        }

        // === TRIAL EXPIRATION CHECK ===
        // Check if the tenant's trial has expired and block the widget
        if (userId) {
            try {
                const userDoc = await adminDb.collection('users').doc(userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    
                    // === ACCOUNT STATUS CHECK ===
                    // Explicitly check for false, default to true if undefined to be safe
                    if (userData?.isActive === false) {
                        console.log(`[CHAT API] Account is inactive for user ${userId}, blocking widget`);
                        return NextResponse.json({
                            error: "account_inactive",
                            message: "Bu sohbet botu şu anda aktif değil. Lütfen site yöneticisi ile iletişime geçin.",
                            isInactive: true
                        }, { status: 403 });
                    }

                    const subscriptionStatus = userData?.subscriptionStatus;
                    const trialEndsAt = userData?.trialEndsAt;
                    
                    // If subscription is 'trial' and trial has expired, block the request
                    if (subscriptionStatus === 'trial' && trialEndsAt) {
                        const now = new Date();
                        const endDate = new Date(trialEndsAt);
                        const isExpired = endDate.getTime() < now.getTime();
                        
                        if (isExpired) {
                            console.log(`[CHAT API] Trial expired for user ${userId}, blocking widget`);
                            return NextResponse.json({
                                error: "trial_expired",
                                message: "Deneme süreniz sona erdi. Devam etmek için lütfen bir plan seçin.",
                                shouldUpgrade: true
                            }, { status: 402 }); // 402 Payment Required
                        }
                    }
                }
            } catch (trialCheckError) {
                console.error('[CHAT API] Error checking trial status:', trialCheckError);
                // Don't block on error, just log and continue
            }
        }
        // === END TRIAL EXPIRATION CHECK ===

        // ... existing rate limit codes ...

        // ... existing pause check codes ...

        // Parallelize: Save user message and start generating AI response
        const lastMessage = messages[messages.length - 1];
        const messageId = lastMessage.id || Date.now().toString();

        const [saveResult, result] = await Promise.all([
            sessionId && lastMessage.role === "user"
                ? saveMessageToSession(sessionId, chatbotId, { ...lastMessage, id: messageId, role: "user", sentiment: "Neutral" }, userId)
                : Promise.resolve(),
            generateAIResponse(chatbotId, messages, sessionId, shouldStream, context, isVoice, language, visualAnalysisContext, body.industry)
        ]);
        
        // ... sentiment code ...

        // Estimate Input Tokens
        const inputContent = messages.map((m: any) => m.content).join(" ");
        const estimatedInputTokens = Math.ceil(inputContent.length / 4);

        if (result.isStream) {
            const stream = (result as any).stream;
            const encoder = new TextEncoder();
            let fullContent = '';

            const readableStream = new ReadableStream({
                async start(controller) {
                    try {
                        for await (const content of stream) {
                            if (content) {
                                fullContent += content;
                                controller.enqueue(encoder.encode(content));
                            }
                        }

                        // Save assistant response after stream completes using PRE-GENERATED ID
                        if (sessionId && fullContent) {
                            await saveMessageToSession(sessionId, chatbotId, {
                                role: "assistant",
                                content: fullContent,
                                id: assistantMessageId // <--- USE THIS ID
                            }, userId);

                            // Check if this is an appointment confirmation and save it
                            if (isAppointmentConfirmation(fullContent)) {

                                try {
                                    // Extract appointment data using the clean extractor
                                    const extractedData = extractAppointmentData(messages, fullContent);

                                    // Validate we have minimum required data
                                    if (!extractedData.customerEmail && !extractedData.customerPhone) {
                                        // No contact info, skip save
                                    } else {
                                        // Double-check adminDb is available
                                        if (!adminDb) {
                                            console.error("Chat API: ❌ adminDb is null for appointment save!");
                                        } else {
                                            // Save appointment to Firestore
                                            const appointmentDoc = {
                                                chatbotId,
                                                customerName: extractedData.customerName || "Guest",
                                                customerEmail: extractedData.customerEmail || "",
                                                customerPhone: extractedData.customerPhone || "",
                                                date: extractedData.date || "",
                                                time: extractedData.time || "",
                                                sessionId,
                                                status: 'pending',
                                                createdAt: new Date()
                                            };

                                            await adminDb.collection("appointments").add(appointmentDoc);

                                            // Sync to Google Calendar if connected
                                            try {
                                                const chatbotDoc = await adminDb.collection("chatbots").doc(chatbotId).get();
                                                const integrations = chatbotDoc.data()?.integrations || {};

                                                if (integrations.googleCalendar?.connected && extractedData.date && extractedData.time) {
                                                    // Parse date and time
                                                    const dateStr = extractedData.date;
                                                    const timeStr = extractedData.time;
                                                    
                                                    // Combine date and time into ISO format
                                                    let startDateTime: string;
                                                    let endDateTime: string;
                                                    
                                                    try {
                                                        const date = new Date(`${dateStr}T${timeStr}`);
                                                        startDateTime = date.toISOString();
                                                        endDateTime = new Date(date.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour default
                                                    } catch {
                                                        // Fallback: use current date/time if parsing fails
                                                        const now = new Date();
                                                        startDateTime = now.toISOString();
                                                        endDateTime = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
                                                    }

                                                    await fetch(`${new URL(req.url).origin}/api/integrations/google-calendar/events`, {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({
                                                            userId: chatbotId,
                                                            eventData: {
                                                                summary: `Appointment with ${extractedData.customerName || 'Guest'}`,
                                                                description: `Appointment scheduled via chatbot\nEmail: ${extractedData.customerEmail || 'N/A'}\nPhone: ${extractedData.customerPhone || 'N/A'}`,
                                                                start: { dateTime: startDateTime, timeZone: "UTC" },
                                                                end: { dateTime: endDateTime, timeZone: "UTC" },
                                                                attendees: extractedData.customerEmail ? [{ email: extractedData.customerEmail }] : []
                                                            }
                                                        })
                                                    });

                                                }
                                            } catch (syncError) {
                                                console.error("Chat API: ❌ Google Calendar sync error:", syncError);
                                            }
                                        }
                                    }
                                } catch (appointmentError: any) {
                                    console.error("Chat API: ❌ Appointment save failed:", appointmentError?.message || appointmentError);
                                }
                            }


                            // Check if this is a lead confirmation and save it
                            if (isLeadConfirmation(fullContent)) {
                                try {
                                    const leadData = extractLeadData(messages);

                                    // IMPORTANT: Only save if we have REAL contact info (email or phone)
                                    // Don't save if only name exists, as it might be incorrectly extracted from chat messages
                                    const hasRealContactInfo = leadData.email || leadData.phone;
                                    
                                    if (hasRealContactInfo) {
                                        if (!adminDb) {
                                            console.error("Chat API: ❌ adminDb is null for lead save!");
                                        } else {
                                            // Get translation for source based on language
                                            const sourceText = language === 'tr' 
                                                ? "Sohbet İçi Konuşma" 
                                                : "In-Chat Conversation";
                                            
                                            const leadDoc = {
                                                chatbotId,
                                                name: leadData.name || (language === 'tr' ? "Anonim" : "Anonymous"),
                                                email: leadData.email || "",
                                                phone: leadData.phone || "",
                                                source: sourceText,
                                                customFields: leadData.company ? { company: leadData.company } : {},
                                                sessionId,
                                                createdAt: new Date()
                                            };

                                            await adminDb.collection("leads").add(leadDoc);

                                            // External lead sync integrations (Salesforce/Mailchimp/Constant Contact)
                                            // are intentionally disabled.
                                        }
                                    } else {

                                    }
                                } catch (leadError: any) {
                                    console.error("Chat API: ❌ Lead save failed:", leadError?.message || leadError);
                                }
                            }
                        }

                        // Track Usage (Async, Fire-and-forget)
                        const estimatedOutputTokens = Math.ceil(fullContent.length / 4);
                        // TODO: Pass actual model used from result.modelUsed
                        const modelUsed = (result as any).modelUsed || "gpt-4o-mini";
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
        const rawMessage = error instanceof Error ? error.message : String(error);
        const lowered = rawMessage.toLowerCase();
        const isConfigError = lowered.includes("no ai provider is configured") || lowered.includes("api key");
        const message = isConfigError
            ? "AI service configuration is incomplete. Please contact support."
            : "AI service is temporarily unavailable. Please try again.";

        return new Response(
            JSON.stringify({ error: "ai_unavailable", message }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
