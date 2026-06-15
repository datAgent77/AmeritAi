import { describe, expect, test } from "vitest"
import { getDefaultModulesForPlan } from "./onboarding-intelligence"
import { ACTIVE_PRICING_SCENARIO } from "./pricing-config"
import { isModuleAvailableForSector } from "./modules-registry"

/**
 * Regression tests for F1 + F2:
 * buildDefaultModules must seed onboarding from the plan's `defaultEnabled` set
 * (NOT the full `included` list), only add sector defaults that the plan includes,
 * and never enable modules incompatible with the tenant's sector.
 *
 * These assertions assume the active pricing scenario is "D".
 */
describe("onboarding default modules (plan + sector gating)", () => {
    test("active scenario is D (assumption guard)", () => {
        expect(ACTIVE_PRICING_SCENARIO).toBe("D")
    })

    test("Starter + restaurant does NOT auto-enable premium digitalWaiter", () => {
        const mods = getDefaultModulesForPlan("starter", "restaurant")
        // digitalWaiter is premium and NOT in the starter plan -> must be excluded
        expect(mods).not.toContain("digitalWaiter")
        // starter.defaultEnabled core set is preserved
        expect(mods).toContain("generalChatbot")
        expect(mods).toContain("leadCollection")
    })

    test("Starter + ecommerce does NOT auto-enable productCatalog (not in plan)", () => {
        const mods = getDefaultModulesForPlan("starter", "ecommerce")
        expect(mods).not.toContain("productCatalog")
        expect(mods).toContain("generalChatbot")
        expect(mods).toContain("leadCollection")
    })

    test("Growth + ecommerce enables plan defaults + baseline, not the whole included list", () => {
        const mods = getDefaultModulesForPlan("growth", "ecommerce")
        // growth.defaultEnabled set is present...
        expect(mods).toContain("generalChatbot")
        expect(mods).toContain("productCatalog")
        expect(mods).toContain("salesOptimization")
        // regression: previously the full `included` list leaked in by default
        expect(mods).not.toContain("visualDiagnosis")
        expect(mods).not.toContain("digitalWaiter")
        expect(mods).not.toContain("smartShopper")
    })

    test("Growth + saas drops sector-incompatible plan defaults (productCatalog)", () => {
        const mods = getDefaultModulesForPlan("growth", "saas")
        // productCatalog supports only ecommerce/restaurant/real_estate -> filtered out for saas
        expect(mods).not.toContain("productCatalog")
        // salesOptimization supports saas -> kept; core always kept
        expect(mods).toContain("salesOptimization")
        expect(mods).toContain("generalChatbot")
    })

    test("Enterprise + ecommerce seeds in-plan sector defaults via the 'all' sentinel", () => {
        const mods = getDefaultModulesForPlan("enterprise", "ecommerce")
        // enterprise.defaultEnabled is empty, but 'all' includes productCatalog and it suits ecommerce
        expect(mods).toContain("productCatalog")
    })

    test("legacy 'pro' planId behaves like growth", () => {
        const pro = getDefaultModulesForPlan("pro", "ecommerce")
        const growth = getDefaultModulesForPlan("growth", "ecommerce")
        expect(new Set(pro)).toEqual(new Set(growth))
    })

    test("every default module is compatible with the tenant's sector", () => {
        for (const sector of ["ecommerce", "restaurant", "saas", "service"] as const) {
            for (const plan of ["starter", "growth", "enterprise"] as const) {
                for (const moduleId of getDefaultModulesForPlan(plan, sector)) {
                    expect(isModuleAvailableForSector(moduleId, sector)).toBe(true)
                }
            }
        }
    })
})
