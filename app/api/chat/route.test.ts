import { beforeEach, describe, expect, test, vi } from "vitest"
import { POST } from "./route"
import { getAdminDb } from "@/lib/firebase-admin"
import { generateAIResponse, saveMessageToSession } from "@/lib/ai-service"
import { upsertChatSessionRecord } from "@/lib/chat-sessions"
import { resolveGuidedSkillTurn } from "@/lib/guided-skills/engine"
import { checkRateLimit } from "@/lib/rate-limiter"

vi.mock("@/lib/firebase-admin", () => ({
    getAdminDb: vi.fn(),
}))

vi.mock("@/lib/ai-service", () => ({
    generateAIResponse: vi.fn(),
    saveMessageToSession: vi.fn(),
    analyzeSentiment: vi.fn(),
}))

vi.mock("@/lib/chat-sessions", () => ({
    upsertChatSessionRecord: vi.fn(),
}))

vi.mock("@/lib/guided-skills/engine", () => ({
    resolveGuidedSkillTurn: vi.fn(),
}))

vi.mock("@/lib/rate-limiter", () => ({
    checkRateLimit: vi.fn(),
    getRateLimitHeaders: vi.fn().mockReturnValue({}),
}))

function createAdminDb() {
    return {
        collection: vi.fn().mockImplementation((name: string) => {
            if (name !== "chat_sessions") {
                throw new Error(`Unexpected collection: ${name}`)
            }

            return {
                doc: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue({
                        exists: true,
                        data: () => ({
                            guidedSkillState: null,
                        }),
                    }),
                }),
            }
        }),
    }
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAdminDb).mockReturnValue(createAdminDb() as any)
    vi.mocked(checkRateLimit).mockReturnValue({
        allowed: true,
        reason: null,
        remaining: 10,
        resetAt: Date.now() + 60_000,
    } as any)
})

describe("POST /api/chat", () => {
    test("returns a structured guided response before falling back to AI generation", async () => {
        vi.mocked(resolveGuidedSkillTurn).mockResolvedValue({
            handled: true,
            assistantContent: "Select a ticket",
            assistantGuidedUi: {
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
            nextState: {
                skillId: "flight-ops",
                stepId: "ticket",
                selections: {},
                channel: "web",
                status: "active",
                startedAt: "2026-03-30T10:00:00.000Z",
                updatedAt: "2026-03-30T10:00:00.000Z",
            },
        } as any)

        const response = await POST(
            new Request("http://localhost/api/chat", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    chatbotId: "tenant-1",
                    sessionId: "sess-1",
                    shouldStream: true,
                    assistantMessageId: "assistant-guided-1",
                    messages: [
                        {
                            id: "user-1",
                            role: "user",
                            content: "check-in",
                        },
                    ],
                    guidedEvent: {
                        skillId: "flight-ops",
                        label: "Check-in",
                        source: "shortcut",
                    },
                }),
            })
        )

        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload).toEqual(
            expect.objectContaining({
                content: "Select a ticket",
                assistantMessageId: "assistant-guided-1",
                guidedUi: expect.objectContaining({
                    skillId: "flight-ops",
                    stepId: "ticket",
                }),
                guidedSkillState: expect.objectContaining({
                    skillId: "flight-ops",
                    stepId: "ticket",
                }),
            })
        )
        expect(saveMessageToSession).toHaveBeenCalledWith(
            "sess-1",
            "tenant-1",
            expect.objectContaining({
                id: "user-1",
                role: "user",
                content: "check-in",
                guidedEvent: expect.objectContaining({
                    skillId: "flight-ops",
                }),
            }),
            undefined
        )
        expect(upsertChatSessionRecord).toHaveBeenCalledWith(
            expect.objectContaining({
                sessionId: "sess-1",
                chatbotId: "tenant-1",
                guidedSkillState: expect.objectContaining({
                    skillId: "flight-ops",
                    stepId: "ticket",
                }),
                message: expect.objectContaining({
                    id: "assistant-guided-1",
                    role: "assistant",
                    content: "Select a ticket",
                }),
            })
        )
        expect(generateAIResponse).not.toHaveBeenCalled()
    })

    test("creates a session id for guided starts when the client has not initialized one yet", async () => {
        vi.mocked(resolveGuidedSkillTurn).mockResolvedValue({
            handled: true,
            assistantContent: "Select a ticket",
            assistantGuidedUi: {
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
            nextState: {
                skillId: "flight-ops",
                stepId: "ticket",
                selections: {},
                channel: "web",
                status: "active",
                startedAt: "2026-03-30T10:00:00.000Z",
                updatedAt: "2026-03-30T10:00:00.000Z",
            },
        } as any)

        const response = await POST(
            new Request("http://localhost/api/chat", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    chatbotId: "tenant-1",
                    shouldStream: true,
                    assistantMessageId: "assistant-guided-2",
                    messages: [
                        {
                            id: "user-1",
                            role: "user",
                            content: "check-in",
                        },
                    ],
                    guidedEvent: {
                        skillId: "flight-ops",
                        label: "Check-in",
                        source: "shortcut",
                    },
                }),
            })
        )

        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.sessionId).toMatch(/^sess-/)
        expect(saveMessageToSession).toHaveBeenCalledWith(
            payload.sessionId,
            "tenant-1",
            expect.objectContaining({
                role: "user",
                content: "check-in",
            }),
            undefined
        )
        expect(resolveGuidedSkillTurn).toHaveBeenCalledWith(
            expect.objectContaining({
                sessionId: payload.sessionId,
                chatbotId: "tenant-1",
            })
        )
        expect(upsertChatSessionRecord).toHaveBeenCalledWith(
            expect.objectContaining({
                sessionId: payload.sessionId,
            })
        )
    })
})
