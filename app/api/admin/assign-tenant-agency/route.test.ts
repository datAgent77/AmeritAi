import { beforeEach, describe, expect, test, vi } from "vitest";
import { POST } from "./route";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

vi.mock("@/lib/firebase-admin", () => ({
    getAdminAuth: vi.fn(),
    getAdminDb: vi.fn()
}));

vi.mock("@/lib/server-event-log", () => ({
    buildActorFromRequest: vi.fn(() => ({ uid: "actor" })),
    logPlatformEvent: vi.fn()
}));

type UserDocMap = Record<string, Record<string, unknown>>;

function createAdminDb(userDocs: UserDocMap) {
    const setSpy = vi.fn().mockResolvedValue(undefined);

    const collectionFn = vi.fn().mockImplementation((name: string) => {
        if (name !== "users") {
            throw new Error(`Unexpected collection ${name}`);
        }
        return {
            doc: vi.fn().mockImplementation((id: string) => ({
                get: vi.fn().mockResolvedValue({
                    exists: Boolean(userDocs[id]),
                    data: () => userDocs[id]
                }),
                set: setSpy
            }))
        };
    });

    return { db: { collection: collectionFn }, setSpy };
}

function createRequest(body: Record<string, unknown>) {
    return new Request("http://localhost/api/admin/assign-tenant-agency", {
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

describe("POST /api/admin/assign-tenant-agency", () => {
    test("rejects non-super-admin caller", async () => {
        const adminAuth = {
            verifyIdToken: vi.fn().mockResolvedValue({ uid: "caller-1", role: "USER" })
        };
        const { db } = createAdminDb({
            "caller-1": { role: "USER" }
        });

        vi.mocked(getAdminAuth).mockReturnValue(adminAuth as any);
        vi.mocked(getAdminDb).mockReturnValue(db as any);

        const response = await POST(createRequest({ tenantId: "tenant-1", agencyId: "agency-1" }));

        expect(response.status).toBe(403);
    });

    test("assigns agency to tenant for super admin", async () => {
        const adminAuth = {
            verifyIdToken: vi.fn().mockResolvedValue({ uid: "super-1", role: "SUPER_ADMIN" })
        };
        const { db, setSpy } = createAdminDb({
            "super-1": { role: "SUPER_ADMIN" },
            "tenant-1": { role: "TENANT_ADMIN" },
            "agency-1": { role: "AGENCY_ADMIN" }
        });

        vi.mocked(getAdminAuth).mockReturnValue(adminAuth as any);
        vi.mocked(getAdminDb).mockReturnValue(db as any);

        const response = await POST(createRequest({ tenantId: "tenant-1", agencyId: "agency-1" }));

        expect(response.status).toBe(200);
        expect(setSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                agencyId: "agency-1",
                agencyAssignedBy: "super-1"
            }),
            { merge: true }
        );
    });
});
