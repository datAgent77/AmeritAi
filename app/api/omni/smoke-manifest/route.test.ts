import { beforeEach, describe, expect, test, vi } from "vitest"
import { GET } from "./route"
import { authorizeOmniRequest, getOmniChannelConfig, normalizeVoiceIntegrationConfig } from "@/lib/omni/server-utils"

vi.mock("@/lib/omni/server-utils", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/server-utils")>("@/lib/omni/server-utils")
    return {
        ...actual,
        authorizeOmniRequest: vi.fn(),
        getOmniChannelConfig: vi.fn(),
        normalizeVoiceIntegrationConfig: vi.fn(),
    }
})

function createAdminDb(activeVoiceNumbers = 1) {
    return {
        collection: vi.fn().mockImplementation((name: string) => {
            if (name === "voice_numbers") {
                return {
                    where: vi.fn().mockImplementation((_field: string, _op: string, _value: unknown) => ({
                        get: vi.fn().mockResolvedValue({
                            docs: Array.from({ length: activeVoiceNumbers }, (_, index) => ({
                                id: `voice-${index + 1}`,
                                data: () => ({
                                    phoneNumber: `+90555111223${index}`,
                                    carrierProvider: "verimor",
                                    routingStatus: "active",
                                }),
                            })),
                        }),
                    })),
                }
            }

            throw new Error(`Unexpected collection: ${name}`)
        }),
    }
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe("GET /api/omni/smoke-manifest", () => {
    test("returns provider-ready webhook mapping and expected audit events", async () => {
        vi.mocked(authorizeOmniRequest).mockResolvedValue({
            ok: true,
            adminDb: createAdminDb(),
            callerUid: "tenant-1",
            isSuperAdmin: false,
            isAgencyAdmin: false,
        } as any)
        vi.mocked(getOmniChannelConfig).mockResolvedValue({
            voiceIntegration: { accountSid: "AC123", authToken: "auth-token" },
            whatsapp: {
                enabled: true,
                phoneNumberId: "wa-phone-1",
                accessTokenRef: "token",
                appSecretRef: "secret",
                verifyToken: "verify",
                webhookStatus: "connected",
                defaultReplyMode: "assistant",
            },
            instagram: {
                enabled: true,
                accountId: "ig-account-1",
                pageId: "ig-page-1",
                accessTokenRef: "token",
                appSecretRef: "secret",
                verifyToken: "verify",
                webhookStatus: "connected",
                defaultReplyMode: "assistant",
            },
        } as any)
        vi.mocked(normalizeVoiceIntegrationConfig).mockReturnValue({
            accountSid: "AC123",
            authToken: "auth-token",
        } as any)

        const response = await GET(new Request("https://preview.example.com/api/omni/smoke-manifest?chatbotId=tenant-1"))
        expect(response.status).toBe(200)

        const payload = await response.json()
        expect(payload.publicOrigin).toBe(true)
        expect(payload.channels.voice.provider).toBe("Carrier + Twilio Control")
        expect(payload.channels.voice.providerConsoleFields[1].value).toContain("/api/omni/channels/voice/inbound")
        expect(payload.channels.voice.expectedAuditEvents).toEqual(expect.arrayContaining(["voice.tts.elevenlabs_fallback", "voice.byoc_missing"]))
        expect(payload.channels.whatsapp.expectedAuditEvents).toEqual(expect.arrayContaining(["whatsapp.auto_reply", "whatsapp.test_message"]))
        expect(payload.channels.instagram.providerConsoleFields[0].value).toContain("/api/omni/channels/instagram/webhook")
    })

    test("returns 400 when chatbotId is missing", async () => {
        const response = await GET(new Request("http://localhost/api/omni/smoke-manifest"))
        expect(response.status).toBe(400)
    })
})
