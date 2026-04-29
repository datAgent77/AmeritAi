import { beforeEach, describe, expect, test, vi } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "./route"
import { getAnalyticsData } from "@/lib/analytics"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { logPlatformEvent } from "@/lib/server-event-log"

vi.mock("@/lib/analytics", () => ({
    getAnalyticsData: vi.fn(),
}))

vi.mock("@/lib/api-auth", () => ({
    authorizeTargetAccess: vi.fn(),
}))

vi.mock("@/lib/server-event-log", () => ({
    buildActorFromRequest: vi.fn((_req: Request, overrides = {}) => ({
        ip: "127.0.0.1",
        user_agent: "vitest",
        ...overrides,
    })),
    logPlatformEvent: vi.fn(),
}))

function createRequest(path: string) {
    return new NextRequest(`http://localhost${path}`, {
        headers: {
            authorization: "Bearer test-token",
            "user-agent": "vitest",
        },
    })
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe("GET /api/analytics", () => {
    test("requires chatbotId before authorization", async () => {
        const response = await GET(createRequest("/api/analytics"))

        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({ error: "Chatbot ID is required" })
        expect(authorizeTargetAccess).not.toHaveBeenCalled()
        expect(getAnalyticsData).not.toHaveBeenCalled()
    })

    test("denies analytics access when target authorization fails", async () => {
        vi.mocked(authorizeTargetAccess).mockResolvedValue({
            ok: false,
            response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
        })

        const response = await GET(createRequest("/api/analytics?chatbotId=tenant-1"))

        expect(response.status).toBe(401)
        expect(authorizeTargetAccess).toHaveBeenCalledWith(expect.any(NextRequest), "tenant-1")
        expect(getAnalyticsData).not.toHaveBeenCalled()
        expect(logPlatformEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                event_type: "analytics_fetch",
                source_module: "analytics_api",
                result: "denied",
                target: { chatbot_id: "tenant-1" },
            })
        )
    })

    test("returns analytics for an authorized tenant", async () => {
        const analyticsSummary = {
            totalConversations: 2,
            totalMessages: 8,
            userMessages: 4,
            assistantMessages: 4,
            averageMessagesPerConversation: 4,
            averageFirstResponseSeconds: 6,
            handoffCount: 0,
            handoffRate: 0,
            leadsCount: 1,
            appointmentsCount: 0,
            conversionRate: 50,
            appointmentConversionRate: 0,
            sentiment: { positive: 1, neutral: 1, negative: 0 },
            dailyStats: [],
            automationRate: { automated: 2, handoff: 0 },
            topTopics: [],
            visitorsByCountry: [],
            channelBreakdown: [],
            responseTime: {
                averageSeconds: 6,
                medianSeconds: 6,
                p95Seconds: 8,
                sampleSize: 2,
            },
            handoffQuality: {
                handoffCount: 0,
                handoffRate: 0,
                pausedCount: 0,
                pausedRate: 0,
            },
            sessionQuality: {
                hiddenCount: 0,
                favoriteCount: 0,
                dispositionBreakdown: [],
            },
            callbackQuality: {
                openCount: 0,
                resolvedCount: 0,
                resolutionRate: 0,
            },
            feedbackQuality: {
                positiveCount: 0,
                negativeCount: 0,
                score: null,
            },
            savedTimeHours: 1,
            missedOpportunities: 24,
        }
        vi.mocked(authorizeTargetAccess).mockResolvedValue({
            ok: true,
            callerUid: "tenant-1",
            isSuperAdmin: false,
            isAgencyAdmin: false,
        })
        vi.mocked(getAnalyticsData).mockResolvedValue(analyticsSummary)

        const response = await GET(
            createRequest("/api/analytics?chatbotId=tenant-1&startDate=2026-04-01&endDate=2026-04-07")
        )

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual(analyticsSummary)
        expect(getAnalyticsData).toHaveBeenCalledWith(
            "tenant-1",
            new Date("2026-04-01"),
            new Date("2026-04-07")
        )
        expect(logPlatformEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                event_type: "analytics_fetch",
                source_module: "analytics_api",
                result: "success",
                target: { chatbot_id: "tenant-1" },
            })
        )
    })
})
