import { NextResponse } from "next/server"
import { getConfiguredCapabilitiesForChannel } from "@/lib/omni/assistant-capabilities"
import { getChannelPolicy } from "@/lib/omni/channel-policies"
import { authorizeOmniRequest, authorizedForOmniPermission, getOmniChannelConfig, jsonError, mergeOmniChannelConfig } from "@/lib/omni/server-utils"
import type { WebChannelConfig } from "@/lib/omni/types"

export const dynamic = "force-dynamic"

function normalizeConfig(config: any): WebChannelConfig {
    return {
        enabled: config?.enabled !== false,
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
    const web = normalizeConfig(config.web)

    return NextResponse.json({
        config: web,
        policy: getChannelPolicy("web"),
        capabilities: getConfiguredCapabilitiesForChannel("web", config.assistantCore).map((capability) => ({
            id: capability.id,
            title: capability.title,
        })),
        health: {
            enabled: web.enabled,
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
    const existing = normalizeConfig(current.web)

    const merged = await mergeOmniChannelConfig(authz.adminDb, chatbotId, {
        web: {
            enabled: typeof body.enabled === "boolean" ? body.enabled : existing.enabled,
            updatedAt: new Date(),
        },
    })

    return NextResponse.json({
        config: normalizeConfig(merged.web),
    })
}
