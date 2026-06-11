import Stripe from "stripe";

/**
 * Lazily-initialised Stripe client. Returns null when STRIPE_SECRET_KEY is not
 * configured so routes can degrade gracefully (503) instead of throwing.
 */
let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    if (!key) return null;
    if (!stripeClient) {
        // apiVersion intentionally omitted -> uses the account's default version,
        // which avoids coupling the build to a specific pinned literal type.
        stripeClient = new Stripe(key);
    }
    return stripeClient;
}

/**
 * Map of plan keys -> Stripe Price IDs, sourced from env. Keys match the app's
 * canonical PublicPlanId values (see lib/pricing-config: starter | growth |
 * enterprise). Add/adjust by setting the corresponding STRIPE_PRICE_<PLAN> var.
 */
export const STRIPE_PRICE_BY_PLAN: Record<string, string | undefined> = {
    starter: process.env.STRIPE_PRICE_STARTER,
    growth: process.env.STRIPE_PRICE_GROWTH,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
};

export function resolvePriceId(plan: string): string | null {
    const id = STRIPE_PRICE_BY_PLAN[plan];
    return id && id.trim() ? id.trim() : null;
}

export function listConfiguredPlans(): string[] {
    return Object.entries(STRIPE_PRICE_BY_PLAN)
        .filter(([, id]) => Boolean(id && id.trim()))
        .map(([plan]) => plan);
}

/**
 * Reverse lookup: Stripe Price ID -> plan key. Used by the webhook as a
 * fallback when subscription metadata does not carry the plan.
 */
export function planForPriceId(priceId: string | null | undefined): string | null {
    if (!priceId) return null;
    for (const [plan, id] of Object.entries(STRIPE_PRICE_BY_PLAN)) {
        if (id && id.trim() === priceId) return plan;
    }
    return null;
}

/**
 * Maps a Stripe subscription.status to the app's VionSubscriptionStatus values.
 */
export function mapStripeStatus(stripeStatus: string | null | undefined): string | null {
    switch (stripeStatus) {
        case "active":
            return "active";
        case "trialing":
            return "trial";
        case "past_due":
            return "past_due";
        case "unpaid":
            return "unpaid";
        case "canceled":
            return "cancelled";
        default:
            // incomplete / incomplete_expired / paused / unknown -> no change signal
            return null;
    }
}
