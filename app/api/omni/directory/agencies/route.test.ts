import { beforeEach, describe, expect, test, vi } from "vitest"
import { GET } from "./route"
import { authorizeOmniDirectoryRequest } from "@/lib/omni/server-utils"

vi.mock("@/lib/omni/server-utils", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/server-utils")>("@/lib/omni/server-utils")
    return {
        ...actual,
        authorizeOmniDirectoryRequest: vi.fn(),
    }
})

function createDoc(id: string, data: Record<string, unknown>) {
    return {
        id,
        data: () => data,
    }
}

function createAdminDb() {
    const agencies = [createDoc("agency-1", { agencyName: "North Agency", email: "agency@example.com", isActive: true })]
    const tenants = [
        createDoc("tenant-1", { agencyId: "agency-1", enableOmniChannel: true }),
        createDoc("tenant-2", { agencyId: "agency-1", enableOmniChannel: false, productEntitlements: { chatbot: true, omniChannel: false } }),
    ]

    return {
        collection: vi.fn().mockImplementation((name: string) => {
            if (name !== "users") throw new Error(`Unexpected collection ${name}`)
            return {
                where: vi.fn().mockImplementation((_field: string, _op: string, value: unknown) => ({
                    get: vi.fn().mockResolvedValue({
                        docs: value === "AGENCY_ADMIN" ? agencies : value === "TENANT_ADMIN" ? tenants : [],
                    }),
                })),
            }
        }),
    }
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe("GET /api/omni/directory/agencies", () => {
    test("lists agencies for super admins", async () => {
        vi.mocked(authorizeOmniDirectoryRequest).mockResolvedValue({
            ok: true,
            adminDb: createAdminDb(),
            callerUid: "super-1",
            callerRole: "SUPER_ADMIN",
            isSuperAdmin: true,
            isAgencyAdmin: false,
            isTenantAdmin: false,
        } as any)

        const response = await GET(new Request("https://preview.example.com/api/omni/directory/agencies"))
        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.agencies).toHaveLength(1)
        expect(payload.agencies[0].customerCount).toBe(2)
        expect(payload.agencies[0].omniEnabledAccounts).toBe(2)
        expect(payload.agencies[0].partnerLevel).toBe("solution_partner")
    })

    test("rejects non-super-admin callers", async () => {
        vi.mocked(authorizeOmniDirectoryRequest).mockResolvedValue({
            ok: true,
            adminDb: createAdminDb(),
            callerUid: "agency-1",
            callerRole: "AGENCY_ADMIN",
            isSuperAdmin: false,
            isAgencyAdmin: true,
            isTenantAdmin: false,
        } as any)

        const response = await GET(new Request("https://preview.example.com/api/omni/directory/agencies"))
        expect(response.status).toBe(403)
    })
})
