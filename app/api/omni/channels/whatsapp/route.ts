import { NextResponse } from "next/server"
import { getConfiguredCapabilitiesForChannel } from "@/lib/omni/assistant-capabilities"
import { getChannelPolicy } from "@/lib/omni/channel-policies"
import { authorizeOmniRequest, authorizedForOmniPermission, getOmniChannelConfig, getRequestOrigin, jsonError, maskSecret, mergeOmniChannelConfig } from "@/lib/omni/server-utils"
import type { WhatsAppChannelConfig } from "@/lib/omni/types"

export const dynamic = "force-dynamic"

function normalizeConfig(config: any): WhatsAppChannelConfig {
    return {
        enabled: config?.enabled === true,
        businessAccountId: config?.businessAccountId || null,
        phoneNumberId: config?.phoneNumberId || null,
        displayNumber: config?.displayNumber || null,
        appSecretRef: config?.appSecretRef || null,
        accessTokenRef: config?.accessTokenRef || null,
        verifyToken: config?.verifyToken || null,
        templateNamespace: config?.templateNamespace || null,
        webhookStatus: config?.webhookStatus || "disconnected",
        defaultReplyMode: config?.defaultReplyMode || "assistant",
    }
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
    if (!authorizedForOmniPermission(authz, "channels.view")) {
        return jsonError("Forbidden", 403)
    }

    const config = await getOmniChannelConfig(authz.adminDb, chatbotId)
    const whatsapp = normalizeConfig(config.whatsapp)
    const origin = getRequestOrigin(req)

    return NextResponse.json({
        config: {
            ...whatsapp,
            appSecretRef: maskSecret(whatsapp.appSecretRef),
            accessTokenRef: maskSecret(whatsapp.accessTokenRef),
            verifyToken: maskSecret(whatsapp.verifyToken),
        },
        policy: getChannelPolicy("whatsapp"),
        capabilities: getConfiguredCapabilitiesForChannel("whatsapp", config.assistantCore).map((capability) => ({
            id: capability.id,
            title: capability.title,
        })),
        health: {
            webhookUrl: `${origin}/api/omni/channels/whatsapp/webhook`,
            webhookStatus: whatsapp.webhookStatus,
            defaultReplyMode: whatsapp.defaultReplyMode,
            phoneNumberId: whatsapp.phoneNumberId,
        },
    })
}

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

    const current = await getOmniChannelConfig(authz.adminDb, chatbotId)
    const existing = normalizeConfig(current.whatsapp)

    const nextConfig = await mergeOmniChannelConfig(authz.adminDb, chatbotId, {
        whatsapp: {
            enabled: body.enabled ?? existing.enabled,
            businessAccountId: body.businessAccountId ?? existing.businessAccountId,
            phoneNumberId: body.phoneNumberId ?? existing.phoneNumberId,
            displayNumber: body.displayNumber ?? existing.displayNumber,
            appSecretRef: body.appSecretRef ? body.appSecretRef : existing.appSecretRef,
            accessTokenRef: body.accessTokenRef ? body.accessTokenRef : existing.accessTokenRef,
            verifyToken: body.verifyToken ? body.verifyToken : existing.verifyToken,
            templateNamespace: body.templateNamespace ?? existing.templateNamespace,
            webhookStatus: body.webhookStatus || (body.enabled === false ? "disconnected" : existing.webhookStatus || "connected"),
            defaultReplyMode: body.defaultReplyMode ?? existing.defaultReplyMode,
            updatedAt: new Date(),
        },
    })

    const normalized = normalizeConfig(nextConfig.whatsapp)

    return NextResponse.json({
        config: {
            ...normalized,
            appSecretRef: maskSecret(normalized.appSecretRef),
            accessTokenRef: maskSecret(normalized.accessTokenRef),
            verifyToken: maskSecret(normalized.verifyToken),
        },
    })
}
