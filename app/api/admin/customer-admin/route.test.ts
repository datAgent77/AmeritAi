import { beforeEach, describe, expect, test, vi } from "vitest";
import { GET, PUT } from "./route";
import { getAdminDb } from "@/lib/firebase-admin";
import { authorizeTargetAccess } from "@/lib/api-auth";

vi.mock("firebase-admin/auth", () => ({
    getAuth: vi.fn(() => ({
        verifyIdToken: vi.fn().mockResolvedValue({ uid: "super-1" }),
    })),
}));

vi.mock("@/lib/firebase-admin", () => ({
    getAdminDb: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
    authorizeTargetAccess: vi.fn(),
}));

function request(path: string, body?: Record<string, unknown>) {
    return new Request(`http://localhost${path}`, {
        method: body ? "PUT" : "GET",
        headers: {
            Authorization: "Bearer test-token",
            ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
}

function querySnapshot(docs: Array<Record<string, any>>) {
    return {
        docs: docs.map((data) => ({ data: () => data })),
        size: docs.length,
    };
}

function createAdminDb(userData: Record<string, any>) {
    const update = vi.fn().mockResolvedValue(undefined);
    const snapshots: Record<string, any> = {
        knowledge_docs: querySnapshot([{ type: "file" }, { type: "url" }]),
        chat_sessions: querySnapshot([{ messages: [{}, {}] }, { messages: [{}] }]),
        leads: querySnapshot([{}, {}, {}]),
        appointments: querySnapshot([{}]),
    };

    const collection = vi.fn().mockImplementation((name: string) => {
        if (name === "users") {
            return {
                doc: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue({
                        exists: true,
                        id: "tenant-1",
                        data: () => userData,
                    }),
                    update,
                }),
            };
        }

        if (snapshots[name]) {
            return {
                where: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue(snapshots[name]),
                }),
            };
        }

        throw new Error(`Unexpected collection: ${name}`);
    });

    vi.mocked(getAdminDb).mockReturnValue({ collection } as any);
    return { update, collection };
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authorizeTargetAccess).mockResolvedValue({
        ok: true,
        isSuperAdmin: true,
        isAgencyAdmin: false,
    } as any);
});

describe("GET /api/admin/customer-admin", () => {
    test("normalizes legacy membership fields into Vion subscription state", async () => {
        createAdminDb({
            email: "tenant@example.com",
            createdAt: "2026-05-01T00:00:00.000Z",
            role: "TENANT_ADMIN",
            isActive: true,
            plan: "pro",
            billingCycle: "yearly",
            entitlements: {
                trial: { isActive: false, endAt: null },
            },
        });

        const response = await GET(request("/api/admin/customer-admin?userId=tenant-1"));
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.subscription).toMatchObject({
            planId: "growth",
            status: "active",
            billingStatus: "paid",
            billingPeriod: "yearly",
        });
        expect(payload.resourceUsage).toEqual({
            messageCount: 3,
            conversationCount: 2,
            knowledgeFiles: 1,
            knowledgeWebsites: 1,
            leadsCount: 3,
            appointmentsCount: 1,
        });
    });
});

describe("PUT /api/admin/customer-admin", () => {
    test("coerces paid trial updates to active Scale membership and syncs entitlement fields", async () => {
        const { update } = createAdminDb({
            industry: "ecommerce",
        });

        const response = await PUT(request("/api/admin/customer-admin", {
            userId: "tenant-1",
            subscription: {
                planId: "pro",
                status: "trial",
                billingStatus: "paid",
                billingPeriod: "monthly",
                trialEndsAt: "2026-05-30T00:00:00.000Z",
                currentPeriodEnd: "2026-06-30T00:00:00.000Z",
            },
        }));
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.subscription).toMatchObject({
            planId: "growth",
            status: "active",
            trialEndsAt: null,
            updatedBy: "super-1",
        });
        expect(update).toHaveBeenCalledWith(expect.objectContaining({
            planId: "growth",
            subscriptionStatus: "active",
            trialEndsAt: null,
            currentPeriodEnd: "2026-06-30T00:00:00.000Z",
            "entitlements.planId": "growth",
            "entitlements.trial.isActive": false,
            "entitlements.trial.endAt": null,
        }));
    });
});
