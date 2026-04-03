import { beforeEach, describe, expect, test, vi } from "vitest"
import { POST } from "./route"
import { authorizeOmniRequest, getOmniChannelConfig, mergeOmniChannelConfig } from "@/lib/omni/server-utils"

vi.mock("@/lib/omni/server-utils", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/server-utils")>("@/lib/omni/server-utils")
    return {
        ...actual,
        authorizeOmniRequest: vi.fn(),
        getOmniChannelConfig: vi.fn(),
        mergeOmniChannelConfig: vi.fn(),
    }
})

function createDoc(data: Record<string, unknown>, exists = true) {
    return {
        exists,
        data: () => data,
    }
}

function createAdminDb() {
    return {
        collection: vi.fn().mockImplementation((name: string) => {
            if (name === "omni_migration_snapshots") {
                return {
                    add: vi.fn().mockResolvedValue({ id: "snapshot-1" }),
                }
            }

            if (name === "chatbots") {
                return {
                    doc: vi.fn().mockImplementation(() => ({
                        get: vi.fn().mockResolvedValue(
                            createDoc({
                                companyName: "Acme",
                                welcomeMessage: "Merhaba",
                                customPrompts: "Net konus",
                                integrations: {
                                    whatsapp: {
                                        connected: true,
                                        phoneNumberId: "legacy-phone",
                                        accessToken: "legacy-token",
                                        verifyToken: "legacy-verify",
                                    },
                                },
                            })
                        ),
                    })),
                }
            }

            if (name === "users") {
                return {
                    doc: vi.fn().mockImplementation(() => ({
                        get: vi.fn().mockResolvedValue(createDoc({ companyName: "Acme User" })),
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

describe("POST /api/omni/migration-sync", () => {
    test("syncs legacy whatsapp and brand context into omni config", async () => {
        vi.mocked(authorizeOmniRequest).mockResolvedValue({
            ok: true,
            adminDb: createAdminDb(),
            callerUid: "tenant-1",
            isSuperAdmin: false,
            isAgencyAdmin: false,
        } as any)
        vi.mocked(getOmniChannelConfig).mockResolvedValue({
            whatsapp: {},
            assistantCore: {},
            operations: {},
        } as any)
        vi.mocked(mergeOmniChannelConfig).mockResolvedValue({
            whatsapp: {
                phoneNumberId: "legacy-phone",
            },
            assistantCore: {
                brandVoicePrompt: "Company: Acme\nWelcome message: Merhaba\nLegacy custom prompts: Net konus",
            },
            operations: {
                workspaceLabel: "Acme",
            },
            migration: {
                lastAppliedActions: ["sync_legacy_whatsapp", "sync_brand_context", "sync_workspace_label"],
            },
        } as any)

        const response = await POST(
            new Request("http://localhost/api/omni/migration-sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chatbotId: "tenant-1",
                    action: "run_all",
                }),
            })
        )

        expect(response.status).toBe(200)
        expect(mergeOmniChannelConfig).toHaveBeenCalledWith(
            expect.anything(),
            "tenant-1",
            expect.objectContaining({
                whatsapp: expect.objectContaining({
                    phoneNumberId: "legacy-phone",
                }),
                operations: expect.objectContaining({
                    workspaceLabel: "Acme",
                }),
            })
        )
        const payload = await response.json()
        expect(payload.ok).toBe(true)
        expect(payload.snapshotId).toBe("snapshot-1")
        expect(payload.applied).toEqual(expect.arrayContaining(["sync_legacy_whatsapp", "sync_brand_context", "sync_workspace_label"]))
    })
})
