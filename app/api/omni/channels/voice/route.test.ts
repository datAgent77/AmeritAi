import { beforeEach, describe, expect, test, vi } from "vitest"
import { GET, POST } from "./route"
import { authorizeOmniRequest } from "@/lib/omni/server-utils"

vi.mock("@/lib/omni/server-utils", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/server-utils")>("@/lib/omni/server-utils")
    return {
        ...actual,
        authorizeOmniRequest: vi.fn(),
    }
})

function createAuthz(callerPermissions: string[]) {
    return {
        ok: true,
        adminDb: {
            collection: vi.fn(),
        },
        callerUid: "tenant-1",
        callerRole: "TENANT_ADMIN",
        callerPermissions,
        isSuperAdmin: false,
        isAgencyAdmin: false,
    } as any
}

describe("omni voice channel permission gates", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test("denies reading voice channel settings without channels.view", async () => {
        vi.mocked(authorizeOmniRequest).mockResolvedValue(createAuthz([]))

        const response = await GET(new Request("https://preview.example.com/api/omni/channels/voice?chatbotId=tenant-1"))

        expect(response.status).toBe(403)
        expect(await response.json()).toEqual({ error: "Forbidden" })
    })

    test("denies mutating voice channel settings without channels.manage", async () => {
        vi.mocked(authorizeOmniRequest).mockResolvedValue(createAuthz(["channels.view"]))

        const response = await POST(
            new Request("https://preview.example.com/api/omni/channels/voice", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    chatbotId: "tenant-1",
                    phoneNumber: "+905550001122",
                }),
            })
        )

        expect(response.status).toBe(403)
        expect(await response.json()).toEqual({ error: "Forbidden" })
    })
})
