import { describe, expect, test } from "vitest"
import { getOmniNavGroups, getOmniPageDefinition, getOmniTopLevelItems, isKnownOmniPage } from "@/lib/omni/navigation"

const t = (key: string) => key

describe("omni navigation", () => {
    test("registers the channels overview route", () => {
        expect(isKnownOmniPage("/omni/channels")).toBe(true)
        expect(getOmniPageDefinition("/omni/channels", t as any)?.specialView).toBe("channels-overview")
    })

    test("shows channels overview inside the channels group", () => {
        const groups = getOmniNavGroups(t as any, ["channels.view"] as any)
        const channelsGroup = groups.find((group) => group.id === "channels")
        expect(channelsGroup?.title).toBe("omni.nav.channels")
        expect(channelsGroup?.items[0]?.href).toBe("/omni/channels")
    })

    test("does not show settings as a top-level nav item", () => {
        const topLevelItems = getOmniTopLevelItems(t as any, [
            "dashboard.view",
            "analytics.view",
            "settings.view",
        ] as any)
        expect(topLevelItems.map((item) => item.href)).toEqual(["/omni", "/omni/analytics"])
    })
})
