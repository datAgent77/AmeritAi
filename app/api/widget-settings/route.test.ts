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

vi.mock("@/lib/contracts", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/contracts")>()
    return {
        ...actual,
        getPublishedContract: vi.fn().mockResolvedValue(null),
    }
})

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

    test("keeps the widget test runtime enabled when the Omni web channel is turned off", async () => {
        vi.mocked(getAdminDb).mockReturnValue(createAdminDb({
            omniConfig: {
                web: {
                    enabled: false,
                },
            },
        }) as any)

        const response = await GET(new Request("https://preview.example.com/api/widget-settings?chatbotId=tenant-1&testMode=1"))

        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.isEnabled).toBe(true)
        expect(payload.enableVoiceAssistant).toBe(true)
    })

    test("keeps the widget test runtime enabled when the chatbot module is turned off", async () => {
        vi.mocked(getAdminDb).mockReturnValue(createAdminDb({
            userData: {
                companyName: "Userex",
                enableChatbot: false,
                isActive: true,
                elevenLabsApiKey: "sk-test",
            },
        }) as any)

        const response = await GET(new Request("https://preview.example.com/api/widget-settings?chatbotId=tenant-1&testMode=1"))

        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.isEnabled).toBe(true)
    })

    test("still disables the widget test runtime when the tenant account itself is inactive", async () => {
        vi.mocked(getAdminDb).mockReturnValue(createAdminDb({
            userData: {
                companyName: "Userex",
                enableChatbot: true,
                isActive: false,
                elevenLabsApiKey: "sk-test",
            },
        }) as any)

        const response = await GET(new Request("https://preview.example.com/api/widget-settings?chatbotId=tenant-1&testMode=1"))

        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.isEnabled).toBe(false)
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

    test("returns enterprise dynamic context mode and keeps pii crawl disabled by default", async () => {
        vi.mocked(getAdminDb).mockReturnValue(createAdminDb({
            chatbotData: {
                companyName: "Userex",
                enableDynamicContext: true,
                dynamicContextMode: "enterprise_adapter",
                dynamicSiteContextCapturePII: false,
            },
        }) as any)

        const response = await GET(new Request("https://preview.example.com/api/widget-settings?chatbotId=tenant-1"))

        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.dynamicContextMode).toBe("enterprise_adapter")
        expect(payload.dynamicSiteContextCapturePII).toBe(false)
    })

    test("returns normalized quick actions for all supported active modules", async () => {
        vi.mocked(getAdminDb).mockReturnValue(createAdminDb({
            chatbotData: {
                companyName: "Userex",
                enableAppointments: true,
                enableHumanHandoff: true,
                enableVisualDiagnosis: true,
                enableKvkkConsent: true,
                enableProactiveMessaging: true,
                enableDigitalWaiter: true,
                digitalWaiter: {
                    menuUrl: "https://example.com/menu",
                },
                quickActions: {
                    enabled: true,
                    buttons: [
                        {
                            id: "humanHandoff",
                            label: "KVKK",
                            moduleId: "humanHandoff",
                            triggerMessage: "kvkk onay metnini görmek istiyorum",
                            visible: true,
                            order: 0,
                        },
                        {
                            id: "leadCollection",
                            label: "Iletisim Birak",
                            moduleId: "leadCollection",
                            triggerMessage: "iletisim bilgilerimi birakmak istiyorum",
                            visible: true,
                            order: 1,
                        },
                    ],
                },
            },
        }) as any)

        const response = await GET(new Request("https://preview.example.com/api/widget-settings?chatbotId=tenant-1"))

        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.enableProactiveMessaging).toBe(true)
        expect(payload.enableDigitalWaiter).toBe(true)
        expect(payload.quickActions.enabled).toBe(true)
        expect(payload.quickActions.buttons.map((button: any) => button.moduleId)).toEqual([
            "kvkkConsent",
            "appointments",
            "humanHandoff",
            "visualDiagnosis",
            "proactiveMessaging",
            "digitalWaiter",
        ])
    })
})
