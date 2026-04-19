import { getAdminDb } from "@/lib/firebase-admin"
import { consumeOAuthState } from "@/lib/oauth-state"
import { discoverWhatsAppBusinesses } from "@/lib/meta-setup"
import { exchangeMetaCode } from "@/lib/integrations/meta-shared/oauth"
import { subscribeWebhook } from "@/lib/integrations/meta-shared/webhook"
import { runWhatsAppBizPreflight } from "@/lib/integrations/whatsapp-business/preflight"
import { buildWhatsAppBizMergePayload, buildWhatsAppBizStatus } from "@/lib/integrations/whatsapp-business/setup"
import { mergeOmniChannelConfig } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

function buildPopupResponse(origin: string, payload: Record<string, unknown>) {
    const body = `<!doctype html><html><body><script>
window.opener && window.opener.postMessage(${JSON.stringify(payload)}, ${JSON.stringify(origin)});
window.close();
</script></body></html>`
    return new Response(body, {
        headers: {
            "Content-Type": "text/html; charset=utf-8",
        },
    })
}

export async function GET(req: Request) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return new Response("Firebase Admin başlatılamadı.", { status: 500 })
    }

    const origin = new URL(req.url).origin
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const providerError = searchParams.get("error")

    if (!code || !state) {
        return buildPopupResponse(origin, {
            type: "vion-whatsapp-business-oauth",
            ok: false,
            error: providerError || "Meta doğrulaması tamamlanamadı.",
        })
    }

    const stateData = await consumeOAuthState(state, "integration-meta-whatsapp-business")
    const chatbotId = stateData?.chatbotId || stateData?.userId || ""

    if (!chatbotId) {
        return buildPopupResponse(origin, {
            type: "vion-whatsapp-business-oauth",
            ok: false,
            error: "Geçersiz oturum durumu.",
        })
    }

    try {
        let appConfig: { appId: string; appSecret: string; verifyToken: string }
        if (stateData?.appConfigSource === "platform") {
            throw new Error("Platform uygulama modu devre dışı. Lütfen chatbot'a ait Meta App bilgileri ile yeniden bağlanın.")
        } else {
            appConfig = {
                appId: stateData?.apiKey || "",
                appSecret: stateData?.apiSecret || "",
                verifyToken: stateData?.verifyToken || "tenant-whatsapp-verify-token",
            }
        }

        if (!appConfig.appId || !appConfig.appSecret) {
            throw new Error("Meta uygulama bilgileri (App ID / Secret) eksik veya geçersiz.")
        }

        const { accessToken, expiresIn } = await exchangeMetaCode({
            origin,
            callbackPath: "/api/integrations/whatsapp-business/callback",
            code,
            appConfig,
        })

        const expiresAt = typeof expiresIn === "number" ? new Date(Date.now() + expiresIn * 1000).toISOString() : null
        const currentConfig = ((await adminDb.collection("omni_channel_configs").doc(chatbotId).get()).data() || {}) as Record<string, any>
        const discovery = await discoverWhatsAppBusinesses(accessToken)
        const firstBusiness = discovery.businesses.find((business) => business.phoneNumbers.length > 0) || discovery.businesses[0] || null
        const firstPhone = firstBusiness?.phoneNumbers[0] || null
        const preflight = await runWhatsAppBizPreflight(accessToken, chatbotId, adminDb)

        let nextConfig = await mergeOmniChannelConfig(
            adminDb,
            chatbotId,
            buildWhatsAppBizMergePayload({
                omniConfig: currentConfig,
                accessToken,
                wabaId: firstBusiness?.id || null,
                phoneNumberId: firstPhone?.id || null,
                displayNumber: firstPhone?.displayNumber || null,
                tokenExpiresAt: expiresAt,
                preflightResult: preflight.result,
                webhookStatus: firstBusiness ? "pending" : "disconnected",
                lastConnectedAt: firstBusiness ? new Date().toISOString() : null,
            })
        )

        if (firstBusiness) {
            try {
                await subscribeWebhook({
                    channel: "whatsapp",
                    businessAccountId: firstBusiness.id,
                    accessToken,
                })
                const refreshed = await runWhatsAppBizPreflight(accessToken, chatbotId, adminDb)
                nextConfig = await mergeOmniChannelConfig(
                    adminDb,
                    chatbotId,
                    buildWhatsAppBizMergePayload({
                        omniConfig: nextConfig,
                        wabaId: firstBusiness.id,
                        phoneNumberId: firstPhone?.id || null,
                        displayNumber: firstPhone?.displayNumber || null,
                        tokenExpiresAt: expiresAt,
                        preflightResult: {
                            ...refreshed.result,
                            webhookActive: true,
                            failureReason:
                                refreshed.result.failureReason === "Mesaj akışı şu anda aktif görünmüyor."
                                    ? null
                                    : refreshed.result.failureReason,
                        },
                        webhookStatus: "connected",
                        lastConnectedAt: new Date().toISOString(),
                    })
                )
            } catch {
                nextConfig = await mergeOmniChannelConfig(
                    adminDb,
                    chatbotId,
                    buildWhatsAppBizMergePayload({
                        omniConfig: nextConfig,
                        wabaId: firstBusiness.id,
                        phoneNumberId: firstPhone?.id || null,
                        displayNumber: firstPhone?.displayNumber || null,
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
                    whatsapp: {
                        connected: Boolean(firstBusiness && firstPhone),
                        businessAccountId: firstBusiness?.id || null,
                        phoneNumberId: firstPhone?.id || null,
                        displayNumber: firstPhone?.displayNumber || null,
                        accessToken,
                        verifyToken: nextConfig?.whatsapp?.verifyToken || appConfig.verifyToken,
                        appSecret: appConfig.appSecret,
                        connectedAt: firstBusiness ? new Date().toISOString() : null,
                    },
                },
            },
            { merge: true }
        )

        const status = await buildWhatsAppBizStatus({
            adminDb,
            chatbotId,
            origin,
            omniConfig: nextConfig,
            availableBusinesses: preflight.availableBusinesses,
            legacyIntegrations: ((await chatbotRef.get()).data() || {}).integrations || {},
        })

        return buildPopupResponse(origin, {
            type: "vion-whatsapp-business-oauth",
            ok: true,
            status,
        })
    } catch (error) {
        return buildPopupResponse(origin, {
            type: "vion-whatsapp-business-oauth",
            ok: false,
            error: error instanceof Error ? error.message : "WhatsApp Business bağlantısı tamamlanamadı.",
        })
    }
}
