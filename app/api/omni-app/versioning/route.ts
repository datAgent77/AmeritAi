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

    const branches = agentsResponse.data.agents.slice(0, 3).map((agent, index) => ({
        id: `${agent.id}-branch-${index + 1}`,
        agentId: agent.id,
        name: index === 0 ? "live" : index === 1 ? "candidate" : "draft",
        status: index === 0 ? "live" : index === 1 ? "candidate" : "draft",
        trafficPercent: index === 0 ? 80 : index === 1 ? 20 : 0,
        updatedAt: agent.lastActivityAt || null,
    }))

    const versions = branches.map((branch, index) => ({
        id: `${branch.id}-version`,
        branchId: branch.id,
        label: `${branch.name} / v${index + 1}.0`,
        state: branch.status,
        notes: index === 0 ? ["Current live prompt set", "Stable routing"] : index === 1 ? ["Candidate tone tuning", "Limited traffic"] : ["Draft evaluation updates"],
        createdAt: branch.updatedAt,
    }))

    const deployments = branches
        .filter((branch) => branch.status !== "draft")
        .map((branch) => ({
            id: `${branch.id}-deployment`,
            branchId: branch.id,
            label: `${branch.name} deployment`,
            trafficPercent: branch.trafficPercent,
            status: branch.status === "live" ? "live" : "candidate",
        }))

    return NextResponse.json({
        summary: {
            live: branches.filter((branch) => branch.status === "live").length,
            candidate: branches.filter((branch) => branch.status === "candidate").length,
            drafts: branches.filter((branch) => branch.status === "draft").length,
        },
        branches,
        versions,
        deployments,
    })
}
