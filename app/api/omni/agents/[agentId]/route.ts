import { NextResponse } from "next/server"
import { authorizeOmniRequest, authorizedForOmniPermission, getOmniChannelConfig, jsonError } from "@/lib/omni/server-utils"
import { buildAgentCapabilityCatalog, buildWorkspaceAgentDetail } from "@/lib/omni/workspace-agents"

export const dynamic = "force-dynamic"

function mapDocs(snapshot: any) {
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) }))
}

export async function GET(req: Request, { params }: { params: { agentId: string } }) {
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

    const [config, sessionsSnapshot, callbacksSnapshot, leadsSnapshot, appointmentsSnapshot, voiceNumbersSnapshot] = await Promise.all([
        getOmniChannelConfig(authz.adminDb, chatbotId),
        authz.adminDb.collection("chat_sessions").where("chatbotId", "==", chatbotId).get(),
        authz.adminDb.collection("callback_requests").where("chatbotId", "==", chatbotId).get(),
        authz.adminDb.collection("leads").where("chatbotId", "==", chatbotId).get(),
        authz.adminDb.collection("appointments").where("chatbotId", "==", chatbotId).get(),
        authz.adminDb.collection("voice_numbers").where("chatbotId", "==", chatbotId).get(),
    ])

    const detail = buildWorkspaceAgentDetail({
        assistantCore: config.assistantCore,
        sessions: mapDocs(sessionsSnapshot),
        callbacks: mapDocs(callbacksSnapshot),
        leads: mapDocs(leadsSnapshot),
        appointments: mapDocs(appointmentsSnapshot),
        agentId: params.agentId,
        voiceIntegration: config.voiceIntegration || null,
        voiceNumbers: mapDocs(voiceNumbersSnapshot),
    })

    if (!detail) {
        return jsonError("Agent not found", 404)
    }

    return NextResponse.json({
        detail,
        capabilityCatalog: buildAgentCapabilityCatalog(),
    })
}
