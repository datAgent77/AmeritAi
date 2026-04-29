import { beforeEach, describe, expect, test, vi } from "vitest";
import { authorizeTargetAccess } from "./api-auth";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

vi.mock("@/lib/firebase-admin", () => ({
    getAdminAuth: vi.fn(),
    getAdminDb: vi.fn()
}));

type UserDoc = {
    role?: string;
    agencyId?: string | null;
    partnerLevel?: string;
    agentTenantId?: string | null;
};

function createUsersDb(users: Record<string, UserDoc>) {
    return {
        collection: vi.fn().mockImplementation((name: string) => {
            if (name !== "users") {
                throw new Error(`Unexpected collection: ${name}`);
            }
            return {
                doc: vi.fn().mockImplementation((id: string) => ({
                    get: vi.fn().mockResolvedValue({
                        exists: Boolean(users[id]),
                        data: () => users[id]
                    })
                }))
            };
        })
    };
}

function createRequest(token: string) {
    return new Request("http://localhost/api/test", {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("authorizeTargetAccess", () => {
    test("allows AGENCY_ADMIN to access their own tenant", async () => {
        const verifyIdToken = vi.fn().mockResolvedValue({ uid: "agency-1", role: "AGENCY_ADMIN" });
        vi.mocked(getAdminAuth).mockReturnValue({ verifyIdToken } as any);
        vi.mocked(getAdminDb).mockReturnValue(
            createUsersDb({
                "agency-1": { role: "AGENCY_ADMIN" },
                "tenant-1": { role: "TENANT_ADMIN", agencyId: "agency-1" }
            }) as any
        );

        const result = await authorizeTargetAccess(createRequest("agency-token"), "tenant-1");

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.isAgencyAdmin).toBe(true);
            expect(result.isSuperAdmin).toBe(false);
        }
    });

    test("denies AGENCY_ADMIN when tenant belongs to another agency", async () => {
        const verifyIdToken = vi.fn().mockResolvedValue({ uid: "agency-1", role: "AGENCY_ADMIN" });
        vi.mocked(getAdminAuth).mockReturnValue({ verifyIdToken } as any);
        vi.mocked(getAdminDb).mockReturnValue(
            createUsersDb({
                "agency-1": { role: "AGENCY_ADMIN" },
                "tenant-2": { role: "TENANT_ADMIN", agencyId: "agency-2" }
            }) as any
        );

        const result = await authorizeTargetAccess(createRequest("agency-token"), "tenant-2");

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.response.status).toBe(403);
        }
    });

    test("denies basic partner level from entering managed account workspaces", async () => {
        const verifyIdToken = vi.fn().mockResolvedValue({ uid: "agency-1", role: "AGENCY_ADMIN" });
        vi.mocked(getAdminAuth).mockReturnValue({ verifyIdToken } as any);
        vi.mocked(getAdminDb).mockReturnValue(
            createUsersDb({
                "agency-1": { role: "AGENCY_ADMIN", partnerLevel: "partner" },
                "tenant-1": { role: "TENANT_ADMIN", agencyId: "agency-1" }
            }) as any
        );

        const result = await authorizeTargetAccess(createRequest("agency-token"), "tenant-1");

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.response.status).toBe(403);
        }
    });

    test("allows SUPER_ADMIN to access any tenant", async () => {
        const verifyIdToken = vi.fn().mockResolvedValue({ uid: "super-1", role: "SUPER_ADMIN" });
        vi.mocked(getAdminAuth).mockReturnValue({ verifyIdToken } as any);
        vi.mocked(getAdminDb).mockReturnValue(
            createUsersDb({
                "super-1": { role: "SUPER_ADMIN" },
                "tenant-1": { role: "TENANT_ADMIN", agencyId: null }
            }) as any
        );

        const result = await authorizeTargetAccess(createRequest("super-token"), "tenant-1");

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.isSuperAdmin).toBe(true);
            expect(result.isAgencyAdmin).toBe(false);
        }
    });

    test("allows TENANT_ADMIN only for self access", async () => {
        const verifyIdToken = vi.fn().mockResolvedValue({ uid: "tenant-1", role: "TENANT_ADMIN" });
        vi.mocked(getAdminAuth).mockReturnValue({ verifyIdToken } as any);
        vi.mocked(getAdminDb).mockReturnValue(
            createUsersDb({
                "tenant-1": { role: "TENANT_ADMIN", agencyId: null }
            }) as any
        );

        const result = await authorizeTargetAccess(createRequest("tenant-token"), "tenant-1");

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.isSuperAdmin).toBe(false);
            expect(result.isAgencyAdmin).toBe(false);
        }
    });

    test("allows AGENT to access assigned tenant workspace", async () => {
        const verifyIdToken = vi.fn().mockResolvedValue({ uid: "agent-1", role: "AGENT" });
        vi.mocked(getAdminAuth).mockReturnValue({ verifyIdToken } as any);
        vi.mocked(getAdminDb).mockReturnValue(
            createUsersDb({
                "agent-1": { role: "AGENT", agentTenantId: "tenant-1" },
                "tenant-1": { role: "TENANT_ADMIN", agencyId: "agency-1" }
            }) as any
        );

        const result = await authorizeTargetAccess(createRequest("agent-token"), "tenant-1");

        expect(result.ok).toBe(true);
    });

    test("denies AGENT for non-assigned tenant workspace", async () => {
        const verifyIdToken = vi.fn().mockResolvedValue({ uid: "agent-1", role: "AGENT" });
        vi.mocked(getAdminAuth).mockReturnValue({ verifyIdToken } as any);
        vi.mocked(getAdminDb).mockReturnValue(
            createUsersDb({
                "agent-1": { role: "AGENT", agentTenantId: "tenant-1" },
                "tenant-2": { role: "TENANT_ADMIN", agencyId: "agency-1" }
            }) as any
        );

        const result = await authorizeTargetAccess(createRequest("agent-token"), "tenant-2");

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.response.status).toBe(403);
        }
    });

    test("denies inactive AGENT for assigned tenant workspace", async () => {
        const verifyIdToken = vi.fn().mockResolvedValue({ uid: "agent-1", role: "AGENT" });
        vi.mocked(getAdminAuth).mockReturnValue({ verifyIdToken } as any);
        vi.mocked(getAdminDb).mockReturnValue(
            createUsersDb({
                "agent-1": { role: "AGENT", agentTenantId: "tenant-1", isActive: false },
                "tenant-1": { role: "TENANT_ADMIN", agencyId: "agency-1" }
            }) as any
        );

        const result = await authorizeTargetAccess(createRequest("agent-token"), "tenant-1");

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.response.status).toBe(403);
        }
    });
});
