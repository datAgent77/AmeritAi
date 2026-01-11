import { getAdminDb } from "@/lib/firebase-admin";
import crypto from "crypto";

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

        // Get Shopify config
        const chatbotRef = adminDb.collection("chatbots").doc(chatbotId);
        const chatbotDoc = await chatbotRef.get();

        if (!chatbotDoc.exists) {
            return new Response(JSON.stringify({ error: "Chatbot not found" }), { status: 404 });
        }

        const integrations = chatbotDoc.data()?.integrations;
        const shopifyConfig = integrations?.shopify;

        if (!shopifyConfig?.connected || !shopifyConfig.apiSecret) {
            return new Response(JSON.stringify({ error: "Shopify not connected" }), { status: 400 });
        }

        // Verify webhook signature
        const hmacHeader = req.headers.get("x-shopify-hmac-sha256");
        const body = await req.text();

        if (hmacHeader) {
            const hash = crypto
                .createHmac("sha256", shopifyConfig.apiSecret)
                .update(body, "utf8")
                .digest("base64");

            if (hash !== hmacHeader) {
                return new Response(JSON.stringify({ error: "Invalid webhook signature" }), { status: 401 });
            }
        }

        // Parse webhook payload
        const payload = JSON.parse(body);

        // Handle different Shopify webhook events
        const topic = req.headers.get("x-shopify-topic");
        const shopDomain = req.headers.get("x-shopify-shop-domain");

        console.log("Shopify webhook received:", { topic, shopDomain, payload });

        // Process webhook based on topic
        // Examples: orders/create, orders/updated, customers/create, etc.
        if (topic === "orders/create" || topic === "orders/updated") {
            // Handle order webhook
            // You can store order data, trigger notifications, etc.
        } else if (topic === "customers/create" || topic === "customers/update") {
            // Handle customer webhook
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error("Shopify Webhook Error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
}
