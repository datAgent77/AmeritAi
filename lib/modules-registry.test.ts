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

    test("registers survey manager as an explicit opt-in module", () => {
        expect(getModule("surveyManager")).toMatchObject({
            id: "surveyManager",
            legacyFirestoreField: "enableSurveyManager",
            isCore: false,
            isPremium: false,
            status: "ready",
            defaultEnabledBySector: [],
        })
    })
})
