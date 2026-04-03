import { beforeEach, describe, expect, test, vi } from "vitest"
import { POST } from "./route"
import { authorizeOmniRequest } from "@/lib/omni/server-utils"

vi.mock("@/lib/omni/server-utils", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/server-utils")>("@/lib/omni/server-utils")
    return {
        ...actual,
        authorizeOmniRequest: vi.fn(),
    }
})

function createDoc(data: Record<string, unknown>, exists = true) {
    return {
        exists,
        data: () => data,
    }
}

function createAdminDb() {
    const snapshotSet = vi.fn().mockResolvedValue(undefined)
    const configSet = vi.fn().mockResolvedValue(undefined)

    return {
        collection: vi.fn().mockImplementation((name: string) => {
            if (name === "omni_migration_snapshots") {
                return {
                    doc: vi.fn().mockImplementation((id: string) => ({
                        get: vi.fn().mockResolvedValue(
                            createDoc({
                                chatbotId: "tenant-1",
                                source: "migration-sync",
                                action: "run_all",
                                applied: ["sync_legacy_whatsapp", "sync_brand_context"],
                                config: {
                                    whatsapp: { phoneNumberId: "restored-phone" },
                                    assistantCore: { brandVoicePrompt: "Restored prompt" },
                                    operations: { workspaceLabel: "Restored workspace" },
                                    migration: { lastSyncedAt: "2026-03-28T09:00:00.000Z" },
                                },
                                restoreCount: 1,
                            })
                        ),
                        set: snapshotSet,
                        id,
                    })),
                }
            }

            if (name === "omni_channel_configs") {
                return {
                    doc: vi.fn().mockImplementation(() => ({
                        set: configSet,
                        get: vi.fn().mockResolvedValue(
                            createDoc({
                                chatbotId: "tenant-1",
                                whatsapp: { phoneNumberId: "restored-phone" },
                                assistantCore: { brandVoicePrompt: "Restored prompt" },
                                operations: { workspaceLabel: "Restored workspace" },
                                migration: {
                                    lastRestoredSnapshotId: "snapshot-1",
                                },
                            })
                        ),
                    })),
                }
            }

            throw new Error(`Unexpected collection: ${name}`)
        }),
    }
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe("POST /api/omni/migration-restore", () => {
    test("restores a stored migration snapshot", async () => {
        const adminDb = createAdminDb()
        vi.mocked(authorizeOmniRequest).mockResolvedValue({
            ok: true,
            adminDb,
            callerUid: "user-1",
            isSuperAdmin: false,
            isAgencyAdmin: false,
        } as any)

        const response = await POST(
            new Request("http://localhost/api/omni/migration-restore", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chatbotId: "tenant-1",
                    snapshotId: "snapshot-1",
                }),
            })
        )

        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.ok).toBe(true)
        expect(payload.snapshotId).toBe("snapshot-1")
        expect(payload.whatsapp.phoneNumberId).toBe("restored-phone")
        const configSet = adminDb.collection("omni_channel_configs").doc().set
        expect(configSet).toHaveBeenCalledWith(
            expect.objectContaining({
                chatbotId: "tenant-1",
                whatsapp: expect.objectContaining({
                    phoneNumberId: "restored-phone",
                }),
            }),
            expect.objectContaining({
                mergeFields: expect.arrayContaining(["whatsapp", "assistantCore", "operations", "migration"]),
            })
        )
        const snapshotSet = adminDb.collection("omni_migration_snapshots").doc("snapshot-1").set
        expect(snapshotSet).toHaveBeenCalledWith(
            expect.objectContaining({
                lastRestoreBy: "user-1",
                restoreCount: 2,
            }),
            { merge: true }
        )
    })

    test("returns 400 when snapshotId is missing", async () => {
        const response = await POST(
            new Request("http://localhost/api/omni/migration-restore", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chatbotId: "tenant-1",
                }),
            })
        )

        expect(response.status).toBe(400)
    })
})
