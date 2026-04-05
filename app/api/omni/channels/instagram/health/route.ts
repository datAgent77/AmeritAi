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
    const instagram = config.instagram || {}

    if (instagram.enabled === false) {
        await recordOmniSmokeRun(authz.adminDb, {
            chatbotId,
            channel: "instagram",
            provider: "meta",
            action: "health_check",
            result: "blocked",
            source: "api/omni/channels/instagram/health",
            message: "Instagram channel is disabled",
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "instagram",
            eventType: "instagram.health_check",
            result: "blocked",
            source: "api/omni/channels/instagram/health",
            message: "Instagram channel is disabled",
        })
        return NextResponse.json({
            ok: true,
            provider: "instagram",
            enabled: false,
            skipped: true,
            message: "Instagram channel is disabled",
            checkedAt: new Date().toISOString(),
        })
    }

    if (!instagram.accessTokenRef || !instagram.accountId) {
        await recordOmniSmokeRun(authz.adminDb, {
            chatbotId,
            channel: "instagram",
            provider: "meta",
            action: "health_check",
            result: "error",
            source: "api/omni/channels/instagram/health",
            message: "Instagram access token and account ID are required",
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "instagram",
            eventType: "instagram.health_check",
            result: "error",
            source: "api/omni/channels/instagram/health",
            message: "Instagram access token and account ID are required",
        })
        return jsonError("Instagram access token and account ID are required", 400)
    }

    const endpoint = `https://graph.facebook.com/v23.0/${encodeURIComponent(instagram.accountId)}?fields=id,username,name`
    const response = await fetch(endpoint, {
        headers: {
            Authorization: `Bearer ${instagram.accessTokenRef}`,
        },
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
        await recordOmniSmokeRun(authz.adminDb, {
            chatbotId,
            channel: "instagram",
            provider: "meta",
            action: "health_check",
            result: "error",
            source: "api/omni/channels/instagram/health",
            message: data?.error?.message || "Instagram health check failed",
            metadata: {
                status: response.status,
                accountId: instagram.accountId,
            },
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "instagram",
            eventType: "instagram.health_check",
            result: "error",
            source: "api/omni/channels/instagram/health",
            message: data?.error?.message || "Instagram health check failed",
            metadata: {
                status: response.status,
                accountId: instagram.accountId,
            },
        })
        return NextResponse.json(
            {
                ok: false,
                provider: "instagram",
                status: response.status,
                message: data?.error?.message || "Instagram health check failed",
            },
            { status: 400 }
        )
    }

    await recordOmniSmokeRun(authz.adminDb, {
        chatbotId,
        channel: "instagram",
        provider: "meta",
        action: "health_check",
        result: "success",
        source: "api/omni/channels/instagram/health",
        message: "Instagram connection verified",
        metadata: {
            accountId: data?.id || instagram.accountId,
        },
    })
    await logOmniAuditEvent({
        chatbotId,
        channel: "instagram",
        eventType: "instagram.health_check",
        result: "success",
        source: "api/omni/channels/instagram/health",
        message: "Instagram connection verified",
        metadata: {
            accountId: data?.id || instagram.accountId,
        },
    })

    return NextResponse.json({
        ok: true,
        provider: "instagram",
        accountId: data?.id || instagram.accountId,
        username: data?.username || null,
        name: data?.name || null,
        checkedAt: new Date().toISOString(),
    })
}
