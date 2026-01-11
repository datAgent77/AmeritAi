import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    const adminDb = getAdminDb();
    try {
        if (!adminDb) {
            return new Response(JSON.stringify({ error: "Firebase Admin not initialized" }), { status: 500 });
        }

        const { searchParams } = new URL(req.url);
        const chatbotId = searchParams.get("chatbotId");

        if (!chatbotId) {
            return new Response(JSON.stringify({ error: "Missing chatbotId" }), { status: 400 });
        }

        // Parse Salesforce webhook payload
        const payload = await req.json();

        // Handle different Salesforce webhook events
        // This is a placeholder - actual implementation depends on Salesforce webhook configuration
        console.log("Salesforce webhook received:", payload);

        // You can process webhook data here (e.g., update chatbot state, trigger actions)

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error("Salesforce Webhook Error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
}
