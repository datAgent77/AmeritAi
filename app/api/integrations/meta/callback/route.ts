import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import {
    autoSelectMetaAssets,
    buildMetaSetupMergePayload,
    discoverMetaAssets,
    exchangeMetaCodeForAccessToken,
    generateMetaVerifyToken,
    resolveReturnPath,
    runMetaHealthCheck,
    sanitizeSelectedChannels,
    subscribeMetaAppToPage,
    subscribeMetaAppToWhatsAppBusiness,
} from "@/lib/meta-setup"
import { consumeOAuthState } from "@/lib/oauth-state"
import { getOmniChannelConfig, getPublicAppOrigin, mergeOmniChannelConfig } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

function withStatusParams(returnPath: string, params: Record<string, string>) {
    const [pathname, query = ""] = returnPath.split("?")
    const search = new URLSearchParams(query)
    Object.entries(params).forEach(([key, value]) => search.set(key, value))
    const nextQuery = search.toString()
    return `${pathname}${nextQuery ? `?${nextQuery}` : ""}`
}

export async function GET(req: Request) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return new Response("Firebase Admin not initialized", { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const providerError = searchParams.get("error")

    if (!code || !state) {
        return new Response(providerError || "Missing code or state", { status: 400 })
    }

    const stateData = await consumeOAuthState(state, "integration-meta")
    const chatbotId = stateData?.chatbotId || stateData?.userId || ""
    const selectedChannels = sanitizeSelectedChannels(stateData?.selectedChannels)
    const returnPath = resolveReturnPath(stateData?.returnPath)
    const tenantAppConfig =
        stateData?.apiKey && stateData?.apiSecret
            ? {
                  appId: stateData.apiKey,
                  appSecret: stateData.apiSecret,
                  verifyToken: stateData.verifyToken || generateMetaVerifyToken(),
              }
            : null
    const appConfigSource = stateData?.appConfigSource

    if (!chatbotId) {
        return new Response("Invalid state", { status: 400 })
    }

    try {
        const origin = getPublicAppOrigin(req)
        const { accessToken } = await exchangeMetaCodeForAccessToken({ origin, code, appConfig: tenantAppConfig || undefined })
        const discovery = await discoverMetaAssets(accessToken)
        const currentConfig = await getOmniChannelConfig(adminDb, chatbotId)
        const chatbotRef = adminDb.collection("chatbots").doc(chatbotId)
        const chatbotSnap = await chatbotRef.get()
        const legacyIntegrations = chatbotSnap.exists ? chatbotSnap.data()?.integrations || {} : {}
        const oauthAppConfig = tenantAppConfig
        if (!oauthAppConfig) {
            throw new Error("Bu tenant icin Meta App ID ve Meta App Secret bulunamadi.")
        }
        const connectionMode = appConfigSource === "platform" ? "platform_meta_app" : "tenant_meta_app"
        const selection = autoSelectMetaAssets(discovery, selectedChannels)
        const now = new Date().toISOString()

        const channelPayloads: Record<string, Record<string, unknown>> = {}
        const subscriptionErrors: Partial<Record<"instagram" | "messenger" | "whatsapp", string | null>> = {}
        const subscribedPages = new Set<string>()

        if (selectedChannels.includes("instagram")) {
            if (selection.instagramPage?.instagramAccount) {
                try {
                    if (!subscribedPages.has(selection.instagramPage.id)) {
                        await subscribeMetaAppToPage(selection.instagramPage.id, selection.instagramPage.pageAccessToken || accessToken)
                        subscribedPages.add(selection.instagramPage.id)
                    }
                    subscriptionErrors.instagram = null
                } catch (error) {
                    subscriptionErrors.instagram = error instanceof Error ? error.message : "Instagram subscribed_apps basarisiz."
                }

                channelPayloads.instagram = {
                    enabled: true,
                    pageId: selection.instagramPage.id,
                    accountId: selection.instagramPage.instagramAccount.id,
                    appId: oauthAppConfig.appId,
                    accessTokenRef: selection.instagramPage.pageAccessToken || accessToken,
                    appSecretRef: oauthAppConfig.appSecret,
                    verifyToken: oauthAppConfig.verifyToken,
                    webhookStatus: subscriptionErrors.instagram ? "pending" : "connected",
                    setupStatus: subscriptionErrors.instagram ? "error" : "draft",
                    setupStage: subscriptionErrors.instagram ? "go_live" : "draft",
                    connectionMode,
                    lastSetupError: subscriptionErrors.instagram || null,
                }
            } else {
                channelPayloads.instagram = {
                    enabled: false,
                    webhookStatus: "disconnected",
                    setupStatus: "draft",
                    setupStage: "draft",
                    connectionMode,
                    lastSetupError: discovery.errors.instagram || "Instagram icin uygun sayfa bulunamadi.",
                }
            }
        }

        if (selectedChannels.includes("messenger")) {
            if (selection.messengerPage) {
                try {
                    if (!subscribedPages.has(selection.messengerPage.id)) {
                        await subscribeMetaAppToPage(selection.messengerPage.id, selection.messengerPage.pageAccessToken || accessToken)
                        subscribedPages.add(selection.messengerPage.id)
                    }
                    subscriptionErrors.messenger = null
                } catch (error) {
                    subscriptionErrors.messenger = error instanceof Error ? error.message : "Messenger subscribed_apps basarisiz."
                }

                channelPayloads.messenger = {
                    enabled: true,
                    pageId: selection.messengerPage.id,
                    appId: oauthAppConfig.appId,
                    accessTokenRef: selection.messengerPage.pageAccessToken || accessToken,
                    appSecretRef: oauthAppConfig.appSecret,
                    verifyToken: oauthAppConfig.verifyToken,
                    webhookStatus: subscriptionErrors.messenger ? "pending" : "connected",
                    setupStatus: subscriptionErrors.messenger ? "error" : "draft",
                    setupStage: subscriptionErrors.messenger ? "go_live" : "draft",
                    connectionMode,
                    lastSetupError: subscriptionErrors.messenger || null,
                }
            } else {
                channelPayloads.messenger = {
                    enabled: false,
                    webhookStatus: "disconnected",
                    setupStatus: "draft",
                    setupStage: "draft",
                    connectionMode,
                    lastSetupError: discovery.errors.messenger || "Messenger icin uygun sayfa bulunamadi.",
                }
            }
        }

        if (selectedChannels.includes("whatsapp")) {
            if (selection.whatsappBusiness && selection.whatsappPhone) {
                try {
                    await subscribeMetaAppToWhatsAppBusiness(selection.whatsappBusiness.id, accessToken)
                    subscriptionErrors.whatsapp = null
                } catch (error) {
                    subscriptionErrors.whatsapp = error instanceof Error ? error.message : "WhatsApp subscribed_apps basarisiz."
                }

                channelPayloads.whatsapp = {
                    enabled: true,
                    businessAccountId: selection.whatsappBusiness.id,
                    phoneNumberId: selection.whatsappPhone.id,
                    displayNumber: selection.whatsappPhone.displayNumber || null,
                    accessTokenRef: accessToken,
                    appSecretRef: oauthAppConfig.appSecret,
                    verifyToken: oauthAppConfig.verifyToken,
                    webhookStatus: subscriptionErrors.whatsapp ? "pending" : "connected",
                    setupStatus: subscriptionErrors.whatsapp ? "error" : "draft",
                    setupStage: subscriptionErrors.whatsapp ? "go_live" : "draft",
                    connectionMode,
                    lastSetupError: subscriptionErrors.whatsapp || null,
                }
            } else {
                channelPayloads.whatsapp = {
                    enabled: false,
                    webhookStatus: "disconnected",
                    setupStatus: "draft",
                    setupStage: "draft",
                    connectionMode,
                    lastSetupError: discovery.errors.whatsapp || "WhatsApp icin uygun numara bulunamadi.",
                }
            }
        }

        let nextConfig = await mergeOmniChannelConfig(
            adminDb,
            chatbotId,
            buildMetaSetupMergePayload({
                currentConfig,
                stage: "draft",
                selectedChannels,
                discovery: {
                    ...discovery,
                    discoveredAt: now,
                },
                secrets: {
                    accessToken,
                    appSecret: oauthAppConfig.appSecret,
                    appId: oauthAppConfig.appId,
                },
                oauth: {
                    lastConnectedAt: now,
                    lastConnectedBy: chatbotId,
                    connectionMode,
                },
                channels: channelPayloads,
            })
        )

        const finalChannelPayloads: Record<string, Record<string, unknown>> = {}
        const results: Record<string, { ok: boolean; message: string; status: number }> = {}

        for (const channel of selectedChannels) {
            const configCandidate = nextConfig?.[channel]
            if (!configCandidate?.enabled) {
                finalChannelPayloads[channel] = {
                    enabled: false,
                    setupStatus: "draft",
                    setupStage: "draft",
                }
                continue
            }

            if (channel !== "whatsapp" && channel !== "instagram" && channel !== "messenger") {
                continue
            }

            const health = await runMetaHealthCheck(req, channel, chatbotId)
            const subscriptionError = subscriptionErrors[channel] || null
            const live = health.ok && !subscriptionError
            finalChannelPayloads[channel] = {
                enabled: true,
                setupStatus: live ? "live" : subscriptionError ? "error" : "ready_for_live",
                setupStage: live ? "live" : "go_live",
                webhookStatus: live ? "connected" : subscriptionError ? "pending" : "connected",
                lastHealthCheckAt: now,
                lastSetupError: live ? null : subscriptionError || health.message,
            }
            results[channel] = {
                ok: live,
                status: health.status,
                message: live ? "Kurulum tamamlandi." : subscriptionError || health.message,
            }

            if (!live) continue

            if (channel === "instagram") {
                legacyIntegrations.instagram = {
                    ...(legacyIntegrations.instagram || {}),
                    connected: true,
                    pageId: nextConfig?.instagram?.pageId || null,
                    accountId: nextConfig?.instagram?.accountId || null,
                    appId: oauthAppConfig.appId,
                    accessToken: nextConfig?.instagram?.accessTokenRef || null,
                    verifyToken: oauthAppConfig.verifyToken,
                    appSecret: oauthAppConfig.appSecret,
                    connectedAt: now,
                }
            } else if (channel === "messenger") {
                legacyIntegrations.messenger = {
                    ...(legacyIntegrations.messenger || {}),
                    connected: true,
                    pageId: nextConfig?.messenger?.pageId || null,
                    appId: oauthAppConfig.appId,
                    accessToken: nextConfig?.messenger?.accessTokenRef || null,
                    verifyToken: oauthAppConfig.verifyToken,
                    appSecret: oauthAppConfig.appSecret,
                    connectedAt: now,
                }
            } else if (channel === "whatsapp") {
                legacyIntegrations.whatsapp = {
                    ...(legacyIntegrations.whatsapp || {}),
                    connected: true,
                    businessAccountId: nextConfig?.whatsapp?.businessAccountId || null,
                    phoneNumberId: nextConfig?.whatsapp?.phoneNumberId || null,
                    displayNumber: nextConfig?.whatsapp?.displayNumber || null,
                    accessToken: nextConfig?.whatsapp?.accessTokenRef || null,
                    verifyToken: oauthAppConfig.verifyToken,
                    appSecret: oauthAppConfig.appSecret,
                    connectedAt: now,
                }
            }
        }

        nextConfig = await mergeOmniChannelConfig(
            adminDb,
            chatbotId,
            buildMetaSetupMergePayload({
                currentConfig: nextConfig,
                stage: selectedChannels.every((channel) => results[channel]?.ok || finalChannelPayloads[channel]?.enabled === false) ? "live" : "go_live",
                selectedChannels,
                channels: finalChannelPayloads,
            })
        )

        await chatbotRef.set({ integrations: legacyIntegrations }, { merge: true })

        return NextResponse.redirect(new URL(withStatusParams(returnPath, { connected: "meta-channels" }), origin))
    } catch (error) {
        const fallbackUrl = new URL(withStatusParams(returnPath, { metaError: "1" }), new URL(req.url).origin)
        fallbackUrl.searchParams.set("metaMessage", error instanceof Error ? error.message : "Meta callback basarisiz.")
        return NextResponse.redirect(fallbackUrl)
    }
}
