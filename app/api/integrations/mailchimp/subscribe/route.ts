import { getAdminDb } from "@/lib/firebase-admin";
import { MailchimpService } from "@/lib/services/mailchimp-service";

export async function POST(req: Request) {
    const adminDb = getAdminDb();
    try {
        if (!adminDb) {
            return new Response(JSON.stringify({ error: "Firebase Admin not initialized" }), { status: 500 });
        }

        const { userId, leadData, listId } = await req.json();

        if (!userId || !leadData || !leadData.email) {
            return new Response(JSON.stringify({ error: "Missing userId or leadData with email" }), { status: 400 });
        }

        // Get Mailchimp config from Firestore
        const chatbotRef = adminDb.collection("chatbots").doc(userId);
        const chatbotDoc = await chatbotRef.get();

        if (!chatbotDoc.exists) {
            return new Response(JSON.stringify({ error: "Chatbot not found" }), { status: 404 });
        }

        const integrations = chatbotDoc.data()?.integrations;
        const mailchimpConfig = integrations?.mailchimp;

        if (!mailchimpConfig?.connected || !mailchimpConfig.apiKey || !mailchimpConfig.serverPrefix) {
            return new Response(JSON.stringify({ error: "Mailchimp not connected" }), { status: 400 });
        }

        // Initialize Mailchimp service
        const mailchimpService = new MailchimpService({
            apiKey: mailchimpConfig.apiKey,
            serverPrefix: mailchimpConfig.serverPrefix
        });

        // Subscribe lead to list
        const targetListId = listId || mailchimpConfig.defaultListId;
        if (!targetListId) {
            return new Response(JSON.stringify({ error: "No list ID specified" }), { status: 400 });
        }

        const memberId = await mailchimpService.addOrUpdateMember(targetListId, {
            email_address: leadData.email,
            status: "subscribed",
            merge_fields: {
                FNAME: leadData.name?.split(' ')[0] || "",
                LNAME: leadData.name?.split(' ').slice(1).join(' ') || "",
                PHONE: leadData.phone || ""
            }
        });

        return new Response(JSON.stringify({ success: true, memberId }), { status: 200 });

    } catch (error: any) {
        console.error("Mailchimp Subscribe Error:", error);
        return new Response(JSON.stringify({ error: "Failed to subscribe", details: error.message }), { status: 500 });
    }
}
