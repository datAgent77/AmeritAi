import { NextResponse } from "next/server"
import { authorizedForOmniPermission } from "@/lib/omni/server-utils"
import type { OmniSmokeRunRecord } from "@/lib/omni/types"
import { authorizeOmniAppRequest, fetchUpstreamJson } from "@/lib/omni-app/server"

export const dynamic = "force-dynamic"

interface SmokeRunsResponse {
    runs: OmniSmokeRunRecord[]
    summary: {
        success: number
        blocked: number
        error: number
    }
}

interface SmokeReportResponse {
    readinessScore: number
    overallReady: boolean
    attentionRequired: boolean
}

export async function GET(req: Request) {
    const authz = await authorizeOmniAppRequest(req)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "settings.view")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const [runsResponse, reportResponse] = await Promise.all([
        fetchUpstreamJson<SmokeRunsResponse>(req, "/api/omni/smoke-runs", { limit: 12 }),
        fetchUpstreamJson<SmokeReportResponse>(req, "/api/omni/smoke-report"),
    ])

    if (!runsResponse.ok) return runsResponse.response
    if (!reportResponse.ok) return reportResponse.response

    return NextResponse.json({
        readinessScore: reportResponse.data.readinessScore,
        overallReady: reportResponse.data.overallReady,
        attentionRequired: reportResponse.data.attentionRequired,
        summary: runsResponse.data.summary,
        runs: runsResponse.data.runs.map((run) => ({
            id: run.id || `${run.channel}-${run.action}-${run.createdAt || "run"}`,
            channel: run.channel,
            action: run.action,
            result: run.result,
            message: run.message || null,
            createdAt: run.createdAt || null,
        })),
    })
}
