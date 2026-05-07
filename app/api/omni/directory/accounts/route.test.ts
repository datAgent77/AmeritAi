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
        exists: true,
        data: () => data,
    }
}

function createAdminDb() {
    const agencies = [createDoc("agency-1", { agencyName: "North Agency", email: "agency@example.com" })]
    const tenants = [
        createDoc("tenant-1", {
            email: "account@example.com",
            companyName: "Acme",
            agencyId: "agency-1",
            isActive: true,
            productEntitlements: {
                chatbot: true,
                omniChannel: true,
            },
            enableOmniChannel: true,
        }),
    ]

    return {
        collection: vi.fn().mockImplementation((name: string) => {
            if (name !== "users") throw new Error(`Unexpected collection ${name}`)
            return {
                where: vi.fn().mockImplementation((field: string, _op: string, value: unknown) => ({
                    get: vi.fn().mockResolvedValue({
                        docs: field === "role" && value === "AGENCY_ADMIN" ? agencies : field === "role" && value === "TENANT_ADMIN" ? tenants : [],
                    }),
                    where: vi.fn().mockImplementation((nextField: string, _nextOp: string, nextValue: unknown) => ({
                        get: vi.fn().mockResolvedValue({
                            docs:
                                field === "role" &&
                                value === "TENANT_ADMIN" &&
                                nextField === "agencyId" &&
                                nextValue === "agency-1"
                                    ? tenants
                                    : [],
                        }),
                    })),
                })),
                doc: vi.fn().mockImplementation((id: string) => ({
                    get: vi.fn().mockResolvedValue(
                        id === "agency-1"
                            ? createDoc("agency-1", agencies[0].data() as any)
                            : createDoc(id, tenants[0].data() as any)
                    ),
                })),
            }
        }),
    }
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe("GET /api/omni/directory/accounts", () => {
    test("lists accessible accounts for super admins", async () => {
        vi.mocked(authorizeOmniDirectoryRequest).mockResolvedValue({
            ok: true,
            adminDb: createAdminDb(),
            callerUid: "super-1",
            callerRole: "SUPER_ADMIN",
            isSuperAdmin: true,
            isAgencyAdmin: false,
            isTenantAdmin: false,
        } as any)

        const response = await GET(new Request("https://preview.example.com/api/omni/directory/accounts"))
        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.meta.canSwitchAccounts).toBe(true)
        expect(payload.accounts).toHaveLength(1)
        expect(payload.accounts[0].agencyName).toBe("North Agency")
        expect(payload.accounts[0].omniEnabled).toBe(true)
    })

    test("returns own account for tenant admins", async () => {
        vi.mocked(authorizeOmniDirectoryRequest).mockResolvedValue({
            ok: true,
            adminDb: createAdminDb(),
            callerUid: "tenant-1",
            callerRole: "TENANT_ADMIN",
            isSuperAdmin: false,
            isAgencyAdmin: false,
            isTenantAdmin: true,
        } as any)

        const response = await GET(new Request("https://preview.example.com/api/omni/directory/accounts"))
        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.meta.canSwitchAccounts).toBe(false)
        expect(payload.accounts).toHaveLength(1)
        expect(payload.accounts[0].id).toBe("tenant-1")
    })
})
