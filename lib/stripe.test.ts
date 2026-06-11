import { describe, expect, test } from "vitest";
import { mapStripeStatus, planForPriceId, resolvePriceId, listConfiguredPlans } from "./stripe";

describe("stripe helpers", () => {
    test("maps Stripe subscription statuses to app statuses", () => {
        expect(mapStripeStatus("active")).toBe("active");
        expect(mapStripeStatus("trialing")).toBe("trial");
        expect(mapStripeStatus("past_due")).toBe("past_due");
        expect(mapStripeStatus("unpaid")).toBe("unpaid");
        expect(mapStripeStatus("canceled")).toBe("cancelled");
        // Unhandled/transitional statuses signal "no change".
        expect(mapStripeStatus("incomplete")).toBeNull();
        expect(mapStripeStatus("paused")).toBeNull();
        expect(mapStripeStatus(undefined)).toBeNull();
        expect(mapStripeStatus(null)).toBeNull();
    });

    test("planForPriceId returns null for unknown/empty ids", () => {
        expect(planForPriceId(null)).toBeNull();
        expect(planForPriceId(undefined)).toBeNull();
        expect(planForPriceId("price_not_configured")).toBeNull();
    });

    test("resolvePriceId returns null when plan/env not configured", () => {
        // STRIPE_PRICE_* are unset in the test environment.
        expect(resolvePriceId("growth")).toBeNull();
        expect(resolvePriceId("does-not-exist")).toBeNull();
    });

    test("listConfiguredPlans is empty when no price envs are set", () => {
        expect(listConfiguredPlans()).toEqual([]);
    });
});
