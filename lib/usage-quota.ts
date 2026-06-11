import * as admin from "firebase-admin";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * Per-chatbot monthly message usage (server-side, Admin SDK).
 * Stored at chatbot_usage/{chatbotId} with a field per month: messages_YYYY-MM.
 *
 * All functions fail OPEN (return 0 / no-op on error) so a usage-tracking
 * problem can never block a customer's widget.
 */
function monthKey(date = new Date()): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function getMonthlyMessageCount(chatbotId: string): Promise<number> {
    const db = getAdminDb();
    if (!db || !chatbotId) return 0;
    try {
        const snap = await db.collection("chatbot_usage").doc(chatbotId).get();
        const data = snap.exists ? snap.data() || {} : {};
        const value = data[`messages_${monthKey()}`];
        return typeof value === "number" ? value : 0;
    } catch {
        return 0;
    }
}

export async function incrementMonthlyMessageCount(chatbotId: string): Promise<void> {
    const db = getAdminDb();
    if (!db || !chatbotId) return;
    try {
        await db.collection("chatbot_usage").doc(chatbotId).set(
            {
                [`messages_${monthKey()}`]: admin.firestore.FieldValue.increment(1),
                updatedAt: new Date().toISOString(),
            },
            { merge: true }
        );
    } catch {
        /* fail-open: never block on usage tracking */
    }
}
