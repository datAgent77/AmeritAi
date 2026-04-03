import { beforeEach, describe, expect, test, vi } from "vitest"
import { POST } from "./route"
import { buildVoiceReadiness, normalizeVoiceNumberRecords } from "@/lib/omni/voice-config"
import { authorizeOmniRequest, getOmniChannelConfig } from "@/lib/omni/server-utils"
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

vi.mock("@/lib/omni/voice-config", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/voice-config")>("@/lib/omni/voice-config")
    return {
        ...actual,
        buildVoiceReadiness: vi.fn(),
        normalizeVoiceNumberRecords: vi.fn(),
    }
})

vi.mock("@/lib/omni/smoke-runs", () => ({
    recordOmniSmokeRun: vi.fn(),
}))

vi.mock("@/lib/omni/audit-log", () => ({
    logOmniAuditEvent: vi.fn(),
}))

describe("POST /api/omni/channels/voice/health", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(authorizeOmniRequest).mockResolvedValue({
            ok: true,
            adminDb: {
                collection: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue({ docs: [] }),
                    }),
                }),
            },
            callerUid: "tenant-1",
            callerRole: "TENANT_ADMIN",
            callerPermissions: ["channels.manage"],
            isSuperAdmin: false,
            isAgencyAdmin: false,
        } as any)
        vi.mocked(getOmniChannelConfig).mockResolvedValue({
            voiceIntegration: {
                enabled: false,
            },
        } as any)
        vi.mocked(normalizeVoiceNumberRecords).mockReturnValue([])
        vi.mocked(buildVoiceReadiness).mockReturnValue({
            enabled: false,
            ready: false,
            blockers: ["Channel disabled"],
            carrierConfigured: false,
            callControlConfigured: false,
            renderingConfigured: false,
            defaultRoutingMode: "twilio_byoc",
        } as any)
        vi.stubGlobal("fetch", vi.fn())
    })

    test("returns skipped when the voice channel is disabled", async () => {
        const response = await POST(
            new Request("https://preview.example.com/api/omni/channels/voice/health", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ chatbotId: "tenant-1" }),
            })
        )

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual(
            expect.objectContaining({
                ok: true,
                enabled: false,
                skipped: true,
                message: "Voice channel is disabled",
            })
        )
        expect(recordOmniSmokeRun).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                action: "health_check",
                result: "blocked",
            })
        )
        expect(logOmniAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: "voice.health_check",
                result: "blocked",
            })
        )
        expect(fetch).not.toHaveBeenCalled()
    })
})
