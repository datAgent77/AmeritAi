import { beforeEach, describe, expect, test, vi } from "vitest";
import { GET, POST } from "./route";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { listManagedAccountsForViewer } from "@/lib/management/accounts";
import { getPartnerDoc } from "@/lib/management/partners";
import { provisionTenantAccount } from "@/lib/tenant-provisioning";

vi.mock("@/lib/firebase-admin", () => ({
    getAdminAuth: vi.fn(),
    getAdminDb: vi.fn()
}));

vi.mock("@/lib/tenant-provisioning", () => ({
    provisionTenantAccount: vi.fn()
}));

vi.mock("@/lib/management/accounts", () => ({
    listManagedAccountsForViewer: vi.fn()
}));

vi.mock("@/lib/management/partners", () => ({
    getPartnerDoc: vi.fn()
}));

vi.mock("@/lib/server-event-log", () => ({
    buildActorFromRequest: vi.fn(() => ({ uid: "actor" })),
    logPlatformEvent: vi.fn()
}));

beforeEach(() => {
    vi.clearAllMocks();
});

function createGetRequest() {
    return new Request("http://localhost/api/agency/customers?includeArchived=false", {
        method: "GET",
        headers: {
            authorization: "Bearer test-token"
        }
    });
}

function createPostRequest(body: Record<string, unknown>) {
    return new Request("http://localhost/api/agency/customers", {
        method: "POST",
        headers: {
            authorization: "Bearer test-token",
            "content-type": "application/json"
        },
        body: JSON.stringify(body)
    });
}

describe("GET /api/agency/customers", () => {
    test("returns only caller agency customers", async () => {
        const adminAuth = {
            verifyIdToken: vi.fn().mockResolvedValue({ uid: "agency-1", role: "AGENCY_ADMIN" })
        };
        const adminDb = {
            collection: vi.fn().mockImplementation((name: string) => {
                if (name === "users") {
                    return {
                        doc: vi.fn().mockImplementation((id: string) => ({
                            get: vi.fn().mockResolvedValue({
                                exists: true,
                                data: () => (id === "agency-1" ? { role: "AGENCY_ADMIN" } : {})
                            })
                        }))
                    };
                }
                throw new Error(`Unexpected collection ${name}`);
            })
        };

        vi.mocked(getAdminAuth).mockReturnValue(adminAuth as any);
        vi.mocked(getAdminDb).mockReturnValue(adminDb as any);
        vi.mocked(getPartnerDoc).mockResolvedValue({
            id: "agency-1",
            partnerLevel: "solution_partner",
            capabilities: {
                canCreateManagedAccounts: true,
                canAccessManagedAccountWorkspace: true,
                canAssignManagedAccounts: true,
                canSwitchOmniAccounts: true,
                canUsePartnerBranding: false,
            }
        } as any);
        vi.mocked(listManagedAccountsForViewer).mockResolvedValue({
            accounts: [{
                id: "tenant-1",
                email: "tenant@example.com",
                companyName: "Acme",
                industry: "ecommerce",
                isActive: true,
                isArchived: false,
                agencyId: "agency-1",
                partnerId: "agency-1",
                partnerName: "North Partner",
                partnerLevel: "solution_partner",
                partnerLogoUrl: null,
            }],
            meta: { canSwitchAccounts: true }
        } as any);

        const response = await GET(createGetRequest());
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.customers).toHaveLength(1);
        expect(payload.customers[0].id).toBe("tenant-1");
        expect(payload.viewerCapabilities?.canAccessManagedAccountWorkspace).toBe(true);
    });
});

describe("POST /api/agency/customers", () => {
    test("creates customer and auto-binds agencyId to caller", async () => {
        const adminAuth = {
            verifyIdToken: vi.fn().mockResolvedValue({ uid: "agency-7", role: "AGENCY_ADMIN" })
        };
        const adminDb = {
            collection: vi.fn().mockImplementation((name: string) => {
                if (name === "users") {
                    return {
                        doc: vi.fn().mockImplementation((id: string) => ({
                            get: vi.fn().mockResolvedValue({
                                exists: true,
                                data: () => (id === "agency-7" ? { role: "AGENCY_ADMIN" } : {})
                            })
                        }))
                    };
                }
                throw new Error(`Unexpected collection ${name}`);
            })
        };

        vi.mocked(getAdminAuth).mockReturnValue(adminAuth as any);
        vi.mocked(getAdminDb).mockReturnValue(adminDb as any);
        vi.mocked(getPartnerDoc).mockResolvedValue({
            id: "agency-7",
            partnerLevel: "solution_partner",
            capabilities: {
                canCreateManagedAccounts: true,
                canAccessManagedAccountWorkspace: true,
                canAssignManagedAccounts: true,
                canSwitchOmniAccounts: true,
                canUsePartnerBranding: false,
            }
        } as any);
        vi.mocked(provisionTenantAccount).mockResolvedValue({ userId: "tenant-7" });

        const response = await POST(createPostRequest({
            email: "tenant@example.com",
            password: "123456",
            companyName: "Acme"
        }));

        expect(response.status).toBe(200);
        expect(provisionTenantAccount).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.objectContaining({
                agencyId: "agency-7",
                agencyAssignedBy: "agency-7"
            })
        );
    });

    test("blocks basic partner level from creating customers", async () => {
        const adminAuth = {
            verifyIdToken: vi.fn().mockResolvedValue({ uid: "agency-7", role: "AGENCY_ADMIN" })
        };
        const adminDb = {
            collection: vi.fn().mockImplementation((name: string) => {
                if (name === "users") {
                    return {
                        doc: vi.fn().mockImplementation(() => ({
                            get: vi.fn().mockResolvedValue({
                                exists: true,
                                data: () => ({ role: "AGENCY_ADMIN", partnerLevel: "partner" })
                            })
                        }))
                    };
                }
                throw new Error(`Unexpected collection ${name}`);
            })
        };

        vi.mocked(getAdminAuth).mockReturnValue(adminAuth as any);
        vi.mocked(getAdminDb).mockReturnValue(adminDb as any);
        vi.mocked(getPartnerDoc).mockResolvedValue({
            id: "agency-7",
            partnerLevel: "partner",
            capabilities: {
                canCreateManagedAccounts: false,
                canAccessManagedAccountWorkspace: false,
                canAssignManagedAccounts: false,
                canSwitchOmniAccounts: false,
                canUsePartnerBranding: false,
            }
        } as any);

        const response = await POST(createPostRequest({
            email: "tenant@example.com",
            password: "123456",
            companyName: "Acme"
        }));

        expect(response.status).toBe(403);
        expect(provisionTenantAccount).not.toHaveBeenCalled();
    });
});
