import { NextResponse } from "next/server"
import { authorizeOmniRequest, authorizedForOmniPermission, getOmniChannelConfig, jsonError } from "@/lib/omni/server-utils"
import { buildWorkspaceAgentSummaries } from "@/lib/omni/workspace-agents"

export const dynamic = "force-dynamic"

function mapDocs(snapshot: any) {
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) }))
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const chatbotId = searchParams.get("chatbotId")

    if (!chatbotId) {
        return jsonError("chatbotId is required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "aiCore.view")) {
        return jsonError("Forbidden", 403)
    }

    const [config, sessionsSnapshot, callbacksSnapshot, leadsSnapshot, appointmentsSnapshot] = await Promise.all([
        getOmniChannelConfig(authz.adminDb, chatbotId),
        authz.adminDb.collection("chat_sessions").where("chatbotId", "==", chatbotId).get(),
        authz.adminDb.collection("callback_requests").where("chatbotId", "==", chatbotId).get(),
        authz.adminDb.collection("leads").where("chatbotId", "==", chatbotId).get(),
        authz.adminDb.collection("appointments").where("chatbotId", "==", chatbotId).get(),
    ])

    const agents = buildWorkspaceAgentSummaries({
        assistantCore: config.assistantCore,
        sessions: mapDocs(sessionsSnapshot),
        callbacks: mapDocs(callbacksSnapshot),
        leads: mapDocs(leadsSnapshot),
        appointments: mapDocs(appointmentsSnapshot),
    })

    return NextResponse.json({
        agents,
        primaryAgentId: agents.find((agent) => agent.isPrimary)?.id || agents[0]?.id || null,
    })
}
