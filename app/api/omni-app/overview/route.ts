import { NextResponse } from "next/server"
import { authorizedForOmniPermission } from "@/lib/omni/server-utils"
import type { OmniOverviewPayload } from "@/lib/omni/types"
import { authorizeOmniAppRequest, fetchUpstreamJson } from "@/lib/omni-app/server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    const authz = await authorizeOmniAppRequest(req)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "dashboard.view")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const overview = await fetchUpstreamJson<OmniOverviewPayload>(req, "/api/omni/overview")
    if (!overview.ok) {
        return overview.response
    }

    const payload = overview.data
    const outcomeRate = payload.headline.conversationCount > 0 ? Math.round((payload.insights.successRate || 0) * 100) / 100 : 0

    return NextResponse.json({
        workspace: {
            id: payload.scope.chatbotId,
            label: payload.scope.accountName || "Omni workspace",
            activeAgentCount: payload.availableAgents.length,
            conversationCount: payload.headline.conversationCount,
            readinessScore: Math.round(
                payload.channelHealth.length > 0
                    ? (payload.channelHealth.filter((item) => item.enabled && item.ready).length / payload.channelHealth.filter((item) => item.enabled).length) * 100 || 0
                    : 100
            ),
            enabledChannels: payload.channelHealth.filter((item) => item.enabled).length,
            readyChannels: payload.channelHealth.filter((item) => item.enabled && item.ready).length,
            openCallbacks: payload.headline.openCallbacks,
            updatedAt: payload.generatedAt,
        },
        highlights: [
            {
                label: "Conversations",
                value: payload.headline.conversationCount,
                note: `${payload.headline.activeConversations} currently active`,
            },
            {
                label: "Open callbacks",
                value: payload.headline.openCallbacks,
                note: `${payload.headline.openLeads} open leads inside the same workspace`,
            },
            {
                label: "Avg. duration",
                value: `${Math.round(payload.headline.averageDurationSeconds / 60)}m`,
                note: "Average conversation duration across the selected window.",
            },
            {
                label: "Outcome rate",
                value: `${outcomeRate}%`,
                note: `${payload.insights.criticalEvents} critical events observed`,
            },
        ],
        channels: payload.channelHealth,
        experiments: {
            running: payload.availableAgents.length > 1 ? 1 : 0,
            candidateTrafficPercent: payload.availableAgents.length > 1 ? 20 : 0,
        },
    })
}
