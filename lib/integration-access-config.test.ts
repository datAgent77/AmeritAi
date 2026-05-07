import { describe, expect, test } from "vitest";
import { getIntegrationMinPlan, hasIntegrationAccess } from "./integration-access-config";

describe("integration access configuration", () => {
    test("requires growth for messaging integrations", () => {
        expect(getIntegrationMinPlan("telegram")).toBe("growth");
        expect(getIntegrationMinPlan("whatsapp")).toBe("growth");
        expect(getIntegrationMinPlan("instagram")).toBe("growth");
    });

    test("maps legacy pro-level integrations to growth", () => {
        expect(getIntegrationMinPlan("shopify")).toBe("growth");
        expect(getIntegrationMinPlan("google-calendar")).toBe("growth");
        expect(hasIntegrationAccess("shopify", 2)).toBe(true);
    });

    test("blocks starter plans from growth+ messaging integrations", () => {
        expect(hasIntegrationAccess("telegram", 1)).toBe(false);
        expect(hasIntegrationAccess("whatsapp", 1)).toBe(false);
        expect(hasIntegrationAccess("instagram", 1)).toBe(false);
    });

    test("allows growth plans to use growth+ messaging integrations", () => {
        expect(hasIntegrationAccess("telegram", 2)).toBe(true);
        expect(hasIntegrationAccess("whatsapp", 2)).toBe(true);
        expect(hasIntegrationAccess("instagram", 2)).toBe(true);
    });
});
