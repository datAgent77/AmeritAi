import { getAdminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

// Pricing per 1M tokens (USD)
const PRICING = {
    "gpt-3.5-turbo": { input: 0.50, output: 1.50 },
    "gpt-4o": { input: 5.00, output: 15.00 },
    "gpt-4o-mini": { input: 0.15, output: 0.60 },
    "gpt-4-turbo": { input: 10.00, output: 30.00 },
    "gemini-1.5-pro": { input: 3.50, output: 10.50 }, // Approx
    "gemini-1.5-flash": { input: 0.075, output: 0.30 }, // Approx
    "default": { input: 1.00, output: 2.00 }
};

export async function trackAiUsage(
    chatbotId: string,
    inputTokens: number,
    outputTokens: number,
    model: string = "gpt-3.5-turbo"
) {
    try {
        // Runs server-side (API routes): must use the Admin SDK, which bypasses
        // Firestore security rules. The client SDK has no authenticated user here
        // and would be denied with PERMISSION_DENIED.
        const adminDb = getAdminDb();
        if (!adminDb) {
            console.warn("[UsageTracker] Admin DB not initialized, skipping usage tracking.");
            return;
        }

        const modelPrice = PRICING[model as keyof typeof PRICING] || PRICING["default"];

        const inputCost = (inputTokens / 1_000_000) * modelPrice.input;
        const outputCost = (outputTokens / 1_000_000) * modelPrice.output;
        const totalCost = inputCost + outputCost;

        const increment = admin.firestore.FieldValue.increment;

        // Global aggregate stats
        await adminDb.collection("system_stats").doc("ai_usage").set({
            totalInputTokens: increment(inputTokens),
            totalOutputTokens: increment(outputTokens),
            totalCost: increment(totalCost),
            totalApiCalls: increment(1),
            lastUpdated: new Date().toISOString()
        }, { merge: true });

        // Per-chatbot usage (so each tenant's consumption can be measured)
        if (chatbotId) {
            await adminDb.collection("chatbot_usage").doc(chatbotId).set({
                chatbotId,
                totalInputTokens: increment(inputTokens),
                totalOutputTokens: increment(outputTokens),
                totalCost: increment(totalCost),
                totalApiCalls: increment(1),
                lastUpdated: new Date().toISOString()
            }, { merge: true });
        }

        console.log(`[UsageTracker] Tracked ${inputTokens}in/${outputTokens}out ($${totalCost.toFixed(6)}) for ${model}`);

    } catch (error) {
        console.error("[UsageTracker] Failed to track usage:", error);
        // Non-blocking error, we don't want to fail the chat flow
    }
}
