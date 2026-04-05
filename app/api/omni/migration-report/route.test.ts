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

function createDoc(data: Record<string, unknown>, exists = true) {
    return {
        exists,
        data: () => data,
    }
}

function createQueryDocs(docs: Array<Record<string, unknown>>) {
    return {
        docs: docs.map((doc, index) => ({
            id: `doc-${index + 1}`,
            data: () => doc,
        })),
    }
}

function createAdminDb() {
    return {
        collection: vi.fn().mockImplementation((name: string) => {
            if (name === "chatbots") {
                return {
                    doc: vi.fn().mockImplementation(() =>
                        ({
                            get: vi.fn().mockResolvedValue(
                                createDoc({
                                    companyName: "Acme",
                                    welcomeMessage: "Merhaba",
                                    customPrompts: "Kisa ve net konus",
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
                        }) as any
                    ),
                }
            }

            if (name === "users") {
                return {
                    doc: vi.fn().mockImplementation(() =>
                        ({
                            get: vi.fn().mockResolvedValue(createDoc({ companyName: "Acme User" })),
                        }) as any
                    ),
                }
            }

            if (name === "chat_sessions") {
                return {
                    where: vi.fn().mockImplementation(() => ({
                        limit: vi.fn().mockImplementation(() => ({
                            get: vi.fn().mockResolvedValue(
                                createQueryDocs([{ chatbotId: "tenant-1", channel: "web" }, { chatbotId: "tenant-1", channel: "voice" }])
                            ),
                        })),
                    })),
                }
            }

            if (name === "contact_graph") {
                return {
                    where: vi.fn().mockImplementation(() => ({
                        limit: vi.fn().mockImplementation(() => ({
                            get: vi.fn().mockResolvedValue(createQueryDocs([{ chatbotId: "tenant-1" }])),
                        })),
                    })),
                }
            }

            if (name === "callback_requests") {
                return {
                    where: vi.fn().mockImplementation(() => ({
                        limit: vi.fn().mockImplementation(() => ({
                            get: vi.fn().mockResolvedValue(createQueryDocs([{ chatbotId: "tenant-1" }])),
                        })),
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

describe("GET /api/omni/migration-report", () => {
    test("returns legacy parity and blockers", async () => {
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

        const response = await GET(new Request("http://localhost/api/omni/migration-report?chatbotId=tenant-1"))
        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.legacy.whatsapp.present).toBe(true)
        expect(payload.parity.whatsappConfigSynced).toBe(false)
        expect(payload.blockers).toEqual(expect.arrayContaining(["Legacy WhatsApp config var, Omni tarafina alinmamis."]))
        expect(payload.stats.sessions.byChannel.voice).toBe(1)
    })
})
