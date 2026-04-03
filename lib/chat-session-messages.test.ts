import { describe, expect, test } from "vitest"
import { hydrateChatSessionMessage, normalizeChatSessionMessage } from "./chat-session-messages"

describe("chat-session-messages", () => {
    test("hydrates legacy message records without guided metadata", () => {
        const message = hydrateChatSessionMessage({
            id: "msg-1",
            role: "assistant",
            content: "Hello",
            createdAt: "2026-03-30T09:00:00.000Z",
        })

        expect(message).toEqual(
            expect.objectContaining({
                id: "msg-1",
                role: "assistant",
                content: "Hello",
            })
        )
        expect(message?.createdAt).toBeInstanceOf(Date)
        expect(message?.guidedUi).toBeUndefined()
        expect(message?.guidedEvent).toBeUndefined()
    })

    test("preserves guided metadata on normalized messages", () => {
        const message = normalizeChatSessionMessage({
            id: "msg-2",
            role: "assistant",
            content: "Select a ticket",
            createdAt: "2026-03-30T09:05:00.000Z",
            guidedUi: {
                type: "guided-step",
                skillId: "flight-ops",
                skillTitle: "Flight operations",
                stepId: "ticket",
                prompt: "Select a ticket",
                presentation: "cards",
                options: [],
                cards: [],
                submit: null,
                cancelLabel: null,
                textMenu: null,
            },
        })

        expect(message?.guidedUi).toEqual(
            expect.objectContaining({
                skillId: "flight-ops",
                stepId: "ticket",
            })
        )
    })

    test("removes undefined guided event fields before persistence", () => {
        const message = normalizeChatSessionMessage({
            id: "msg-3",
            role: "user",
            content: "Test Guided",
            guidedEvent: {
                skillId: "guided-1",
                stepId: undefined,
                optionId: undefined,
                label: "Test Guided",
                source: "shortcut",
            },
        })

        expect(message).toEqual({
            id: "msg-3",
            role: "user",
            content: "Test Guided",
            createdAt: expect.any(String),
            guidedEvent: {
                skillId: "guided-1",
                label: "Test Guided",
                source: "shortcut",
            },
        })
    })
})
