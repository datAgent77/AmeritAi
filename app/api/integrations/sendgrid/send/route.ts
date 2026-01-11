import { getAdminDb } from "@/lib/firebase-admin";
import { SendGridService } from "@/lib/services/sendgrid-service";

export async function POST(req: Request) {
    const adminDb = getAdminDb();
    try {
        if (!adminDb) {
            return new Response(JSON.stringify({ error: "Firebase Admin not initialized" }), { status: 500 });
        }

        const { userId, emailData } = await req.json();

        if (!userId || !emailData || !emailData.to || !emailData.subject) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
        }

        // Get SendGrid config from Firestore
        const chatbotRef = adminDb.collection("chatbots").doc(userId);
        const chatbotDoc = await chatbotRef.get();

        if (!chatbotDoc.exists) {
            return new Response(JSON.stringify({ error: "Chatbot not found" }), { status: 404 });
        }

        const integrations = chatbotDoc.data()?.integrations;
        const sendgridConfig = integrations?.sendgrid;

        if (!sendgridConfig?.connected || !sendgridConfig.apiKey || !sendgridConfig.fromEmail) {
            return new Response(JSON.stringify({ error: "SendGrid not connected" }), { status: 400 });
        }

        // Initialize SendGrid service
        const sendgridService = new SendGridService({
            apiKey: sendgridConfig.apiKey,
            fromEmail: sendgridConfig.fromEmail
        });

        // Send email
        const messageId = await sendgridService.sendEmail({
            to: emailData.to,
            subject: emailData.subject,
            html: emailData.html || emailData.text,
            text: emailData.text,
            from: emailData.from || sendgridConfig.fromEmail
        });

        return new Response(JSON.stringify({ success: true, messageId }), { status: 200 });

    } catch (error: any) {
        console.error("SendGrid Send Error:", error);
        return new Response(JSON.stringify({ error: "Failed to send email", details: error.message }), { status: 500 });
    }
}
