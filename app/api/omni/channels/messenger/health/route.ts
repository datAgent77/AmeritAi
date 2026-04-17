import { NextResponse } from "next/server"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { recordOmniSmokeRun } from "@/lib/omni/smoke-runs"
import { authorizeOmniRequest, authorizedForOmniPermission, getOmniChannelConfig, jsonError } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const body = await req.json()
    const chatbotId = body.chatbotId
    if (!chatbotId) return jsonError("chatbotId is required", 400)

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) return authz.response
    if (!authorizedForOmniPermission(authz, "channels.manage")) return jsonError("Forbidden", 403)

    const config = await getOmniChannelConfig(authz.adminDb, chatbotId)
    const messenger = config.messenger || {}

    if (messenger.enabled === false) {
        await recordOmniSmokeRun(authz.adminDb, {
            chatbotId,
            channel: "messenger",
            provider: "meta",
            action: "health_check",
            result: "blocked",
            source: "api/omni/channels/messenger/health",
            message: "Messenger channel is disabled",
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "messenger",
            eventType: "messenger.health_check",
            result: "blocked",
            source: "api/omni/channels/messenger/health",
            message: "Messenger channel is disabled",
        })
        return NextResponse.json({
            ok: true,
            provider: "messenger",
            enabled: false,
            skipped: true,
            message: "Messenger channel is disabled",
            checkedAt: new Date().toISOString(),
        })
    }

    if (!messenger.accessTokenRef || !messenger.pageId) {
        await recordOmniSmokeRun(authz.adminDb, {
            chatbotId,
            channel: "messenger",
            provider: "meta",
            action: "health_check",
            result: "error",
            source: "api/omni/channels/messenger/health",
            message: "Messenger access token and page ID are required",
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "messenger",
            eventType: "messenger.health_check",
            result: "error",
            source: "api/omni/channels/messenger/health",
            message: "Messenger access token and page ID are required",
        })
        return jsonError("Messenger access token and page ID are required", 400)
    }

    const endpoint = `https://graph.facebook.com/v23.0/${encodeURIComponent(messenger.pageId)}?fields=id,name`
    const response = await fetch(endpoint, {
        headers: {
            Authorization: `Bearer ${messenger.accessTokenRef}`,
        },
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        await recordOmniSmokeRun(authz.adminDb, {
            chatbotId,
            channel: "messenger",
            provider: "meta",
            action: "health_check",
            result: "error",
            source: "api/omni/channels/messenger/health",
            message: data?.error?.message || "Messenger health check failed",
            metadata: {
                status: response.status,
                pageId: messenger.pageId,
            },
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "messenger",
            eventType: "messenger.health_check",
            result: "error",
            source: "api/omni/channels/messenger/health",
            message: data?.error?.message || "Messenger health check failed",
            metadata: {
                status: response.status,
                pageId: messenger.pageId,
            },
        })
        return NextResponse.json(
            {
                ok: false,
                provider: "messenger",
                status: response.status,
                message: data?.error?.message || "Messenger health check failed",
            },
            { status: 400 }
        )
    }

    await recordOmniSmokeRun(authz.adminDb, {
        chatbotId,
        channel: "messenger",
        provider: "meta",
        action: "health_check",
        result: "success",
        source: "api/omni/channels/messenger/health",
        message: "Messenger connection verified",
        metadata: {
            pageId: data?.id || messenger.pageId,
        },
    })
    await logOmniAuditEvent({
        chatbotId,
        channel: "messenger",
        eventType: "messenger.health_check",
        result: "success",
        source: "api/omni/channels/messenger/health",
        message: "Messenger connection verified",
        metadata: {
            pageId: data?.id || messenger.pageId,
        },
    })

    return NextResponse.json({
        ok: true,
        provider: "messenger",
        pageId: data?.id || messenger.pageId,
        name: data?.name || null,
        checkedAt: new Date().toISOString(),
    })
}
