import { getAdminDb } from "@/lib/firebase-admin";
import { OutlookCalendarService } from "@/lib/services/outlook-calendar-service";

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

        // Get Outlook Calendar config from Firestore
        const chatbotRef = adminDb.collection("chatbots").doc(userId);
        const chatbotDoc = await chatbotRef.get();

        if (!chatbotDoc.exists) {
            return new Response(JSON.stringify({ error: "Chatbot not found" }), { status: 404 });
        }

        const integrations = chatbotDoc.data()?.integrations;
        const outlookCalendarConfig = integrations?.outlookCalendar;

        if (!outlookCalendarConfig?.connected || !outlookCalendarConfig.accessToken) {
            return new Response(JSON.stringify({ error: "Outlook Calendar not connected" }), { status: 400 });
        }

        // Initialize Outlook Calendar service
        const calendarService = new OutlookCalendarService({
            accessToken: outlookCalendarConfig.accessToken,
            refreshToken: outlookCalendarConfig.refreshToken,
            calendarId: outlookCalendarConfig.calendarId || "calendar"
        });

        // Create event
        const eventId = await calendarService.createEvent({
            subject: eventData.summary || "Appointment",
            body: {
                contentType: "HTML",
                content: eventData.description || ""
            },
            start: eventData.start,
            end: eventData.end,
            location: eventData.location ? {
                displayName: eventData.location
            } : undefined,
            attendees: eventData.attendees || []
        });

        return new Response(JSON.stringify({ success: true, eventId }), { status: 200 });

    } catch (error: any) {
        console.error("Outlook Calendar Event Error:", error);
        return new Response(JSON.stringify({ error: "Failed to create event", details: error.message }), { status: 500 });
    }
}
