import { getAdminDb } from "@/lib/firebase-admin";
import { SalesforceService } from "@/lib/services/salesforce-service";

export async function POST(req: Request) {
    const adminDb = getAdminDb();
    try {
        if (!adminDb) {
            return new Response(JSON.stringify({ error: "Firebase Admin not initialized" }), { status: 500 });
        }

        const { userId, leadData } = await req.json();

        if (!userId || !leadData) {
            return new Response(JSON.stringify({ error: "Missing userId or leadData" }), { status: 400 });
        }

        // Get Salesforce config from Firestore
        const chatbotRef = adminDb.collection("chatbots").doc(userId);
        const chatbotDoc = await chatbotRef.get();

        if (!chatbotDoc.exists) {
            return new Response(JSON.stringify({ error: "Chatbot not found" }), { status: 404 });
        }

        const integrations = chatbotDoc.data()?.integrations;
        const salesforceConfig = integrations?.salesforce;

        if (!salesforceConfig?.connected || !salesforceConfig.accessToken) {
            return new Response(JSON.stringify({ error: "Salesforce not connected" }), { status: 400 });
        }

        // Initialize Salesforce service
        const salesforceService = new SalesforceService({
            accessToken: salesforceConfig.accessToken,
            refreshToken: salesforceConfig.refreshToken,
            instanceUrl: salesforceConfig.instanceUrl,
            orgId: salesforceConfig.orgId
        });

        // Create lead in Salesforce
        const leadId = await salesforceService.createLead({
            FirstName: leadData.name?.split(' ')[0] || leadData.name,
            LastName: leadData.name?.split(' ').slice(1).join(' ') || "",
            Email: leadData.email,
            Phone: leadData.phone,
            Company: leadData.company,
            LeadSource: "Chatbot"
        });

        return new Response(JSON.stringify({ success: true, leadId }), { status: 200 });

    } catch (error: any) {
        console.error("Salesforce Sync Error:", error);
        return new Response(JSON.stringify({ error: "Failed to sync lead", details: error.message }), { status: 500 });
    }
}
