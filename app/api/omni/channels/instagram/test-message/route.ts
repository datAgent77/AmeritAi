import { NextResponse } from "next/server"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { sendOmniInstagramText } from "@/lib/omni/channel-dispatch"
import { recordOmniSmokeRun } from "@/lib/omni/smoke-runs"
import { authorizeOmniRequest, authorizedForOmniPermission, getOmniChannelConfig, jsonError } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const body = await req.json()
    const chatbotId = body.chatbotId
    const recipientId = String(body.recipientId || "").trim()
    const text = String(body.text || "Vion AI Omni-Channel test message").trim()

    if (!chatbotId || !recipientId) {
        return jsonError("chatbotId and recipientId are required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "channels.manage")) {
        return jsonError("Forbidden", 403)
    }

    const config = await getOmniChannelConfig(authz.adminDb, chatbotId)
    const instagram = config.instagram || {}
    const endpointTarget = instagram.accountId || instagram.pageId || null

    if (instagram.enabled === false) {
        await recordOmniSmokeRun(authz.adminDb, {
            chatbotId,
            channel: "instagram",
            provider: "meta",
            action: "test_message",
            result: "blocked",
            source: "api/omni/channels/instagram/test-message",
            message: "Instagram channel is disabled",
            target: recipientId,
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "instagram",
            eventType: "instagram.test_message",
            result: "blocked",
            source: "api/omni/channels/instagram/test-message",
            message: "Instagram channel is disabled",
            metadata: {
                recipientId,
            },
        })
        return jsonError("Instagram channel is disabled", 400)
    }

    if (!instagram.accessTokenRef || !endpointTarget) {
        await recordOmniSmokeRun(authz.adminDb, {
            chatbotId,
            channel: "instagram",
            provider: "meta",
            action: "test_message",
            result: "error",
            source: "api/omni/channels/instagram/test-message",
            message: "Instagram access token and account ID are required",
            target: recipientId,
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "instagram",
            eventType: "instagram.test_message",
            result: "error",
            source: "api/omni/channels/instagram/test-message",
            message: "Instagram access token and account ID are required",
        })
        return jsonError("Instagram access token and account ID are required", 400)
    }

    try {
        const delivery = await sendOmniInstagramText({
            adminDb: authz.adminDb,
            chatbotId,
            recipientId,
            text,
            endpointTarget,
            accessToken: instagram.accessTokenRef,
            source: "api/omni/channels/instagram/test-message",
            metadata: {
                testMessage: true,
            },
        })

        await recordOmniSmokeRun(authz.adminDb, {
            chatbotId,
            channel: "instagram",
            provider: "meta",
            action: "test_message",
            result: "success",
            source: "api/omni/channels/instagram/test-message",
            message: "Instagram test message sent",
            target: recipientId,
            metadata: {
                messageId: delivery.messageId || null,
                deliveryAttemptId: delivery.deliveryAttemptId || null,
            },
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "instagram",
            eventType: "instagram.test_message",
            result: "success",
            source: "api/omni/channels/instagram/test-message",
            message: "Instagram test message sent",
            metadata: {
                recipientId,
                messageId: delivery.messageId || null,
                deliveryAttemptId: delivery.deliveryAttemptId || null,
            },
        })

        return NextResponse.json({
            ok: true,
            recipientId,
            messageId: delivery.messageId || null,
            deliveryAttemptId: delivery.deliveryAttemptId || null,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to send Instagram test message"
        await recordOmniSmokeRun(authz.adminDb, {
            chatbotId,
            channel: "instagram",
            provider: "meta",
            action: "test_message",
            result: "error",
            source: "api/omni/channels/instagram/test-message",
            message,
            target: recipientId,
            metadata: {
                deliveryAttemptId: error instanceof Error ? (error as Error & { deliveryAttemptId?: string | null }).deliveryAttemptId || null : null,
            },
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "instagram",
            eventType: "instagram.test_message",
            result: "error",
            source: "api/omni/channels/instagram/test-message",
            message,
            metadata: {
                recipientId,
                deliveryAttemptId: error instanceof Error ? (error as Error & { deliveryAttemptId?: string | null }).deliveryAttemptId || null : null,
            },
        })
        return NextResponse.json(
            {
                error: message,
            },
            { status: 400 }
        )
    }
}
