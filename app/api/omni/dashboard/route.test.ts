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
    return {
        collection: vi.fn(),
    }
}

function attachListCollections(adminDb: any) {
    adminDb.collection.mockImplementation((name: string) => {
        if (name === "voice_numbers") {
            return {
                where: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue({
                        docs: [
                            createDoc("voice-1", {
                                chatbotId: "tenant-1",
                                phoneNumber: "+905551112233",
                                carrierProvider: "verimor",
                                routingStatus: "active",
                            }),
                        ],
                    }),
                }),
            }
        }

        if (name === "callback_requests") {
            return {
                where: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue({
                        docs: [
                            createDoc("callback-1", {
                                chatbotId: "tenant-1",
                                displayName: "Ayse",
                                sourceChannel: "voice",
                                status: "pending",
                                resolutionStatus: "open",
                                priority: "high",
                                dueAt: "2026-03-28T08:00:00.000Z",
                                owner: "ops@vion.ai",
                            }),
                        ],
                    }),
                }),
            }
        }

        if (name === "appointments") {
            return {
                where: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue({ docs: [createDoc("appointment-1", { chatbotId: "tenant-1", status: "pending" })] }),
                }),
            }
        }

        if (name === "leads") {
            return {
                where: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue({ docs: [createDoc("lead-1", { chatbotId: "tenant-1", status: "qualified" })] }),
                }),
            }
        }

        if (name === "contact_graph") {
            return {
                where: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue({ docs: [createDoc("contact-1", { chatbotId: "tenant-1", manualMergeReview: true })] }),
                }),
            }
        }

        if (name === "omni_audit_logs") {
            return {
                where: vi.fn().mockImplementation((_field: string, _op: string, value: unknown) => ({
                    limit: vi.fn().mockImplementation(() => ({
                        get: vi.fn().mockResolvedValue({
                            docs: [
                                createDoc("audit-1", {
                                    chatbotId: String(value),
                                    channel: "voice",
                                    eventType: "voice.call_status",
                                    result: "error",
                                    message: "Call failed",
                                    createdAt: "2026-03-28T09:00:00.000Z",
                                }),
                            ],
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
                            docs: [
                                createDoc("delivery-1", {
                                    chatbotId: String(value),
                                    channel: "voice",
                                    provider: "twilio",
                                    direction: "outbound",
                                    source: "callback.execute",
                                    status: "failed",
                                    retryState: "exhausted",
                                    createdAt: "2026-03-28T09:05:00.000Z",
                                }),
                            ],
                        }),
                    })),
                })),
            }
        }

        throw new Error(`Unexpected collection: ${name}`)
    })
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-28T12:00:00.000Z"))
})

describe("GET /api/omni/dashboard", () => {
    test("denies access without dashboard.view permission", async () => {
        vi.mocked(authorizeOmniRequest).mockResolvedValue({
            ok: true,
            adminDb: createAdminDb(),
            callerUid: "tenant-1",
            callerRole: "TENANT_ADMIN",
            callerPermissions: [],
            isSuperAdmin: false,
            isAgencyAdmin: false,
        } as any)

        const response = await GET(new Request("https://preview.example.com/api/omni/dashboard?chatbotId=tenant-1"))
        expect(response.status).toBe(403)
        expect(await response.json()).toEqual({ error: "Forbidden" })
    })

    test("returns operational overview and next actions", async () => {
        const adminDb = createAdminDb()
        attachListCollections(adminDb)

        vi.mocked(authorizeOmniRequest).mockResolvedValue({
            ok: true,
            adminDb,
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
                enabled: false,
                accountId: null,
                pageId: null,
                accessTokenRef: null,
                appSecretRef: null,
                verifyToken: null,
            },
        } as any)
        vi.mocked(normalizeVoiceIntegrationConfig).mockReturnValue({
            accountSid: "AC123",
            authToken: "auth-token",
        } as any)

        const response = await GET(new Request("https://preview.example.com/api/omni/dashboard?chatbotId=tenant-1"))
        expect(response.status).toBe(200)

        const payload = await response.json()
        expect(payload.summary.readinessScore).toBe(100)
        expect(payload.summary.enabledChannels).toEqual(["voice", "whatsapp"])
        expect(payload.summary.openCallbacks).toBe(1)
        expect(payload.summary.overdueCallbacks).toBe(1)
        expect(payload.summary.pendingAppointments).toBe(1)
        expect(payload.summary.openLeads).toBe(1)
        expect(payload.summary.manualMergeReview).toBe(1)
        expect(payload.summary.exhaustedRetries).toBe(1)
        expect(payload.channels.voice.failedDeliveries).toBe(1)
        expect(payload.channels.instagram.ready).toBe(false)
        expect(payload.nextActions.map((item: any) => item.id)).toEqual(
            expect.arrayContaining(["callback_sla", "delivery_retry_review", "contact_review"])
        )
    })

    test("returns 400 when chatbotId is missing", async () => {
        const response = await GET(new Request("http://localhost/api/omni/dashboard"))
        expect(response.status).toBe(400)
    })
})
