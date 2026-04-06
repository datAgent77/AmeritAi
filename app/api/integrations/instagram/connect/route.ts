import { getAdminDb } from "@/lib/firebase-admin";
import { authorizeTargetAccess } from "@/lib/api-auth";
import crypto from "crypto";

export async function POST(req: Request) {
    const adminDb = getAdminDb();
    try {
        if (!adminDb) {
            return new Response(JSON.stringify({ error: "Firebase Admin not initialized" }), { status: 500 });
        }

        const { chatbotId, pageId, accessToken, verifyToken } = await req.json();

        if (!chatbotId || !pageId || !accessToken || !verifyToken) {
            return new Response(JSON.stringify({ error: "Missing required fields: chatbotId, pageId, accessToken, verifyToken" }), { status: 400 });
        }

        const access = await authorizeTargetAccess(req, chatbotId);
        if (!access.ok) return access.response;

        const chatbotRef = adminDb.collection("chatbots").doc(chatbotId);
        const chatbotSnap = await chatbotRef.get();

        if (!chatbotSnap.exists) {
            return new Response(JSON.stringify({ error: "Chatbot not found" }), { status: 404 });
        }

        // Validate access token with Instagram Graph API
        let igUserId = "";
        try {
            const meRes = await fetch(
                `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${accessToken}`
            );
            if (meRes.ok) {
                const meData = await meRes.json();
                igUserId = meData.id || "";
            }
        } catch {
            // Non-blocking — connection still works even if validation fails
        }

        const webhookSecret = crypto.randomBytes(32).toString("hex");
        const origin = new URL(req.url).origin;
        const webhookUrl = `${origin}/api/integrations/instagram/webhook?chatbotId=${chatbotId}&secret=${webhookSecret}`;

        // Save Instagram config
        await chatbotRef.set({
            integrations: {
                instagram: {
                    connected: true,
                    pageId,
                    accessToken,
                    verifyToken,
                    webhookSecret,
                    igUserId,
                    connectedAt: new Date().toISOString()
                }
            }
        }, { merge: true });

        return new Response(JSON.stringify({ success: true, webhookUrl }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Instagram Connect Error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
}
