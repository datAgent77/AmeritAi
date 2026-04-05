import { describe, expect, test } from "vitest"
import { getConfiguredCapabilitiesForChannel, resolveCapabilityIdsForChannel } from "./assistant-capabilities"

describe("assistant capability resolution", () => {
    test("falls back to supported capabilities when no settings exist", () => {
        const ids = resolveCapabilityIdsForChannel("voice")
        expect(ids).toContain("generalChatbot")
        expect(ids).toContain("knowledgeBase")
        expect(ids).not.toContain("visualDiagnosis")
    })

    test("filters global capability ids per channel", () => {
        const ids = resolveCapabilityIdsForChannel("voice", {
            enabledCapabilityIds: ["generalChatbot", "visualDiagnosis", "knowledgeBase"],
        })

        expect(ids).toEqual(["generalChatbot", "knowledgeBase"])
    })

    test("honors explicit channel overrides including empty arrays while filtering unavailable modules", () => {
        const voiceIds = resolveCapabilityIdsForChannel("voice", {
            enabledCapabilityIds: ["generalChatbot", "knowledgeBase"],
            channelCapabilityOverrides: {
                voice: [],
                web: ["generalChatbot", "gamification"],
            },
        })
        const webCapabilities = getConfiguredCapabilitiesForChannel("web", {
            enabledCapabilityIds: ["generalChatbot"],
            channelCapabilityOverrides: {
                web: ["generalChatbot", "gamification"],
            },
        })

        expect(voiceIds).toEqual([])
        expect(webCapabilities.map((capability) => capability.id)).toEqual(["generalChatbot"])
    })
})
