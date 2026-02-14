import { getAdminDb } from "@/lib/firebase-admin";
import { authorizeTargetAccess } from "@/lib/api-auth";

export async function POST(req: Request) {
    const adminDb = getAdminDb();
    try {
        if (!adminDb) {
            return new Response(JSON.stringify({ error: "Firebase Admin not initialized" }), { status: 500 });
        }

        const { userId, shopDomain, apiKey, apiSecret } = await req.json();

        if (!userId || !shopDomain || !apiKey || !apiSecret) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
        }

        const access = await authorizeTargetAccess(req, userId);
        if (!access.ok) return access.response;

        // Shopify OAuth flow
        // For custom apps, we can use Admin API with API key/secret
        // For OAuth apps, we would need to implement OAuth flow
        // For now, we'll use API key/secret approach (Private App or Custom App)

        const shopUrl = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const testUrl = `https://${shopUrl}/admin/api/2024-01/shop.json`;

        // Test connection by fetching shop info
        const testResponse = await fetch(testUrl, {
            headers: {
                "X-Shopify-Access-Token": apiKey,
                "Content-Type": "application/json"
            }
        });

        if (!testResponse.ok) {
            const errorData = await testResponse.json();
            return new Response(JSON.stringify({ 
                error: "Failed to connect to Shopify", 
                details: errorData.errors || "Invalid credentials"
            }), { status: 400 });
        }

        const shopData = await testResponse.json();

        // Save to Firestore
        const chatbotRef = adminDb.collection("chatbots").doc(userId);

        await chatbotRef.update({
            "integrations.shopify": {
                connected: true,
                shopDomain: shopUrl,
                apiKey: apiKey,
                apiSecret: apiSecret,
                shopName: shopData.shop?.name || "",
                connectedAt: new Date().toISOString()
            }
        }).catch(async (err) => {
            if (err.code === 5 || err.code === 'not-found') {
                await chatbotRef.set({
                    integrations: {
                        shopify: {
                            connected: true,
                            shopDomain: shopUrl,
                            apiKey: apiKey,
                            apiSecret: apiSecret,
                            shopName: shopData.shop?.name || "",
                            connectedAt: new Date().toISOString()
                        }
                    }
                }, { merge: true });
            } else {
                throw err;
            }
        });

        return new Response(JSON.stringify({ 
            success: true, 
            shopName: shopData.shop?.name 
        }), { status: 200 });

    } catch (error) {
        console.error("Shopify Connect Error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error", details: String(error) }), { status: 500 });
    }
}
