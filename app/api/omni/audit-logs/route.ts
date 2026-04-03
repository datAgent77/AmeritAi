import { NextResponse } from "next/server"
import { listOmniAuditEvents } from "@/lib/omni/audit-log"
import { authorizeOmniRequest, jsonError } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const chatbotId = searchParams.get("chatbotId")
    const channel = searchParams.get("channel")
    const result = searchParams.get("result")
    const eventPrefix = searchParams.get("eventPrefix")
    const sourcePrefix = searchParams.get("sourcePrefix")
    const limit = Math.min(Number(searchParams.get("limit") || "20"), 100)

    if (!chatbotId) {
        return jsonError("chatbotId is required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }

    const logs = await listOmniAuditEvents(authz.adminDb, {
        chatbotId,
        channel: (channel as any) || null,
        result: (result as any) || null,
        eventPrefix,
        sourcePrefix,
        limit,
    })

    return NextResponse.json({ logs })
}
