import { getAdminDb } from "@/lib/firebase-admin";
import { generateAIResponse } from "@/lib/ai-service";

export async function POST(req: Request) {
    const adminDb = getAdminDb();
    try {
        const url = new URL(req.url);
        const chatbotId = url.searchParams.get("chatbotId");
        const update = await req.json();

        if (!chatbotId) {
            console.error("Telegram Webhook: Missing chatbotId");
            return new Response("Missing chatbotId", { status: 400 });
        }

        if (!adminDb) {
            console.error("Telegram Webhook: Firebase Admin not initialized");
            return new Response("Internal Server Error", { status: 500 });
        }

        // Check if it's a message
        if (!update.message || !update.message.text) {
            return new Response("OK", { status: 200 }); // Ignore non-text messages
        }

        const chatId = update.message.chat.id;
        const text = update.message.text;
        const userId = update.message.from.id; // Telegram User ID

        console.log(`Telegram Webhook: Received message from ${userId} for chatbot ${chatbotId}: ${text}`);

        // 1. Get Chatbot Settings (to get the Token)
        const chatbotRef = adminDb.collection("chatbots").doc(chatbotId);
        const chatbotSnap = await chatbotRef.get();

        if (!chatbotSnap.exists) {
            console.error("Telegram Webhook: Chatbot not found");
            return new Response("Chatbot not found", { status: 404 });
        }

        const data = chatbotSnap.data();
        const telegramConfig = data?.integrations?.telegram;

        if (!telegramConfig || !telegramConfig.connected || !telegramConfig.botToken) {
            console.error("Telegram Webhook: Telegram not connected for this chatbot");
            return new Response("Telegram not connected", { status: 400 });
        }

        const botToken = telegramConfig.botToken;

        // 2. Generate AI Response
        // We use the Telegram Chat ID as the Session ID to maintain context per user
        const sessionId = `telegram-${chatbotId}-${chatId}`;
        const sessionRef = adminDb.collection("chat_sessions").doc(sessionId);
        const sessionSnap = await sessionRef.get();
        let isPaused = false;
        let history: any[] = [];
        let currentMessages: any[] = [];

        if (sessionSnap.exists) {
            const sessionData = sessionSnap.data();
            isPaused = sessionData?.isPaused || false;
            // Get last 6 messages
            const msgs = sessionData?.messages || [];
            currentMessages = msgs;
            history = msgs.slice(-6).map((m: any) => ({
                role: m.role,
                content: m.content
            }));
        } else {
            // Create session if not exists
            await sessionRef.set({
                chatbotId,
                createdAt: new Date().toISOString(),
                messages: [],
                isPaused: false
            });
        }

        // Save user message
        const userMsg = {
            id: Date.now().toString(),
            role: "user",
            content: text,
            createdAt: new Date().toISOString()
        };
        currentMessages.push(userMsg);

        // We need to write back the array. 
        // Note: Race condition possible if high concurrency but acceptable for single user chat.
        await sessionRef.update({
            messages: currentMessages
        });

        if (isPaused) {
            console.log(`Telegram Webhook: Session ${sessionId} is paused. Skipping AI reply.`);
            return new Response("OK (Paused)", { status: 200 });
        }

        const messages = [
            ...history,
            { role: "user", content: text }
        ];

        // Send "Typing..." action
        await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                action: "typing"
            })
        });

        // Generate and Send AI Response
        // Note: generateAIResponse saves the assistant reply internally now using adminDb
        const aiResult = await generateAIResponse(chatbotId, messages as any, sessionId, false);
        const replyText = aiResult.content;

        // 3. Send Reply to Telegram
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text: replyText
            })
        });

        return new Response("OK", { status: 200 });

    } catch (error) {
        console.error("Telegram Webhook Error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
