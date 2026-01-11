import { getAdminDb } from "@/lib/firebase-admin";
import { GoogleCalendarService } from "@/lib/services/google-calendar-service";

export async function POST(req: Request) {
    const adminDb = getAdminDb();
    try {
        if (!adminDb) {
            return new Response(JSON.stringify({ error: "Firebase Admin not initialized" }), { status: 500 });
        }

        const { userId, eventData } = await req.json();

        if (!userId || !eventData) {
            return new Response(JSON.stringify({ error: "Missing userId or eventData" }), { status: 400 });
        }

        // Get Google Calendar config from Firestore
        const chatbotRef = adminDb.collection("chatbots").doc(userId);
        const chatbotDoc = await chatbotRef.get();

        if (!chatbotDoc.exists) {
            return new Response(JSON.stringify({ error: "Chatbot not found" }), { status: 404 });
        }

        const integrations = chatbotDoc.data()?.integrations;
        const googleCalendarConfig = integrations?.googleCalendar;

        if (!googleCalendarConfig?.connected || !googleCalendarConfig.accessToken) {
            return new Response(JSON.stringify({ error: "Google Calendar not connected" }), { status: 400 });
        }

        // Initialize Google Calendar service
        const calendarService = new GoogleCalendarService({
            accessToken: googleCalendarConfig.accessToken,
            refreshToken: googleCalendarConfig.refreshToken,
            calendarId: googleCalendarConfig.calendarId || "primary"
        });

        // Create event
        const eventId = await calendarService.createEvent({
            summary: eventData.summary || "Appointment",
            description: eventData.description || "",
            start: eventData.start,
            end: eventData.end,
            location: eventData.location,
            attendees: eventData.attendees || []
        });

        return new Response(JSON.stringify({ success: true, eventId }), { status: 200 });

    } catch (error: any) {
        console.error("Google Calendar Event Error:", error);
        return new Response(JSON.stringify({ error: "Failed to create event", details: error.message }), { status: 500 });
    }
}
