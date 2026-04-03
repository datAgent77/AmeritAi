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
    const runs = [
        {
            id: "run-1",
            chatbotId: "tenant-1",
            channel: "voice",
            provider: "twilio",
            action: "health_check",
            result: "success",
            source: "api/omni/channels/voice/health",
            createdAt: "2026-03-28T10:00:00.000Z",
        },
        {
            id: "run-2",
            chatbotId: "tenant-1",
            channel: "voice",
            provider: "twilio",
            action: "test_call",
            result: "error",
            source: "api/omni/channels/voice/test-call",
            createdAt: "2026-03-28T10:05:00.000Z",
        },
        {
            id: "run-3",
            chatbotId: "tenant-1",
            channel: "whatsapp",
            provider: "meta",
            action: "test_message",
            result: "success",
            source: "api/omni/channels/whatsapp/test-message",
            createdAt: "2026-03-28T10:10:00.000Z",
        },
        {
            id: "run-4",
            chatbotId: "tenant-1",
            channel: "instagram",
            provider: "meta",
            action: "health_check",
            result: "blocked",
            source: "api/omni/channels/instagram/health",
            createdAt: "2026-03-28T10:15:00.000Z",
        },
    ]

    return {
        collection: vi.fn().mockImplementation((name: string) => {
            if (name !== "omni_smoke_runs") {
                throw new Error(`Unexpected collection: ${name}`)
            }

            return {
                where(field: string, _op: string, value: unknown) {
                    const filtered = runs.filter((item) => item[field as keyof typeof item] === value)
                    return {
                        where(nextField: string, _nextOp: string, nextValue: unknown) {
                            const nextFiltered = filtered.filter((item) => item[nextField as keyof typeof item] === nextValue)
                            return {
                                limit() {
                                    return {
                                        async get() {
                                            return { docs: nextFiltered.map((item) => createDoc(item.id, item)) }
                                        },
                                    }
                                },
                            }
                        },
                        limit() {
                            return {
                                async get() {
                                    return { docs: filtered.map((item) => createDoc(item.id, item)) }
                                },
                            }
                        },
                    }
                },
            }
        }),
    }
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe("GET /api/omni/smoke-runs", () => {
    test("filters by channel and returns summary", async () => {
        vi.mocked(authorizeOmniRequest).mockResolvedValue({
            ok: true,
            adminDb: createAdminDb(),
            callerUid: "tenant-1",
            isSuperAdmin: false,
            isAgencyAdmin: false,
        } as any)

        const response = await GET(new Request("http://localhost/api/omni/smoke-runs?chatbotId=tenant-1&channel=voice"))
        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.runs).toHaveLength(2)
        expect(payload.summary.total).toBe(2)
        expect(payload.summary.error).toBe(1)
        expect(payload.summary.blocked).toBe(0)
        expect(payload.summary.byAction.test_call).toBe(1)
    })

    test("includes blocked runs in the summary", async () => {
        vi.mocked(authorizeOmniRequest).mockResolvedValue({
            ok: true,
            adminDb: createAdminDb(),
            callerUid: "tenant-1",
            isSuperAdmin: false,
            isAgencyAdmin: false,
        } as any)

        const response = await GET(new Request("http://localhost/api/omni/smoke-runs?chatbotId=tenant-1&result=blocked"))
        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.runs).toHaveLength(1)
        expect(payload.summary.total).toBe(1)
        expect(payload.summary.blocked).toBe(1)
        expect(payload.summary.success).toBe(0)
        expect(payload.summary.error).toBe(0)
    })

    test("returns 400 when chatbotId is missing", async () => {
        const response = await GET(new Request("http://localhost/api/omni/smoke-runs"))
        expect(response.status).toBe(400)
    })
})
