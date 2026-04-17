import { authorizeIntegrationAccess } from "@/lib/integration-plan-access"
import { createOAuthState } from "@/lib/oauth-state"
import { getAdminDb } from "@/lib/firebase-admin"
import { getOmniChannelConfig, mergeOmniChannelConfig } from "@/lib/omni/server-utils"
import { buildMetaOAuthUrl, buildMetaSetupMergePayload, generateMetaVerifyToken, resolveReturnPath, sanitizeMetaSetupDraft, sanitizeSelectedChannels } from "@/lib/meta-setup"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => null)
        const chatbotId = typeof body?.chatbotId === "string" ? body.chatbotId : ""
        const selectedChannels = sanitizeSelectedChannels(body?.selectedChannels)
        const returnPath = resolveReturnPath(typeof body?.returnPath === "string" ? body.returnPath : undefined)
        const requestedAppId = typeof body?.appId === "string" ? body.appId.trim() : ""
        const requestedAppSecret = typeof body?.appSecret === "string" ? body.appSecret.trim() : ""

        if (!chatbotId) {
            return new Response(JSON.stringify({ error: "chatbotId is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            })
        }

        const access = await authorizeIntegrationAccess(req, chatbotId, "meta-channels")
        if (!access.ok) return access.response

        const adminDb = getAdminDb()
        if (!adminDb) {
            return new Response(JSON.stringify({ error: "Firebase Admin not initialized" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            })
        }

        const currentConfig = await getOmniChannelConfig(adminDb, chatbotId)
        const draft = sanitizeMetaSetupDraft(currentConfig?.metaSetup)
        const tenantAppId = requestedAppId || draft.secrets?.appId || currentConfig?.instagram?.appId || currentConfig?.messenger?.appId || ""
        const tenantAppSecret =
            requestedAppSecret ||
            draft.secrets?.appSecret ||
            currentConfig?.instagram?.appSecretRef ||
            currentConfig?.messenger?.appSecretRef ||
            currentConfig?.whatsapp?.appSecretRef ||
            ""
        const tenantVerifyToken =
            currentConfig?.instagram?.verifyToken ||
            currentConfig?.messenger?.verifyToken ||
            currentConfig?.whatsapp?.verifyToken ||
            generateMetaVerifyToken()
        const oauthAppConfig = tenantAppId && tenantAppSecret ? { appId: tenantAppId, appSecret: tenantAppSecret, verifyToken: tenantVerifyToken } : null

        if (!oauthAppConfig) {
            return new Response(
                JSON.stringify({
                    error: "Bu tenant icin Meta App ID ve Meta App Secret gerekli. Bu hesaba ait Meta uygulama bilgilerini girin.",
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            )
        }

        await mergeOmniChannelConfig(
            adminDb,
            chatbotId,
            buildMetaSetupMergePayload({
                currentConfig,
                selectedChannels,
                secrets: {
                    appId: oauthAppConfig.appId,
                    appSecret: oauthAppConfig.appSecret,
                },
                oauth: {
                    connectionMode: "tenant_meta_app",
                },
                channels: {
                    instagram: {
                        appId: oauthAppConfig.appId,
                        appSecretRef: oauthAppConfig.appSecret,
                        verifyToken: currentConfig?.instagram?.verifyToken || oauthAppConfig.verifyToken,
                        connectionMode: "tenant_meta_app",
                    },
                    messenger: {
                        appId: oauthAppConfig.appId,
                        appSecretRef: oauthAppConfig.appSecret,
                        verifyToken: currentConfig?.messenger?.verifyToken || oauthAppConfig.verifyToken,
                        connectionMode: "tenant_meta_app",
                    },
                    whatsapp: {
                        appSecretRef: oauthAppConfig.appSecret,
                        verifyToken: currentConfig?.whatsapp?.verifyToken || oauthAppConfig.verifyToken,
                        connectionMode: "tenant_meta_app",
                    },
                },
            })
        )

        const origin = new URL(req.url).origin
        const state = await createOAuthState({
            provider: "integration-meta",
            userId: chatbotId,
            apiKey: oauthAppConfig?.appId || undefined,
            apiSecret: oauthAppConfig?.appSecret || undefined,
            verifyToken: oauthAppConfig?.verifyToken || undefined,
            appConfigSource: "tenant",
            chatbotId,
            selectedChannels,
            returnPath,
        })

        return new Response(
            JSON.stringify({
                authUrl: buildMetaOAuthUrl({
                    origin,
                    state,
                    appConfig: oauthAppConfig || undefined,
                    selectedChannels,
                }),
            }),
            {
            status: 200,
            headers: { "Content-Type": "application/json" },
            }
        )
    } catch (error) {
        const message = error instanceof Error ? error.message : "Meta OAuth baslatilamadi."
        const fallbackMessage =
            message.includes("ortam degiskenleri eksik")
                ? "Bu tenant icin Meta App ID ve Meta App Secret gerekli."
                : message
        return new Response(
            JSON.stringify({
                error: fallbackMessage,
            }),
            {
                status: message.includes("ortam degiskenleri eksik") ? 400 : 500,
                headers: { "Content-Type": "application/json" },
            }
        )
    }
}
