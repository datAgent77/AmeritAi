import { describe, expect, test } from "vitest"
import { filterSuggestedQuestions, shouldShowClassicEntryOnboarding } from "./classic-entry-onboarding"

describe("shouldShowClassicEntryOnboarding", () => {
    test("shows onboarding in classic mode when enabled and user has not sent a message", () => {
        expect(
            shouldShowClassicEntryOnboarding({
                chatDisplayMode: "classic",
                enableClassicEntryOnboarding: true,
                hasUserMessage: false,
            }),
        ).toBe(true)
    })

    test("shows onboarding by default when the toggle is undefined", () => {
        expect(
            shouldShowClassicEntryOnboarding({
                chatDisplayMode: "classic",
                hasUserMessage: false,
            }),
        ).toBe(true)
    })

    test("hides onboarding in ambient mode", () => {
        expect(
            shouldShowClassicEntryOnboarding({
                chatDisplayMode: "ambient",
                enableClassicEntryOnboarding: true,
                hasUserMessage: false,
            }),
        ).toBe(false)
    })

    test("hides onboarding when disabled from settings", () => {
        expect(
            shouldShowClassicEntryOnboarding({
                chatDisplayMode: "classic",
                enableClassicEntryOnboarding: false,
                hasUserMessage: false,
            }),
        ).toBe(false)
    })

    test("hides onboarding after first user message", () => {
        expect(
            shouldShowClassicEntryOnboarding({
                chatDisplayMode: "classic",
                enableClassicEntryOnboarding: true,
                hasUserMessage: true,
            }),
        ).toBe(false)
    })

    test("hides onboarding after an assistant-only quick action message", () => {
        expect(
            shouldShowClassicEntryOnboarding({
                chatDisplayMode: "classic",
                enableClassicEntryOnboarding: true,
                hasUserMessage: false,
                hasMessages: true,
            }),
        ).toBe(false)
    })
})

describe("filterSuggestedQuestions", () => {
    test("returns cleaned list when query is empty", () => {
        expect(filterSuggestedQuestions(["  Pricing  ", "", "  ", "Contact us"], "")).toEqual([
            "Pricing",
            "Contact us",
        ])
    })

    test("filters questions case-insensitively", () => {
        expect(
            filterSuggestedQuestions(
                ["How do I get started?", "Pricing plans", "Contact support"],
                "PRIC",
            ),
        ).toEqual(["Pricing plans"])
    })
})
