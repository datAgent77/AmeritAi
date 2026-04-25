import { beforeEach, describe, expect, test, vi } from "vitest"
import { GET, POST } from "./route"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { getAdminDb } from "@/lib/firebase-admin"

vi.mock("@/lib/api-auth", () => ({
    authorizeTargetAccess: vi.fn(),
}))

vi.mock("@/lib/firebase-admin", () => ({
    getAdminDb: vi.fn(),
}))

function createAdminDb(initialEntries?: Array<Record<string, any>>) {
    const store = new Map<string, Record<string, any>>(
        (initialEntries || []).map((entry) => [String(entry.id), entry])
    )

    const docsForChatbot = (chatbotId: string) => Array.from(store.entries())
        .filter(([, data]) => data.chatbotId === chatbotId)
        .map(([id, data]) => ({
            id,
            data: () => data,
        }))

    return {
        store,
        collection: vi.fn().mockImplementation((name: string) => {
            if (name !== "assistant_training_entries") {
                throw new Error(`Unexpected collection: ${name}`)
            }

            return {
                where: vi.fn().mockImplementation((field: string, _op: string, value: unknown) => {
                    if (field !== "chatbotId") throw new Error(`Unexpected field: ${field}`)
                    return {
                        limit: vi.fn().mockReturnValue({
                            get: vi.fn().mockResolvedValue({
                                docs: docsForChatbot(String(value)),
                            }),
                        }),
                    }
                }),
                doc: vi.fn().mockImplementation((id?: string) => {
                    const resolvedId = id || `entry-${store.size + 1}`
                    return {
                        id: resolvedId,
                        set: vi.fn().mockImplementation(async (data: Record<string, any>) => {
                            store.set(resolvedId, { ...(store.get(resolvedId) || {}), ...data })
                        }),
                    }
                }),
            }
        }),
    }
}

function createJsonRequest(body: Record<string, unknown>) {
    return new Request("http://localhost/api/assistant-training", {
        method: "POST",
        headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    })
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authorizeTargetAccess).mockResolvedValue({
        ok: true,
        callerUid: "tenant-1",
        isSuperAdmin: false,
        isAgencyAdmin: false,
    } as any)
})

describe("/api/assistant-training", () => {
    test("rejects unauthorized list requests", async () => {
        vi.mocked(getAdminDb).mockReturnValue(createAdminDb() as any)
        vi.mocked(authorizeTargetAccess).mockResolvedValue({
            ok: false,
            response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
        } as any)

        const response = await GET(new Request("http://localhost/api/assistant-training?chatbotId=tenant-1"))

        expect(response.status).toBe(403)
    })

    test("lists only the authorized tenant entries", async () => {
        vi.mocked(getAdminDb).mockReturnValue(createAdminDb([
            { id: "entry-1", chatbotId: "tenant-1", type: "qa", status: "active", question: "A", answer: "B" },
            { id: "entry-2", chatbotId: "tenant-2", type: "qa", status: "active", question: "C", answer: "D" },
        ]) as any)

        const response = await GET(new Request("http://localhost/api/assistant-training?chatbotId=tenant-1"))
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.entries).toHaveLength(1)
        expect(payload.entries[0].id).toBe("entry-1")
        expect(authorizeTargetAccess).toHaveBeenCalledWith(expect.any(Request), "tenant-1")
    })

    test("creates entries for the authorized tenant and records creator", async () => {
        const db = createAdminDb()
        vi.mocked(getAdminDb).mockReturnValue(db as any)

        const response = await POST(createJsonRequest({
            chatbotId: "tenant-1",
            type: "correction",
            question: "Saatler nedir?",
            wrongAnswer: "Her zaman açığız.",
            answer: "Hafta içi 10:00-19:00 arası açığız.",
            priority: 5,
        }))
        const payload = await response.json()

        expect(response.status).toBe(200)
        expect(payload.entry).toEqual(expect.objectContaining({
            chatbotId: "tenant-1",
            type: "correction",
            createdBy: "tenant-1",
            priority: 5,
        }))
        expect(Array.from(db.store.values())[0]).toEqual(expect.objectContaining({
            chatbotId: "tenant-1",
            createdBy: "tenant-1",
        }))
    })
})
