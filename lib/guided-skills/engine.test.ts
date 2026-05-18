import { beforeEach, describe, expect, test, vi } from "vitest"
import { resolveGuidedSkillTurn } from "./engine"
import type { GuidedSkillRecord, GuidedSkillState } from "./types"
import { executeVionGuidedAction } from "@/lib/vion-guided-actions"

vi.mock("@/lib/vion-guided-actions", () => ({
    executeVionGuidedAction: vi.fn(),
}))

function createAdminDb(skills: GuidedSkillRecord[], opts?: { enableGuided?: boolean }) {
    return {
        collection: vi.fn().mockImplementation((name: string) => {
            if (name === "guided_skills") {
                return {
                    where: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue({
                            docs: skills.map((skill) => ({
                                id: skill.id,
                                data: () => skill,
                            })),
                        }),
                    }),
                }
            }

            if (name === "chatbots") {
                return {
                    doc: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue({
                            exists: true,
                            data: () => ({ enableGuided: opts?.enableGuided ?? true }),
                        }),
                    }),
                }
            }

            return {
                doc: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue({ exists: false }),
                }),
            }
        }),
    }
}

function createSkill(overrides?: Partial<GuidedSkillRecord>): GuidedSkillRecord {
    return {
        id: "flight-ops",
        chatbotId: "tenant-1",
        title: "Flight operations",
        description: "Manage flight follow-up steps.",
        enabled: true,
        channels: ["web", "whatsapp", "instagram"],
        startStepId: "action",
        startAliases: ["flight help", "ucak bileti"],
        steps: [
            {
                id: "action",
                prompt: "What would you like to do?",
                presentation: "chips",
                options: [
                    {
                        id: "checkin",
                        label: "Check-in",
                        aliases: ["checkin"],
                        nextStepId: "ticket",
                    },
                    {
                        id: "cancel-flight",
                        label: "Cancel booking",
                        aliases: ["cancel"],
                        nextStepId: "ticket",
                    },
                ],
                cancelLabel: "Cancel flow",
            },
            {
                id: "ticket",
                prompt: "Select a ticket",
                presentation: "cards",
                options: [
                    {
                        id: "pnr-1",
                        label: "TK123",
                        aliases: ["wmefkc"],
                        selectionValue: "TK123",
                        payloadPatch: {
                            pnr: "WMEFKC",
                        },
                    },
                ],
                cards: [
                    {
                        optionId: "pnr-1",
                        title: "Istanbul -> Izmir",
                        description: "11:50 - 14:50",
                        badge: "Soon",
                        metadata: "PNR WMEFKC",
                    },
                ],
                submit: {
                    mode: "confirm_only",
                    label: "Confirm",
                    successMessage: "Done.",
                },
                cancelLabel: "Cancel flow",
            },
        ],
        updatedAt: new Date().toISOString(),
        ...overrides,
    }
}

function createState(overrides?: Partial<GuidedSkillState>): GuidedSkillState {
    return {
        skillId: "flight-ops",
        stepId: "action",
        selections: {},
        channel: "web",
        status: "active",
        startedAt: "2026-03-30T10:00:00.000Z",
        updatedAt: "2026-03-30T10:00:00.000Z",
        ...overrides,
    }
}

