import { authorizeIntegrationAccess } from "@/lib/integration-plan-access"
import { getAdminDb } from "@/lib/firebase-admin"
import { subscribeWebhook } from "@/lib/integrations/meta-shared/webhook"
import { buildWhatsAppBizMergePayload, buildWhatsAppBizStatus, getWhatsAppUserAccessToken } from "@/lib/integrations/whatsapp-business/setup"
import { runWhatsAppBizPreflight } from "@/lib/integrations/whatsapp-business/preflight"
import { decryptToken } from "@/lib/omni/token-cipher"
import { mergeOmniChannelConfig } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const body = await req.json().catch(() => null)
    const chatbotId = typeof body?.chatbotId === "string" ? body.chatbotId : ""

    if (!chatbotId) {
        return Response.json({ error: "chatbotId zorunlu." }, { status: 400 })
    }

    const access = await authorizeIntegrationAccess(req, chatbotId, "meta-channels")
    if (!access.ok) return access.response

    const adminDb = getAdminDb()
    if (!adminDb) {
        return Response.json({ error: "Firebase Admin başlatılamadı." }, { status: 500 })
    }

    const chatbotRef = adminDb.collection("chatbots").doc(chatbotId)
    const [configSnapshot, chatbotSnapshot] = await Promise.all([
        adminDb.collection("omni_channel_configs").doc(chatbotId).get(),
        chatbotRef.get(),
    ])
    const omniConfig = (configSnapshot.data() || {}) as Record<string, any>
    const wabaId = omniConfig?.whatsappBusiness?.wabaId || omniConfig?.whatsapp?.businessAccountId
    const accessToken = getWhatsAppUserAccessToken(omniConfig) || decryptToken(omniConfig?.whatsappBusiness?.accessTokenRef)

    if (!wabaId || !accessToken) {
        return Response.json({ error: "Önce WhatsApp Business hesabınızı seçin." }, { status: 400 })
    }

    await subscribeWebhook({
        channel: "whatsapp",
        businessAccountId: wabaId,
        accessToken,
    })

    const preflight = await runWhatsAppBizPreflight(accessToken, chatbotId, adminDb)
    const nextConfig = await mergeOmniChannelConfig(
        adminDb,
        chatbotId,
        buildWhatsAppBizMergePayload({
            omniConfig,
            preflightResult: {
                ...preflight.result,
                webhookActive: true,
                failureReason:
                    preflight.result.failureReason === "Mesaj akışı şu anda aktif görünmüyor."
                        ? null
                        : preflight.result.failureReason,
            },
            webhookStatus: "connected",
            lastConnectedAt: new Date().toISOString(),
        })
    )

    await chatbotRef.set(
        {
            integrations: {
                whatsapp: {
                    connected: true,
                    businessAccountId: nextConfig?.whatsapp?.businessAccountId || null,
                    phoneNumberId: nextConfig?.whatsapp?.phoneNumberId || null,
                    displayNumber: nextConfig?.whatsapp?.displayNumber || null,
                    connectedAt: new Date().toISOString(),
                },
            },
        },
        { merge: true }
    )

    return Response.json(
        await buildWhatsAppBizStatus({
            adminDb,
            chatbotId,
            origin: new URL(req.url).origin,
            omniConfig: nextConfig,
            availableBusinesses: preflight.availableBusinesses,
            legacyIntegrations: chatbotSnapshot.data()?.integrations || {},
        })
    )
}
