import { getAdminDb } from "@/lib/firebase-admin";

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

        const chatbotRef = adminDb.collection("chatbots").doc(chatbotId);

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
                    connectedAt: new Date().toISOString()
                }
            }
        }, { merge: true });

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error("WhatsApp Connect Error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
}
