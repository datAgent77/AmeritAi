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

function createAdminDb() {
    const voiceNumbers = [
        createDoc("voice-1", {
            chatbotId: "tenant-1",
            phoneNumber: "+905551112233",
            carrierProvider: "verimor",
            routingStatus: "active",
        }),
    ]

    const auditLogs = [
        createDoc("audit-1", {
            chatbotId: "tenant-1",
            channel: "voice",
            eventType: "voice.test_call",
            result: "success",
            source: "api/omni/channels/voice/test-call",
            createdAt: "2026-03-28T09:00:00.000Z",
        }),
        createDoc("audit-2", {
            chatbotId: "tenant-1",
            channel: "whatsapp",
            eventType: "whatsapp.webhook_signature",
            result: "denied",
            source: "api/omni/channels/whatsapp/webhook",
            createdAt: "2026-03-28T09:05:00.000Z",
        }),
        createDoc("audit-3", {
            chatbotId: "tenant-1",
            channel: "instagram",
            eventType: "instagram.auto_reply",
            result: "success",
            source: "api/omni/channels/instagram/webhook",
            createdAt: "2026-03-28T09:10:00.000Z",
        }),
    ]

    const deliveryAttempts = [
        createDoc("delivery-1", {
            chatbotId: "tenant-1",
            channel: "voice",
            provider: "twilio",
            direction: "outbound",
            source: "callback.execute",
            status: "success",
            retryEligible: false,
            createdAt: "2026-03-28T08:30:00.000Z",
        }),
        createDoc("delivery-2", {
            chatbotId: "tenant-1",
            channel: "whatsapp",
            provider: "meta",
            direction: "outbound",
            source: "test-message",
            status: "failed",
            retryEligible: true,
            retryState: "exhausted",
            errorClass: "provider",
            errorMessage: "Meta delivery failed",
            createdAt: "2026-03-28T08:45:00.000Z",
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

            if (name === "omni_audit_logs") {
                return {
                    where: vi.fn().mockImplementation((_field: string, _op: string, value: unknown) => ({
                        limit: vi.fn().mockImplementation(() => ({
                            get: vi.fn().mockResolvedValue({
                                docs: auditLogs.filter((doc) => doc.data().chatbotId === value),
                            }),
                        })),
                    })),
                }
            }

            if (name === "omni_delivery_attempts") {
                return {
                    where: vi.fn().mockImplementation((_field: string, _op: string, value: unknown) => ({
                        limit: vi.fn().mockImplementation(() => ({
                            get: vi.fn().mockResolvedValue({
                                docs: deliveryAttempts.filter((doc) => doc.data().chatbotId === value),
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

describe("GET /api/omni/smoke-report", () => {
    test("returns aggregate readiness, audit, and delivery summaries", async () => {
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
            },
            instagram: {
                enabled: true,
                accountId: "ig-account-1",
                pageId: "ig-page-1",
                accessTokenRef: "token",
                appSecretRef: "secret",
                verifyToken: "verify",
            },
            provisioning: [
                { id: "voice_webhooks", status: "done" },
                { id: "whatsapp_meta", status: "blocked" },
            ],
        } as any)
        vi.mocked(normalizeVoiceIntegrationConfig).mockReturnValue({
            accountSid: "AC123",
            authToken: "auth-token",
        } as any)

        const response = await GET(new Request("https://preview.example.com/api/omni/smoke-report?chatbotId=tenant-1"))
        expect(response.status).toBe(200)

        const payload = await response.json()
        expect(payload.publicOrigin).toBe(true)
        expect(payload.overallReady).toBe(true)
        expect(payload.attentionRequired).toBe(true)
        expect(payload.readinessScore).toBe(100)
        expect(payload.provisioningSummary.blocked).toBe(1)
        expect(payload.auditSummary.denied).toBe(1)
        expect(payload.deliverySummary.failed).toBe(1)
        expect(payload.deliverySummary.exhaustedRetries).toBe(1)
        expect(payload.channels.whatsapp.delivery.retryEligible).toBe(1)
        expect(payload.channels.whatsapp.delivery.exhaustedRetries).toBe(1)
        expect(payload.channels.voice.audit.total).toBe(1)
        expect(payload.readyChannels).toEqual(expect.arrayContaining(["voice", "whatsapp", "instagram"]))
    })

    test("returns 400 when chatbotId is missing", async () => {
        const response = await GET(new Request("http://localhost/api/omni/smoke-report"))
        expect(response.status).toBe(400)
    })
})
