import { beforeEach, describe, expect, test, vi } from "vitest"
import { POST } from "./route"
import { authorizeOmniRequest, getOmniChannelConfig } from "@/lib/omni/server-utils"
import { sendOmniInstagramText } from "@/lib/omni/channel-dispatch"
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

vi.mock("@/lib/omni/channel-dispatch", () => ({
    sendOmniInstagramText: vi.fn(),
}))

vi.mock("@/lib/omni/smoke-runs", () => ({
    recordOmniSmokeRun: vi.fn(),
}))

vi.mock("@/lib/omni/audit-log", () => ({
    logOmniAuditEvent: vi.fn(),
}))

describe("POST /api/omni/channels/instagram/test-message", () => {
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
            instagram: {
                enabled: false,
            },
        } as any)
    })

    test("records disabled channel as blocked instead of error", async () => {
        const response = await POST(
            new Request("https://preview.example.com/api/omni/channels/instagram/test-message", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    chatbotId: "tenant-1",
                    recipientId: "17841400000000000",
                }),
            })
        )

        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({ error: "Instagram channel is disabled" })
        expect(recordOmniSmokeRun).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                action: "test_message",
                result: "blocked",
            })
        )
        expect(logOmniAuditEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: "instagram.test_message",
                result: "blocked",
            })
        )
        expect(sendOmniInstagramText).not.toHaveBeenCalled()
    })
})
