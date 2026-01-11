import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    const adminDb = getAdminDb();
    try {
        if (!adminDb) {
            return new Response(JSON.stringify({ error: "Firebase Admin not initialized" }), { status: 500 });
        }

        const { userId, clientId, clientSecret, username, password, securityToken } = await req.json();

        if (!userId || !clientId || !clientSecret || !username || !password) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
        }

        // Salesforce OAuth2 Username-Password Flow
        const loginUrl = "https://login.salesforce.com/services/oauth2/token";
        const loginBody = new URLSearchParams({
            grant_type: "password",
            client_id: clientId,
            client_secret: clientSecret,
            username: username,
            password: password + (securityToken || "")
        });

        const tokenResponse = await fetch(loginUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: loginBody.toString()
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok || !tokenData.access_token) {
            return new Response(JSON.stringify({ 
                error: "Failed to authenticate with Salesforce", 
                details: tokenData.error_description || tokenData.error 
            }), { status: 400 });
        }

        // Get organization info
        const orgInfoResponse = await fetch(`${tokenData.instance_url}/services/oauth2/userinfo`, {
            headers: { "Authorization": `Bearer ${tokenData.access_token}` }
        });

        const orgInfo = await orgInfoResponse.ok ? await orgInfoResponse.json() : {};

        // Save to Firestore
        const chatbotRef = adminDb.collection("chatbots").doc(userId);

        await chatbotRef.update({
            "integrations.salesforce": {
                connected: true,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token || "",
                instanceUrl: tokenData.instance_url,
                orgId: orgInfo.organization_id || "",
                connectedAt: new Date().toISOString()
            }
        }).catch(async (err) => {
            if (err.code === 5 || err.code === 'not-found') {
                await chatbotRef.set({
                    integrations: {
                        salesforce: {
                            connected: true,
                            accessToken: tokenData.access_token,
                            refreshToken: tokenData.refresh_token || "",
                            instanceUrl: tokenData.instance_url,
                            orgId: orgInfo.organization_id || "",
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
            instanceUrl: tokenData.instance_url,
            orgId: orgInfo.organization_id 
        }), { status: 200 });

    } catch (error) {
        console.error("Salesforce Connect Error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error", details: String(error) }), { status: 500 });
    }
}
