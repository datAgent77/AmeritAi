import { NextResponse } from "next/server"
import { authorizeOmniAppRequest, fetchUpstreamJson } from "@/lib/omni-app/server"
import { authorizedForOmniPermission } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

interface ChatSessionsResponse {
    sessions: Array<{
        id: string
        visitorName?: string | null
        visitorEmail?: string | null
        lastMessageTime?: string | null
        channel?: string | null
        lastDisposition?: string | null
        assistantProfileId?: string | null
        messages?: unknown[]
    }>
}

export async function GET(req: Request) {
    const authz = await authorizeOmniAppRequest(req)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "operations.view")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const [sessionsResponse, callbacksSnapshot] = await Promise.all([
        fetchUpstreamJson<ChatSessionsResponse>(req, "/api/chat-sessions", { limit: 60 }),
        authz.adminDb.collection("callback_requests").where("chatbotId", "==", authz.chatbotId).get(),
    ])

    if (!sessionsResponse.ok) {
        return sessionsResponse.response
    }

    const items = sessionsResponse.data.sessions.map((session) => ({
        id: session.id,
        displayName: session.visitorName || session.visitorEmail || null,
        channel: session.channel || "web",
        messageCount: Array.isArray(session.messages) ? session.messages.length : 0,
        lastDisposition: session.lastDisposition || null,
        assistantProfileId: session.assistantProfileId || null,
        updatedAt: session.lastMessageTime || null,
    }))

    const activeChannels = new Set(items.map((item) => item.channel)).size
    const pendingCallbacks = callbacksSnapshot.docs.filter((doc: any) => {
        const data = doc.data() || {}
        return data.resolutionStatus !== "completed" && data.status !== "resolved"
    }).length

    return NextResponse.json({
        summary: {
            total: items.length,
            activeChannels,
            pendingCallbacks,
            unresolved: items.filter((item) => !item.lastDisposition || item.lastDisposition === "unknown").length,
        },
        items,
    })
}
