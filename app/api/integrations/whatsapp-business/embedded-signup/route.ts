import { authorizeIntegrationAccess } from "@/lib/integration-plan-access"
import { getAdminDb } from "@/lib/firebase-admin"
import { createOAuthState } from "@/lib/oauth-state"
import { generateMetaVerifyToken, getMetaPlatformAppConfig, isMetaPlatformAppAvailable } from "@/lib/meta-setup"
import { buildMetaOAuthUrl } from "@/lib/integrations/meta-shared/oauth"
import { WhatsAppBizConnectSchema } from "@/lib/integrations/whatsapp-business/schemas"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const parsed = WhatsAppBizConnectSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
        return Response.json({ error: "Geçersiz istek." }, { status: 400 })
    }

    const { chatbotId, returnPath } = parsed.data
    const access = await authorizeIntegrationAccess(req, chatbotId, "meta-channels")
    if (!access.ok) return access.response

    const adminDb = getAdminDb()
    if (!adminDb) {
        return Response.json({ error: "Firebase Admin başlatılamadı." }, { status: 500 })
    }

    const currentConfig = ((await adminDb.collection("omni_channel_configs").doc(chatbotId).get()).data() || {}) as Record<string, any>
    const tenantAppId = currentConfig?.metaSetup?.secrets?.appId || currentConfig?.instagram?.appId || ""
    const tenantAppSecret =
        currentConfig?.metaSetup?.secrets?.appSecret || currentConfig?.whatsapp?.appSecretRef || currentConfig?.instagram?.appSecretRef || ""
    const verifyToken = currentConfig?.whatsapp?.verifyToken || generateMetaVerifyToken()

    const hasTenantCredentials = Boolean(tenantAppId && tenantAppSecret)
    const platformAvailable = isMetaPlatformAppAvailable()

    if (!hasTenantCredentials && !platformAvailable) {
        return Response.json({ error: "Meta uygulama bilgileri eksik. Lütfen destek ekibiyle görüşün." }, { status: 400 })
    }

    const state = await createOAuthState({
        provider: "integration-meta-whatsapp-business",
        userId: chatbotId,
        chatbotId,
        apiKey: hasTenantCredentials ? tenantAppId : undefined,
        apiSecret: hasTenantCredentials ? tenantAppSecret : undefined,
        verifyToken,
        appConfigSource: hasTenantCredentials ? "tenant" : "platform",
        selectedChannels: ["whatsapp"],
        returnPath,
    })

    const origin = new URL(req.url).origin
    const platformApp = platformAvailable ? getMetaPlatformAppConfig() : null

    return Response.json({
        authUrl: buildMetaOAuthUrl({
            origin,
            state,
            callbackPath: "/api/integrations/whatsapp-business/callback",
            appConfig: hasTenantCredentials
                ? {
                      appId: tenantAppId,
                      appSecret: tenantAppSecret,
                      verifyToken,
                  }
                : platformApp || undefined,
            selectedChannels: ["whatsapp"],
        }),
    })
}
