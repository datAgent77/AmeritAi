import { describe, expect, test } from "vitest";
import { ACTIVE_PRICING_SCENARIO, getPlan, isModuleIncludedInPlan } from "./pricing-config";

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

    test("keeps multi-channel support on pro", () => {
        const proPlan = getPlan("pro");
        expect(proPlan?.highlights).toContain("featureMultiChannel");
    });

    test("includes KVKK consent in all public plans", () => {
        expect(isModuleIncludedInPlan("starter", "kvkkConsent")).toBe(true);
        expect(isModuleIncludedInPlan("growth", "kvkkConsent")).toBe(true);
        expect(isModuleIncludedInPlan("pro", "kvkkConsent")).toBe(true);
        expect(isModuleIncludedInPlan("enterprise", "kvkkConsent")).toBe(true);
    });

    test("includes human handoff in all public plans", () => {
        expect(isModuleIncludedInPlan("starter", "humanHandoff")).toBe(true);
        expect(isModuleIncludedInPlan("growth", "humanHandoff")).toBe(true);
        expect(isModuleIncludedInPlan("pro", "humanHandoff")).toBe(true);
        expect(isModuleIncludedInPlan("enterprise", "humanHandoff")).toBe(true);
    });
});
