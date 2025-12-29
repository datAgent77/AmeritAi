import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    const adminDb = getAdminDb();
    try {
        if (!adminDb) {
            return new Response(JSON.stringify({ error: "Firebase Admin not initialized" }), { status: 500 });
        }

        const { userId, botToken } = await req.json();

        if (!userId || !botToken) {
            return new Response(JSON.stringify({ error: "Missing userId or botToken" }), { status: 400 });
        }

        // 1. Verify Token and Get Bot Info from Telegram
        const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
        const telegramData = await telegramResponse.json();

        if (!telegramData.ok) {
            return new Response(JSON.stringify({ error: "Invalid Bot Token" }), { status: 400 });
        }

        const botName = telegramData.result.username;

        // 2. Set Webhook
        const origin = new URL(req.url).origin;
        const webhookUrl = `${origin}/api/integrations/telegram/webhook?chatbotId=${userId}`;

        const setWebhookResponse = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${webhookUrl}`);
        const setWebhookData = await setWebhookResponse.json();

        if (!setWebhookData.ok) {
            return new Response(JSON.stringify({ error: "Failed to set webhook", details: setWebhookData }), { status: 500 });
        }

        // 3. Save to Firestore via Admin SDK
        const chatbotRef = adminDb.collection("chatbots").doc(userId);

        // Update strictly nested field using dot notation
        await chatbotRef.update({
            "integrations.telegram": {
                connected: true,
                botToken: botToken,
                botName: botName,
                botId: telegramData.result.id,
                connectedAt: new Date().toISOString()
            }
        }).catch(async (err) => {
            // If document doesn't exist or update fails on missing field, fallback to set with merge
            if (err.code === 5 || err.code === 'not-found') { // 5 is NOT_FOUND in some gRPC errors
                await chatbotRef.set({
                    integrations: {
                        telegram: {
                            connected: true,
                            botToken: botToken,
                            botName: botName,
                            botId: telegramData.result.id,
                            connectedAt: new Date().toISOString()
                        }
                    }
                }, { merge: true });
            } else {
                throw err;
            }
        });

        return new Response(JSON.stringify({ success: true, botName }), { status: 200 });

    } catch (error) {
        console.error("Telegram Connect Error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error", details: String(error) }), { status: 500 });
    }
}
