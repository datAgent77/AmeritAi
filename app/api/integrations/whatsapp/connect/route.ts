import { getAdminDb } from "@/lib/firebase-admin";
import { authorizeTargetAccess } from "@/lib/api-auth";
import crypto from "crypto";

export async function POST(req: Request) {
    const adminDb = getAdminDb();
    try {
        if (!adminDb) {
            return new Response(JSON.stringify({ error: "Firebase Admin not initialized" }), { status: 500 });
        }

        const { chatbotId, phoneNumberId, accessToken, verifyToken } = await req.json();

        if (!chatbotId || !phoneNumberId || !accessToken || !verifyToken) {
            return new Response("Missing required fields", { status: 400 });
        }

        const access = await authorizeTargetAccess(req, chatbotId);
        if (!access.ok) return access.response;

        const chatbotRef = adminDb.collection("chatbots").doc(chatbotId);
        const webhookSecret = crypto.randomBytes(32).toString("hex");
        const webhookUrl = `${new URL(req.url).origin}/api/integrations/whatsapp/webhook?chatbotId=${chatbotId}&secret=${webhookSecret}`;

        // Verify chatbot exists
        const chatbotSnap = await chatbotRef.get();
        if (!chatbotSnap.exists) {
            return new Response("Chatbot not found", { status: 404 });
        }

        // Save WhatsApp config
        await chatbotRef.set({
            integrations: {
                whatsapp: {
                    connected: true,
                    phoneNumberId,
                    accessToken,
                    verifyToken,
                    webhookSecret,
                    connectedAt: new Date().toISOString()
                }
            }
        }, { merge: true });

        return new Response(JSON.stringify({ success: true, webhookUrl }), { status: 200 });

    } catch (error) {
        console.error("WhatsApp Connect Error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
}
