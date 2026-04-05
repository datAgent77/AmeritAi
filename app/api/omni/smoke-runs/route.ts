import { NextResponse } from "next/server"
import { listOmniSmokeRuns } from "@/lib/omni/smoke-runs"
import { authorizeOmniRequest, authorizedForOmniPermission, jsonError } from "@/lib/omni/server-utils"
import type { OmniSmokeRunAction, OmniSmokeRunChannel, OmniSmokeRunRecord, OmniSmokeRunResult } from "@/lib/omni/types"

export const dynamic = "force-dynamic"

const CHANNELS: OmniSmokeRunChannel[] = ["voice", "whatsapp", "instagram"]
const ACTIONS: OmniSmokeRunAction[] = ["health_check", "test_message", "test_call", "test_call_status"]
const RESULTS: OmniSmokeRunResult[] = ["success", "error", "blocked"]

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const chatbotId = searchParams.get("chatbotId")
    const channel = searchParams.get("channel")
    const action = searchParams.get("action")
    const result = searchParams.get("result")
    const limit = Math.min(Number(searchParams.get("limit") || "20"), 100)

    if (!chatbotId) {
        return jsonError("chatbotId is required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "settings.view")) {
        return jsonError("Forbidden", 403)
    }

    const runs = await listOmniSmokeRuns(authz.adminDb, {
        chatbotId,
        channel: channel && CHANNELS.includes(channel as OmniSmokeRunChannel) ? (channel as OmniSmokeRunChannel) : null,
        action: action && ACTIONS.includes(action as OmniSmokeRunAction) ? (action as OmniSmokeRunAction) : null,
        result: result && RESULTS.includes(result as OmniSmokeRunResult) ? (result as OmniSmokeRunResult) : null,
        limit,
    })

    const summary = runs.reduce(
        (
            accumulator: {
                total: number
                success: number
                blocked: number
                error: number
                byChannel: Record<string, number>
                byAction: Record<string, number>
            },
            run: OmniSmokeRunRecord
        ) => {
            accumulator.total += 1
            if (run.result === "success") accumulator.success += 1
            if (run.result === "blocked") accumulator.blocked += 1
            if (run.result === "error") accumulator.error += 1
            accumulator.byChannel[run.channel] = (accumulator.byChannel[run.channel] || 0) + 1
            accumulator.byAction[run.action] = (accumulator.byAction[run.action] || 0) + 1
            return accumulator
        },
        {
            total: 0,
            success: 0,
            blocked: 0,
            error: 0,
            byChannel: {} as Record<string, number>,
            byAction: {} as Record<string, number>,
        }
    )

    return NextResponse.json({ runs, summary })
}
