import { beforeEach, describe, expect, test, vi } from "vitest";
import { GET } from "./route";
import { POST as postSector } from "./sector/route";
import { POST as postPlan } from "./plan/route";
import { POST as postKnowledge } from "./knowledge/route";
import { POST as postWidget } from "./widget/route";
import { POST as postComplete } from "./complete/route";
import { POST as postVerifyInstall } from "./verify-install/route";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { getDefaultModulesForSector } from "@/lib/modules-registry";
import { getPlan } from "@/lib/pricing-config";

vi.mock("@/lib/firebase-admin", () => ({
    getAdminAuth: vi.fn(),
    getAdminDb: vi.fn(),
}));

vi.mock("@/lib/server-event-log", () => ({
    buildActorFromRequest: vi.fn(() => ({ uid: "actor" })),
    logPlatformEvent: vi.fn(),
}));

type TestDbOptions = {
    userData?: Record<string, any>;
    userExists?: boolean;
};

function request(path: string, body?: Record<string, unknown>, headers: Record<string, string> = {}) {
    return new Request(`http://localhost${path}`, {
        method: body ? "POST" : "GET",
        headers: {
            Authorization: "Bearer test-token",
            ...(body ? { "Content-Type": "application/json" } : {}),
            ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
    });
}

function createTestDb(options: TestDbOptions = {}) {
    const userUpdate = vi.fn().mockResolvedValue(undefined);
    const chatbotUpdate = vi.fn().mockResolvedValue(undefined);
    const userData = options.userData ?? {};
    const userExists = options.userExists ?? true;

    const collection = vi.fn().mockImplementation((name: string) => ({
        doc: vi.fn().mockImplementation(() => {
            if (name === "users") {
                return {
                    get: vi.fn().mockResolvedValue({
                        exists: userExists,
                        id: "tenant-1",
                        data: () => userData,
                    }),
                    update: userUpdate,
                };
            }

            if (name === "chatbots") {
                return {
                    update: chatbotUpdate,
                };
            }

            throw new Error(`Unexpected collection ${name}`);
        }),
    }));

    const db = { collection };
    vi.mocked(getAdminDb).mockReturnValue(db as any);

    return { db, collection, userUpdate, chatbotUpdate };
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.mocked(getAdminAuth).mockReturnValue({
        verifyIdToken: vi.fn().mockResolvedValue({ uid: "tenant-1" }),
    } as any);
});

