import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { authorizeTargetAccess } from "@/lib/api-auth";

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 });
        }

        const { sessionId, chatbotId, content } = await req.json();

        if (!sessionId || !chatbotId || !content) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const authz = await authorizeTargetAccess(req, chatbotId);
        if (!authz.ok) {
            return authz.response;
        }

        console.log(`Admin Message: Sending to ${sessionId} for bot ${chatbotId}`);

        // 1. Save to Firestore (This updates Web Widget automatically via onSnapshot)
        const sessionRef = adminDb.collection("chat_sessions").doc(sessionId);
        const sessionSnap = await sessionRef.get();

        const newMessage = {
            id: Date.now().toString(),
            role: "assistant",
            content: content,
            createdAt: new Date().toISOString(),
            isHuman: true
        };

        if (!sessionSnap.exists) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        if (sessionSnap.data()?.chatbotId !== chatbotId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const currentMessages = sessionSnap.data()?.messages || [];
        currentMessages.push(newMessage);
        await sessionRef.update({ messages: currentMessages });

        // 2. Check if Telegram and Dispatch
        if (sessionId.startsWith("telegram-")) {
            const prefix = `telegram-${chatbotId}-`;
            const chatId = sessionId.substring(prefix.length);

            if (chatId) {
                const chatbotRef = adminDb.collection("chatbots").doc(chatbotId);
                const chatbotSnap = await chatbotRef.get();

                if (chatbotSnap.exists) {
                    const data = chatbotSnap.data();
                    const telegramConfig = data?.integrations?.telegram;

                    if (telegramConfig?.connected && telegramConfig?.botToken) {
                        try {
                            await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    chat_id: chatId,
                                    text: content
                                })
                            });
                            console.log("Admin Message: Sent to Telegram");
                        } catch (e) {
                            console.error("Admin Message: Failed to send to Telegram", e);
                        }
                    } else {
                        console.warn("Admin Message: No Telegram token found or not connected");
                    }
                }
            }
        } else if (sessionId.startsWith("whatsapp-")) {
            const prefix = `whatsapp-${chatbotId}-`;
            const phoneNumber = sessionId.substring(prefix.length);

            if (phoneNumber) {
                const chatbotRef = adminDb.collection("chatbots").doc(chatbotId);
                const chatbotSnap = await chatbotRef.get();

                if (chatbotSnap.exists) {
                    const waConfig = chatbotSnap.data()?.integrations?.whatsapp;
                    if (waConfig?.connected && waConfig?.phoneNumberId && waConfig?.accessToken) {
                        try {
                            await fetch(`https://graph.facebook.com/v17.0/${waConfig.phoneNumberId}/messages`, {
                                method: "POST",
                                headers: {
                                    "Authorization": `Bearer ${waConfig.accessToken}`,
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    messaging_product: "whatsapp",
                                    to: phoneNumber,
                                    text: { body: content }
                                })
                            });
                            console.log("Admin Message: Sent to WhatsApp");
                        } catch (e) {
                            console.error("Admin Message: Failed to send to WhatsApp", e);
                        }
                    } else {
                        console.warn("Admin Message: WhatsApp not configured or connected for this chatbot");
                    }
                }
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Admin Message Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
