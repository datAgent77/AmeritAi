import { beforeEach, describe, expect, test, vi } from "vitest"
import { GET } from "./route"
import { getOmniContactMemory } from "@/lib/omni/memory"
import { authorizeOmniRequest } from "@/lib/omni/server-utils"

vi.mock("@/lib/omni/server-utils", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/server-utils")>("@/lib/omni/server-utils")
    return {
        ...actual,
        authorizeOmniRequest: vi.fn(),
    }
})

vi.mock("@/lib/omni/memory", () => ({
    getOmniContactMemory: vi.fn(),
}))

function createDoc(id: string, data: Record<string, unknown>) {
    return {
        id,
        data: () => data,
    }
}

function createQueryCollection(items: Array<Record<string, any>>) {
    return {
        where(field: string, _op: string, value: unknown) {
            const filtered = items.filter((item) => item[field] === value)
            return {
                where(nextField: string, _nextOp: string, nextValue: unknown) {
                    const nextFiltered = filtered.filter((item) => item[nextField] === nextValue)
                    return {
                        limit() {
                            return {
                                async get() {
                                    return {
                                        docs: nextFiltered.map((item) => createDoc(item.id, item)),
                                    }
                                },
                            }
                        },
                    }
                },
                limit() {
                    return {
                        async get() {
                            return {
                                docs: filtered.map((item) => createDoc(item.id, item)),
                            }
                        },
                    }
                },
            }
        },
    }
}

