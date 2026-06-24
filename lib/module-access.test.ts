import { describe, expect, test } from "vitest";
import { getModuleAccess } from "./module-access";

describe("AmeritAI module access matrix", () => {
    test("keeps core modules available and non-toggleable on starter", () => {
        expect(getModuleAccess("starter", "generalChatbot", "ecommerce")).toMatchObject({
            status: "core",
            badge: "core",
            canToggle: false,
            isLocked: false,
            isCore: true,
        });

        expect(getModuleAccess("starter", "knowledgeBase", "restaurant")).toMatchObject({
            status: "core",
            badge: "core",
            canToggle: false,
            isLocked: false,
            isCore: true,
        });
    });

    test("locks Scale modules for starter users with a growth upgrade target", () => {
        expect(getModuleAccess("starter", "productCatalog", "ecommerce")).toMatchObject({
            status: "upgrade_required",
            canToggle: false,
            isLocked: true,
            upgradeTarget: "growth",
        });
    });

    test("allows growth users to toggle included Scale modules", () => {
        expect(getModuleAccess("growth", "productCatalog", "ecommerce")).toMatchObject({
            status: "included",
            badge: "included",
            canToggle: true,
            isLocked: false,
            upgradeTarget: null,
        });

        expect(getModuleAccess("pro", "smartShopper", "ecommerce")).toMatchObject({
            status: "included",
            canToggle: true,
            isLocked: false,
            upgradeTarget: null,
        });
    });

    test("keeps Enterprise-only voice locked on growth and open on enterprise", () => {
        expect(getModuleAccess("growth", "voiceAssistant", "service")).toMatchObject({
            status: "upgrade_required",
            canToggle: false,
            isLocked: true,
            upgradeTarget: "enterprise",
        });

        expect(getModuleAccess("enterprise", "voiceAssistant", "service")).toMatchObject({
            status: "included",
            canToggle: true,
            isLocked: false,
            upgradeTarget: null,
        });
    });

    test("marks coming soon modules locked even when the plan can access all modules", () => {
        expect(getModuleAccess("enterprise", "campaignManager", "ecommerce")).toMatchObject({
            status: "upgrade_required",
            canToggle: false,
            isLocked: true,
            isComingSoon: true,
        });
    });
});
