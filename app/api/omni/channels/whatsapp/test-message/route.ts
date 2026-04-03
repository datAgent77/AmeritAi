import { NextResponse } from "next/server"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { sendOmniWhatsAppText } from "@/lib/omni/channel-dispatch"
import { recordOmniSmokeRun } from "@/lib/omni/smoke-runs"
import { authorizeOmniRequest, authorizedForOmniPermission, getOmniChannelConfig, jsonError } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const body = await req.json()
    const chatbotId = body.chatbotId
    const to = String(body.to || "").trim()
    const text = String(body.text || "Vion AI Omni-Channel test message").trim()

    if (!chatbotId || !to) {
        return jsonError("chatbotId and to are required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "channels.manage")) {
        return jsonError("Forbidden", 403)
    }

    const config = await getOmniChannelConfig(authz.adminDb, chatbotId)
    const whatsapp = config.whatsapp || {}

    if (whatsapp.enabled === false) {
        await recordOmniSmokeRun(authz.adminDb, {
            chatbotId,
            channel: "whatsapp",
            provider: "meta",
            action: "test_message",
            result: "blocked",
            source: "api/omni/channels/whatsapp/test-message",
            message: "WhatsApp channel is disabled",
            target: to,
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "whatsapp",
            eventType: "whatsapp.test_message",
            result: "blocked",
            source: "api/omni/channels/whatsapp/test-message",
            message: "WhatsApp channel is disabled",
            metadata: {
                to,
            },
        })
        return jsonError("WhatsApp channel is disabled", 400)
    }

    if (!whatsapp.accessTokenRef || !whatsapp.phoneNumberId) {
        await recordOmniSmokeRun(authz.adminDb, {
            chatbotId,
            channel: "whatsapp",
            provider: "meta",
            action: "test_message",
            result: "error",
            source: "api/omni/channels/whatsapp/test-message",
            message: "WhatsApp access token and phone number ID are required",
            target: to,
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "whatsapp",
            eventType: "whatsapp.test_message",
            result: "error",
            source: "api/omni/channels/whatsapp/test-message",
            message: "WhatsApp access token and phone number ID are required",
        })
        return jsonError("WhatsApp access token and phone number ID are required", 400)
    }

    try {
        const delivery = await sendOmniWhatsAppText({
            adminDb: authz.adminDb,
            chatbotId,
            to,
            text,
            phoneNumberId: whatsapp.phoneNumberId,
            accessToken: whatsapp.accessTokenRef,
            source: "api/omni/channels/whatsapp/test-message",
            metadata: {
                testMessage: true,
            },
        })

        await recordOmniSmokeRun(authz.adminDb, {
            chatbotId,
            channel: "whatsapp",
            provider: "meta",
            action: "test_message",
            result: "success",
            source: "api/omni/channels/whatsapp/test-message",
            message: "WhatsApp test message sent",
            target: to,
            metadata: {
                messageId: delivery.messageId || null,
                deliveryAttemptId: delivery.deliveryAttemptId || null,
            },
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "whatsapp",
            eventType: "whatsapp.test_message",
            result: "success",
            source: "api/omni/channels/whatsapp/test-message",
            message: "WhatsApp test message sent",
            metadata: {
                to,
                messageId: delivery.messageId || null,
                deliveryAttemptId: delivery.deliveryAttemptId || null,
            },
        })

        return NextResponse.json({
            ok: true,
            messageId: delivery.messageId || null,
            deliveryAttemptId: delivery.deliveryAttemptId || null,
            to,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to send WhatsApp test message"
        await recordOmniSmokeRun(authz.adminDb, {
            chatbotId,
            channel: "whatsapp",
            provider: "meta",
            action: "test_message",
            result: "error",
            source: "api/omni/channels/whatsapp/test-message",
            message,
            target: to,
            metadata: {
                deliveryAttemptId: error instanceof Error ? (error as Error & { deliveryAttemptId?: string | null }).deliveryAttemptId || null : null,
            },
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "whatsapp",
            eventType: "whatsapp.test_message",
            result: "error",
            source: "api/omni/channels/whatsapp/test-message",
            message,
            metadata: {
                to,
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
