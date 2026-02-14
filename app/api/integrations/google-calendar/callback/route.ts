import { getAdminDb } from "@/lib/firebase-admin";
import { redirect } from "next/navigation";
import { consumeOAuthState } from "@/lib/oauth-state";

export const dynamic = 'force-dynamic';

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

        const stateData = await consumeOAuthState(state, "integration-google-calendar");
        const userId = stateData?.userId;

        if (!userId) {
            return new Response("Invalid state", { status: 400 });
        }

        // Exchange code for tokens
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = `${new URL(req.url).origin}/api/integrations/google-calendar/callback`;

        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: clientId!,
                client_secret: clientSecret!,
                redirect_uri: redirectUri,
                grant_type: "authorization_code"
            })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok || !tokenData.access_token) {
            return new Response("Failed to exchange code for tokens", { status: 400 });
        }

        // Get user's calendar info
        const calendarResponse = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList/primary", {
            headers: { "Authorization": `Bearer ${tokenData.access_token}` }
        });

        const calendarData = calendarResponse.ok ? await calendarResponse.json() : {};
        const calendarId = calendarData.id || "primary";

        // Save to Firestore
        const chatbotRef = adminDb.collection("chatbots").doc(userId);

        await chatbotRef.update({
            "integrations.googleCalendar": {
                connected: true,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token || "",
                calendarId: calendarId,
                connectedAt: new Date().toISOString()
            }
        }).catch(async (err) => {
            if (err.code === 5 || err.code === 'not-found') {
                await chatbotRef.set({
                    integrations: {
                        googleCalendar: {
                            connected: true,
                            accessToken: tokenData.access_token,
                            refreshToken: tokenData.refresh_token || "",
                            calendarId: calendarId,
                            connectedAt: new Date().toISOString()
                        }
                    }
                }, { merge: true });
            } else {
                throw err;
            }
        });

        // Redirect to success page
        return redirect(`/console/chatbot/integration?connected=google-calendar`);

    } catch (error) {
        console.error("Google Calendar Callback Error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
