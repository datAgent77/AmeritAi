import { NextResponse } from "next/server"
import { executeOmniAction } from "@/lib/omni/action-execution"
import { authorizeOmniRequest, authorizedForOmniPermission, jsonError } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const body = await req.json()
    const chatbotId = body.chatbotId

    if (!chatbotId || !body.actionId) {
        return jsonError("chatbotId and actionId are required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "operations.manage")) {
        return jsonError("Forbidden", 403)
    }

    try {
        const result = await executeOmniAction(authz.adminDb, {
            chatbotId,
            actionId: body.actionId,
            sourceChannel: body.sourceChannel || "web",
            sourceSessionId: body.sourceSessionId || null,
            contactKey: body.contactKey || null,
            canonicalContactId: body.canonicalContactId || null,
            payload: body.payload || {},
        })

        return NextResponse.json({
            ok: true,
            result,
        })
    } catch (error) {
        return jsonError(error instanceof Error ? error.message : "Action execution failed", 400)
    }
}
