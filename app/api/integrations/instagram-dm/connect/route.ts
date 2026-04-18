import { authorizeIntegrationAccess } from "@/lib/integration-plan-access"
import { getAdminDb } from "@/lib/firebase-admin"
import { createOAuthState } from "@/lib/oauth-state"
import { generateMetaVerifyToken, getMetaPlatformAppConfig, isMetaPlatformAppAvailable } from "@/lib/meta-setup"
import { buildMetaOAuthUrl } from "@/lib/integrations/meta-shared/oauth"
import { InstagramDMConnectSchema } from "@/lib/integrations/instagram-dm/schemas"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const parsed = InstagramDMConnectSchema.safeParse(await req.json().catch(() => null))
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
    const tenantAppId =
        currentConfig?.metaSetup?.secrets?.appId || currentConfig?.instagram?.appId || currentConfig?.messenger?.appId || ""
    const tenantAppSecret =
        currentConfig?.metaSetup?.secrets?.appSecret ||
        currentConfig?.instagram?.appSecretRef ||
        currentConfig?.messenger?.appSecretRef ||
        ""
    const verifyToken = currentConfig?.instagram?.verifyToken || generateMetaVerifyToken()

    const hasTenantCredentials = Boolean(tenantAppId && tenantAppSecret)
    const platformAvailable = isMetaPlatformAppAvailable()

    let appConfigSource: "platform" | "tenant" = "tenant"
    let appConfig:
        | {
              appId: string
              appSecret: string
              verifyToken: string
          }
        | undefined

    if (hasTenantCredentials && !platformAvailable) {
        appConfigSource = "tenant"
        appConfig = {
            appId: tenantAppId,
            appSecret: tenantAppSecret,
            verifyToken,
        }
    } else if (platformAvailable) {
        appConfigSource = "platform"
        if (!hasTenantCredentials) {
            appConfig = undefined
        } else {
            appConfig = {
                appId: tenantAppId,
                appSecret: tenantAppSecret,
                verifyToken,
            }
            appConfigSource = "tenant"
        }
    }

    if (!hasTenantCredentials && !platformAvailable) {
        return Response.json({ error: "Meta uygulama bilgileri eksik. Lütfen destek ekibiyle görüşün." }, { status: 400 })
    }

    const state = await createOAuthState({
        provider: "integration-meta-instagram-dm",
        userId: chatbotId,
        chatbotId,
        apiKey: appConfigSource === "tenant" ? appConfig?.appId : undefined,
        apiSecret: appConfigSource === "tenant" ? appConfig?.appSecret : undefined,
        verifyToken,
        appConfigSource,
        selectedChannels: ["instagram"],
        returnPath,
    })

    const origin = new URL(req.url).origin
    const platformApp = appConfigSource === "platform" ? getMetaPlatformAppConfig() : null

    return Response.json({
        authUrl: buildMetaOAuthUrl({
            origin,
            state,
            callbackPath: "/api/integrations/instagram-dm/callback",
            appConfig: appConfigSource === "tenant" ? appConfig : platformApp || undefined,
            selectedChannels: ["instagram"],
        }),
    })
}
