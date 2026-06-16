import { getAdminDb } from "@/lib/firebase-admin";
import { generateAIResponse } from "@/lib/ai-service";
import {
    classifyConsentKeyword,
    consentReplyLanguage,
    getOptInConfirmation,
    getOptOutConfirmation,
    isOptedOut,
    recordOptIn,
    recordOptOut,
} from "@/lib/messaging/opt-out";
import crypto from "crypto";

function isTimingSafeEqual(value: string, expected: string): boolean {
    const valueBuf = Buffer.from(value);
    const expectedBuf = Buffer.from(expected);
    if (valueBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(valueBuf, expectedBuf);
}

export async function POST(req: Request) {
    const adminDb = getAdminDb();
    try {
        const url = new URL(req.url);
        const chatbotId = url.searchParams.get("chatbotId");

        if (!chatbotId) {
            console.error("Telegram Webhook: Missing chatbotId");
            return new Response("Missing chatbotId", { status: 400 });
        }

        if (!adminDb) {
            console.error("Telegram Webhook: Firebase Admin not initialized");
            return new Response("Internal Server Error", { status: 500 });
        }

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

        const expectedWebhookSecret = telegramConfig.webhookSecret || "";
        if (!expectedWebhookSecret) {
            console.error("Telegram Webhook: Missing webhook secret configuration");
            return new Response("Webhook secret not configured", { status: 401 });
        }

        const providedWebhookSecret = req.headers.get("x-telegram-bot-api-secret-token") || "";
        if (!isTimingSafeEqual(providedWebhookSecret, expectedWebhookSecret)) {
            console.error("Telegram Webhook: Invalid webhook secret");
            return new Response("Forbidden", { status: 403 });
        }

        const update = await req.json();
        // Check if it's a message
        if (!update.message || !update.message.text) {
            return new Response("OK", { status: 200 }); // Ignore non-text messages
        }

        const chatId = update.message.chat.id;
        const text = update.message.text;
        const userId = update.message.from.id; // Telegram User ID

        console.log(`Telegram Webhook: Received message from ${userId} for chatbot ${chatbotId}: ${text}`);

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

        const sendTgText = (bodyText: string) =>
            fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: chatId, text: bodyText }),
            });

        // TCPA-style opt-out: honor STOP/START before any AI processing.
        const consent = classifyConsentKeyword(text);
        if (consent) {
            const replyLang = consentReplyLanguage(text);
            const identity = { chatbotId, channel: "telegram" as const, contactKey: String(userId) };
            if (consent === "opt_out") {
                await recordOptOut(adminDb as any, identity, { source: "api/integrations/telegram/webhook", keyword: String(text).slice(0, 40) });
            } else {
                await recordOptIn(adminDb as any, identity, { source: "api/integrations/telegram/webhook", keyword: String(text).slice(0, 40) });
            }
            const confirmation = consent === "opt_out" ? getOptOutConfirmation(replyLang) : getOptInConfirmation(replyLang);
            try { await sendTgText(confirmation); } catch { /* do not block opt-out on delivery error */ }
            return new Response("OK (consent)", { status: 200 });
        }

        if (isPaused) {
            console.log(`Telegram Webhook: Session ${sessionId} is paused. Skipping AI reply.`);
            return new Response("OK (Paused)", { status: 200 });
        }

        // Never send outbound to a contact who has opted out.
        if (await isOptedOut(adminDb as any, { chatbotId, channel: "telegram", contactKey: String(userId) })) {
            return new Response("OK (opted out)", { status: 200 });
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
        await sendTgText(replyText);

        return new Response("OK", { status: 200 });

    } catch (error) {
        console.error("Telegram Webhook Error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