function createAdminDb() {
    const contacts = new Map<string, any>([
        [
            "contact-1",
            {
                id: "contact-1",
                chatbotId: "tenant-1",
                canonicalContactId: "contact-1",
                contactKey: "main-key",
                verifiedPhone: "+90 555 111 22 33",
                whatsappNumber: "+90 555 111 22 33",
                email: "user@example.com",
                instagramHandle: "insta-user",
                linkedContactKeys: ["alias-key"],
            },
        ],
        [
            "contact-source",
            {
                id: "contact-source",
                chatbotId: "tenant-1",
                canonicalContactId: "contact-source",
                contactKey: "legacy-instagram-user",
                instagramHandle: "legacy-instagram-user",
                mergedInto: "contact-target",
                linkedContactKeys: ["legacy-instagram-user"],
            },
        ],
        [
            "contact-target",
            {
                id: "contact-target",
                chatbotId: "tenant-1",
                canonicalContactId: "contact-target",
                contactKey: "+905559998877",
                verifiedPhone: "+905559998877",
                linkedContactIds: ["contact-source"],
                linkedContactKeys: ["legacy-instagram-user", "+905559998877"],
            },
        ],
    ])

    const chatSessions = [
        {
            id: "session-1",
            chatbotId: "tenant-1",
            contactKey: "main-key",
            canonicalContactId: "contact-1",
            channel: "whatsapp",
            transcriptSummary: "Conversation summary",
            lastDisposition: "auto_replied",
            createdAt: "2026-03-28T10:00:00.000Z",
            updatedAt: "2026-03-28T10:10:00.000Z",
        },
        {
            id: "session-merged-1",
            chatbotId: "tenant-1",
            contactKey: "legacy-instagram-user",
            canonicalContactId: "contact-source",
            channel: "instagram",
            transcriptSummary: "Legacy Instagram session",
            lastDisposition: "handoff_requested",
            createdAt: "2026-03-27T09:00:00.000Z",
            updatedAt: "2026-03-27T09:15:00.000Z",
        },
    ]

    const callbacks = [
        {
            id: "callback-1",
            chatbotId: "tenant-1",
            contactKey: "alias-key",
            canonicalContactId: "contact-1",
            sourceChannel: "voice",
            displayName: "Ayse",
            notes: "Requested callback",
            resolutionStatus: "open",
            sourceSessionId: "session-1",
            createdAt: "2026-03-28T10:20:00.000Z",
            updatedAt: "2026-03-28T10:21:00.000Z",
        },
        {
            id: "callback-merged-1",
            chatbotId: "tenant-1",
            contactKey: "+905559998877",
            canonicalContactId: "contact-source",
            sourceChannel: "voice",
            displayName: "Merged Contact",
            notes: "Requested from old contact",
            resolutionStatus: "open",
            sourceSessionId: "session-merged-1",
            createdAt: "2026-03-27T10:20:00.000Z",
            updatedAt: "2026-03-27T10:25:00.000Z",
        },
    ]

    const appointments = [
        {
            id: "appointment-1",
            chatbotId: "tenant-1",
            customerName: "Ayse",
            customerEmail: "user@example.com",
            customerPhone: "+905551112233",
            canonicalContactId: "contact-1",
            sourceChannel: "whatsapp",
            status: "confirmed",
            date: "2026-03-30",
            time: "14:00",
            sourceSessionId: "session-1",
            createdAt: "2026-03-28T10:30:00.000Z",
            updatedAt: "2026-03-28T10:35:00.000Z",
        },
        {
            id: "appointment-merged-1",
            chatbotId: "tenant-1",
            customerName: "Merged Contact",
            customerPhone: "+905559998877",
            canonicalContactId: "contact-source",
            sourceChannel: "voice",
            status: "pending",
            date: "2026-03-31",
            time: "16:00",
            sourceSessionId: "session-merged-1",
            createdAt: "2026-03-27T11:00:00.000Z",
            updatedAt: "2026-03-27T11:10:00.000Z",
        },
    ]

    const leads = [
        {
            id: "lead-1",
            chatbotId: "tenant-1",
            name: "Ayse",
            phone: "+905551112233",
            canonicalContactId: "contact-1",
            source: "instagram",
            sourceChannel: "instagram",
            assignedTo: "sales@tenant.test",
            createdAt: "2026-03-28T10:40:00.000Z",
            updatedAt: "2026-03-28T10:41:00.000Z",
        },
        {
            id: "lead-merged-1",
            chatbotId: "tenant-1",
            name: "Merged Contact",
            phone: "+905559998877",
            canonicalContactId: "contact-source",
            source: "voice",
            sourceChannel: "voice",
            assignedTo: "ops@tenant.test",
            createdAt: "2026-03-27T12:00:00.000Z",
            updatedAt: "2026-03-27T12:05:00.000Z",
        },
    ]

    return {
        collection(name: string) {
            if (name === "contact_graph") {
                return {
                    doc(id: string) {
                        return {
                            async get() {
                                const value = contacts.get(id)
                                return {
                                    exists: Boolean(value),
                                    data: () => value,
                                }
                            },
                        }
                    },
                }
            }

            if (name === "chat_sessions") return createQueryCollection(chatSessions)
            if (name === "callback_requests") return createQueryCollection(callbacks)
            if (name === "appointments") {
                return {
                    where(field: string, _op: string, value: unknown) {
                        const filtered = appointments.filter((item) => (item as Record<string, unknown>)[field] === value)
                        return {
                            limit() {
                                return {
                                    async get() {
                                        return {
                                            docs: filtered.map((item) => createDoc(item.id, item)),
                                        }
                                    },
                                }
                            },
                        }
                    },
                }
            }
            if (name === "leads") {
                return {
                    where(field: string, _op: string, value: unknown) {
                        const filtered = leads.filter((item) => (item as Record<string, unknown>)[field] === value)
                        return {
                            limit() {
                                return {
                                    async get() {
                                        return {
                                            docs: filtered.map((item) => createDoc(item.id, item)),
                                        }
                                    },
                                }
                            },
                        }
                    },
                }
            }

            throw new Error(`Unexpected collection: ${name}`)
        },
    }
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe("GET /api/omni/contacts/timeline", () => {
    test("returns timeline items and customer memory for a deterministic contact", async () => {
        vi.mocked(authorizeOmniRequest).mockResolvedValue({
            ok: true,
            adminDb: createAdminDb(),
            callerUid: "tenant-1",
            isSuperAdmin: false,
            isAgencyAdmin: false,
        } as any)

        vi.mocked(getOmniContactMemory).mockImplementation(async (_adminDb, _chatbotId, key) => {
            if (key === "main-key") {
                return {
                    chatbotId: "tenant-1",
                    contactKey: "main-key",
                    summary: "Known customer summary",
                    preferences: ["Red products"],
                    openIssues: ["Callback requested"],
                    recentTopics: ["Delivery timing"],
                    lastChannel: "whatsapp",
                } as any
            }
            return null
        })

        const response = await GET(new Request("http://localhost/api/omni/contacts/timeline?chatbotId=tenant-1&contactId=contact-1"))
        expect(response.status).toBe(200)

        const payload = await response.json()
        expect(payload.keys).toEqual(expect.arrayContaining(["main-key", "+905551112233", "user@example.com", "insta-user", "alias-key"]))
        expect(payload.memory.summary).toBe("Known customer summary")
        expect(payload.timeline).toHaveLength(4)
        expect(payload.timeline[0].type).toBe("lead")
        expect(payload.timeline.map((item: any) => item.type)).toEqual(expect.arrayContaining(["session", "callback", "appointment", "lead"]))
    })

    test("includes merged source history when loading the target canonical contact", async () => {
        vi.mocked(authorizeOmniRequest).mockResolvedValue({
            ok: true,
            adminDb: createAdminDb(),
            callerUid: "tenant-1",
            isSuperAdmin: false,
            isAgencyAdmin: false,
        } as any)

        vi.mocked(getOmniContactMemory).mockResolvedValue(null as any)

        const response = await GET(new Request("http://localhost/api/omni/contacts/timeline?chatbotId=tenant-1&contactId=contact-target"))
        expect(response.status).toBe(200)

        const payload = await response.json()
        expect(payload.canonicalContactId).toBe("contact-target")
        expect(payload.relatedContactIds).toEqual(expect.arrayContaining(["contact-target", "contact-source"]))
        expect(payload.timeline.map((item: any) => item.id)).toEqual(
            expect.arrayContaining(["session-merged-1", "callback-merged-1", "appointment-merged-1", "lead-merged-1"])
        )
    })

    test("returns 400 when chatbotId is missing", async () => {
        const response = await GET(new Request("http://localhost/api/omni/contacts/timeline?contactId=contact-1"))
        expect(response.status).toBe(400)
    })
})
