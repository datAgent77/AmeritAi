import { NextResponse } from "next/server"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { getAdminDb } from "@/lib/firebase-admin"
import {
    buildMetaSetupMergePayload,
    buildMetaSetupStatus,
    runMetaHealthCheck,
    sanitizeMetaSetupDraft,
    sanitizeSelectedChannels,
} from "@/lib/meta-setup"
import { getOmniChannelConfig, mergeOmniChannelConfig } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const body = await req.json().catch(() => null)
    const chatbotId = typeof body?.chatbotId === "string" ? body.chatbotId : ""
    const selectedChannels = sanitizeSelectedChannels(body?.selectedChannels)
    const confirmReady = body?.confirmReady === true
    const appSecret = typeof body?.appSecret === "string" ? body.appSecret.trim() : ""
    const appId = typeof body?.appId === "string" ? body.appId.trim() : ""

    if (!chatbotId) {
        return NextResponse.json({ error: "chatbotId is required" }, { status: 400 })
    }
    if (!confirmReady) {
        return NextResponse.json({ error: "Canliya alma onayi gerekli." }, { status: 400 })
    }

    const authz = await authorizeTargetAccess(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }

    const [chatbotSnapshot, currentConfig] = await Promise.all([
        adminDb.collection("chatbots").doc(chatbotId).get(),
        getOmniChannelConfig(adminDb, chatbotId),
    ])
    const draft = sanitizeMetaSetupDraft(currentConfig?.metaSetup)
    const resolvedAppSecret =
        appSecret ||
        draft.secrets?.appSecret ||
        currentConfig?.instagram?.appSecretRef ||
        currentConfig?.messenger?.appSecretRef ||
        currentConfig?.whatsapp?.appSecretRef ||
        ""

    if (!resolvedAppSecret) {
        return NextResponse.json({ error: "Canliya alma icin Meta App Secret gerekli." }, { status: 400 })
    }

    let nextConfig = await mergeOmniChannelConfig(
        adminDb,
        chatbotId,
        buildMetaSetupMergePayload({
            currentConfig,
            stage: "go_live",
            selectedChannels,
            secrets: {
                accessToken: draft.secrets?.accessToken || currentConfig?.metaSetup?.secrets?.accessToken || null,
                appSecret: resolvedAppSecret,
                appId: appId || draft.secrets?.appId || currentConfig?.instagram?.appId || null,
            },
            channels: {
                instagram: selectedChannels.includes("instagram")
                    ? {
                          appSecretRef: resolvedAppSecret,
                          appId: appId || currentConfig?.instagram?.appId || null,
                          setupStage: "go_live",
                      }
                    : {},
                messenger: selectedChannels.includes("messenger")
                    ? {
                          appSecretRef: resolvedAppSecret,
                          appId: appId || currentConfig?.messenger?.appId || null,
                          setupStage: "go_live",
                      }
                    : {},
                whatsapp: selectedChannels.includes("whatsapp")
                    ? {
                          appSecretRef: resolvedAppSecret,
                          setupStage: "go_live",
                      }
                    : {},
            },
        })
    )

    const channelPayloads: Record<string, Record<string, unknown>> = {}
    const legacyIntegrations = chatbotSnapshot.data()?.integrations || {}
    const results: Record<string, { ok: boolean; message: string; status: number }> = {}

    for (const channel of selectedChannels) {
        const health = await runMetaHealthCheck(req, channel, chatbotId)
        results[channel] = {
            ok: health.ok,
            message: health.message,
            status: health.status,
        }

        channelPayloads[channel] = {
            setupStatus: health.ok ? "live" : "error",
            setupStage: health.ok ? "live" : "go_live",
            webhookStatus: health.ok ? "connected" : currentConfig?.[channel]?.webhookStatus || "pending",
            lastHealthCheckAt: new Date().toISOString(),
            lastSetupError: health.ok ? null : health.message,
            enabled: true,
        }

        if (health.ok && channel === "instagram") {
            legacyIntegrations.instagram = {
                ...(legacyIntegrations.instagram || {}),
                connected: true,
                pageId: nextConfig?.instagram?.pageId || currentConfig?.instagram?.pageId || null,
                accountId: nextConfig?.instagram?.accountId || currentConfig?.instagram?.accountId || null,
                appId: appId || nextConfig?.instagram?.appId || currentConfig?.instagram?.appId || null,
                accessToken: nextConfig?.instagram?.accessTokenRef || currentConfig?.instagram?.accessTokenRef || null,
                verifyToken: nextConfig?.instagram?.verifyToken || currentConfig?.instagram?.verifyToken || null,
                appSecret: resolvedAppSecret,
                connectedAt: new Date().toISOString(),
            }
        }

        if (health.ok && channel === "messenger") {
            legacyIntegrations.messenger = {
                ...(legacyIntegrations.messenger || {}),
                connected: true,
                pageId: nextConfig?.messenger?.pageId || currentConfig?.messenger?.pageId || null,
                appId: appId || nextConfig?.messenger?.appId || currentConfig?.messenger?.appId || null,
                accessToken: nextConfig?.messenger?.accessTokenRef || currentConfig?.messenger?.accessTokenRef || null,
                verifyToken: nextConfig?.messenger?.verifyToken || currentConfig?.messenger?.verifyToken || null,
                appSecret: resolvedAppSecret,
                connectedAt: new Date().toISOString(),
            }
        }

        if (health.ok && channel === "whatsapp") {
            legacyIntegrations.whatsapp = {
                ...(legacyIntegrations.whatsapp || {}),
                connected: true,
                businessAccountId: nextConfig?.whatsapp?.businessAccountId || currentConfig?.whatsapp?.businessAccountId || null,
                phoneNumberId: nextConfig?.whatsapp?.phoneNumberId || currentConfig?.whatsapp?.phoneNumberId || null,
                displayNumber: nextConfig?.whatsapp?.displayNumber || currentConfig?.whatsapp?.displayNumber || null,
                accessToken: nextConfig?.whatsapp?.accessTokenRef || currentConfig?.whatsapp?.accessTokenRef || null,
                verifyToken: nextConfig?.whatsapp?.verifyToken || currentConfig?.whatsapp?.verifyToken || null,
                appSecret: resolvedAppSecret,
                connectedAt: new Date().toISOString(),
            }
        }
    }

    nextConfig = await mergeOmniChannelConfig(
        adminDb,
        chatbotId,
        buildMetaSetupMergePayload({
            currentConfig: nextConfig,
            stage: selectedChannels.every((channel) => results[channel]?.ok) ? "live" : "go_live",
            selectedChannels,
            channels: channelPayloads,
        })
    )

    await adminDb.collection("chatbots").doc(chatbotId).set(
        {
            integrations: legacyIntegrations,
        },
        { merge: true }
    )

    return NextResponse.json({
        results,
        status: buildMetaSetupStatus({
            origin: new URL(req.url).origin,
            omniConfig: nextConfig,
            legacyIntegrations,
        }),
    })
}
