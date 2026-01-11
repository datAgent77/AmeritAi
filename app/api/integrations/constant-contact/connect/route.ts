import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    const adminDb = getAdminDb();
    try {
        if (!adminDb) {
            return new Response(JSON.stringify({ error: "Firebase Admin not initialized" }), { status: 500 });
        }

        const { userId, apiKey, apiSecret } = await req.json();

        if (!userId || !apiKey || !apiSecret) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
        }

        // Constant Contact OAuth2 flow
        const redirectUri = `${new URL(req.url).origin}/api/integrations/constant-contact/callback`;

        // Generate state token for security
        const state = Buffer.from(JSON.stringify({ userId })).toString('base64');

        // Build OAuth URL
        const authUrl = new URL("https://authz.constantcontact.com/oauth2/default/v1/authorize");
        authUrl.searchParams.set("client_id", apiKey);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", "contact_data offline_access");
        authUrl.searchParams.set("state", state);

        // Store API secret temporarily for callback (in production, use secure storage)
        // For now, we'll pass it in state
        const stateWithSecret = Buffer.from(JSON.stringify({ userId, apiSecret })).toString('base64');
        authUrl.searchParams.set("state", stateWithSecret);

        return new Response(JSON.stringify({ authUrl: authUrl.toString() }), { status: 200 });

    } catch (error) {
        console.error("Constant Contact Connect Error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error", details: String(error) }), { status: 500 });
    }
}
