import { getAdminDb } from "@/lib/firebase-admin";
import { ShopifyService } from "@/lib/services/shopify-service";

export async function GET(req: Request) {
    const adminDb = getAdminDb();
    try {
        if (!adminDb) {
            return new Response(JSON.stringify({ error: "Firebase Admin not initialized" }), { status: 500 });
        }

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return new Response(JSON.stringify({ error: "Missing userId" }), { status: 400 });
        }

        // Get Shopify config from Firestore
        const chatbotRef = adminDb.collection("chatbots").doc(userId);
        const chatbotDoc = await chatbotRef.get();

        if (!chatbotDoc.exists) {
            return new Response(JSON.stringify({ error: "Chatbot not found" }), { status: 404 });
        }

        const integrations = chatbotDoc.data()?.integrations;
        const shopifyConfig = integrations?.shopify;

        if (!shopifyConfig?.connected || !shopifyConfig.apiKey || !shopifyConfig.shopDomain) {
            return new Response(JSON.stringify({ error: "Shopify not connected" }), { status: 400 });
        }

        // Initialize Shopify service
        const shopifyService = new ShopifyService({
            shopDomain: shopifyConfig.shopDomain,
            accessToken: shopifyConfig.apiKey
        });

        // Fetch recent orders
        const orders = await shopifyService.getOrders({ limit: 10 });

        return new Response(JSON.stringify({ success: true, orders }), { status: 200 });

    } catch (error: any) {
        console.error("Shopify Sync Error:", error);
        return new Response(JSON.stringify({ error: "Failed to sync", details: error.message }), { status: 500 });
    }
}
