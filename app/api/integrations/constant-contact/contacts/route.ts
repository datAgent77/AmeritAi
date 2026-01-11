import { getAdminDb } from "@/lib/firebase-admin";
import { ConstantContactService } from "@/lib/services/constant-contact-service";

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

        // Get Constant Contact config from Firestore
        const chatbotRef = adminDb.collection("chatbots").doc(userId);
        const chatbotDoc = await chatbotRef.get();

        if (!chatbotDoc.exists) {
            return new Response(JSON.stringify({ error: "Chatbot not found" }), { status: 404 });
        }

        const integrations = chatbotDoc.data()?.integrations;
        const constantContactConfig = integrations?.constantContact;

        if (!constantContactConfig?.connected || !constantContactConfig.accessToken) {
            return new Response(JSON.stringify({ error: "Constant Contact not connected" }), { status: 400 });
        }

        // Initialize Constant Contact service
        const constantContactService = new ConstantContactService({
            accessToken: constantContactConfig.accessToken,
            refreshToken: constantContactConfig.refreshToken,
            apiKey: constantContactConfig.apiKey || ""
        });

        // Create or update contact
        const contactId = await constantContactService.createOrUpdateContact({
            email_address: leadData.email,
            first_name: leadData.name?.split(' ')[0] || "",
            last_name: leadData.name?.split(' ').slice(1).join(' ') || "",
            phone_number: leadData.phone || "",
            list_memberships: listId ? [listId] : []
        });

        return new Response(JSON.stringify({ success: true, contactId }), { status: 200 });

    } catch (error: any) {
        console.error("Constant Contact Contact Error:", error);
        return new Response(JSON.stringify({ error: "Failed to create contact", details: error.message }), { status: 500 });
    }
}
