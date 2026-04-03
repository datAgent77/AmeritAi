import { beforeEach, describe, expect, test, vi } from "vitest"
import { GET, POST } from "./route"
import { authorizeOmniRequest } from "@/lib/omni/server-utils"

vi.mock("@/lib/omni/server-utils", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/server-utils")>("@/lib/omni/server-utils")
    return {
        ...actual,
        authorizeOmniRequest: vi.fn(),
        getRequestOrigin: vi.fn().mockReturnValue("https://preview.example.com"),
    }
})

function createDoc(data: Record<string, unknown>) {
    return {
        exists: true,
        data: () => data,
    }
}

describe("/api/omni/account-center/developers", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test("GET returns developer config", async () => {
        const adminDb = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn().mockResolvedValue(createDoc({ omniDeveloper: { accessToken: "omni_token", webhookUrl: "https://hook.example.com", webhookSecret: "whsec_test" } })),
                    set: vi.fn(),
                })),
            })),
        }

        vi.mocked(authorizeOmniRequest).mockResolvedValue({ ok: true, adminDb, callerUid: "tenant-1", isSuperAdmin: false, isAgencyAdmin: false } as any)

        const response = await GET(new Request("https://example.com/api/omni/account-center/developers?chatbotId=tenant-1"))
        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.developer.accessToken).toBe("omni_token")
    })

    test("POST validates webhook url for save", async () => {
        const set = vi.fn()
        const adminDb = {
            collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                    get: vi.fn().mockResolvedValue(createDoc({ omniDeveloper: {} })),
                    set,
                })),
            })),
        }

        vi.mocked(authorizeOmniRequest).mockResolvedValue({ ok: true, adminDb, callerUid: "tenant-1", isSuperAdmin: false, isAgencyAdmin: false } as any)

        const response = await POST(new Request("https://example.com/api/omni/account-center/developers", {
            method: "POST",
            body: JSON.stringify({ chatbotId: "tenant-1", action: "save", webhookUrl: "invalid-url" }),
        }))

        expect(response.status).toBe(400)
        expect(set).not.toHaveBeenCalled()
    })
})
