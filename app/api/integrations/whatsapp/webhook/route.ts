import { getAdminDb } from "@/lib/firebase-admin";
import { generateAIResponse } from "@/lib/ai-service";

// GET: Webhook Verification
export async function GET(req: Request) {
    const adminDb = getAdminDb();
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const chatbotId = url.searchParams.get("chatbotId");

    if (!chatbotId) {
        return new Response("Missing chatbotId", { status: 400 });
    }

    if (!adminDb) {
        return new Response("Internal Server Error", { status: 500 });
    }

    // Fetch verify token from Firestore
    const chatbotRef = adminDb.collection("chatbots").doc(chatbotId);
    const chatbotSnap = await chatbotRef.get();

    if (!chatbotSnap.exists) {
        return new Response("Chatbot not found", { status: 404 });
    }

    const waConfig = chatbotSnap.data()?.integrations?.whatsapp;

    if (!waConfig || waConfig.verifyToken !== token) {
        return new Response("Forbidden", { status: 403 });
    }

    if (mode === "subscribe" && challenge) {
        return new Response(challenge, { status: 200 });
    }

    return new Response("Bad Request", { status: 400 });
}

// POST: Incoming Messages
export async function POST(req: Request) {
    const adminDb = getAdminDb();
    try {
        const url = new URL(req.url);
        const chatbotId = url.searchParams.get("chatbotId");
        const body = await req.json();

        if (!chatbotId) {
            return new Response("Missing chatbotId", { status: 400 });
        }

        if (!adminDb) {
            return new Response("Internal Server Error", { status: 500 });
        }

        // Check if it's a WhatsApp status update (ignore for now)
        if (body.entry?.[0]?.changes?.[0]?.value?.statuses) {
            return new Response("OK", { status: 200 });
        }

        const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

        if (!message || message.type !== "text") {
            return new Response("OK", { status: 200 }); // Ignore non-text
        }

        const from = message.from; // User's phone number
        const text = message.text.body;
        const waBusinessId = body.entry?.[0]?.id; // Business Account ID

        console.log(`WhatsApp Webhook: Message from ${from} for chatbot ${chatbotId}: ${text}`);

        // 1. Get Chatbot Settings
        const chatbotRef = adminDb.collection("chatbots").doc(chatbotId);
        const chatbotSnap = await chatbotRef.get();

        if (!chatbotSnap.exists) {
            return new Response("Chatbot not found", { status: 404 });
        }

        const data = chatbotSnap.data();
        const waConfig = data?.integrations?.whatsapp;
        if (!waConfig || !waConfig.connected) {
            return new Response("WhatsApp not connected", { status: 400 });
        }

        const phoneNumberId = waConfig.phoneNumberId;
        const accessToken = waConfig.accessToken;

        // 2. Session Management
        const sessionId = `whatsapp-${chatbotId}-${from}`;
        const sessionRef = adminDb.collection("chat_sessions").doc(sessionId);
        const sessionSnap = await sessionRef.get();

        let isPaused = false;
        let history: any[] = [];
        let currentMessages: any[] = [];

        if (sessionSnap.exists) {
            const sessionData = sessionSnap.data();
            isPaused = sessionData?.isPaused || false;
            const msgs = sessionData?.messages || [];
            currentMessages = msgs;
            history = msgs.slice(-6).map((m: any) => ({
                role: m.role,
                content: m.content
            }));
        } else {
            await sessionRef.set({
                chatbotId,
                createdAt: new Date().toISOString(),
                messages: [],
                isPaused: false,
                channel: "whatsapp",
                userIdentifier: from
            });
        }

        // Save User Message
        const userMsg = {
            id: Date.now().toString(),
            role: "user",
            content: text,
            createdAt: new Date().toISOString()
        };
        currentMessages.push(userMsg);

        await sessionRef.update({
            messages: currentMessages
        });

        if (isPaused) {
            console.log(`WhatsApp Webhook: Session ${sessionId} is paused. Skipping AI reply.`);
            return new Response("OK (Paused)", { status: 200 });
        }

        // 3. Generate AI Response
        const messages = [
            ...history,
            { role: "user", content: text }
        ];

        // generateAIResponse uses adminDb internally now
        const aiResult = await generateAIResponse(chatbotId, messages as any, sessionId, false);
        const replyText = aiResult.content;

        // 4. Send Reply via WhatsApp Cloud API
        await fetch(`https://graph.facebook.com/v17.0/${phoneNumberId}/messages`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: from,
                text: { body: replyText }
            })
        });

        return new Response("OK", { status: 200 });

    } catch (error) {
        console.error("WhatsApp Webhook Error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
