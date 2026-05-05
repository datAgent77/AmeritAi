import { getAdminDb } from "./firebase-admin";

export async function processWaiterRequestsFromAi({
    chatbotId,
    sessionId,
    content,
    context
}: {
    chatbotId: string;
    sessionId: string;
    content: string;
    context?: any;
}) {
    const isCallStaff = content.includes('[CALL_STAFF]');
    const isRequestBill = content.includes('[REQUEST_BILL]');

    if (!isCallStaff && !isRequestBill) return;

    const adminDb = getAdminDb();
    if (!adminDb) return;

    // Extract table number from context
    let masaNo = "0"; // Default or unknown
    
    if (context?.url) {
        try {
            const url = new URL(context.url);
            masaNo = url.searchParams.get("masa") || url.searchParams.get("table") || "0";
        } catch (e) {
            // URL parsing failed, check dynamicData
        }
    }

    if (masaNo === "0" && context?.dynamicData?.masa) {
        masaNo = String(context.dynamicData.masa);
    }

    // Record the request
    const requestData = {
        chatbotId,
        sessionId,
        masaNo,
        type: isCallStaff ? 'call_staff' : 'request_bill',
        status: 'pending',
        createdAt: new Date().toISOString(),
        note: `AI tarafından otomatik oluşturuldu: ${isCallStaff ? 'Garson Çağır' : 'Hesap İste'}`
    };

    try {
        await adminDb.collection("waiter_requests").add(requestData);
        console.log(`[WAITER REQUEST] Recorded ${requestData.type} for table ${masaNo}`);
    } catch (error) {
        console.error("[WAITER REQUEST] Failed to record request:", error);
    }
}
