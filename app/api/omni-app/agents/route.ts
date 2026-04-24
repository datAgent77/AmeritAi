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

    const items = agentsResponse.data.agents.map((agent, index) => ({
        id: agent.id,
        name: agent.name,
        description: agent.description || null,
        status: agent.status,
        channels: agent.channels,
        branchLabel: agent.isPrimary ? "Live branch" : index % 2 === 0 ? "Candidate branch" : "Draft branch",
        versionLabel: agent.isPrimary ? "v1.0 live" : `v${index + 1}.0 candidate`,
        conversationVolume: agent.conversationVolume,
        outcomeRate: agent.outcomeRate,
        lastActivityAt: agent.lastActivityAt || null,
    }))

    return NextResponse.json({
        summary: {
            total: items.length,
            live: items.filter((item) => item.status === "primary" || item.status === "active").length,
            candidateBranches: Math.max(items.length - 1, 0),
            avgOutcomeRate: items.length > 0 ? Math.round(items.reduce((sum, item) => sum + item.outcomeRate, 0) / items.length) : 0,
        },
        items,
    })
}
