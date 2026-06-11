import { getAdminDb } from "@/lib/firebase-admin";
import { normalizePlanId } from "@/lib/pricing-config";

export interface SubscriptionSyncInput {
    /** Firebase uid of the subscribing user (also the chatbot/tenant id). */
    uid: string;
    /** Plan key to apply (starter | growth | enterprise). Optional. */
    planId?: string | null;
    /** Already-mapped VionSubscriptionStatus (e.g. "active", "cancelled"). */
    status: string | null;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
}

/**
 * Applies a Stripe-driven subscription change to the user (and mirrors plan onto
 * the chatbot doc). Writes the same fields the rest of the app reads:
 * planId / plan / subscriptionStatus / entitlements.planId.
 *
 * Uses set(..., { merge: true }) so it is safe even if a field is absent.
 */
export async function applySubscriptionToUser(input: SubscriptionSyncInput): Promise<void> {
    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin not initialized");
    if (!input.uid) throw new Error("Missing uid for subscription sync");

    const normalizedPlan = input.planId ? normalizePlanId(input.planId) : null;

    const userUpdate: Record<string, any> = {
        subscriptionUpdatedAt: new Date().toISOString(),
    };
    if (input.status) {
        userUpdate.subscriptionStatus = input.status;
    }
    if (normalizedPlan) {
        userUpdate.planId = normalizedPlan;
        userUpdate.plan = normalizedPlan;
        // Nested-merge form (avoids dotted-key pitfalls with set+merge).
        userUpdate.entitlements = { planId: normalizedPlan };
    }
    if (input.stripeCustomerId) userUpdate.stripeCustomerId = input.stripeCustomerId;
    if (input.stripeSubscriptionId) userUpdate.stripeSubscriptionId = input.stripeSubscriptionId;

    await db.collection("users").doc(input.uid).set(userUpdate, { merge: true });

    if (normalizedPlan) {
        await db.collection("chatbots").doc(input.uid).set({ plan: normalizedPlan }, { merge: true });
    }
}
