import { getAdminDb } from "@/lib/firebase-admin";
import { redirect } from "next/navigation";

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
        const error = searchParams.get("error");

        if (error) {
            return new Response(`Authentication error: ${error}`, { status: 400 });
        }

        if (!code || !state) {
            return new Response("Missing code or state", { status: 400 });
        }

        // Decode state to get userId
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        const userId = stateData.userId;

        if (!userId) {
            return new Response("Invalid state", { status: 400 });
        }

        // Exchange code for tokens
        const clientId = process.env.MICROSOFT_CLIENT_ID;
        const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
        const redirectUri = `${new URL(req.url).origin}/api/integrations/outlook-calendar/callback`;

        const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: clientId!,
                client_secret: clientSecret!,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
                scope: "https://graph.microsoft.com/Calendars.ReadWrite offline_access"
            })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok || !tokenData.access_token) {
            return new Response("Failed to exchange code for tokens", { status: 400 });
        }

        // Get user's calendar info
        const calendarResponse = await fetch("https://graph.microsoft.com/v1.0/me/calendars", {
            headers: { "Authorization": `Bearer ${tokenData.access_token}` }
        });

        const calendarData = calendarResponse.ok ? await calendarResponse.json() : {};
        const primaryCalendar = calendarData.value?.find((cal: any) => cal.isDefaultCalendar) || calendarData.value?.[0];

        // Save to Firestore
        const chatbotRef = adminDb.collection("chatbots").doc(userId);

        await chatbotRef.update({
            "integrations.outlookCalendar": {
                connected: true,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token || "",
                calendarId: primaryCalendar?.id || "calendar",
                connectedAt: new Date().toISOString()
            }
        }).catch(async (err) => {
            if (err.code === 5 || err.code === 'not-found') {
                await chatbotRef.set({
                    integrations: {
                        outlookCalendar: {
                            connected: true,
                            accessToken: tokenData.access_token,
                            refreshToken: tokenData.refresh_token || "",
                            calendarId: primaryCalendar?.id || "calendar",
                            connectedAt: new Date().toISOString()
                        }
                    }
                }, { merge: true });
            } else {
                throw err;
            }
        });

        // Redirect to success page
        return redirect(`/console/chatbot/integration?connected=outlook-calendar`);

    } catch (error) {
        console.error("Outlook Calendar Callback Error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
