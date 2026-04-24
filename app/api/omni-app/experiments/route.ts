import { NextResponse } from "next/server"
import { authorizedForOmniPermission } from "@/lib/omni/server-utils"
import type { OmniWorkspaceAgentSummary } from "@/lib/omni/types"
import { authorizeOmniAppRequest, fetchUpstreamJson } from "@/lib/omni-app/server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    const authz = await authorizeOmniAppRequest(req)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "aiCore.view")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const agentsResponse = await fetchUpstreamJson<{ agents: OmniWorkspaceAgentSummary[] }>(req, "/api/omni/agents")
    if (!agentsResponse.ok) {
        return agentsResponse.response
    }

    const items = agentsResponse.data.agents.slice(0, 3).map((agent, index) => ({
        id: `${agent.id}-experiment`,
        name: `${agent.name} rollout experiment`,
        status: index === 0 ? "running" : index === 1 ? "draft" : "paused",
        controlLabel: `${agent.name} / Live`,
        candidateLabel: `${agent.name} / Candidate`,
        trafficSplit: index === 0 ? "80 / 20" : index === 1 ? "50 / 50" : "90 / 10",
        successDelta: index === 0 ? "+12%" : index === 1 ? "+4%" : "-2%",
        updatedAt: agent.lastActivityAt || null,
    }))

    return NextResponse.json({
        summary: {
            running: items.filter((item) => item.status === "running").length,
            drafts: items.filter((item) => item.status === "draft").length,
            candidateTraffic: items.length > 0 ? 20 : 0,
        },
        items,
    })
}