describe("resolveGuidedSkillTurn", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test("starts a skill from a web shortcut event", async () => {
        const adminDb = createAdminDb([createSkill()])

        const result = await resolveGuidedSkillTurn({
            adminDb,
            chatbotId: "tenant-1",
            channel: "web",
            guidedModuleEnabled: true,
            transcript: "Flight operations",
            guidedEvent: {
                skillId: "flight-ops",
                label: "Flight operations",
                source: "shortcut",
            },
        })

        expect(result.handled).toBe(true)
        expect(result.assistantContent).toBe("What would you like to do?")
        expect(result.assistantGuidedUi?.skillId).toBe("flight-ops")
        expect(result.nextState).toEqual(
            expect.objectContaining({
                skillId: "flight-ops",
                stepId: "action",
                status: "active",
            })
        )
    })

    test("returns a numbered start menu on text channels when no skill matched", async () => {
        const adminDb = createAdminDb([createSkill()])

        const result = await resolveGuidedSkillTurn({
            adminDb,
            chatbotId: "tenant-1",
            channel: "whatsapp",
            guidedModuleEnabled: true,
            transcript: "hello",
        })

        expect(result.handled).toBe(false)
        expect(result.guidedTextMenu).toContain("1. Flight operations")
    })

    test("advances to the next step when an option is selected", async () => {
        const adminDb = createAdminDb([createSkill()])

        const result = await resolveGuidedSkillTurn({
            adminDb,
            chatbotId: "tenant-1",
            channel: "web",
            guidedModuleEnabled: true,
            transcript: "1",
            currentState: createState(),
        })

        expect(result.handled).toBe(true)
        expect(result.assistantGuidedUi?.stepId).toBe("ticket")
        expect(result.nextState).toEqual(
            expect.objectContaining({
                stepId: "ticket",
                status: "active",
            })
        )
    })

    test("completes a confirm_only submit after a selection exists", async () => {
        const adminDb = createAdminDb([createSkill()])
        const state = createState({
            stepId: "ticket",
            selections: {
                ticket: {
                    stepId: "ticket",
                    optionId: "pnr-1",
                    label: "TK123",
                    selectionValue: "TK123",
                },
            },
        })

        const result = await resolveGuidedSkillTurn({
            adminDb,
            chatbotId: "tenant-1",
            channel: "web",
            guidedModuleEnabled: true,
            transcript: "2",
            currentState: state,
        })

        expect(result.handled).toBe(true)
        expect(result.assistantContent).toBe("Done.")
        expect(result.nextState).toEqual(
            expect.objectContaining({
                stepId: "ticket",
                status: "completed",
            })
        )
    })

    test("executes omni actions with deterministic payload patches", async () => {
        const adminDb = createAdminDb([
            createSkill({
                steps: [
                    createSkill().steps[0],
                    {
                        ...createSkill().steps[1],
                        submit: {
                            mode: "omni_action",
                            label: "Request callback",
                            actionId: "create_callback_request",
                            successMessage: "Callback requested.",
                        },
                    },
                ],
            }),
        ])
        vi.mocked(executeVionGuidedAction).mockResolvedValue({
            actionId: "create_callback_request",
        } as any)

        const result = await resolveGuidedSkillTurn({
            adminDb,
            chatbotId: "tenant-1",
            channel: "whatsapp",
            guidedModuleEnabled: true,
            sessionId: "wa-1",
            contactKey: "+905550001122",
            canonicalContactId: "contact-1",
            transcript: "2",
            currentState: createState({
                channel: "whatsapp",
                stepId: "ticket",
                selections: {
                    ticket: {
                        stepId: "ticket",
                        optionId: "pnr-1",
                        label: "TK123",
                        selectionValue: "TK123",
                        payloadPatch: {
                            pnr: "WMEFKC",
                        },
                    },
                },
            }),
        })

        expect(result.handled).toBe(true)
        expect(result.assistantContent).toBe("Callback requested.")
        expect(result.handoffStatus).toBe("callback_requested")
        expect(executeVionGuidedAction).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                actionId: "create_callback_request",
                sourceChannel: "whatsapp",
                sourceSessionId: "wa-1",
                payload: expect.objectContaining({
                    guidedSkillId: "flight-ops",
                    pnr: "WMEFKC",
                }),
            })
        )
    })

    test("cancels the flow deterministically", async () => {
        const adminDb = createAdminDb([createSkill()])

        const result = await resolveGuidedSkillTurn({
            adminDb,
            chatbotId: "tenant-1",
            channel: "web",
            guidedModuleEnabled: true,
            currentState: createState(),
            guidedEvent: {
                skillId: "flight-ops",
                stepId: "action",
                optionId: "__cancel",
                label: "Cancel flow",
                source: "guided_ui",
            },
        })

        expect(result.handled).toBe(true)
        expect(result.nextState?.status).toBe("cancelled")
    })

    test("leaves the flow open when free text does not match an active step", async () => {
        const adminDb = createAdminDb([createSkill()])
        const state = createState()

        const result = await resolveGuidedSkillTurn({
            adminDb,
            chatbotId: "tenant-1",
            channel: "web",
            guidedModuleEnabled: true,
            transcript: "tell me more",
            currentState: state,
        })

        expect(result.handled).toBe(false)
        expect(result.nextState).toEqual(state)
    })

    test("does nothing when the Guided module is disabled", async () => {
        const adminDb = createAdminDb([createSkill()])

        const result = await resolveGuidedSkillTurn({
            adminDb,
            chatbotId: "tenant-1",
            channel: "web",
            guidedModuleEnabled: false,
            transcript: "Flight operations",
        })

        expect(result.handled).toBe(false)
        expect(result.guidedTextMenu).toBeNull()
    })

    test("isGuidedModuleEnabled path: resolves from chatbots collection", async () => {
        const adminDb = createAdminDb([createSkill()], { enableGuided: true })

        const result = await resolveGuidedSkillTurn({
            adminDb,
            chatbotId: "tenant-1",
            channel: "web",
            // guidedModuleEnabled not passed — triggers Firestore lookup
            guidedEvent: { skillId: "flight-ops" },
        })

        expect(result.handled).toBe(true)
        expect(result.nextState?.skillId).toBe("flight-ops")
    })

    test("isGuidedModuleEnabled path: returns false when chatbot has enableGuided=false", async () => {
        const adminDb = createAdminDb([createSkill()], { enableGuided: false })

        const result = await resolveGuidedSkillTurn({
            adminDb,
            chatbotId: "tenant-1",
            channel: "web",
            guidedEvent: { skillId: "flight-ops" },
        })

        expect(result.handled).toBe(false)
    })

    test("matches skill by text alias", async () => {
        const adminDb = createAdminDb([createSkill()])

        const result = await resolveGuidedSkillTurn({
            adminDb,
            chatbotId: "tenant-1",
            channel: "whatsapp",
            guidedModuleEnabled: true,
            transcript: "flight help",
            language: "en",
        })

        expect(result.handled).toBe(true)
        expect(result.nextState?.skillId).toBe("flight-ops")
    })

    test("matches option by text label on active step", async () => {
        const adminDb = createAdminDb([createSkill()])

        const result = await resolveGuidedSkillTurn({
            adminDb,
            chatbotId: "tenant-1",
            channel: "whatsapp",
            guidedModuleEnabled: true,
            transcript: "Check-in",
            language: "en",
            currentState: createState({ channel: "whatsapp" }),
        })

        expect(result.handled).toBe(true)
        expect(result.nextState?.stepId).toBe("ticket")
    })

    test("does not match when numeric input exceeds options count", async () => {
        const adminDb = createAdminDb([createSkill()])

        const result = await resolveGuidedSkillTurn({
            adminDb,
            chatbotId: "tenant-1",
            channel: "web",
            guidedModuleEnabled: true,
            transcript: "99",
            currentState: createState(),
        })

        expect(result.handled).toBe(false)
    })

    test("returns error message and cancels state when executeOmniAction throws", async () => {
        const adminDb = createAdminDb([
            createSkill({
                steps: [
                    createSkill().steps[0],
                    {
                        ...createSkill().steps[1],
                        submit: {
                            mode: "omni_action",
                            label: "Request callback",
                            actionId: "create_callback_request",
                            successMessage: "Callback requested.",
                        },
                    },
                ],
            }),
        ])
        vi.mocked(executeVionGuidedAction).mockRejectedValue(new Error("Network failure"))

        const result = await resolveGuidedSkillTurn({
            adminDb,
            chatbotId: "tenant-1",
            channel: "web",
            guidedModuleEnabled: true,
            transcript: "2",
            language: "en",
            currentState: createState({
                stepId: "ticket",
                selections: {
                    ticket: {
                        stepId: "ticket",
                        optionId: "pnr-1",
                        label: "TK123",
                        selectionValue: "TK123",
                    },
                },
            }),
        })

        expect(result.handled).toBe(true)
        expect(result.nextState?.status).toBe("cancelled")
        expect(result.lastDisposition).toBe("guided_skill_action_error")
        expect(result.assistantContent).toContain("error")
    })
})
