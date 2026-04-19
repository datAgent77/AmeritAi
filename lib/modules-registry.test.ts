import { describe, expect, test } from "vitest"
import { getModule, ORDERED_MODULES } from "./modules-registry"

describe("modules registry", () => {
    test("registers human handoff as a configurable module", () => {
        expect(getModule("humanHandoff")).toMatchObject({
            id: "humanHandoff",
            legacyFirestoreField: "enableHumanHandoff",
            isCore: false,
            isPremium: false,
            status: "ready",
            defaultEnabledBySector: [],
        })
    })

    test("renders human handoff in the ordered module list", () => {
        expect(ORDERED_MODULES.map((module) => module.id)).toContain("humanHandoff")
    })
})
