import { beforeEach, describe, expect, test, vi } from "vitest"
import { GET } from "./route"
import { getAdminDb } from "@/lib/firebase-admin"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { sendOmniWhatsAppText } from "@/lib/omni/channel-dispatch"
import { getOmniDeliveryAttempt, updateOmniDeliveryAttemptRetryState } from "@/lib/omni/delivery-attempts"
import { getOmniChannelConfig } from "@/lib/omni/server-utils"

vi.mock("@/lib/firebase-admin", () => ({
    getAdminDb: vi.fn(),
}))

vi.mock("@/lib/omni/audit-log", () => ({
    logOmniAuditEvent: vi.fn(),
}))

vi.mock("@/lib/omni/channel-dispatch", () => ({
    sendOmniWhatsAppText: vi.fn(),
    sendOmniInstagramText: vi.fn(),
}))

vi.mock("@/lib/omni/delivery-attempts", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/delivery-attempts")>("@/lib/omni/delivery-attempts")
    return {
        ...actual,
        getOmniDeliveryAttempt: vi.fn(),
        updateOmniDeliveryAttemptRetryState: vi.fn(),
    }
})

vi.mock("@/lib/omni/server-utils", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/server-utils")>("@/lib/omni/server-utils")
    return {
        ...actual,
        getOmniChannelConfig: vi.fn(),
    }
})

function createAdminDbMock() {
    return {
        collection: vi.fn().mockImplementation((name: string) => {
            if (name === "omni_delivery_attempts") {
                return {
                    where: vi.fn().mockImplementation(() => ({
                        limit: vi.fn().mockImplementation(() => ({
                            get: vi.fn().mockResolvedValue({
                                docs: [
                                    {
                                        id: "attempt-1",
                                        data: () => ({
                                            chatbotId: "tenant-1",
                                            channel: "whatsapp",
                                            status: "failed",
                                            retryEligible: true,
                                            retryMode: "auto",
                                            retryState: "pending",
                                            attemptNumber: 1,
                                            nextRetryAt: new Date(Date.now() - 60_000).toISOString(),
                                            destination: "+905550001122",
                                            payloadText: "Test retry",
                                            providerTargetId: "wa-phone-1",
                                            source: "test",
                                            sessionId: "session-1",
                                        }),
                                    },
                                ],
                            }),
                        })),
                    })),
                }
            }

            if (name === "chatbots") {
                return {
                    doc: vi.fn().mockImplementation(() => ({
                        get: vi.fn().mockResolvedValue({
                            exists: true,
                            data: () => ({
                                integrations: {
                                    whatsapp: {
                                        phoneNumberId: "legacy-phone",
                                        accessToken: "legacy-token",
                                    },
                                },
                            }),
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
    process.env.CRON_SECRET = "test-secret"
})

describe("GET /api/admin/omni-delivery-retry-cron", () => {
    test("rejects invalid secret", async () => {
        const response = await GET(new Request("http://localhost/api/admin/omni-delivery-retry-cron?secret=wrong"))
        expect(response.status).toBe(401)
    })

    test("processes due WhatsApp retries", async () => {
        vi.mocked(getAdminDb).mockReturnValue(createAdminDbMock() as any)
        vi.mocked(getOmniChannelConfig).mockResolvedValue({
            whatsapp: {
                phoneNumberId: "wa-phone-1",
                accessTokenRef: "wa-token",
            },
        } as any)
        vi.mocked(sendOmniWhatsAppText).mockResolvedValue({
            messageId: "wamid-1",
            deliveryAttemptId: "delivery-2",
            recipient: "+905550001122",
            phoneNumberId: "wa-phone-1",
        } as any)

        const response = await GET(new Request("http://localhost/api/admin/omni-delivery-retry-cron?secret=test-secret"))
        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.summary.success).toBe(1)
        expect(sendOmniWhatsAppText).toHaveBeenCalled()
        expect(updateOmniDeliveryAttemptRetryState).toHaveBeenCalledWith(
            expect.anything(),
            "attempt-1",
            expect.objectContaining({
                retryState: "processing",
            })
        )
        expect(logOmniAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                channel: "whatsapp",
                eventType: "whatsapp.delivery_auto_retry",
                result: "success",
            })
        )
    })

    test("marks retry as exhausted when retry chain hits the limit", async () => {
        vi.mocked(getAdminDb).mockReturnValue(createAdminDbMock() as any)
        vi.mocked(getOmniChannelConfig).mockResolvedValue({
            whatsapp: {
                phoneNumberId: "wa-phone-1",
                accessTokenRef: "wa-token",
            },
        } as any)
        const retryError = new Error("WhatsApp delivery failed: provider timeout") as Error & { deliveryAttemptId?: string | null }
        retryError.deliveryAttemptId = "delivery-9"
        vi.mocked(sendOmniWhatsAppText).mockRejectedValue(retryError)
        vi.mocked(getOmniDeliveryAttempt).mockResolvedValue({
            id: "delivery-9",
            chatbotId: "tenant-1",
            channel: "whatsapp",
            provider: "meta",
            direction: "outbound",
            source: "api/admin/omni-delivery-retry-cron",
            status: "failed",
            retryEligible: true,
            retryState: "exhausted",
            createdAt: "2026-03-28T09:00:00.000Z",
        } as any)

        const response = await GET(new Request("http://localhost/api/admin/omni-delivery-retry-cron?secret=test-secret"))
        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.summary.failed).toBe(1)
        expect(updateOmniDeliveryAttemptRetryState).toHaveBeenCalledWith(
            expect.anything(),
            "attempt-1",
            expect.objectContaining({
                retryState: "exhausted",
            })
        )
        expect(logOmniAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                channel: "whatsapp",
                eventType: "whatsapp.delivery_retry_exhausted",
                result: "error",
            })
        )
    })
})
