import { authorizeIntegrationAccess } from "@/lib/integration-plan-access"
import { getAdminDb } from "@/lib/firebase-admin"
import { createOAuthState } from "@/lib/oauth-state"
import { generateMetaVerifyToken } from "@/lib/meta-setup"
import { buildMetaOAuthUrl } from "@/lib/integrations/meta-shared/oauth"
import { WhatsAppBizConnectSchema } from "@/lib/integrations/whatsapp-business/schemas"
import { getPublicAppOrigin, mergeOmniChannelConfig } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    try {
        const parsed = WhatsAppBizConnectSchema.safeParse(await req.json().catch(() => null))
        if (!parsed.success) {
            return Response.json({ error: "Geçersiz istek." }, { status: 400 })
        }

        const { chatbotId, returnPath } = parsed.data
        const requestedAppId = typeof parsed.data.appId === "string" ? parsed.data.appId.trim() : ""
        const requestedAppSecret = typeof parsed.data.appSecret === "string" ? parsed.data.appSecret.trim() : ""
        const access = await authorizeIntegrationAccess(req, chatbotId, "meta-channels")
        if (!access.ok) return access.response

        const adminDb = getAdminDb()
        if (!adminDb) {
            return Response.json({ error: "Firebase Admin başlatılamadı." }, { status: 500 })
        }

        if ((requestedAppId && !requestedAppSecret) || (!requestedAppId && requestedAppSecret)) {
            return Response.json(
                { error: "Özel Meta App için App ID ve App Secret birlikte girilmelidir." },
                { status: 400 }
            )
        }

        let currentConfig = ((await adminDb.collection("omni_channel_configs").doc(chatbotId).get()).data() || {}) as Record<string, any>

        if (requestedAppId && requestedAppSecret) {
            currentConfig = (await mergeOmniChannelConfig(adminDb, chatbotId, {
                metaSetup: {
                    ...(currentConfig?.metaSetup || {}),
                    secrets: {
                        ...(currentConfig?.metaSetup?.secrets || {}),
                        appId: requestedAppId,
                        appSecret: requestedAppSecret,
                    },
                },
            })) as Record<string, any>
        }

        const tenantAppId = (requestedAppId || currentConfig?.metaSetup?.secrets?.appId || currentConfig?.instagram?.appId || "").trim()
        const tenantAppSecret = (
            requestedAppSecret ||
            currentConfig?.metaSetup?.secrets?.appSecret ||
            currentConfig?.whatsapp?.appSecretRef ||
            currentConfig?.instagram?.appSecretRef ||
            ""
        ).trim()
        const verifyToken = currentConfig?.whatsapp?.verifyToken || generateMetaVerifyToken()

        const hasTenantCredentials = Boolean(tenantAppId && tenantAppSecret)
        if (!hasTenantCredentials) {
            return Response.json(
                {
                    error: "WhatsApp bağlantısı için bu chatbot'a ait Meta App ID ve App Secret zorunludur. Ortak platform uygulaması desteklenmiyor.",
                },
                { status: 400 }
            )
        }

        const state = await createOAuthState({
            provider: "integration-meta-whatsapp-business",
            userId: chatbotId,
            chatbotId,
            apiKey: tenantAppId,
            apiSecret: tenantAppSecret,
            verifyToken,
            appConfigSource: "tenant",
            selectedChannels: ["whatsapp"],
            returnPath,
        })

        const origin = getPublicAppOrigin(req)

        return Response.json({
            authUrl: buildMetaOAuthUrl({
                origin,
                state,
                callbackPath: "/api/integrations/whatsapp-business/callback",
                appConfig: {
                    appId: tenantAppId,
                    appSecret: tenantAppSecret,
                    verifyToken,
                },
                selectedChannels: ["whatsapp"],
            }),
        })
    } catch (error) {
        console.error("[WhatsAppBiz Embedded Signup Error]", error)
        return Response.json(
            {
                error: error instanceof Error ? error.message : "WhatsApp bağlantısı başlatılırken beklenmedik bir hata oluştu.",
            },
            { status: 500 }
        )
    }
}
