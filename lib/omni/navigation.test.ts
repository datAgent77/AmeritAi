import { describe, expect, test } from "vitest"
import { getOmniLegacyRedirect, getOmniNavGroups, getOmniPageDefinition, getOmniTopLevelItems, isKnownOmniPage } from "@/lib/omni/navigation"

const t = (key: string) => key

describe("omni navigation", () => {
    test("registers the new integrations route", () => {
        expect(isKnownOmniPage("/omni/integrations")).toBe(true)
        expect(getOmniPageDefinition("/omni/integrations", t as any)?.specialView).toBe("channels-overview")
    })

    test("shows deploy items inside the deploy group", () => {
        const groups = getOmniNavGroups(t as any, ["channels.view"] as any)
        const deployGroup = groups.find((group) => group.id === "deploy")
        expect(deployGroup?.items[0]?.href).toBe("/omni/deploy/web-widget")
    })

    test("shows only home as a top-level nav item", () => {
        const topLevelItems = getOmniTopLevelItems(t as any, [
            "dashboard.view",
            "analytics.view",
            "settings.view",
        ] as any)
        expect(topLevelItems.map((item) => item.href)).toEqual(["/omni"])
    })

    test("maps legacy omni paths into the new shell", () => {
        expect(getOmniLegacyRedirect("/omni/channels/voice-calls")).toBe("/omni/deploy/voice")
        expect(getOmniLegacyRedirect("/omni/ai-core/actions")).toBe("/omni/tools")
    })
})
