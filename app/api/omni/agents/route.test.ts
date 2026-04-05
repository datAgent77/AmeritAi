import { beforeEach, describe, expect, test, vi } from "vitest"
import { GET } from "./route"
import { authorizeOmniRequest, getOmniChannelConfig } from "@/lib/omni/server-utils"

vi.mock("@/lib/omni/server-utils", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/server-utils")>("@/lib/omni/server-utils")
    return {
        ...actual,
        authorizeOmniRequest: vi.fn(),
        getOmniChannelConfig: vi.fn(),
    }
})

function createDoc(id: string, data: Record<string, unknown>) {
    return {
        id,
        data: () => data,
    }
}

function createAdminDb() {
    return {
        collection: vi.fn(),
    }
}

function attachCollections(adminDb: any) {
    adminDb.collection.mockImplementation((name: string) => ({
        where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
                docs:
                    name === "chat_sessions"
                        ? [
                              createDoc("session-1", {
                                  chatbotId: "tenant-1",
                                  channel: "web",
                                  assistantProfileId: "sales",
                                  createdAt: "2026-04-01T10:00:00.000Z",
                                  updatedAt: "2026-04-01T10:03:00.000Z",
                              }),
                          ]
                        : [],
            }),
        }),
    }))
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe("GET /api/omni/agents", () => {
    test("denies access without aiCore.view permission", async () => {
        vi.mocked(authorizeOmniRequest).mockResolvedValue({
            ok: true,
            adminDb: createAdminDb(),
            callerPermissions: [],
        } as any)

        const response = await GET(new Request("https://preview.example.com/api/omni/agents?chatbotId=tenant-1"))
        expect(response.status).toBe(403)
    })

    test("returns derived workspace agent summaries", async () => {
        const adminDb = createAdminDb()
        attachCollections(adminDb)

        vi.mocked(authorizeOmniRequest).mockResolvedValue({
            ok: true,
            adminDb,
            callerPermissions: ["aiCore.view"],
        } as any)
        vi.mocked(getOmniChannelConfig).mockResolvedValue({
            assistantCore: {
                assistantProfiles: [
                    { id: "omni-default", name: "Default", active: true },
                    { id: "sales", name: "Sales", active: true },
                ],
                channelAssistantProfiles: {
                    web: "sales",
                    whatsapp: "omni-default",
                    instagram: "omni-default",
                    voice: "omni-default",
                },
            },
        } as any)

        const response = await GET(new Request("https://preview.example.com/api/omni/agents?chatbotId=tenant-1"))
        expect(response.status).toBe(200)

        const payload = await response.json()
        expect(payload.agents).toHaveLength(2)
        expect(payload.agents.find((agent: any) => agent.id === "sales")?.conversationVolume).toBe(1)
    })
})
