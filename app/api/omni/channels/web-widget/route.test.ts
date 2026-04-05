import { beforeEach, describe, expect, test, vi } from "vitest"
import { GET, POST } from "./route"
import { authorizeOmniRequest, getOmniChannelConfig, mergeOmniChannelConfig } from "@/lib/omni/server-utils"

vi.mock("@/lib/omni/server-utils", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/server-utils")>("@/lib/omni/server-utils")
    return {
        ...actual,
        authorizeOmniRequest: vi.fn(),
        getOmniChannelConfig: vi.fn(),
        mergeOmniChannelConfig: vi.fn(),
    }
})

function createAuthz(callerPermissions: string[]) {
    return {
        ok: true,
        adminDb: {},
        callerUid: "tenant-1",
        callerRole: "TENANT_ADMIN",
        callerPermissions,
        isSuperAdmin: false,
        isAgencyAdmin: false,
    } as any
}

describe("omni web widget channel route", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test("returns default enabled state for legacy tenants", async () => {
        vi.mocked(authorizeOmniRequest).mockResolvedValue(createAuthz(["channels.view"]))
        vi.mocked(getOmniChannelConfig).mockResolvedValue({ web: undefined } as any)

        const response = await GET(new Request("https://preview.example.com/api/omni/channels/web-widget?chatbotId=tenant-1"))

        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.config.enabled).toBe(true)
    })

    test("returns channel-specific capability overrides", async () => {
        vi.mocked(authorizeOmniRequest).mockResolvedValue(createAuthz(["channels.view"]))
        vi.mocked(getOmniChannelConfig).mockResolvedValue({
            web: { enabled: true },
            assistantCore: {
                channelCapabilityOverrides: {
                    web: [],
                },
            },
        } as any)

        const response = await GET(new Request("https://preview.example.com/api/omni/channels/web-widget?chatbotId=tenant-1"))

        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.capabilities).toEqual([])
    })

    test("persists the explicit enabled flag", async () => {
        vi.mocked(authorizeOmniRequest).mockResolvedValue(createAuthz(["channels.manage"]))
        vi.mocked(getOmniChannelConfig).mockResolvedValue({ web: { enabled: true } } as any)
        vi.mocked(mergeOmniChannelConfig).mockResolvedValue({ web: { enabled: false } } as any)

        const response = await POST(
            new Request("https://preview.example.com/api/omni/channels/web-widget", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    chatbotId: "tenant-1",
                    enabled: false,
                }),
            })
        )

        expect(response.status).toBe(200)
        expect(mergeOmniChannelConfig).toHaveBeenCalledWith(
            expect.anything(),
            "tenant-1",
            expect.objectContaining({
                web: expect.objectContaining({
                    enabled: false,
                }),
            })
        )
        const payload = await response.json()
        expect(payload.config.enabled).toBe(false)
    })
})
