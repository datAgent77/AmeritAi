import { beforeEach, describe, expect, test, vi } from "vitest";
import { POST } from "./route";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { getPartnerDoc } from "@/lib/management/partners";
import { provisionTenantAccount } from "@/lib/tenant-provisioning";

vi.mock("@/lib/firebase-admin", () => ({
    getAdminAuth: vi.fn(),
    getAdminDb: vi.fn()
}));

vi.mock("@/lib/tenant-provisioning", () => ({
    provisionTenantAccount: vi.fn()
}));

vi.mock("@/lib/management/partners", () => ({
    getPartnerDoc: vi.fn()
}));

vi.mock("@/lib/server-event-log", () => ({
    buildActorFromRequest: vi.fn(() => ({ uid: "actor" })),
    logPlatformEvent: vi.fn()
}));

type UserDocMap = Record<string, Record<string, unknown>>;

function createAdminDb(userDocs: UserDocMap) {
    return {
        collection: vi.fn().mockImplementation((name: string) => {
            if (name !== "users") {
                return {
                    doc: vi.fn().mockImplementation(() => ({
                        get: vi.fn().mockResolvedValue({ exists: false, data: () => null })
                    }))
                };
            }

            return {
                doc: vi.fn().mockImplementation((id: string) => ({
                    get: vi.fn().mockResolvedValue({
                        exists: Boolean(userDocs[id]),
                        data: () => userDocs[id]
                    })
                }))
            };
        })
    };
}

function createRequest(body: Record<string, unknown>) {
    return new Request("http://localhost/api/admin/create-tenant", {
        method: "POST",
        headers: {
            authorization: "Bearer test-token",
            "content-type": "application/json"
        },
        body: JSON.stringify(body)
    });
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("POST /api/admin/create-tenant", () => {
    test("rejects role spoof from body when caller is not privileged", async () => {
        const adminAuth = {
            verifyIdToken: vi.fn().mockResolvedValue({ uid: "caller-1", role: "USER" })
        };

        vi.mocked(getAdminAuth).mockReturnValue(adminAuth as any);
        vi.mocked(getAdminDb).mockReturnValue(createAdminDb({
            "caller-1": { role: "USER" }
        }) as any);

        const response = await POST(createRequest({
            email: "tenant@example.com",
            password: "123456",
            companyName: "Acme",
            callerRole: "SUPER_ADMIN"
        }));

        expect(response.status).toBe(403);
        const payload = await response.json();
        expect(payload.error).toContain("Unauthorized");
    });

    test("allows super admin and validates requested agency assignment", async () => {
        const adminAuth = {
            verifyIdToken: vi.fn().mockResolvedValue({ uid: "super-1", role: "SUPER_ADMIN" })
        };

        vi.mocked(getAdminAuth).mockReturnValue(adminAuth as any);
        vi.mocked(getAdminDb).mockReturnValue(createAdminDb({
            "super-1": { role: "SUPER_ADMIN" },
            "agency-1": { role: "AGENCY_ADMIN" }
        }) as any);
        vi.mocked(provisionTenantAccount).mockResolvedValue({ userId: "tenant-1" });

        const response = await POST(createRequest({
            email: "tenant@example.com",
            password: "123456",
            companyName: "Acme",
            agencyId: "agency-1"
        }));

        expect(response.status).toBe(200);
        expect(provisionTenantAccount).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.objectContaining({
                agencyId: "agency-1",
                agencyAssignedBy: "super-1"
            })
        );
    });

    test("agency admin creates customer with forced self agencyId", async () => {
        const adminAuth = {
            verifyIdToken: vi.fn().mockResolvedValue({ uid: "agency-9", role: "AGENCY_ADMIN" })
        };

        vi.mocked(getAdminAuth).mockReturnValue(adminAuth as any);
        vi.mocked(getAdminDb).mockReturnValue(createAdminDb({
            "agency-9": { role: "AGENCY_ADMIN" },
            "agency-other": { role: "AGENCY_ADMIN" }
        }) as any);
        vi.mocked(getPartnerDoc).mockResolvedValue({
            id: "agency-9",
            partnerLevel: "solution_partner",
            capabilities: {
                canCreateManagedAccounts: true,
                canAccessManagedAccountWorkspace: true,
                canAssignManagedAccounts: true,
                canSwitchOmniAccounts: true,
                canUsePartnerBranding: false,
            }
        } as any);
        vi.mocked(provisionTenantAccount).mockResolvedValue({ userId: "tenant-9" });

        const response = await POST(createRequest({
            email: "tenant@example.com",
            password: "123456",
            companyName: "Acme",
            agencyId: "agency-other"
        }));

        expect(response.status).toBe(200);
        expect(provisionTenantAccount).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.objectContaining({
                agencyId: "agency-9",
                agencyAssignedBy: "agency-9"
            })
        );
    });

    test("blocks basic partner level from creating tenants", async () => {
        const adminAuth = {
            verifyIdToken: vi.fn().mockResolvedValue({ uid: "agency-9", role: "AGENCY_ADMIN" })
        };

        vi.mocked(getAdminAuth).mockReturnValue(adminAuth as any);
        vi.mocked(getAdminDb).mockReturnValue(createAdminDb({
            "agency-9": { role: "AGENCY_ADMIN", partnerLevel: "partner" }
        }) as any);
        vi.mocked(getPartnerDoc).mockResolvedValue({
            id: "agency-9",
            partnerLevel: "partner",
            capabilities: {
                canCreateManagedAccounts: false,
                canAccessManagedAccountWorkspace: false,
                canAssignManagedAccounts: false,
                canSwitchOmniAccounts: false,
                canUsePartnerBranding: false,
            }
        } as any);

        const response = await POST(createRequest({
            email: "tenant@example.com",
            password: "123456",
            companyName: "Acme"
        }));

        expect(response.status).toBe(403);
        expect(provisionTenantAccount).not.toHaveBeenCalled();
    });
});
