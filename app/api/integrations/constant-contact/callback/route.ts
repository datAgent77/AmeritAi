import { getAdminDb } from "@/lib/firebase-admin";
import { redirect } from "next/navigation";

export async function GET(req: Request) {
    const adminDb = getAdminDb();
    try {
        if (!adminDb) {
            return new Response("Firebase Admin not initialized", { status: 500 });
        }

        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");
        const state = searchParams.get("state");

        if (!code || !state) {
            return new Response("Missing code or state", { status: 400 });
        }

        // Decode state to get userId and apiSecret
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        const userId = stateData.userId;
        const apiSecret = stateData.apiSecret;

        if (!userId || !apiSecret) {
            return new Response("Invalid state", { status: 400 });
        }

        // Exchange code for tokens
        const redirectUri = `${new URL(req.url).origin}/api/integrations/constant-contact/callback`;
        const apiKey = process.env.CONSTANT_CONTACT_API_KEY || stateData.apiKey;

        const tokenResponse = await fetch("https://authz.constantcontact.com/oauth2/default/v1/token", {
            method: "POST",
            headers: { 
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`
            },
            body: new URLSearchParams({
                code,
                redirect_uri: redirectUri,
                grant_type: "authorization_code"
            })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok || !tokenData.access_token) {
            return new Response("Failed to exchange code for tokens", { status: 400 });
        }

        // Get account info
        const accountResponse = await fetch("https://api.cc.email/v3/account_info", {
            headers: { "Authorization": `Bearer ${tokenData.access_token}` }
        });

        const accountData = accountResponse.ok ? await accountResponse.json() : {};

        // Save to Firestore
        const chatbotRef = adminDb.collection("chatbots").doc(userId);

        await chatbotRef.update({
            "integrations.constantContact": {
                connected: true,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token || "",
                apiKey: apiKey,
                connectedAt: new Date().toISOString()
            }
        }).catch(async (err) => {
            if (err.code === 5 || err.code === 'not-found') {
                await chatbotRef.set({
                    integrations: {
                        constantContact: {
                            connected: true,
                            accessToken: tokenData.access_token,
                            refreshToken: tokenData.refresh_token || "",
                            apiKey: apiKey,
                            connectedAt: new Date().toISOString()
                        }
                    }
                }, { merge: true });
            } else {
                throw err;
            }
        });

        // Redirect to success page
        return redirect(`/console/chatbot/integration?connected=constant-contact`);

    } catch (error) {
        console.error("Constant Contact Callback Error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
