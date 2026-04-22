import { getAdminDb } from "@/lib/firebase-admin"
import { consumeOAuthState } from "@/lib/oauth-state"
import { discoverMetaPages, getMetaPlatformAppConfig, isMetaPlatformAppAvailable } from "@/lib/meta-setup"
import { exchangeMetaCode } from "@/lib/integrations/meta-shared/oauth"
import { subscribeWebhook } from "@/lib/integrations/meta-shared/webhook"
import { buildMessengerDMMergePayload, buildMessengerDMStatus } from "@/lib/integrations/messenger/setup"
import { runMessengerDMPreflight } from "@/lib/integrations/messenger/preflight"
import { getPublicAppOrigin, mergeOmniChannelConfig } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

function buildPopupResponse(origin: string, payload: Record<string, unknown>) {
    const body = `<!doctype html><html><body><script>
window.opener && window.opener.postMessage(${JSON.stringify(payload)}, ${JSON.stringify(origin)});
window.close();
</script></body></html>`
    return new Response(body, { headers: { "Content-Type": "text/html; charset=utf-8" } })
}

export async function GET(req: Request) {
    const adminDb = getAdminDb()
    if (!adminDb) return new Response("Firebase Admin başlatılamadı.", { status: 500 })

    const origin = getPublicAppOrigin(req)
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const providerError = searchParams.get("error")

    if (!code || !state) {
        return buildPopupResponse(origin, {
            type: "vion-messenger-dm-oauth",
            ok: false,
            error: providerError || "Meta doğrulaması tamamlanamadı.",
        })
    }

    const stateData = await consumeOAuthState(state, "integration-meta-messenger-dm")
    const chatbotId = stateData?.chatbotId || stateData?.userId || ""

    if (!chatbotId) {
        return buildPopupResponse(origin, { type: "vion-messenger-dm-oauth", ok: false, error: "Geçersiz oturum durumu." })
    }

    try {
        let appConfig: { appId: string; appSecret: string; verifyToken: string }
        if (stateData?.appConfigSource === "platform") {
            if (!isMetaPlatformAppAvailable()) {
                throw new Error("Platform uygulama yapılandırması eksik. META_APP_ID ve META_APP_SECRET tanımlı olmalıdır.")
            }
            appConfig = getMetaPlatformAppConfig()
        } else {
            appConfig = {
                appId: stateData?.apiKey || "",
                appSecret: stateData?.apiSecret || "",
                verifyToken: stateData?.verifyToken || "tenant-messenger-verify-token",
            }
            if (!appConfig.appId || !appConfig.appSecret) {
                throw new Error("Meta uygulama bilgileri (App ID / Secret) eksik veya geçersiz.")
            }
        }

        const { accessToken, expiresIn } = await exchangeMetaCode({
            origin,
            callbackPath: "/api/integrations/messenger/callback",
            code,
            appConfig,
        })

        const expiresAt = typeof expiresIn === "number" ? new Date(Date.now() + expiresIn * 1000).toISOString() : null
        const currentConfig = ((await adminDb.collection("omni_channel_configs").doc(chatbotId).get()).data() || {}) as Record<string, any>
        const discovery = await discoverMetaPages(accessToken)
        const firstPage = discovery.pages.find((page) => page.messagingEligible !== false) || null
        const pageAccessToken = firstPage?.pageAccessToken || accessToken
        const preflight = await runMessengerDMPreflight(accessToken, chatbotId, adminDb)

        let nextConfig = await mergeOmniChannelConfig(
            adminDb,
            chatbotId,
            buildMessengerDMMergePayload({
                omniConfig: currentConfig,
                accessToken,
                appId: appConfig.appId,
                appSecret: appConfig.appSecret,
                pageId: firstPage?.id || null,
                pageName: firstPage?.name || null,
                pageAccessToken,
                tokenExpiresAt: expiresAt,
                preflightResult: preflight.result,
                webhookStatus: firstPage ? "pending" : "disconnected",
                lastConnectedAt: firstPage ? new Date().toISOString() : null,
            })
        )

        if (firstPage) {
            try {
                await subscribeWebhook({ channel: "messenger", pageId: firstPage.id, accessToken: pageAccessToken })
                const refreshed = await runMessengerDMPreflight(accessToken, chatbotId, adminDb)
                nextConfig = await mergeOmniChannelConfig(
                    adminDb,
                    chatbotId,
                    buildMessengerDMMergePayload({
                        omniConfig: nextConfig,
                        appId: appConfig.appId,
                        appSecret: appConfig.appSecret,
                        pageId: firstPage.id,
                        pageName: firstPage.name,
                        pageAccessToken,
                        tokenExpiresAt: expiresAt,
                        preflightResult: {
                            ...refreshed.result,
                            webhookActive: true,
                            overallOk: refreshed.result.hasFacebookPage === true && refreshed.result.pageIsMessagingEligible !== false && refreshed.result.tokenPresent === true,
                            failureReason: refreshed.result.failureReason === "Mesaj akışı şu anda aktif görünmüyor." ? null : refreshed.result.failureReason,
                        },
                        webhookStatus: "connected",
                        lastConnectedAt: new Date().toISOString(),
                    })
                )
            } catch {
                nextConfig = await mergeOmniChannelConfig(
                    adminDb,
                    chatbotId,
                    buildMessengerDMMergePayload({
                        omniConfig: nextConfig,
                        appId: appConfig.appId,
                        appSecret: appConfig.appSecret,
                        pageId: firstPage.id,
                        pageName: firstPage.name,
                        pageAccessToken,
                        tokenExpiresAt: expiresAt,
                        preflightResult: preflight.result,
                        webhookStatus: "pending",
                    })
                )
            }
        }

        const chatbotRef = adminDb.collection("chatbots").doc(chatbotId)
        await chatbotRef.set(
            {
                integrations: {
                    messenger: {
                        connected: Boolean(firstPage),
                        pageId: firstPage?.id || null,
                        accessToken: pageAccessToken,
                        verifyToken: nextConfig?.messenger?.verifyToken || appConfig.verifyToken,
                        appSecret: appConfig.appSecret,
                        appId: appConfig.appId,
                        connectedAt: firstPage ? new Date().toISOString() : null,
                    },
                },
            },
            { merge: true }
        )

        const chatbotSnapshot = await chatbotRef.get()
        const status = await buildMessengerDMStatus({
            adminDb,
            chatbotId,
            origin,
            omniConfig: nextConfig,
            availablePages: preflight.availablePages,
            legacyIntegrations: chatbotSnapshot.data()?.integrations || {},
        })

        return buildPopupResponse(origin, { type: "vion-messenger-dm-oauth", ok: true, status })
    } catch (error) {
        return buildPopupResponse(origin, {
            type: "vion-messenger-dm-oauth",
            ok: false,
            error: error instanceof Error ? error.message : "Messenger bağlantısı tamamlanamadı.",
        })
    }
}
