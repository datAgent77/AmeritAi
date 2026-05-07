import { describe, expect, test } from "vitest";
import {
    ACTIVE_PRICING_SCENARIO,
    formatPlanPrice,
    getModuleUpgradeTarget,
    getPlan,
    getPlanHighlightsSorted,
    getPublicPlansSorted,
    isPreferredPlanBadge,
    isModuleIncludedInPlan,
    normalizePlanId,
    planExists,
    shouldShowPlanPrices
} from "./pricing-config";

describe("pricing plan highlights", () => {
    test("keeps the active pricing scenario on D", () => {
        expect(ACTIVE_PRICING_SCENARIO).toBe("D");
    });

    test("removes customizable widget from starter", () => {
        const starterPlan = getPlan("starter");
        expect(starterPlan?.highlights).not.toContain("featureCustomizableWidget");
    });

    test("removes multi-channel support from growth", () => {
        const growthPlan = getPlan("growth");
        expect(growthPlan?.highlights).not.toContain("featureMultiChannel");
    });

    test("uses exactly three public plans", () => {
        expect(getPublicPlansSorted().map((plan) => plan.planId)).toEqual([
            "starter",
            "growth",
            "enterprise",
        ]);
    });

    test("maps legacy pro to growth", () => {
        expect(normalizePlanId("pro")).toBe("growth");
        expect(normalizePlanId("professional")).toBe("growth");
        expect(normalizePlanId("premium")).toBe("growth");
        expect(planExists("pro")).toBe(true);
        expect(getPlan("pro")?.planId).toBe("growth");
    });

    test("displays growth as Scale while keeping the growth plan id", () => {
        const growthPlan = getPlan("growth");
        expect(growthPlan?.displayName).toBe("Scale");
        expect(growthPlan?.limits.messageLimit).toBe(5000);
        expect(growthPlan?.highlights).toContain("featureMessagesGrowth");
        expect(growthPlan?.highlights).not.toContain("featureUnlimitedMessagesNote");
        expect(isPreferredPlanBadge(growthPlan?.copy.badge)).toBe(true);
    });

    test("keeps appointments live and moves coming-soon enterprise modules last", () => {
        const enterprisePlan = getPlan("enterprise");
        expect(enterprisePlan?.highlights_meta?.coming_soon).not.toContain("featureAppointments");
        expect(enterprisePlan?.highlights).toContain("featureCustomModuleDevelopment");

        const sortedHighlights = enterprisePlan ? getPlanHighlightsSorted(enterprisePlan) : [];
        expect(sortedHighlights.slice(-2)).toEqual(["featureCampaignManager", "featureGamification"]);
    });

    test("includes KVKK consent in all public plans", () => {
        expect(isModuleIncludedInPlan("starter", "kvkkConsent")).toBe(true);
        expect(isModuleIncludedInPlan("growth", "kvkkConsent")).toBe(true);
        expect(isModuleIncludedInPlan("enterprise", "kvkkConsent")).toBe(true);
        expect(isModuleIncludedInPlan("pro", "kvkkConsent")).toBe(true);
    });

    test("includes human handoff in all public plans", () => {
        expect(isModuleIncludedInPlan("starter", "humanHandoff")).toBe(true);
        expect(isModuleIncludedInPlan("growth", "humanHandoff")).toBe(true);
        expect(isModuleIncludedInPlan("enterprise", "humanHandoff")).toBe(true);
        expect(isModuleIncludedInPlan("pro", "humanHandoff")).toBe(true);
    });

    test("keeps legacy pro access aligned with growth", () => {
        expect(isModuleIncludedInPlan("growth", "visualDiagnosis")).toBe(true);
        expect(isModuleIncludedInPlan("growth", "dynamicContext")).toBe(true);
        expect(isModuleIncludedInPlan("growth", "smartShopper")).toBe(true);
        expect(isModuleIncludedInPlan("pro", "visualDiagnosis")).toBe(true);
        expect(isModuleIncludedInPlan("pro", "dynamicContext")).toBe(true);
        expect(isModuleIncludedInPlan("pro", "smartShopper")).toBe(true);
    });

    test("never returns pro as an upgrade target", () => {
        expect(getModuleUpgradeTarget("starter", "salesOptimization")).toBe("growth");
        expect(getModuleUpgradeTarget("growth", "voiceAssistant")).toBe("enterprise");
        expect(getModuleUpgradeTarget("pro", "voiceAssistant")).toBe("enterprise");
        expect(getModuleUpgradeTarget("starter", "leadCollection")).toBeNull();
    });

    test("keeps public plan amounts hidden", () => {
        expect(shouldShowPlanPrices()).toBe(false);
        expect(formatPlanPrice("starter", "monthly", "tr")).toBe("Teklif Alın");
        expect(formatPlanPrice("starter", "monthly", "en")).toBe("Get a Quote");
    });
});
