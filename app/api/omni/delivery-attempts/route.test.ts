import { beforeEach, describe, expect, test, vi } from "vitest"
import { GET } from "./route"
import { listOmniDeliveryAttempts } from "@/lib/omni/delivery-attempts"
import { authorizeOmniRequest } from "@/lib/omni/server-utils"

vi.mock("@/lib/omni/server-utils", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/server-utils")>("@/lib/omni/server-utils")
    return {
        ...actual,
        authorizeOmniRequest: vi.fn(),
    }
})

vi.mock("@/lib/omni/delivery-attempts", async () => {
    const actual = await vi.importActual<typeof import("@/lib/omni/delivery-attempts")>("@/lib/omni/delivery-attempts")
    return {
        ...actual,
        listOmniDeliveryAttempts: vi.fn(),
    }
})

beforeEach(() => {
    vi.clearAllMocks()
})

describe("GET /api/omni/delivery-attempts", () => {
    test("returns delivery summary with exhausted retries", async () => {
        vi.mocked(authorizeOmniRequest).mockResolvedValue({
            ok: true,
            adminDb: {},
            callerUid: "tenant-1",
            isSuperAdmin: false,
            isAgencyAdmin: false,
        } as any)
        vi.mocked(listOmniDeliveryAttempts).mockResolvedValue([
            {
                id: "delivery-1",
                chatbotId: "tenant-1",
                channel: "whatsapp",
                provider: "meta",
                direction: "outbound",
                source: "test",
                status: "failed",
                retryEligible: true,
                retryMode: "auto",
                retryState: "pending",
                createdAt: "2026-03-28T10:00:00.000Z",
            },
            {
                id: "delivery-2",
                chatbotId: "tenant-1",
                channel: "instagram",
                provider: "meta",
                direction: "outbound",
                source: "test",
                status: "failed",
                retryEligible: true,
                retryMode: "auto",
                retryState: "exhausted",
                createdAt: "2026-03-28T10:05:00.000Z",
            },
            {
                id: "delivery-3",
                chatbotId: "tenant-1",
                channel: "voice",
                provider: "twilio",
                direction: "outbound",
                source: "test",
                status: "success",
                retryEligible: false,
                retryMode: "none",
                retryState: "none",
                createdAt: "2026-03-28T10:10:00.000Z",
            },
        ] as any)

        const response = await GET(new Request("http://localhost/api/omni/delivery-attempts?chatbotId=tenant-1"))
        expect(response.status).toBe(200)
        const payload = await response.json()
        expect(payload.summary.total).toBe(3)
        expect(payload.summary.pendingAutoRetries).toBe(1)
        expect(payload.summary.exhaustedRetries).toBe(1)
        expect(payload.summary.byChannel.whatsapp).toBe(1)
    })

    test("returns 400 when chatbotId is missing", async () => {
        const response = await GET(new Request("http://localhost/api/omni/delivery-attempts"))
        expect(response.status).toBe(400)
    })
})
