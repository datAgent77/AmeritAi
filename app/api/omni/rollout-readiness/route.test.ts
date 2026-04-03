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

function createDoc(id: string, data: Record<string, unknown>) {
    return {
        id,
        data: () => data,
    }
}

function createAdminDb(params?: { voiceNumbers?: Array<ReturnType<typeof createDoc>>; smokeRuns?: Array<ReturnType<typeof createDoc>> }) {
    const voiceNumbers = params?.voiceNumbers || [
        createDoc("voice-1", {
            chatbotId: "tenant-1",
            phoneNumber: "+905551112233",
            carrierProvider: "verimor",
            routingMode: "twilio_byoc",
            routingStatus: "active",
            ttsProvider: "elevenlabs",
            elevenLabsVoiceId: "voice-id",
        }),
    ]

    const smokeRuns = params?.smokeRuns || [
        createDoc("run-1", {
            chatbotId: "tenant-1",
            channel: "voice",
            provider: "twilio",
            action: "test_call",
            result: "success",
            source: "voice.test_call",
            createdAt: "2026-03-29T10:00:00.000Z",
        }),
        createDoc("run-2", {
            chatbotId: "tenant-1",
            channel: "whatsapp",
            provider: "meta",
            action: "test_message",
            result: "success",
            source: "whatsapp.test_message",
            createdAt: "2026-03-29T11:00:00.000Z",
        }),
    ]

    return {
        collection: vi.fn().mockImplementation((name: string) => {
            if (name === "voice_numbers") {
                return {
                    where: vi.fn().mockImplementation(() => ({
                        get: vi.fn().mockResolvedValue({ docs: voiceNumbers }),
                    })),
                }
            }

            if (name === "omni_smoke_runs") {
                return {
                    where: vi.fn().mockImplementation((_field: string, _op: string, value: unknown) => ({
                        limit: vi.fn().mockImplementation(() => ({
                            get: vi.fn().mockResolvedValue({
                                docs: smokeRuns.filter((doc) => doc.data().chatbotId === value),
                            }),
                        })),
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

describe("GET /api/omni/rollout-readiness", () => {
    test("returns channel rollout states and next actions", async () => {
        vi.mocked(authorizeOmniRequest).mockResolvedValue({
            ok: true,
            adminDb: createAdminDb(),
            callerUid: "tenant-1",
            isSuperAdmin: false,
            isAgencyAdmin: false,
        } as any)
        vi.mocked(getOmniChannelConfig).mockResolvedValue({
            web: { enabled: true },
            voiceIntegration: {
                enabled: true,
                accountSid: "AC123",
                authToken: "auth-token",
                defaultByocTrunkSid: "BYOC123",
                ttsProviderDefault: "elevenlabs",
            },
            whatsapp: {
                enabled: true,
                phoneNumberId: "wa-phone-1",
                accessTokenRef: "token",
                appSecretRef: "secret",
                verifyToken: "verify",
                webhookStatus: "connected",
            },
            instagram: {
                enabled: true,
                accountId: "ig-account-1",
                pageId: "ig-page-1",
                accessTokenRef: "token",
                appSecretRef: "secret",
                verifyToken: "verify",
                webhookStatus: "disconnected",
            },
        } as any)
        vi.mocked(normalizeVoiceIntegrationConfig).mockReturnValue({
            enabled: true,
            callControlProvider: "twilio",
            accountSid: "AC123",
            authToken: "auth-token",
            defaultByocTrunkSid: "BYOC123",
            elevenLabsManaged: true,
            elevenLabsApiKeyRef: "env:ELEVENLABS_API_KEY",
            ttsProviderDefault: "elevenlabs",
            ttsFallbackProvider: "twilio",
        } as any)

        const response = await GET(new Request("https://preview.example.com/api/omni/rollout-readiness?chatbotId=tenant-1"))
        expect(response.status).toBe(200)

        const payload = await response.json()
        expect(payload.publicOrigin).toBe(true)
        expect(payload.channels.voice.state).toBe("ready")
        expect(payload.channels.whatsapp.state).toBe("ready")
        expect(payload.channels.instagram.state).toBe("blocked")
        expect(payload.channels.web.state).toBe("pending")
        expect(payload.summary.channelsReady).toBe(2)
        expect(payload.summary.channelsPending).toBe(1)
        expect(payload.summary.channelsBlocked).toBe(1)
        expect(payload.nextActions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    channel: "web",
                    label: "Install and snippet",
                }),
                expect.objectContaining({
                    channel: "instagram",
                    label: "Webhook connected",
                }),
            ])
        )
    })

    test("returns blocked public-url step for localhost", async () => {
        vi.mocked(authorizeOmniRequest).mockResolvedValue({
            ok: true,
            adminDb: createAdminDb({ voiceNumbers: [], smokeRuns: [] }),
            callerUid: "tenant-1",
            isSuperAdmin: false,
            isAgencyAdmin: false,
        } as any)
        vi.mocked(getOmniChannelConfig).mockResolvedValue({
            web: { enabled: false },
            voiceIntegration: {},
            whatsapp: { enabled: false },
            instagram: { enabled: false },
        } as any)
        vi.mocked(normalizeVoiceIntegrationConfig).mockReturnValue({
            callControlProvider: "twilio",
            elevenLabsManaged: true,
            ttsProviderDefault: "twilio",
            ttsFallbackProvider: "twilio",
        } as any)

        const response = await GET(new Request("http://localhost:3000/api/omni/rollout-readiness?chatbotId=tenant-1"))
        expect(response.status).toBe(200)

        const payload = await response.json()
        expect(payload.publicOrigin).toBe(false)
        expect(payload.globalSteps[0].status).toBe("blocked")
        expect(payload.channels.voice.state).toBe("disabled")
        expect(payload.summary.channelsDisabled).toBe(4)
    })
})
