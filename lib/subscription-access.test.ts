import { describe, expect, test } from "vitest";
import {
    isPaidVionPlan,
    resolveVionTrialState,
    shouldShowTrialExpiredOverlay,
} from "./subscription-access";

describe("Vion subscription access state", () => {
    test("normalizes legacy pro as a paid Scale plan", () => {
        expect(isPaidVionPlan("pro")).toBe(true);
        expect(isPaidVionPlan("growth")).toBe(true);
        expect(isPaidVionPlan("enterprise")).toBe(true);
        expect(isPaidVionPlan("starter")).toBe(false);
    });

    test("uses the default trial window when trial status has no end date", () => {
        expect(resolveVionTrialState({
            planId: "starter",
            subscriptionStatus: "trial",
            trialEndsAt: null,
        })).toMatchObject({
            isPaidPlan: false,
            isTrialExpired: false,
            trialDaysLeft: 14,
        });
    });

    test("marks an expired trial as blocked outside allowed billing/account paths", () => {
        const state = resolveVionTrialState({
            planId: "starter",
            subscriptionStatus: "trial",
            trialEndsAt: "2026-05-01T00:00:00.000Z",
            now: new Date("2026-05-16T00:00:00.000Z"),
        });

        expect(state).toMatchObject({
            isTrialExpired: true,
            trialDaysLeft: 0,
        });
        expect(shouldShowTrialExpiredOverlay({
            isTrialExpired: state.isTrialExpired,
            subscriptionStatus: "trial",
            pathname: "/console/chatbot",
        })).toBe(true);
        expect(shouldShowTrialExpiredOverlay({
            isTrialExpired: state.isTrialExpired,
            subscriptionStatus: "trial",
            pathname: "/console/settings/subscription",
        })).toBe(false);
    });

    test("bypasses trial expiration for active paid plans", () => {
        const state = resolveVionTrialState({
            planId: "growth",
            subscriptionStatus: "active",
            trialEndsAt: "2026-05-01T00:00:00.000Z",
            now: new Date("2026-05-16T00:00:00.000Z"),
        });

        expect(state).toMatchObject({
            isPaidPlan: true,
            isTrialExpired: false,
            trialDaysLeft: 0,
        });
        expect(shouldShowTrialExpiredOverlay({
            isTrialExpired: state.isTrialExpired,
            subscriptionStatus: "active",
            pathname: "/console/chatbot",
        })).toBe(false);
    });
});
