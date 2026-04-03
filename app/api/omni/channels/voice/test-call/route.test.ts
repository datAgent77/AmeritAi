import { beforeEach, describe, expect, test, vi } from "vitest"
import { POST } from "./route"
import { authorizeOmniRequest, getOmniChannelConfig } from "@/lib/omni/server-utils"
import { recordOmniDeliveryAttempt } from "@/lib/omni/delivery-attempts"
import { recordOmniSmokeRun } from "@/lib/omni/smoke-runs"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"

vi.mock("@/lib/omni/server-utils", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/server-utils")>("@/lib/omni/server-utils")
    return {
        ...actual,
        authorizeOmniRequest: vi.fn(),
        getOmniChannelConfig: vi.fn(),
    }
})

vi.mock("@/lib/omni/delivery-attempts", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/delivery-attempts")>("@/lib/omni/delivery-attempts")
    return {
        ...actual,
        recordOmniDeliveryAttempt: vi.fn(),
    }
})

vi.mock("@/lib/omni/smoke-runs", () => ({
    recordOmniSmokeRun: vi.fn(),
}))

vi.mock("@/lib/omni/audit-log", () => ({
    logOmniAuditEvent: vi.fn(),
}))

function createAuthz() {
    return {
        ok: true,
        adminDb: {
            collection: vi.fn().mockImplementation((name: string) => {
                if (name === "voice_numbers") {
                    return {
                        doc: vi.fn().mockReturnValue({
                            get: vi.fn().mockResolvedValue({
                                exists: true,
                                data: () => ({
                                    chatbotId: "tenant-1",
                                    phoneNumber: "+905551112233",
                                    carrierProvider: "verimor",
                                    routingMode: "twilio_byoc",
                                    routingStatus: "active",
                                    ttsProvider: "elevenlabs",
                                    elevenLabsVoiceId: "voice_123",
                                }),
                            }),
                        }),
                    }
                }

                throw new Error(`Unexpected collection ${name}`)
            }),
        },
        callerUid: "tenant-1",
        callerRole: "TENANT_ADMIN",
        callerPermissions: ["channels.manage"],
        isSuperAdmin: false,
        isAgencyAdmin: false,
    } as any
}

describe("POST /api/omni/channels/voice/test-call", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(authorizeOmniRequest).mockResolvedValue(createAuthz())
        vi.mocked(getOmniChannelConfig).mockResolvedValue({
            voiceIntegration: {
                accountSid: "AC123",
                authToken: "secret",
                defaultByocTrunkSid: null,
            },
        } as any)
        vi.mocked(recordOmniDeliveryAttempt).mockResolvedValue({ id: "attempt-1" } as any)
    })

    test("fails clearly when byoc routing is selected without a trunk sid", async () => {
        const response = await POST(
            new Request("https://preview.example.com/api/omni/channels/voice/test-call", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    chatbotId: "tenant-1",
                    voiceNumberId: "line-1",
                    to: "+905550001122",
                }),
            })
        )

        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({ error: "BYOC trunk SID is not configured for this voice number" })
        expect(recordOmniSmokeRun).toHaveBeenCalled()
        expect(logOmniAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: "voice.byoc_missing",
                result: "error",
            })
        )
    })

    test("fails clearly when the voice channel is disabled", async () => {
        vi.mocked(getOmniChannelConfig).mockResolvedValue({
            voiceIntegration: {
                enabled: false,
                accountSid: "AC123",
                authToken: "secret",
                defaultByocTrunkSid: "BY123",
            },
        } as any)

        const response = await POST(
            new Request("https://preview.example.com/api/omni/channels/voice/test-call", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    chatbotId: "tenant-1",
                    voiceNumberId: "line-1",
                    to: "+905550001122",
                }),
            })
        )

        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({ error: "Voice channel is disabled" })
        expect(recordOmniSmokeRun).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                action: "test_call",
                result: "blocked",
            })
        )
        expect(logOmniAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: "voice.test_call",
                result: "blocked",
            })
        )
    })
})
