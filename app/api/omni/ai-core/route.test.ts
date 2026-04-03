import { beforeEach, describe, expect, test, vi } from "vitest"
import { GET, POST } from "./route"
import { authorizeOmniRequest, getOmniChannelConfig, mergeOmniChannelConfig } from "@/lib/omni/server-utils"

vi.mock("@/lib/omni/server-utils", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/server-utils")>("@/lib/omni/server-utils")
    return {
        ...actual,
        authorizeOmniRequest: vi.fn(),
        getOmniChannelConfig: vi.fn(),
        mergeOmniChannelConfig: vi.fn(),
    }
})

function createRequest(url: string, options?: RequestInit) {
    return new Request(url, options)
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe("Omni AI Core route", () => {
    test("GET returns normalized defaults for assistant core", async () => {
        vi.mocked(authorizeOmniRequest).mockResolvedValue({
            ok: true,
            adminDb: {},
            callerUid: "tenant-1",
            isSuperAdmin: false,
            isAgencyAdmin: false,
        } as any)
        vi.mocked(getOmniChannelConfig).mockResolvedValue({
            assistantCore: {
                brandVoicePrompt: "Speak clearly",
                channelCapabilityOverrides: {
                    voice: ["generalChatbot", "knowledgeBase"],
                },
                knowledgeGovernance: {
                    staleAfterHours: 12,
                },
            },
        } as any)

        const response = await GET(createRequest("http://localhost/api/omni/ai-core?chatbotId=tenant-1"))
        expect(response.status).toBe(200)

        const payload = await response.json()
        expect(payload.assistantCore.brandVoicePrompt).toBe("Speak clearly")
        expect(payload.assistantCore.knowledgeGovernance.staleAfterHours).toBe(12)
        expect(payload.assistantCore.customerMemory.enabled).toBe(true)
        expect(payload.assistantCore.channelCapabilityOverrides.voice).toEqual(["generalChatbot", "knowledgeBase"])
        expect(payload.assistantCore.assistantProfiles[0].id).toBe("omni-default")
        expect(payload.assistantCore.channelAssistantProfiles.voice).toBe("omni-default")
        expect(Array.isArray(payload.defaults.capabilities)).toBe(true)
        expect(payload.defaults.channelPolicies.voice.channel).toBe("voice")
    })

    test("POST preserves existing sections while partially updating knowledge governance", async () => {
        vi.mocked(authorizeOmniRequest).mockResolvedValue({
            ok: true,
            adminDb: {},
            callerUid: "tenant-1",
            isSuperAdmin: false,
            isAgencyAdmin: false,
        } as any)

        vi.mocked(getOmniChannelConfig).mockResolvedValue({
            assistantCore: {
                brandVoicePrompt: "Existing global prompt",
                channelCapabilityOverrides: {
                    voice: ["generalChatbot"],
                    web: ["generalChatbot", "knowledgeBase"],
                },
                channelPolicyOverrides: {
                    voice: {
                        maxVerbosity: "short",
                    },
                },
                assistantProfiles: [
                    {
                        id: "support",
                        name: "Support",
                        prompt: "Support-first profile",
                        active: true,
                    },
                ],
                channelAssistantProfiles: {
                    voice: "support",
                    whatsapp: "support",
                    instagram: "support",
                    web: "support",
                },
                customerMemory: {
                    enabled: false,
                    maxFacts: 3,
                },
            },
        } as any)

        vi.mocked(mergeOmniChannelConfig).mockImplementation(async (_adminDb, _chatbotId, nextConfig) => nextConfig as any)

        const response = await POST(
            createRequest("http://localhost/api/omni/ai-core", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    chatbotId: "tenant-1",
                    assistantCore: {
                        knowledgeGovernance: {
                            staleAfterHours: 48,
                            includeConfidenceHints: false,
                        },
                        channelCapabilityOverrides: {
                            voice: ["knowledgeBase"],
                            whatsapp: [],
                        },
                    },
                }),
            })
        )

        expect(response.status).toBe(200)
        expect(mergeOmniChannelConfig).toHaveBeenCalledTimes(1)

        const mergedPayload = vi.mocked(mergeOmniChannelConfig).mock.calls[0]?.[2] as any
        expect(mergedPayload.assistantCore.brandVoicePrompt).toBe("Existing global prompt")
        expect(mergedPayload.assistantCore.customerMemory.enabled).toBe(false)
        expect(mergedPayload.assistantCore.assistantProfiles[0].id).toBe("support")
        expect(mergedPayload.assistantCore.channelAssistantProfiles.voice).toBe("support")
        expect(mergedPayload.assistantCore.channelCapabilityOverrides.voice).toEqual(["knowledgeBase"])
        expect(mergedPayload.assistantCore.channelCapabilityOverrides.whatsapp).toEqual([])
        expect(mergedPayload.assistantCore.channelCapabilityOverrides.web).toEqual(["generalChatbot", "knowledgeBase"])
        expect(mergedPayload.assistantCore.channelPolicyOverrides.voice.maxVerbosity).toBe("short")
        expect(mergedPayload.assistantCore.knowledgeGovernance.staleAfterHours).toBe(48)
        expect(mergedPayload.assistantCore.knowledgeGovernance.includeConfidenceHints).toBe(false)

        const payload = await response.json()
        expect(payload.assistantCore.assistantProfiles[0].id).toBe("support")
        expect(payload.assistantCore.customerMemory.enabled).toBe(false)
        expect(payload.assistantCore.channelCapabilityOverrides.voice).toEqual(["knowledgeBase"])
        expect(payload.assistantCore.knowledgeGovernance.staleAfterHours).toBe(48)
    })
})
