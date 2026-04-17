import { NextResponse } from "next/server"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { getAdminDb } from "@/lib/firebase-admin"
import { buildMetaSetupMergePayload, buildMetaSetupStatus, discoverMetaAssets, generateMetaVerifyToken, sanitizeSelectedChannels } from "@/lib/meta-setup"
import { getOmniChannelConfig, mergeOmniChannelConfig } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const body = await req.json().catch(() => null)
    const chatbotId = typeof body?.chatbotId === "string" ? body.chatbotId : ""
    const accessToken = typeof body?.accessToken === "string" ? body.accessToken.trim() : ""
    const appSecret = typeof body?.appSecret === "string" ? body.appSecret.trim() : ""
    const appId = typeof body?.appId === "string" ? body.appId.trim() : ""
    const selectedChannels = sanitizeSelectedChannels(body?.selectedChannels)

    if (!chatbotId || !accessToken) {
        return NextResponse.json({ error: "chatbotId and accessToken are required" }, { status: 400 })
    }

    const authz = await authorizeTargetAccess(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }

    const [chatbotSnapshot, currentConfig] = await Promise.all([
        adminDb.collection("chatbots").doc(chatbotId).get(),
        getOmniChannelConfig(adminDb, chatbotId),
    ])

    const discovery = await discoverMetaAssets(accessToken)
    const hasAnyInstagram = discovery.pages.some((page) => Boolean(page.instagramAccount))
    const hasAnyMessenger = discovery.pages.some((page) => page.messagingEligible !== false)
    const hasAnyWhatsApp = discovery.whatsappBusinesses.some((item) => item.phoneNumbers.length > 0)

    if (!hasAnyInstagram && !hasAnyMessenger && !hasAnyWhatsApp && discovery.errors.instagram && discovery.errors.messenger && discovery.errors.whatsapp) {
        return NextResponse.json(
            {
                error: "Meta varliklari kesfedilemedi",
                discovery: {
                    pages: [],
                    whatsappBusinesses: [],
                    errors: discovery.errors,
                },
            },
            { status: 400 }
        )
    }

    const nextConfig = await mergeOmniChannelConfig(
        adminDb,
        chatbotId,
        buildMetaSetupMergePayload({
            currentConfig,
            stage: "discovery",
            selectedChannels,
            discovery: {
                ...discovery,
                discoveredAt: new Date().toISOString(),
            },
            secrets: {
                accessToken,
                appSecret:
                    appSecret ||
                    currentConfig?.metaSetup?.secrets?.appSecret ||
                    currentConfig?.instagram?.appSecretRef ||
                    currentConfig?.messenger?.appSecretRef ||
                    currentConfig?.whatsapp?.appSecretRef ||
                    null,
                appId: appId || currentConfig?.metaSetup?.secrets?.appId || currentConfig?.instagram?.appId || currentConfig?.messenger?.appId || null,
            },
            channels: {
                instagram: selectedChannels.includes("instagram")
                    ? {
                          verifyToken: currentConfig?.instagram?.verifyToken || generateMetaVerifyToken(),
                          appId: appId || currentConfig?.instagram?.appId || null,
                          appSecretRef: appSecret || currentConfig?.instagram?.appSecretRef || null,
                          setupStage: "discovery",
                          connectionMode: "tenant_meta_app",
                          lastSetupError: discovery.errors.instagram,
                      }
                    : {},
                messenger: selectedChannels.includes("messenger")
                    ? {
                          verifyToken: currentConfig?.messenger?.verifyToken || generateMetaVerifyToken(),
                          appId: appId || currentConfig?.messenger?.appId || null,
                          appSecretRef: appSecret || currentConfig?.messenger?.appSecretRef || null,
                          setupStage: "discovery",
                          connectionMode: "tenant_meta_app",
                          lastSetupError: discovery.errors.messenger,
                      }
                    : {},
                whatsapp: selectedChannels.includes("whatsapp")
                    ? {
                          verifyToken: currentConfig?.whatsapp?.verifyToken || generateMetaVerifyToken(),
                          appSecretRef: appSecret || currentConfig?.whatsapp?.appSecretRef || null,
                          setupStage: "discovery",
                          connectionMode: "tenant_meta_app",
                          lastSetupError: discovery.errors.whatsapp,
                      }
                    : {},
            },
        })
    )

    return NextResponse.json(
        buildMetaSetupStatus({
            origin: new URL(req.url).origin,
            omniConfig: nextConfig,
            legacyIntegrations: chatbotSnapshot.data()?.integrations || {},
        })
    )
}
