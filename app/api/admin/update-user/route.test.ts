import { beforeEach, describe, expect, test, vi } from "vitest"
import { POST } from "./route"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { authorizeTargetAccess } from "@/lib/api-auth"

vi.mock("@/lib/firebase-admin", () => ({
    getAdminAuth: vi.fn(),
    getAdminDb: vi.fn(),
}))

vi.mock("@/lib/api-auth", () => ({
    authorizeTargetAccess: vi.fn(),
}))

function createRequest(body: Record<string, unknown>) {
    return new Request("http://localhost/api/admin/update-user", {
        method: "POST",
        headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    })
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe("POST /api/admin/update-user", () => {
    test("converts a tenant user into a partner account", async () => {
        const updateUser = vi.fn().mockResolvedValue(undefined)
        const setCustomUserClaims = vi.fn().mockResolvedValue(undefined)
        const getUser = vi.fn().mockResolvedValue({ customClaims: { foo: "bar" } })
        const set = vi.fn().mockResolvedValue(undefined)

        vi.mocked(getAdminAuth).mockReturnValue({
            verifyIdToken: vi.fn().mockResolvedValue({ uid: "super-1", role: "SUPER_ADMIN" }),
            updateUser,
            setCustomUserClaims,
            getUser,
        } as any)

        vi.mocked(getAdminDb).mockReturnValue({
            collection: vi.fn().mockReturnValue({
                doc: vi.fn().mockImplementation((id: string) => ({
                    get: vi.fn().mockResolvedValue({
                        exists: true,
                        data: () => (
                            id === "super-1"
                                ? { role: "SUPER_ADMIN" }
                                : {
                                    role: "TENANT_ADMIN",
                                    companyName: "Acme Commerce",
                                    agencyId: "agency-9",
                                    email: "tenant@example.com",
                                }
                        ),
                    }),
                    set,
                })),
            }),
        } as any)

        vi.mocked(authorizeTargetAccess).mockResolvedValue({
            ok: true,
            callerUid: "super-1",
            isSuperAdmin: true,
            isAgencyAdmin: false,
        } as any)

        const response = await POST(createRequest({
            targetUserId: "tenant-1",
            role: "AGENCY_ADMIN",
            partnerLevel: "strategic_partner",
            agencyName: "Acme Strategic Partner",
        }) as any)

        expect(response.status).toBe(200)
        expect(getUser).toHaveBeenCalledWith("tenant-1")
        expect(setCustomUserClaims).toHaveBeenCalledWith("tenant-1", {
            foo: "bar",
            role: "AGENCY_ADMIN",
        })
        expect(set).toHaveBeenCalledWith(expect.objectContaining({
            role: "AGENCY_ADMIN",
            agencyName: "Acme Strategic Partner",
            partnerName: "Acme Strategic Partner",
            partnerLevel: "strategic_partner",
            agencyId: null,
            agencyAssignedAt: null,
            agencyAssignedBy: null,
        }), { merge: true })
    })
})
