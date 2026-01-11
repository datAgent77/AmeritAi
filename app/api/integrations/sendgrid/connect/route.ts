import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    const adminDb = getAdminDb();
    try {
        if (!adminDb) {
            return new Response(JSON.stringify({ error: "Firebase Admin not initialized" }), { status: 500 });
        }

        const { userId, apiKey, fromEmail } = await req.json();

        if (!userId || !apiKey || !fromEmail) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
        }

        // Test connection by fetching API key info
        const testResponse = await fetch("https://api.sendgrid.com/v3/user/profile", {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        if (!testResponse.ok) {
            const errorData = await testResponse.json();
            return new Response(JSON.stringify({ 
                error: "Failed to connect to SendGrid", 
                details: errorData.errors?.[0]?.message || "Invalid API key"
            }), { status: 400 });
        }

        // Save to Firestore
        const chatbotRef = adminDb.collection("chatbots").doc(userId);

        await chatbotRef.update({
            "integrations.sendgrid": {
                connected: true,
                apiKey: apiKey,
                fromEmail: fromEmail,
                connectedAt: new Date().toISOString()
            }
        }).catch(async (err) => {
            if (err.code === 5 || err.code === 'not-found') {
                await chatbotRef.set({
                    integrations: {
                        sendgrid: {
                            connected: true,
                            apiKey: apiKey,
                            fromEmail: fromEmail,
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
        console.error("SendGrid Connect Error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error", details: String(error) }), { status: 500 });
    }
}
