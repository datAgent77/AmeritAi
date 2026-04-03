import { beforeEach, describe, expect, test, vi } from "vitest"
import { PATCH } from "./route"
import { getPartnerDoc } from "@/lib/management/partners"
import { authorizeOmniDirectoryRequest } from "@/lib/omni/server-utils"

vi.mock("@/lib/omni/server-utils", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/server-utils")>("@/lib/omni/server-utils")
    return {
        ...actual,
        authorizeOmniDirectoryRequest: vi.fn(),
    }
})

vi.mock("@/lib/management/partners", () => ({
    getPartnerDoc: vi.fn()
}))

function createDoc(id: string, data: Record<string, unknown>) {
    return {
        id,
        exists: true,
        data: () => data,
    }
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe("PATCH /api/omni/directory/accounts/[id]", () => {
    test("enables omni for a tenant account", async () => {
        const set = vi.fn().mockResolvedValue(undefined)
        const adminDb = {
            collection: vi.fn().mockReturnValue({
                doc: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue(
                        createDoc("tenant-1", {
                            email: "account@example.com",
                            agencyId: "agency-1",
                            productEntitlements: { chatbot: true, omniChannel: false },
                            enableOmniChannel: false,
                        })
                    ),
                    set,
                }),
            }),
        }

        vi.mocked(authorizeOmniDirectoryRequest).mockResolvedValue({
            ok: true,
            adminDb,
            callerUid: "super-1",
            callerRole: "SUPER_ADMIN",
            callerPermissions: ["directory.accounts.manage"],
            isSuperAdmin: true,
            isAgencyAdmin: false,
            isTenantAdmin: false,
        } as any)

        const response = await PATCH(
            new Request("https://preview.example.com/api/omni/directory/accounts/tenant-1", {
                method: "PATCH",
                body: JSON.stringify({ omniEnabled: true }),
                headers: { "Content-Type": "application/json" },
            }),
            { params: Promise.resolve({ id: "tenant-1" }) }
        )

        expect(response.status).toBe(200)
        expect(set).toHaveBeenCalledWith(
            expect.objectContaining({
                enableOmniChannel: true,
                visibleOmniChannel: true,
                productEntitlements: expect.objectContaining({ omniChannel: true }),
            }),
            { merge: true }
        )

        const payload = await response.json()
        expect(payload.account.omniEnabled).toBe(true)
    })

    test("treats chatbot-enabled accounts as omni-enabled in the serialized response", async () => {
        const set = vi.fn().mockResolvedValue(undefined)
        const adminDb = {
            collection: vi.fn().mockReturnValue({
                doc: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue(
                        createDoc("tenant-1", {
                            email: "account@example.com",
                            agencyId: "agency-1",
                            productEntitlements: { chatbot: true, omniChannel: false },
                            enableOmniChannel: false,
                        })
                    ),
                    set,
                }),
            }),
        }

        vi.mocked(authorizeOmniDirectoryRequest).mockResolvedValue({
            ok: true,
            adminDb,
            callerUid: "super-1",
            callerRole: "SUPER_ADMIN",
            callerPermissions: ["directory.accounts.manage"],
            isSuperAdmin: true,
            isAgencyAdmin: false,
            isTenantAdmin: false,
        } as any)

        const response = await PATCH(
            new Request("https://preview.example.com/api/omni/directory/accounts/tenant-1", {
                method: "PATCH",
                body: JSON.stringify({ omniEnabled: false }),
                headers: { "Content-Type": "application/json" },
            }),
            { params: Promise.resolve({ id: "tenant-1" }) }
        )

        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.account.omniEnabled).toBe(true)
    })

    test("blocks agency admins from enabling accounts outside their agency", async () => {
        const adminDb = {
            collection: vi.fn().mockReturnValue({
                doc: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue(
                        createDoc("tenant-2", {
                            email: "account@example.com",
                            agencyId: "agency-2",
                            productEntitlements: { omniChannel: false },
                            enableOmniChannel: false,
                        })
                    ),
                    set: vi.fn(),
                }),
            }),
        }

        vi.mocked(authorizeOmniDirectoryRequest).mockResolvedValue({
            ok: true,
            adminDb,
            callerUid: "agency-1",
            callerRole: "AGENCY_ADMIN",
            callerPermissions: ["directory.accounts.manage"],
            isSuperAdmin: false,
            isAgencyAdmin: true,
            isTenantAdmin: false,
        } as any)

        const response = await PATCH(
            new Request("https://preview.example.com/api/omni/directory/accounts/tenant-2", {
                method: "PATCH",
                body: JSON.stringify({ omniEnabled: true }),
                headers: { "Content-Type": "application/json" },
            }),
            { params: Promise.resolve({ id: "tenant-2" }) }
        )

        expect(response.status).toBe(403)
    })

    test("blocks basic partner level from managing their own linked account", async () => {
        const adminDb = {
            collection: vi.fn().mockReturnValue({
                doc: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue(
                        createDoc("tenant-1", {
                            email: "account@example.com",
                            agencyId: "agency-1",
                            productEntitlements: { omniChannel: false },
                            enableOmniChannel: false,
                        })
                    ),
                    set: vi.fn(),
                }),
            }),
        }

        vi.mocked(authorizeOmniDirectoryRequest).mockResolvedValue({
            ok: true,
            adminDb,
            callerUid: "agency-1",
            callerRole: "AGENCY_ADMIN",
            callerPermissions: ["directory.accounts.manage"],
            isSuperAdmin: false,
            isAgencyAdmin: true,
            isTenantAdmin: false,
        } as any)
        vi.mocked(getPartnerDoc).mockResolvedValue({
            id: "agency-1",
            partnerLevel: "partner",
        } as any)

        const response = await PATCH(
            new Request("https://preview.example.com/api/omni/directory/accounts/tenant-1", {
                method: "PATCH",
                body: JSON.stringify({ omniEnabled: true }),
                headers: { "Content-Type": "application/json" },
            }),
            { params: Promise.resolve({ id: "tenant-1" }) }
        )

        expect(response.status).toBe(403)
    })
})
