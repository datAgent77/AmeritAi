import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    const adminDb = getAdminDb();
    try {
        if (!adminDb) {
            return new Response(JSON.stringify({ error: "Firebase Admin not initialized" }), { status: 500 });
        }

        const { userId } = await req.json();

        if (!userId) {
            return new Response(JSON.stringify({ error: "Missing userId" }), { status: 400 });
        }

        // Microsoft OAuth2 configuration
        const clientId = process.env.MICROSOFT_CLIENT_ID;
        const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
        const redirectUri = `${new URL(req.url).origin}/api/integrations/outlook-calendar/callback`;

        if (!clientId || !clientSecret) {
            return new Response(JSON.stringify({ 
                error: "Microsoft OAuth not configured",
                message: "Please configure MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in your environment variables. Register your app at https://portal.azure.com/ to get these credentials."
            }), { status: 500 });
        }

        // Generate state token for security
        const state = Buffer.from(JSON.stringify({ userId })).toString('base64');

        // Build OAuth URL for Microsoft Graph API
        const authUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", "https://graph.microsoft.com/Calendars.ReadWrite offline_access");
        authUrl.searchParams.set("response_mode", "query");
        authUrl.searchParams.set("state", state);

        return new Response(JSON.stringify({ authUrl: authUrl.toString() }), { status: 200 });

    } catch (error) {
        console.error("Outlook Calendar Connect Error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error", details: String(error) }), { status: 500 });
    }
}
