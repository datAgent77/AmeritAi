import { beforeEach, describe, expect, test, vi } from "vitest"
import { GET } from "./route"
import { getAdminDb } from "@/lib/firebase-admin"

vi.mock("@/lib/firebase-admin", () => ({
    getAdminDb: vi.fn(),
    getAdminAuth: vi.fn(),
}))

vi.mock("@/lib/modules-registry", () => ({
    MODULES_REGISTRY: {
        voiceAssistant: { status: "ready" },
    },
}))

vi.mock("@/lib/dynamic-context-presets", () => ({
    resolveDynamicContextPresetSelection: vi.fn().mockReturnValue({
        suggestedPresetId: "generic-web-app",
        activePresetId: "generic-web-app",
        runtimePreset: {
            presetId: "generic-web-app",
        },
    }),
}))

function createDoc(data: Record<string, unknown> | null) {
    return {
        exists: Boolean(data),
        data: () => data,
    }
}

type AdminDbOptions = {
    userData?: Record<string, unknown> | null
    chatbotData?: Record<string, unknown> | null
    omniConfig?: Record<string, unknown> | null
}

function createAdminDb(options: AdminDbOptions = {}) {
    const {
        userData = {
            companyName: "Userex",
            enableChatbot: true,
            isActive: true,
            elevenLabsApiKey: "sk-test",
        },
        chatbotData = {
            companyName: "Userex",
            enableVoiceAssistant: true,
            elevenLabsVoiceId: "voice-123",
        },
        omniConfig = {
            web: {
                enabled: true,
            },
        },
    } = options

    return {
        collection: vi.fn().mockImplementation((name: string) => {
            if (name === "users") {
                return {
                    doc: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(
                            createDoc(userData)
                        ),
                    }),
                }
            }

            if (name === "omni_channel_configs") {
                return {
                    doc: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(
                            createDoc(omniConfig)
                        ),
                    }),
                }
            }

            if (name === "chatbots") {
                return {
                    doc: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(
                            createDoc(chatbotData)
                        ),
                    }),
                }
            }

            if (name === "guided_skills") {
                return {
                    where: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue({
                            docs: [],
                        }),
                    }),
                }
            }

            throw new Error(`Unexpected collection: ${name}`)
        }),
    }
}

describe("GET /api/widget-settings", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test("disables the public widget when the Omni web channel is turned off", async () => {
        vi.mocked(getAdminDb).mockReturnValue(createAdminDb({
            omniConfig: {
                web: {
                    enabled: false,
                },
            },
        }) as any)

        const response = await GET(new Request("https://preview.example.com/api/widget-settings?chatbotId=tenant-1"))

        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.isEnabled).toBe(false)
        expect(payload.companyName).toBe("Userex")
        expect(payload.enableVoiceAssistant).toBe(false)
    })

    test("disables web voice when the tenant has not enabled the voice module", async () => {
        vi.mocked(getAdminDb).mockReturnValue(createAdminDb({
            chatbotData: {
                companyName: "Userex",
                enableVoiceAssistant: false,
                elevenLabsVoiceId: "voice-123",
            },
        }) as any)

        const response = await GET(new Request("https://preview.example.com/api/widget-settings?chatbotId=tenant-1"))

        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.enableVoiceAssistant).toBe(false)
    })

    test("disables web voice when ElevenLabs is not fully configured", async () => {
        vi.mocked(getAdminDb).mockReturnValue(createAdminDb({
            userData: {
                companyName: "Userex",
                enableChatbot: true,
                isActive: true,
                elevenLabsApiKey: "",
            },
            chatbotData: {
                companyName: "Userex",
                enableVoiceAssistant: true,
                elevenLabsVoiceId: "",
            },
        }) as any)

        const response = await GET(new Request("https://preview.example.com/api/widget-settings?chatbotId=tenant-1"))

        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.enableVoiceAssistant).toBe(false)
    })

    test("enables web voice when the widget channel, module, and ElevenLabs config are ready", async () => {
        vi.mocked(getAdminDb).mockReturnValue(createAdminDb() as any)

        const response = await GET(new Request("https://preview.example.com/api/widget-settings?chatbotId=tenant-1"))

        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.isEnabled).toBe(true)
        expect(payload.enableVoiceAssistant).toBe(true)
        expect(payload.elevenLabsVoiceId).toBe("voice-123")
    })
})