describe("AmeritAI onboarding API", () => {
    test("GET returns 401 without a bearer token", async () => {
        createTestDb();

        const response = await GET(new Request("http://localhost/api/onboarding"));

        expect(response.status).toBe(401);
    });

    test("GET returns onboarding state with plan and entitlements for resume", async () => {
        createTestDb({
            userData: {
                onboarding: {
                    status: "in_progress",
                    currentStep: 2,
                    completedSteps: ["sector", "plan"],
                },
                sector: "ecommerce",
                planId: "growth",
                entitlements: {
                    planId: "growth",
                    modules: { enabled: ["generalChatbot"], addOns: [] },
                },
                widget: { brandName: "Acme" },
                modules: { generalChatbot: { isEnabled: true } },
                knowledgeUrl: "https://example.com",
            },
        });

        const response = await GET(request("/api/onboarding"));
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            sector: "ecommerce",
            planId: "growth",
            entitlements: { planId: "growth" },
            widget: { brandName: "Acme" },
            knowledgeUrl: "https://example.com",
        });
    });

    test("sector step rejects invalid sectors", async () => {
        createTestDb();

        const response = await postSector(request("/api/onboarding/sector", { sector: "invalid" }));
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload.error).toBe("Validation failed");
    });

    test("sector step persists sector, default modules, and chatbot sector fields", async () => {
        const { userUpdate, chatbotUpdate } = createTestDb({
            userData: {
                entitlements: {
                    planId: "starter",
                    modules: { enabled: [], addOns: [] },
                    trial: { isActive: true, startAt: null, endAt: null },
                },
            },
        });

        const response = await postSector(request("/api/onboarding/sector", { sector: "restaurant" }));
        const payload = await response.json();
        const expectedDefaults = getDefaultModulesForSector("restaurant");

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            success: true,
            sector: "restaurant",
            enabledModules: expectedDefaults,
            nextStep: "plan",
        });
        expect(userUpdate).toHaveBeenCalledWith(expect.objectContaining({
            "entitlements.sectorId": "restaurant",
            "entitlements.modules.enabled": expectedDefaults,
            sector: "restaurant",
            sectorId: "restaurant",
            industry: "restaurant",
            "onboarding.status": "in_progress",
            "onboarding.currentStep": 1,
            "onboarding.completedSteps": expect.anything(),
        }));
        expect(chatbotUpdate).toHaveBeenCalledWith({
            sector: "restaurant",
            sectorId: "restaurant",
            industry: "restaurant",
        });
    });

    test("plan step rejects unknown plans and returns valid public plan ids", async () => {
        createTestDb();

        const response = await postPlan(request("/api/onboarding/plan", { planId: "invalid-plan" }));
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload.error).toBe("Invalid plan ID");
        expect(payload.validPlans).toEqual(["starter", "growth", "enterprise"]);
    });

    test("plan step normalizes legacy pro to growth and sets default modules", async () => {
        const { userUpdate, chatbotUpdate } = createTestDb({
            userData: {
                entitlements: {
                    modules: { addOns: ["humanHandoff"] },
                },
            },
        });
        const growthDefaults = getPlan("growth")?.modules.defaultEnabled ?? [];

        const response = await postPlan(request("/api/onboarding/plan", { planId: "pro" }));
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({ success: true, planId: "growth", nextStep: "knowledge" });
        expect(userUpdate).toHaveBeenCalledWith(expect.objectContaining({
            "entitlements.planId": "growth",
            "entitlements.modules": {
                enabled: growthDefaults,
                addOns: ["humanHandoff"],
            },
            planId: "growth",
            "onboarding.status": "in_progress",
            "onboarding.currentStep": 2,
            "onboarding.completedSteps": expect.anything(),
        }));
        expect(chatbotUpdate).toHaveBeenCalledWith({ planId: "growth" });
    });

    test("knowledge step enforces onboarding step order", async () => {
        createTestDb({
            userData: {
                onboarding: { completedSteps: ["sector"] },
            },
        });

        const response = await postKnowledge(request("/api/onboarding/knowledge", {
            url: "https://example.com",
            fullCrawl: true,
        }));

        expect(response.status).toBe(403);
    });

    test("knowledge step persists website training preferences", async () => {
        const { userUpdate } = createTestDb({
            userData: {
                onboarding: { completedSteps: ["sector", "plan"] },
            },
        });

        const response = await postKnowledge(request("/api/onboarding/knowledge", {
            url: "https://example.com",
            fullCrawl: true,
        }));
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({ success: true, nextStep: "widget" });
        expect(userUpdate).toHaveBeenCalledWith(expect.objectContaining({
            knowledgeUrl: "https://example.com",
            fullCrawlPreference: true,
            "onboarding.currentStep": 3,
            "onboarding.completedSteps": expect.anything(),
        }));
    });

    test("widget step blocks users that have not completed knowledge", async () => {
        createTestDb({
            userData: {
                onboarding: { completedSteps: ["sector", "plan"] },
            },
        });

        const response = await postWidget(request("/api/onboarding/widget", {
            brandName: "Acme",
            welcomeMessage: "Hello",
            brandColor: "#3366ff",
            position: "bottom-right",
        }));
        const payload = await response.json();

        expect(response.status).toBe(403);
        expect(payload.requiredSteps).toEqual(["sector", "plan", "knowledge"]);
    });

    test("widget step validates and syncs user widget plus chatbot branding", async () => {
        const { userUpdate, chatbotUpdate } = createTestDb({
            userData: {
                onboarding: { completedSteps: ["sector", "plan", "knowledge"] },
            },
        });

        const response = await postWidget(request("/api/onboarding/widget", {
            brandName: "  Acme Store  ",
            welcomeMessage: "  Merhaba  ",
            brandColor: "  #3366ff  ",
            position: "bottom-left",
        }));
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.widget).toEqual({
            brandName: "Acme Store",
            welcomeMessage: "Merhaba",
            brandColor: "#3366ff",
            position: "bottom-left",
        });
        expect(userUpdate).toHaveBeenCalledWith(expect.objectContaining({
            "widget.brandName": "Acme Store",
            "widget.welcomeMessage": "Merhaba",
            "widget.brandColor": "#3366ff",
            "widget.position": "bottom-left",
            "onboarding.currentStep": 4,
            "onboarding.completedSteps": expect.anything(),
        }));
        expect(chatbotUpdate).toHaveBeenCalledWith({
            companyName: "Acme Store",
            welcomeMessage: "Merhaba",
            brandColor: "#3366ff",
            position: "bottom-left",
        });
    });

    test("complete step lists all mandatory steps when completion is premature", async () => {
        createTestDb({
            userData: {
                onboarding: { completedSteps: ["sector", "plan"] },
            },
        });

        const response = await postComplete(request("/api/onboarding/complete", { completionType: "soft" }));
        const payload = await response.json();

        expect(response.status).toBe(403);
        expect(payload.requiredSteps).toEqual(["sector", "plan", "knowledge", "widget"]);
    });

    test("complete step supports soft launch completion", async () => {
        const { userUpdate } = createTestDb({
            userData: {
                onboarding: { completedSteps: ["sector", "plan", "knowledge", "widget"] },
            },
        });

        const response = await postComplete(request("/api/onboarding/complete", { completionType: "soft" }));
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            success: true,
            status: "completed_soft",
        });
        expect(userUpdate).toHaveBeenCalledWith(expect.objectContaining({
            "onboarding.status": "completed_soft",
            "onboarding.completedSteps": expect.anything(),
            "onboarding.completedAt": expect.anything(),
        }));
    });

    test("verify-install detects widget script and promotes completed_soft onboarding", async () => {
        const { userUpdate } = createTestDb({
            userData: {
                onboarding: { status: "completed_soft" },
            },
        });
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            text: vi.fn().mockResolvedValue('<script src="/widget.js" data-chatbot-id="tenant-1"></script> AmeritAI'),
        }));

        const response = await postVerifyInstall(request("/api/onboarding/verify-install", {
            websiteUrl: "https://example.com",
        }));
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.installed).toBe(true);
        expect(userUpdate).toHaveBeenCalledWith(expect.objectContaining({
            "widget.isInstalled": true,
            "widget.websiteUrl": "https://example.com",
        }));
        expect(userUpdate).toHaveBeenCalledWith({
            "onboarding.status": "completed",
        });
    });
});
