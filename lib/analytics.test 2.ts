import { beforeEach, describe, expect, test, vi } from "vitest"
import { getAnalyticsData } from "./analytics"
import { getAdminDb } from "@/lib/firebase-admin"

vi.mock("@/lib/firebase-admin", () => ({
    getAdminDb: vi.fn(),
}))

function createDoc(id: string, data: Record<string, unknown>) {
    return {
        id,
        data: () => data,
    }
}

function createSnapshot(items: Array<ReturnType<typeof createDoc>>) {
    return {
        docs: items,
        forEach: (callback: (doc: ReturnType<typeof createDoc>) => void) => items.forEach(callback),
    }
}

function createCollection(items: Array<ReturnType<typeof createDoc>>) {
    const query = {
        where: vi.fn(() => query),
        get: vi.fn().mockResolvedValue(createSnapshot(items)),
    }
    return query
}

function createAdminDb(collections: Record<string, Array<ReturnType<typeof createDoc>>>) {
    return {
        collection: vi.fn((name: string) => createCollection(collections[name] || [])),
    }
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe("getAnalyticsData", () => {
    test("calculates quality metrics from existing sessions, callbacks and feedback events", async () => {
        vi.mocked(getAdminDb).mockReturnValue(createAdminDb({
            chat_sessions: [
                createDoc("session-1", {
                    chatbotId: "tenant-1",
                    createdAt: "2026-04-20T10:00:00.000Z",
                    channel: "web",
                    isPaused: true,
                    isHidden: true,
                    isFavorite: false,
                    lastDisposition: "handoff_requested",
                    messages: [
                        { role: "user", content: "Merhaba destek lazım", createdAt: "2026-04-20T10:00:00.000Z" },
                        { role: "assistant", content: "Nasıl yardımcı olabilirim?", createdAt: "2026-04-20T10:00:05.000Z" },
                    ],
                }),
                createDoc("session-2", {
                    chatbotId: "tenant-1",
                    createdAt: "2026-04-20T11:00:00.000Z",
                    channel: "whatsapp",
                    isPaused: false,
                    isHidden: false,
                    isFavorite: true,
                    lastDisposition: "auto_replied",
                    messages: [
                        { role: "user", content: "Harika bilgi", createdAt: "2026-04-20T11:00:00.000Z" },
                        { role: "assistant", content: "Memnun oldum", createdAt: "2026-04-20T11:00:15.000Z" },
                    ],
                }),
                createDoc("session-3", {
                    chatbotId: "tenant-1",
                    createdAt: "2026-04-20T12:00:00.000Z",
                    channel: "web",
                    isPaused: false,
                    isHidden: false,
                    isFavorite: false,
                    lastDisposition: "unknown",
                    messages: [
                        { role: "user", content: "Timestamp eksik" },
                        { role: "assistant", content: "Bu örnek latency sayılmamalı" },
                    ],
                }),
            ],
            leads: [],
            appointments: [],
            callback_requests: [
                createDoc("callback-1", {
                    chatbotId: "tenant-1",
                    createdAt: "2026-04-20T09:00:00.000Z",
                    resolutionStatus: "open",
                }),
                createDoc("callback-2", {
                    chatbotId: "tenant-1",
                    createdAt: "2026-04-20T09:30:00.000Z",
                    resolutionStatus: "completed",
                }),
            ],
            conversation_quality_events: [
                createDoc("feedback-1", {
                    chatbotId: "tenant-1",
                    sessionId: "session-1",
                    type: "feedback_submitted",
                    createdAt: "2026-04-20T10:10:00.000Z",
                    metadata: { score: 1 },
                }),
                createDoc("feedback-2", {
                    chatbotId: "tenant-1",
                    sessionId: "session-2",
                    type: "feedback_submitted",
                    createdAt: "2026-04-20T11:10:00.000Z",
                    metadata: { score: -1 },
                }),
            ],
        }) as any)

        const result = await getAnalyticsData(
            "tenant-1",
            new Date("2026-04-20T00:00:00.000Z"),
            new Date("2026-04-20T23:59:59.999Z")
        )

        expect(result.responseTime).toEqual({
            averageSeconds: 10,
            medianSeconds: 10,
            p95Seconds: 15,
            sampleSize: 2,
        })
        expect(result.averageFirstResponseSeconds).toBe(10)
        expect(result.handoffQuality).toEqual({
            handoffCount: 1,
            handoffRate: 33.3,
            pausedCount: 1,
            pausedRate: 33.3,
        })
        expect(result.sessionQuality.hiddenCount).toBe(1)
        expect(result.sessionQuality.favoriteCount).toBe(1)
        expect(result.sessionQuality.dispositionBreakdown).toEqual([
            { disposition: "handoff_requested", count: 1 },
            { disposition: "auto_replied", count: 1 },
            { disposition: "unknown", count: 1 },
        ])
        expect(result.callbackQuality).toEqual({
            openCount: 1,
            resolvedCount: 1,
            resolutionRate: 50,
        })
        expect(result.feedbackQuality).toEqual({
            positiveCount: 1,
            negativeCount: 1,
            score: 0,
        })
    })
})
