import { beforeEach, describe, expect, test, vi } from "vitest"
import { POST } from "./route"
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

vi.mock("@/lib/omni/smoke-runs", () => ({
    recordOmniSmokeRun: vi.fn(),
}))

vi.mock("@/lib/omni/audit-log", () => ({
    logOmniAuditEvent: vi.fn(),
}))

describe("POST /api/omni/channels/whatsapp/health", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(authorizeOmniRequest).mockResolvedValue({
            ok: true,
            adminDb: {
                collection: vi.fn(),
            },
            callerUid: "tenant-1",
            callerRole: "TENANT_ADMIN",
            callerPermissions: ["channels.manage"],
            isSuperAdmin: false,
            isAgencyAdmin: false,
        } as any)
        vi.mocked(getOmniChannelConfig).mockResolvedValue({
            whatsapp: {
                enabled: false,
            },
        } as any)
        vi.stubGlobal("fetch", vi.fn())
    })

    test("returns skipped when the WhatsApp channel is disabled", async () => {
        const response = await POST(
            new Request("https://preview.example.com/api/omni/channels/whatsapp/health", {
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
                message: "WhatsApp channel is disabled",
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
                eventType: "whatsapp.health_check",
                result: "blocked",
            })
        )
        expect(fetch).not.toHaveBeenCalled()
    })
})
