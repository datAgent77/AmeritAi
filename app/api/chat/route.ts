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

        console.log(`[CHAT API DEBUG] chatbotId=${chatbotId}, language=${language}, body.industry=${body.industry}`);

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

                                            console.log("Chat API: 📅 Saving appointment:", appointmentDoc);
                                            await adminDb.collection("appointments").add(appointmentDoc);
                                            console.log("Chat API: ✅ Appointment saved successfully");

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
                                                    console.log("Chat API: ✅ Appointment synced to Google Calendar");
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

                            // Legacy appointment save code (keeping for backward compatibility)
                            if (false && isAppointmentConfirmation(fullContent)) {
                                try {
                                    // Extract appointment data using the clean extractor
                                    const extractedData = extractAppointmentData(messages, fullContent);

                                    // Validate we have minimum required data
                                    if (!extractedData.customerEmail && !extractedData.customerPhone) {
                                        // No contact info, skip save
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

                                        // TypeScript: adminDb is checked above, safe to use
                                        const docRef = await adminDb!.collection("appointments").add(appointmentData);
                                        console.log("Chat API: ✅ Appointment saved successfully");

                                        // Sync to Google Calendar if connected
                                        try {
                                            // TypeScript: adminDb is checked above, safe to use
                                            const chatbotDoc = await adminDb!.collection("chatbots").doc(chatbotId).get();
                                            const integrations = chatbotDoc.data()?.integrations || {};

                                            // Sync to Google Calendar if connected
                                            if (integrations.googleCalendar?.connected && extractedData.date && extractedData.time) {
                                                try {
                                                    // Parse date and time
                                                    let startDateTime: string;
                                                    let endDateTime: string;
                                                    
                                                    try {
                                                        const date = new Date(`${extractedData.date}T${extractedData.time}`);
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
                                                    console.log("Chat API: ✅ Appointment synced to Google Calendar");
                                                } catch (err) {
                                                    console.error("Chat API: ❌ Google Calendar sync error:", err);
                                                }
                                            }

                                            // Sync to Outlook Calendar if connected
                                            if (integrations.outlookCalendar?.connected && extractedData.date && extractedData.time) {
                                                try {
                                                    // Parse date and time
                                                    let startDateTime: string;
                                                    let endDateTime: string;
                                                    
                                                    try {
                                                        const date = new Date(`${extractedData.date}T${extractedData.time}`);
                                                        startDateTime = date.toISOString();
                                                        endDateTime = new Date(date.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour default
                                                    } catch {
                                                        // Fallback: use current date/time if parsing fails
                                                        const now = new Date();
                                                        startDateTime = now.toISOString();
                                                        endDateTime = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
                                                    }

                                                    await fetch(`${new URL(req.url).origin}/api/integrations/outlook-calendar/events`, {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({
                                                            userId: chatbotId,
                                                            eventData: {
                                                                summary: `Appointment with ${extractedData.customerName || 'Guest'}`,
                                                                description: `Appointment scheduled via chatbot\nEmail: ${extractedData.customerEmail || 'N/A'}\nPhone: ${extractedData.customerPhone || 'N/A'}`,
                                                                start: { dateTime: startDateTime, timeZone: "UTC" },
                                                                end: { dateTime: endDateTime, timeZone: "UTC" },
                                                                attendees: extractedData.customerEmail ? [{ emailAddress: { address: extractedData.customerEmail }, type: "required" }] : []
                                                            }
                                                        })
                                                    });
                                                    console.log("Chat API: ✅ Appointment synced to Outlook Calendar");
                                                } catch (err) {
                                                    console.error("Chat API: ❌ Outlook Calendar sync error:", err);
                                                }
                                            }
                                        } catch (syncError) {
                                            console.error("Chat API: ❌ Google Calendar sync error:", syncError);
                                        }
                                    }
                                } catch (extractError: any) {
                                    console.error("Chat API: ❌ Appointment save failed:", extractError?.message || extractError);
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

                                            console.log("Chat API: 📝 Saving lead:", leadDoc);
                                            await adminDb.collection("leads").add(leadDoc);
                                            console.log("Chat API: ✅ Lead saved successfully");

                                            // Sync to connected integrations
                                            try {
                                                const chatbotDoc = await adminDb.collection("chatbots").doc(chatbotId).get();
                                                const integrations = chatbotDoc.data()?.integrations || {};

                                                // Sync to Salesforce
                                                if (integrations.salesforce?.connected && leadData.email) {
                                                    try {
                                                        await fetch(`${new URL(req.url).origin}/api/integrations/salesforce/sync`, {
                                                            method: "POST",
                                                            headers: { "Content-Type": "application/json" },
                                                            body: JSON.stringify({ userId: chatbotId, leadData })
                                                        });
                                                        console.log("Chat API: ✅ Lead synced to Salesforce");
                                                    } catch (err) {
                                                        console.error("Chat API: ❌ Salesforce sync failed:", err);
                                                    }
                                                }

                                                // Sync to Mailchimp
                                                if (integrations.mailchimp?.connected && leadData.email) {
                                                    try {
                                                        await fetch(`${new URL(req.url).origin}/api/integrations/mailchimp/subscribe`, {
                                                            method: "POST",
                                                            headers: { "Content-Type": "application/json" },
                                                            body: JSON.stringify({ userId: chatbotId, leadData })
                                                        });
                                                        console.log("Chat API: ✅ Lead synced to Mailchimp");
                                                    } catch (err) {
                                                        console.error("Chat API: ❌ Mailchimp sync failed:", err);
                                                    }
                                                }

                                                // Sync to Constant Contact
                                                if (integrations.constantContact?.connected && leadData.email) {
                                                    try {
                                                        await fetch(`${new URL(req.url).origin}/api/integrations/constant-contact/contacts`, {
                                                            method: "POST",
                                                            headers: { "Content-Type": "application/json" },
                                                            body: JSON.stringify({ userId: chatbotId, leadData })
                                                        });
                                                        console.log("Chat API: ✅ Lead synced to Constant Contact");
                                                    } catch (err) {
                                                        console.error("Chat API: ❌ Constant Contact sync failed:", err);
                                                    }
                                                }
                                            } catch (syncError) {
                                                console.error("Chat API: ❌ Integration sync error:", syncError);
                                            }
                                        }
                                    } else {
                                        console.log("Chat API: ⚠️ Lead confirmation detected but no contact info extracted");
                                    }
                                } catch (leadError: any) {
                                    console.error("Chat API: ❌ Lead save failed:", leadError?.message || leadError);
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
