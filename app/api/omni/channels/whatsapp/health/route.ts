import { NextResponse } from "next/server"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { recordOmniSmokeRun } from "@/lib/omni/smoke-runs"
import { authorizeOmniRequest, authorizedForOmniPermission, getOmniChannelConfig, jsonError } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const body = await req.json()
    const chatbotId = body.chatbotId

    if (!chatbotId) {
        return jsonError("chatbotId is required", 400)
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
            action: "health_check",
            result: "blocked",
            source: "api/omni/channels/whatsapp/health",
            message: "WhatsApp channel is disabled",
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "whatsapp",
            eventType: "whatsapp.health_check",
            result: "blocked",
            source: "api/omni/channels/whatsapp/health",
            message: "WhatsApp channel is disabled",
        })
        return NextResponse.json({
            ok: true,
            provider: "whatsapp",
            enabled: false,
            skipped: true,
            message: "WhatsApp channel is disabled",
            checkedAt: new Date().toISOString(),
        })
    }

    if (!whatsapp.accessTokenRef || !whatsapp.phoneNumberId) {
        await recordOmniSmokeRun(authz.adminDb, {
            chatbotId,
            channel: "whatsapp",
            provider: "meta",
            action: "health_check",
            result: "error",
            source: "api/omni/channels/whatsapp/health",
            message: "WhatsApp access token and phone number ID are required",
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "whatsapp",
            eventType: "whatsapp.health_check",
            result: "error",
            source: "api/omni/channels/whatsapp/health",
            message: "WhatsApp access token and phone number ID are required",
        })
        return jsonError("WhatsApp access token and phone number ID are required", 400)
    }

    const endpoint = `https://graph.facebook.com/v23.0/${encodeURIComponent(whatsapp.phoneNumberId)}?fields=id,display_phone_number,verified_name`
    const response = await fetch(endpoint, {
        headers: {
            Authorization: `Bearer ${whatsapp.accessTokenRef}`,
        },
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
        await recordOmniSmokeRun(authz.adminDb, {
            chatbotId,
            channel: "whatsapp",
            provider: "meta",
            action: "health_check",
            result: "error",
            source: "api/omni/channels/whatsapp/health",
            message: data?.error?.message || "WhatsApp health check failed",
            metadata: {
                status: response.status,
                phoneNumberId: whatsapp.phoneNumberId,
            },
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "whatsapp",
            eventType: "whatsapp.health_check",
            result: "error",
            source: "api/omni/channels/whatsapp/health",
            message: data?.error?.message || "WhatsApp health check failed",
            metadata: {
                status: response.status,
                phoneNumberId: whatsapp.phoneNumberId,
            },
        })
        return NextResponse.json(
            {
                ok: false,
                provider: "whatsapp",
                status: response.status,
                message: data?.error?.message || "WhatsApp health check failed",
            },
            { status: 400 }
        )
    }

    await recordOmniSmokeRun(authz.adminDb, {
        chatbotId,
        channel: "whatsapp",
        provider: "meta",
        action: "health_check",
        result: "success",
        source: "api/omni/channels/whatsapp/health",
        message: "WhatsApp connection verified",
        metadata: {
            phoneNumberId: data?.id || whatsapp.phoneNumberId,
        },
    })
    await logOmniAuditEvent({
        chatbotId,
        channel: "whatsapp",
        eventType: "whatsapp.health_check",
        result: "success",
        source: "api/omni/channels/whatsapp/health",
        message: "WhatsApp connection verified",
        metadata: {
            phoneNumberId: data?.id || whatsapp.phoneNumberId,
        },
    })

    return NextResponse.json({
        ok: true,
        provider: "whatsapp",
        phoneNumberId: data?.id || whatsapp.phoneNumberId,
        displayPhoneNumber: data?.display_phone_number || whatsapp.displayNumber || null,
        verifiedName: data?.verified_name || null,
        checkedAt: new Date().toISOString(),
    })
}
