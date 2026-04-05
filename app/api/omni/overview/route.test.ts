import { beforeEach, describe, expect, test, vi } from "vitest"
import { GET } from "./route"
import { listOmniAuditEvents } from "@/lib/omni/audit-log"
import { authorizeOmniRequest, getOmniChannelConfig, getRequestOrigin, normalizeVoiceIntegrationConfig } from "@/lib/omni/server-utils"
import { buildVoiceReadiness, normalizeVoiceNumberRecords } from "@/lib/omni/voice-config"

vi.mock("@/lib/omni/audit-log", () => ({
    listOmniAuditEvents: vi.fn(),
}))

vi.mock("@/lib/omni/voice-config", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/voice-config")>("@/lib/omni/voice-config")
    return {
        ...actual,
        buildVoiceReadiness: vi.fn(),
        normalizeVoiceNumberRecords: vi.fn(),
    }
})

vi.mock("@/lib/omni/server-utils", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/server-utils")>("@/lib/omni/server-utils")
    return {
        ...actual,
        authorizeOmniRequest: vi.fn(),
        getOmniChannelConfig: vi.fn(),
        getRequestOrigin: vi.fn(),
        normalizeVoiceIntegrationConfig: vi.fn(),
    }
})

function createDoc(id: string, data: Record<string, unknown>) {
    return {
        id,
        data: () => data,
        exists: true,
    }
}

function createAdminDb() {
    return {
        collection: vi.fn(),
    }
}

function attachCollections(adminDb: any) {
    adminDb.collection.mockImplementation((name: string) => {
        if (name === "users") {
            return {
                doc: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue(createDoc("tenant-1", { companyName: "Acme" })),
                }),
            }
        }

        return {
            where: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({
                    docs:
                        name === "chat_sessions"
                            ? [
                                  createDoc("session-1", {
                                      chatbotId: "tenant-1",
                                      channel: "web",
                                      createdAt: "2026-04-01T10:00:00.000Z",
                                      updatedAt: "2026-04-01T10:05:00.000Z",
                                  }),
                              ]
                            : [],
                }),
            }),
        }
    })
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getRequestOrigin).mockReturnValue("https://preview.example.com")
    vi.mocked(listOmniAuditEvents).mockResolvedValue([
        {
            id: "audit-1",
            channel: "voice",
            eventType: "voice.call_status",
            result: "error",
            message: "Call failed",
            createdAt: "2026-04-01T10:10:00.000Z",
        },
    ] as any)
    vi.mocked(normalizeVoiceIntegrationConfig).mockReturnValue({ enabled: true } as any)
    vi.mocked(normalizeVoiceNumberRecords).mockReturnValue([])
    vi.mocked(buildVoiceReadiness).mockReturnValue({
        enabled: true,
        ready: true,
        blockers: [],
    } as any)
})

describe("GET /api/omni/overview", () => {
    test("denies access without dashboard.view permission", async () => {
        vi.mocked(authorizeOmniRequest).mockResolvedValue({
            ok: true,
            adminDb: createAdminDb(),
            callerPermissions: [],
        } as any)

        const response = await GET(new Request("https://preview.example.com/api/omni/overview?chatbotId=tenant-1"))
        expect(response.status).toBe(403)
    })

    test("returns workspace overview payload", async () => {
        const adminDb = createAdminDb()
        attachCollections(adminDb)

        vi.mocked(authorizeOmniRequest).mockResolvedValue({
            ok: true,
            adminDb,
            callerPermissions: ["dashboard.view"],
        } as any)
        vi.mocked(getOmniChannelConfig).mockResolvedValue({
            assistantCore: {
                assistantProfiles: [{ id: "omni-default", name: "Default", active: true }],
            },
            web: { enabled: true },
            whatsapp: { enabled: false },
            instagram: { enabled: false },
            voiceIntegration: { enabled: true },
        } as any)

        const response = await GET(new Request("https://preview.example.com/api/omni/overview?chatbotId=tenant-1&range=7d&granularity=day"))
        expect(response.status).toBe(200)

        const payload = await response.json()
        expect(payload.filters.range).toBe("7d")
        expect(payload.headline.conversationCount).toBe(1)
        expect(payload.criticalEvents).toHaveLength(1)
        expect(payload.availableAgents[0].id).toBe("omni-default")
    })
})
