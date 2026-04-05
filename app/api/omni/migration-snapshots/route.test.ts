import { beforeEach, describe, expect, test, vi } from "vitest"
import { GET } from "./route"
import { authorizeOmniRequest } from "@/lib/omni/server-utils"

vi.mock("@/lib/omni/server-utils", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/server-utils")>("@/lib/omni/server-utils")
    return {
        ...actual,
        authorizeOmniRequest: vi.fn(),
    }
})

function createDoc(id: string, data: Record<string, unknown>) {
    return {
        id,
        data: () => data,
    }
}

function createAdminDb() {
    const docs = [
        {
            id: "snapshot-1",
            chatbotId: "tenant-1",
            source: "migration-sync",
            action: "run_all",
            applied: ["sync_legacy_whatsapp"],
            config: {
                whatsapp: { phoneNumberId: "phone-1" },
                assistantCore: { brandVoicePrompt: "Acme prompt" },
                operations: { workspaceLabel: "Acme" },
            },
            createdAt: "2026-03-28T12:00:00.000Z",
        },
        {
            id: "snapshot-2",
            chatbotId: "tenant-1",
            source: "migration-sync",
            action: "sync_brand_context",
            applied: ["sync_brand_context"],
            config: {
                whatsapp: {},
                assistantCore: { brandVoicePrompt: "" },
                operations: { workspaceLabel: "" },
            },
            createdAt: "2026-03-28T11:00:00.000Z",
            restoredAt: "2026-03-28T11:30:00.000Z",
            restoreCount: 1,
        },
    ]

    return {
        collection: vi.fn().mockImplementation((name: string) => {
            if (name !== "omni_migration_snapshots") {
                throw new Error(`Unexpected collection: ${name}`)
            }

            return {
                where: vi.fn().mockImplementation((_field: string, _op: string, value: string) => ({
                    limit: vi.fn().mockImplementation(() => ({
                        get: vi.fn().mockResolvedValue({
                            docs: docs.filter((doc) => doc.chatbotId === value).map((doc) => createDoc(doc.id, doc)),
                        }),
                    })),
                })),
            }
        }),
    }
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe("GET /api/omni/migration-snapshots", () => {
    test("returns recent migration snapshots with summary", async () => {
        vi.mocked(authorizeOmniRequest).mockResolvedValue({
            ok: true,
            adminDb: createAdminDb(),
            callerUid: "tenant-1",
            isSuperAdmin: false,
            isAgencyAdmin: false,
        } as any)

        const response = await GET(new Request("http://localhost/api/omni/migration-snapshots?chatbotId=tenant-1"))
        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.summary.total).toBe(2)
        expect(payload.summary.restored).toBe(1)
        expect(payload.snapshots[0].id).toBe("snapshot-1")
        expect(payload.snapshots[0].configSummary.whatsappPhoneNumberId).toBe("phone-1")
        expect(payload.snapshots[0].configSummary.hasBrandVoicePrompt).toBe(true)
    })

    test("returns 400 when chatbotId is missing", async () => {
        const response = await GET(new Request("http://localhost/api/omni/migration-snapshots"))
        expect(response.status).toBe(400)
    })
})
