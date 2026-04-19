import { authorizeIntegrationAccess } from "@/lib/integration-plan-access"
import { getAdminDb } from "@/lib/firebase-admin"
import { isMetaPlatformAppAvailable } from "@/lib/meta-setup"
import { buildMessengerDMStatus, buildMessengerDMMergePayload, getMessengerUserAccessToken } from "@/lib/integrations/messenger/setup"
import { subscribeWebhook } from "@/lib/integrations/meta-shared/webhook"
import { decryptToken } from "@/lib/omni/token-cipher"
import { mergeOmniChannelConfig } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const body = await req.json().catch(() => null)
    const chatbotId = body?.chatbotId || ""
    if (!chatbotId) return Response.json({ error: "chatbotId zorunlu." }, { status: 400 })

    const access = await authorizeIntegrationAccess(req, chatbotId, "meta-channels")
    if (!access.ok) return access.response

    const adminDb = getAdminDb()
    if (!adminDb) return Response.json({ error: "Firebase Admin başlatılamadı." }, { status: 500 })

    const configSnapshot = await adminDb.collection("omni_channel_configs").doc(chatbotId).get()
    const omniConfig = (configSnapshot.data() || {}) as Record<string, any>
    const pageId = omniConfig?.messengerDM?.pageId || omniConfig?.messenger?.pageId || null
    const accessToken = decryptToken(omniConfig?.messengerDM?.accessTokenRef) || getMessengerUserAccessToken(omniConfig)

    if (!pageId || !accessToken) {
        return Response.json({ error: "Sayfa veya bağlantı bilgisi eksik." }, { status: 400 })
    }

    await subscribeWebhook({ channel: "messenger", pageId, accessToken })

    const nextConfig = await mergeOmniChannelConfig(
        adminDb,
        chatbotId,
        buildMessengerDMMergePayload({ omniConfig, webhookStatus: "connected", lastConnectedAt: new Date().toISOString() })
    )

    const chatbotSnapshot = await adminDb.collection("chatbots").doc(chatbotId).get()
    return Response.json({
        ...(await buildMessengerDMStatus({
            adminDb,
            chatbotId,
            origin: new URL(req.url).origin,
            omniConfig: nextConfig,
            availablePages: [],
            legacyIntegrations: chatbotSnapshot.data()?.integrations || {},
        })),
        platformAppAvailable: isMetaPlatformAppAvailable(),
    })
}
