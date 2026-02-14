import { getAdminDb } from "@/lib/firebase-admin";
import { authorizeTargetAccess } from "@/lib/api-auth";
import { createOAuthState } from "@/lib/oauth-state";

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

        const access = await authorizeTargetAccess(req, userId);
        if (!access.ok) return access.response;

        // Google OAuth2 configuration
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = `${new URL(req.url).origin}/api/integrations/google-calendar/callback`;

        if (!clientId || !clientSecret) {
            return new Response(JSON.stringify({ 
                error: "Google OAuth not configured",
                message: "Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables. Create OAuth credentials at https://console.cloud.google.com/apis/credentials"
            }), { status: 500 });
        }

        // Use one-time state token stored server-side to prevent tampering/replay.
        const state = await createOAuthState({
            provider: "integration-google-calendar",
            userId
        });

        // Build OAuth URL
        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar");
        authUrl.searchParams.set("access_type", "offline");
        authUrl.searchParams.set("prompt", "consent");
        authUrl.searchParams.set("state", state);

        return new Response(JSON.stringify({ authUrl: authUrl.toString() }), { status: 200 });

    } catch (error) {
        console.error("Google Calendar Connect Error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error", details: String(error) }), { status: 500 });
    }
}
