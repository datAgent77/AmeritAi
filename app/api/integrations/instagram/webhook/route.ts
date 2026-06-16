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

// GET: Webhook Verification (Meta challenge)
export async function GET(req: Request) {
    const adminDb = getAdminDb();
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const chatbotId = url.searchParams.get("chatbotId");

    if (!chatbotId || !adminDb) {
        return new Response("Missing chatbotId or server error", { status: 400 });
    }

    const chatbotRef = adminDb.collection("chatbots").doc(chatbotId);
    const chatbotSnap = await chatbotRef.get();

    if (!chatbotSnap.exists) {
        return new Response("Chatbot not found", { status: 404 });
    }

    const igConfig = chatbotSnap.data()?.integrations?.instagram;

    if (!igConfig || igConfig.verifyToken !== token) {
        return new Response("Forbidden", { status: 403 });
    }

    if (mode === "subscribe" && challenge) {
        return new Response(challenge, { status: 200 });
    }

    return new Response("Bad Request", { status: 400 });
}

// POST: Incoming Instagram DM Messages
export async function POST(req: Request) {
    const adminDb = getAdminDb();
    try {
        const url = new URL(req.url);
        const chatbotId = url.searchParams.get("chatbotId");
        const webhookSecretParam = url.searchParams.get("secret") || "";

        if (!chatbotId || !adminDb) {
            return new Response("Missing chatbotId", { status: 400 });
        }

        const chatbotRef = adminDb.collection("chatbots").doc(chatbotId);
        const chatbotSnap = await chatbotRef.get();

        if (!chatbotSnap.exists) {
            return new Response("Chatbot not found", { status: 404 });
        }

        const data = chatbotSnap.data();
        const igConfig = data?.integrations?.instagram;

        if (!igConfig?.connected) {
            return new Response("Instagram not connected", { status: 400 });
        }

        // Verify webhook secret
        const expectedSecret = igConfig.webhookSecret || "";
        if (expectedSecret && webhookSecretParam !== expectedSecret) {
            return new Response("Forbidden", { status: 403 });
        }

        const rawBody = await req.text();
        let body: any;
        try {
            body = JSON.parse(rawBody);
        } catch {
            return new Response("Invalid payload", { status: 400 });
        }

        // Instagram DM payload structure
        const entry = body.entry?.[0];
        const messaging = entry?.messaging?.[0];

        if (!messaging) {
            return new Response("OK", { status: 200 });
        }

        const senderId = messaging.sender?.id;
        const messageObj = messaging.message;

        // Ignore echos (messages sent by the page itself)
        if (messageObj?.is_echo) {
            return new Response("OK", { status: 200 });
        }

        const text = messageObj?.text;
        if (!text || !senderId) {
            return new Response("OK", { status: 200 });
        }

        console.log(`[Instagram] DM from ${senderId} to chatbot ${chatbotId}: ${text}`);

        const accessToken = igConfig.accessToken;
        const pageId = igConfig.pageId;

        const sendIgText = (recipientId: string, bodyText: string) =>
            fetch(`https://graph.facebook.com/v18.0/${pageId}/messages`, {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                body: JSON.stringify({ recipient: { id: recipientId }, message: { text: bodyText }, messaging_type: "RESPONSE" }),
            });

        // Session management
        const sessionId = `instagram-${chatbotId}-${senderId}`;
        const sessionRef = adminDb.collection("chat_sessions").doc(sessionId);
        const sessionSnap = await sessionRef.get();

        let history: any[] = [];
        let currentMessages: any[] = [];
        let isPaused = false;

        if (sessionSnap.exists) {
            const sessionData = sessionSnap.data();
            isPaused = sessionData?.isPaused || false;
            currentMessages = sessionData?.messages || [];
            history = currentMessages.slice(-6).map((m: any) => ({
                role: m.role,
                content: m.content
            }));
        } else {
            await sessionRef.set({
                chatbotId,
                createdAt: new Date().toISOString(),
                messages: [],
                isPaused: false,
                channel: "instagram",
                userIdentifier: senderId
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
        await sessionRef.update({ messages: currentMessages });

        // TCPA: honor STOP/START before any AI processing.
        const consent = classifyConsentKeyword(text);
        if (consent) {
            const replyLang = consentReplyLanguage(text);
            const identity = { chatbotId, channel: "instagram" as const, contactKey: senderId };
            if (consent === "opt_out") {
                await recordOptOut(adminDb as any, identity, { source: "api/integrations/instagram/webhook", keyword: String(text).slice(0, 40) });
            } else {
                await recordOptIn(adminDb as any, identity, { source: "api/integrations/instagram/webhook", keyword: String(text).slice(0, 40) });
            }
            const confirmation = consent === "opt_out" ? getOptOutConfirmation(replyLang) : getOptInConfirmation(replyLang);
            try { await sendIgText(senderId, confirmation); } catch { /* do not block opt-out on delivery error */ }
            return new Response("OK (consent)", { status: 200 });
        }

        if (isPaused) {
            return new Response("OK (Paused)", { status: 200 });
        }

        // TCPA: never send outbound to a contact who has opted out.
        if (await isOptedOut(adminDb as any, { chatbotId, channel: "instagram", contactKey: senderId })) {
            return new Response("OK (opted out)", { status: 200 });
        }

        // Generate AI response
        const messages = [...history, { role: "user", content: text }];
        const aiResult = await generateAIResponse(chatbotId, messages as any, sessionId, false);
        const replyText = aiResult.content;

        // Send reply via Instagram Graph API (Messenger Send API)
        const sendRes = await sendIgText(senderId, replyText);

        if (!sendRes.ok) {
            const errBody = await sendRes.text();
            console.error(`[Instagram] Failed to send reply: ${errBody}`);
        }

        // Save AI message
        currentMessages.push({
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: replyText,
            createdAt: new Date().toISOString()
        });
        await sessionRef.update({ messages: currentMessages });

        return new Response("OK", { status: 200 });

    } catch (error) {
        console.error("Instagram Webhook Error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
