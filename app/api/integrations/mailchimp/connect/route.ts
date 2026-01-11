import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    const adminDb = getAdminDb();
    try {
        if (!adminDb) {
            return new Response(JSON.stringify({ error: "Firebase Admin not initialized" }), { status: 500 });
        }

        const { userId, apiKey, serverPrefix, listId } = await req.json();

        if (!userId || !apiKey || !serverPrefix) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
        }

        // Test connection by fetching account info
        const testUrl = `https://${serverPrefix}.api.mailchimp.com/3.0/`;
        const auth = Buffer.from(`anystring:${apiKey}`).toString('base64');

        const testResponse = await fetch(`${testUrl}`, {
            headers: {
                "Authorization": `Basic ${auth}`,
                "Content-Type": "application/json"
            }
        });

        if (!testResponse.ok) {
            const errorData = await testResponse.json();
            return new Response(JSON.stringify({ 
                error: "Failed to connect to Mailchimp", 
                details: errorData.detail || "Invalid API key"
            }), { status: 400 });
        }

        // Save to Firestore
        const chatbotRef = adminDb.collection("chatbots").doc(userId);

        await chatbotRef.update({
            "integrations.mailchimp": {
                connected: true,
                apiKey: apiKey,
                serverPrefix: serverPrefix,
                defaultListId: listId || "",
                connectedAt: new Date().toISOString()
            }
        }).catch(async (err) => {
            if (err.code === 5 || err.code === 'not-found') {
                await chatbotRef.set({
                    integrations: {
                        mailchimp: {
                            connected: true,
                            apiKey: apiKey,
                            serverPrefix: serverPrefix,
                            defaultListId: listId || "",
                            connectedAt: new Date().toISOString()
                        }
                    }
                }, { merge: true });
            } else {
                throw err;
            }
        });

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error("Mailchimp Connect Error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error", details: String(error) }), { status: 500 });
    }
}
