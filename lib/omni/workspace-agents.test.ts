import { describe, expect, test } from "vitest"
import { buildOverviewPayload, buildWorkspaceAgentSummaries } from "@/lib/omni/workspace-agents"

describe("workspace agent adapters", () => {
    test("falls back to omni-default when assistantProfileId is missing", () => {
        const summaries = buildWorkspaceAgentSummaries({
            assistantCore: {
                assistantProfiles: [
                    {
                        id: "omni-default",
                        name: "Default",
                        active: true,
                    },
                ],
                channelAssistantProfiles: {
                    web: "omni-default",
                    whatsapp: "omni-default",
                    instagram: "omni-default",
                    voice: "omni-default",
                },
            },
            sessions: [
                {
                    id: "session-1",
                    channel: "web",
                    createdAt: "2026-04-01T10:00:00.000Z",
                    updatedAt: "2026-04-01T10:05:00.000Z",
                },
            ],
            callbacks: [],
            leads: [],
            appointments: [],
        })

        expect(summaries).toHaveLength(1)
        expect(summaries[0].id).toBe("omni-default")
        expect(summaries[0].conversationVolume).toBe(1)
        expect(summaries[0].averageDurationSeconds).toBe(300)
    })

    test("serializes overview filters and timeline", () => {
        const payload = buildOverviewPayload({
            chatbotId: "tenant-1",
            accountName: "Acme",
            assistantCore: {
                assistantProfiles: [
                    {
                        id: "omni-default",
                        name: "Default",
                        active: true,
                    },
                ],
                channelAssistantProfiles: {
                    web: "omni-default",
                    whatsapp: "omni-default",
                    instagram: "omni-default",
                    voice: "omni-default",
                },
            },
            sessions: [
                {
                    id: "session-1",
                    channel: "web",
                    createdAt: "2026-04-01T10:00:00.000Z",
                    updatedAt: "2026-04-01T10:05:00.000Z",
                },
            ],
            callbacks: [],
            leads: [],
            appointments: [],
            criticalEvents: [],
            channelHealth: [],
            filters: {
                range: "30d",
                granularity: "day",
                agentId: null,
            },
        })

        expect(payload.filters.range).toBe("30d")
        expect(payload.availableAgents[0].id).toBe("omni-default")
        expect(payload.timeline).toHaveLength(1)
    })
})
