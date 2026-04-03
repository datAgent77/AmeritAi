import { beforeEach, describe, expect, test, vi } from "vitest"
import { GET } from "./route"
import { authorizeOmniRequest, getOmniChannelConfig, getRequestOrigin, normalizeVoiceIntegrationConfig } from "@/lib/omni/server-utils"
import { buildVoiceReadiness, normalizeVoiceNumberRecords } from "@/lib/omni/voice-config"

vi.mock("@/lib/omni/server-utils", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/server-utils")>("@/lib/omni/server-utils")
    return {
        ...actual,
        authorizeOmniRequest: vi.fn(),
        getOmniChannelConfig: vi.fn(),
        getRequestOrigin: vi.fn(),
        normalizeVoiceIntegrationConfig: vi.fn(),
    }
})

vi.mock("@/lib/omni/voice-config", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/voice-config")>("@/lib/omni/voice-config")
    return {
        ...actual,
        buildVoiceReadiness: vi.fn(),
        normalizeVoiceNumberRecords: vi.fn(),
    }
})

function createDoc(id: string, data: Record<string, unknown>) {
    return {
        id,
        data: () => data,
    }
}

function createAdminDb() {
    return {
        collection: vi.fn().mockImplementation((name: string) => {
            if (name === "chat_sessions") {
                return {
                    where: vi.fn().mockImplementation(() => ({
                        get: vi.fn().mockResolvedValue({
                            docs: [
                                createDoc("session-1", {
                                    chatbotId: "tenant-1",
                                    channel: "whatsapp",
                                    createdAt: "2026-03-27T10:00:00.000Z",
                                    updatedAt: "2026-03-28T09:00:00.000Z",
                                    lastDisposition: "resolved",
                                    messages: [{}, {}],
                                }),
                            ],
                        }),
                    })),
                }
            }

            if (name === "callback_requests") {
                return {
                    where: vi.fn().mockImplementation(() => ({
                        get: vi.fn().mockResolvedValue({
                            docs: [
                                createDoc("callback-1", {
                                    chatbotId: "tenant-1",
                                    sourceChannel: "voice",
                                    status: "resolved",
                                    resolutionStatus: "completed",
                                    createdAt: "2026-03-28T08:00:00.000Z",
                                    updatedAt: "2026-03-28T08:30:00.000Z",
                                }),
                            ],
                        }),
                    })),
                }
            }

            if (name === "contact_graph") {
                return {
                    where: vi.fn().mockImplementation(() => ({
                        get: vi.fn().mockResolvedValue({
                            docs: [
                                createDoc("contact-1", {
                                    chatbotId: "tenant-1",
                                    linkedChannels: ["whatsapp", "voice"],
                                    manualMergeReview: false,
                                    mergedInto: null,
                                    lastInteractionAt: "2026-03-28T09:00:00.000Z",
                                }),
                            ],
                        }),
                    })),
                }
            }

            if (name === "omni_audit_logs") {
                return {
                    where: vi.fn().mockImplementation(() => ({
                        get: vi.fn().mockResolvedValue({
                            docs: [
                                createDoc("audit-1", {
                                    chatbotId: "tenant-1",
                                    channel: "whatsapp",
                                    eventType: "whatsapp.auto_reply",
                                    result: "success",
                                    message: "ok",
                                    createdAt: "2026-03-28T09:10:00.000Z",
                                }),
                                createDoc("audit-2", {
                                    chatbotId: "tenant-1",
                                    channel: "whatsapp",
                                    eventType: "whatsapp.webhook_signature",
                                    result: "denied",
                                    message: "denied",
                                    createdAt: "2026-03-28T09:15:00.000Z",
                                }),
                            ],
                        }),
                    })),
                }
            }

            if (name === "omni_delivery_attempts") {
                return {
                    where: vi.fn().mockImplementation(() => ({
                        get: vi.fn().mockResolvedValue({
                            docs: [
                                createDoc("delivery-1", {
                                    chatbotId: "tenant-1",
                                    channel: "whatsapp",
                                    status: "failed",
                                    retryEligible: true,
                                    retryState: "exhausted",
                                    errorClass: "provider",
                                    createdAt: "2026-03-28T09:20:00.000Z",
                                }),
                                createDoc("delivery-2", {
                                    chatbotId: "tenant-1",
                                    channel: "voice",
                                    status: "success",
                                    retryEligible: false,
                                    retryState: "none",
                                    errorClass: null,
                                    createdAt: "2026-03-28T09:25:00.000Z",
                                }),
                            ],
                        }),
                    })),
                }
            }

            if (name === "voice_numbers") {
                return {
                    where: vi.fn().mockImplementation(() => ({
                        get: vi.fn().mockResolvedValue({
                            docs: [],
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
    vi.mocked(getOmniChannelConfig).mockResolvedValue({
        web: {
            enabled: true,
        },
        whatsapp: {
            enabled: true,
            phoneNumberId: "wa-1",
            accessTokenRef: "token",
            appSecretRef: "secret",
            verifyToken: "verify",
            webhookStatus: "connected",
        },
        instagram: {
            enabled: false,
        },
        voiceIntegration: {
            enabled: true,
            accountSid: "AC123",
            authToken: "secret",
        },
    } as any)
    vi.mocked(getRequestOrigin).mockReturnValue("https://preview.example.com")
    vi.mocked(normalizeVoiceIntegrationConfig).mockReturnValue({
        enabled: true,
        accountSid: "AC123",
        authToken: "secret",
    } as any)
    vi.mocked(normalizeVoiceNumberRecords).mockReturnValue([])
    vi.mocked(buildVoiceReadiness).mockReturnValue({
        enabled: true,
        ready: false,
        blockers: ["carrier"],
        carrierConfigured: false,
        callControlConfigured: true,
        renderingConfigured: false,
    } as any)
})

describe("GET /api/omni/analytics", () => {
    test("denies access without analytics.view permission", async () => {
        vi.mocked(authorizeOmniRequest).mockResolvedValue({
            ok: true,
            adminDb: createAdminDb(),
            callerUid: "tenant-1",
            callerRole: "TENANT_ADMIN",
            callerPermissions: [],
            isSuperAdmin: false,
            isAgencyAdmin: false,
        } as any)

        const response = await GET(new Request("http://localhost/api/omni/analytics?chatbotId=tenant-1&days=30"))
        expect(response.status).toBe(403)
        expect(await response.json()).toEqual({ error: "Forbidden" })
    })

    test("includes exhausted delivery metrics in overview", async () => {
        vi.mocked(authorizeOmniRequest).mockResolvedValue({
            ok: true,
            adminDb: createAdminDb(),
            callerUid: "tenant-1",
            isSuperAdmin: false,
            isAgencyAdmin: false,
        } as any)

        const response = await GET(new Request("http://localhost/api/omni/analytics?chatbotId=tenant-1&days=30"))
        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.overview.deliveryFailures).toBe(1)
        expect(payload.overview.retryableDeliveries).toBe(1)
        expect(payload.overview.exhaustedDeliveries).toBe(1)
        expect(payload.overview.signatureDenied).toBe(1)
        expect(payload.overview.channelsEnabled).toBe(3)
        expect(payload.overview.channelsReady).toBe(2)
        expect(payload.overview.channelsBlocked).toBe(1)
        expect(payload.overview.channelsDisabled).toBe(1)
        expect(payload.channelBreakdown.deliveries.whatsapp).toBe(1)
        expect(payload.channelStatus.whatsapp.state).toBe("ready")
        expect(payload.channelStatus.instagram.state).toBe("disabled")
        expect(payload.channelStatus.voice.state).toBe("blocked")
    })

    test("returns 400 when chatbotId is missing", async () => {
        const response = await GET(new Request("http://localhost/api/omni/analytics"))
        expect(response.status).toBe(400)
    })
})
