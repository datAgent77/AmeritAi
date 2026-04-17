import { NextResponse } from "next/server"
import { getConfiguredCapabilitiesForChannel } from "@/lib/omni/assistant-capabilities"
import { getChannelPolicy } from "@/lib/omni/channel-policies"
import { authorizeOmniRequest, authorizedForOmniPermission, getOmniChannelConfig, getRequestOrigin, jsonError, maskSecret, mergeOmniChannelConfig } from "@/lib/omni/server-utils"
import type { MessengerChannelConfig } from "@/lib/omni/types"

export const dynamic = "force-dynamic"

function normalizeConfig(config: any): MessengerChannelConfig {
    return {
        enabled: config?.enabled === true,
        pageId: config?.pageId || null,
        appId: config?.appId || null,
        appSecretRef: config?.appSecretRef || null,
        accessTokenRef: config?.accessTokenRef || null,
        verifyToken: config?.verifyToken || null,
        webhookStatus: config?.webhookStatus || "disconnected",
        defaultReplyMode: config?.defaultReplyMode || "assistant",
        setupStatus: config?.setupStatus || "not_started",
        setupStage: config?.setupStage || "prerequisites",
        connectionMode: config?.connectionMode || "tenant_meta_app",
        lastHealthCheckAt: config?.lastHealthCheckAt || null,
        lastSetupError: config?.lastSetupError || null,
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const chatbotId = searchParams.get("chatbotId")
    if (!chatbotId) return jsonError("chatbotId is required", 400)

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) return authz.response
    if (!authorizedForOmniPermission(authz, "channels.view")) return jsonError("Forbidden", 403)

    const config = await getOmniChannelConfig(authz.adminDb, chatbotId)
    const messenger = normalizeConfig(config.messenger)
    const origin = getRequestOrigin(req)

    return NextResponse.json({
        config: {
            ...messenger,
            accessTokenRef: maskSecret(messenger.accessTokenRef),
            appSecretRef: maskSecret(messenger.appSecretRef),
            verifyToken: maskSecret(messenger.verifyToken),
        },
        policy: getChannelPolicy("messenger"),
        capabilities: getConfiguredCapabilitiesForChannel("messenger", config.assistantCore).map((capability) => ({
            id: capability.id,
            title: capability.title,
        })),
        health: {
            webhookUrl: `${origin}/api/omni/channels/messenger/webhook`,
            webhookStatus: messenger.webhookStatus,
            defaultReplyMode: messenger.defaultReplyMode,
            pageId: messenger.pageId,
        },
    })
}

export async function POST(req: Request) {
    const body = await req.json()
    const chatbotId = body.chatbotId
    if (!chatbotId) return jsonError("chatbotId is required", 400)

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) return authz.response
    if (!authorizedForOmniPermission(authz, "channels.manage")) return jsonError("Forbidden", 403)

    const current = await getOmniChannelConfig(authz.adminDb, chatbotId)
    const existing = normalizeConfig(current.messenger)

    const nextConfig = await mergeOmniChannelConfig(authz.adminDb, chatbotId, {
        messenger: {
            enabled: body.enabled ?? existing.enabled,
            pageId: body.pageId ?? existing.pageId,
            appId: body.appId ?? existing.appId,
            appSecretRef: body.appSecretRef ? body.appSecretRef : existing.appSecretRef,
            accessTokenRef: body.accessTokenRef ? body.accessTokenRef : existing.accessTokenRef,
            verifyToken: body.verifyToken ? body.verifyToken : existing.verifyToken,
            webhookStatus: body.webhookStatus || (body.enabled === false ? "disconnected" : existing.webhookStatus || "connected"),
            defaultReplyMode: body.defaultReplyMode ?? existing.defaultReplyMode,
            setupStatus: body.setupStatus ?? existing.setupStatus,
            setupStage: body.setupStage ?? existing.setupStage,
            connectionMode: body.connectionMode ?? existing.connectionMode,
            lastHealthCheckAt: body.lastHealthCheckAt ?? existing.lastHealthCheckAt,
            lastSetupError: body.lastSetupError ?? existing.lastSetupError,
            updatedAt: new Date(),
        },
    })

    const normalized = normalizeConfig(nextConfig.messenger)
    return NextResponse.json({
        config: {
            ...normalized,
            accessTokenRef: maskSecret(normalized.accessTokenRef),
            appSecretRef: maskSecret(normalized.appSecretRef),
            verifyToken: maskSecret(normalized.verifyToken),
        },
    })
}
