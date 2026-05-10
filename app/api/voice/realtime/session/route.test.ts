import { beforeEach, describe, expect, test, vi } from "vitest"
import { POST } from "./route"
import { getAdminDb } from "@/lib/firebase-admin"

vi.mock("@/lib/firebase-admin", () => ({
    getAdminDb: vi.fn(),
}))

function createDoc(data: Record<string, unknown> | null) {
    return {
        exists: Boolean(data),
        data: () => data,
    }
}

function createAdminDb(options: {
    userData?: Record<string, unknown> | null
    chatbotData?: Record<string, unknown> | null
} = {}) {
    const {
        userData = null,
        chatbotData = null,
    } = options

    return {
        collection: vi.fn().mockImplementation((name: string) => ({
            doc: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue(
                    createDoc(name === "users" ? userData : chatbotData)
                ),
            }),
        })),
    }
}

describe("POST /api/voice/realtime/session", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.unstubAllEnvs()
        vi.unstubAllGlobals()
    })

    test("returns 503 when no ElevenLabs agent ID is configured", async () => {
        vi.stubEnv("ELEVENLABS_API_KEY", "sk-env")
        vi.mocked(getAdminDb).mockReturnValue(createAdminDb() as any)

        const response = await POST(new Request("https://preview.example.com/api/voice/realtime/session", {
            method: "POST",
            body: JSON.stringify({ chatbotId: "tenant-1" }),
        }))

        expect(response.status).toBe(503)
        const payload = await response.json()
        expect(payload.error).toMatch(/agent ID/i)
    })

    test("uses tenant agent ID before the global env agent ID", async () => {
        vi.stubEnv("ELEVENLABS_API_KEY", "sk-env")
        vi.stubEnv("ELEVENLABS_AGENT_ID", "agent-env")
        vi.mocked(getAdminDb).mockReturnValue(createAdminDb({
            chatbotData: {
                elevenLabsAgentId: "agent-tenant",
                elevenLabsServerLocation: "eu-residency",
            },
        }) as any)

        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
            token: "rtc-token",
        }), { status: 200 }))
        vi.stubGlobal("fetch", fetchMock)

        const response = await POST(new Request("https://preview.example.com/api/voice/realtime/session", {
            method: "POST",
            body: JSON.stringify({ chatbotId: "tenant-1" }),
        }))

        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload).toMatchObject({
            provider: "elevenlabs",
            token: "rtc-token",
            agentId: "agent-tenant",
            serverLocation: "eu-residency",
        })
        expect(String(fetchMock.mock.calls[0][0])).toContain("agent_id=agent-tenant")
    })

    test("normalizes a valid ElevenLabs token response", async () => {
        vi.stubEnv("ELEVENLABS_API_KEY", "sk-env")
        vi.stubEnv("ELEVENLABS_AGENT_ID", "agent-env")
        vi.mocked(getAdminDb).mockReturnValue(createAdminDb() as any)

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
            token: "rtc-token",
        }), { status: 200 })))

        const response = await POST(new Request("https://preview.example.com/api/voice/realtime/session", {
            method: "POST",
            body: JSON.stringify({ chatbotId: "tenant-1", language: "tr" }),
        }))

        expect(response.status).toBe(200)
        await expect(response.json()).resolves.toEqual({
            provider: "elevenlabs",
            token: "rtc-token",
            agentId: "agent-env",
            serverLocation: "global",
        })
    })
})
