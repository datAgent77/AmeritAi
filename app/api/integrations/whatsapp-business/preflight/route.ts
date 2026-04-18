import { authorizeIntegrationAccess } from "@/lib/integration-plan-access"
import { getAdminDb } from "@/lib/firebase-admin"
import { buildWhatsAppBizMergePayload, buildWhatsAppBizStatus, getWhatsAppUserAccessToken } from "@/lib/integrations/whatsapp-business/setup"
import { runWhatsAppBizPreflight } from "@/lib/integrations/whatsapp-business/preflight"
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
    const accessToken = getWhatsAppUserAccessToken(omniConfig)

    if (!accessToken) {
        const status = await buildWhatsAppBizStatus({
            adminDb,
            chatbotId,
            origin: new URL(req.url).origin,
            omniConfig,
            availableBusinesses: [],
            legacyIntegrations: chatbotSnapshot.data()?.integrations || {},
        })
        return Response.json({
            ...status,
            error: "Bağlantı bilgisi bulunamadı.",
        })
    }

    const preflight = await runWhatsAppBizPreflight(accessToken, chatbotId, adminDb)
    const nextConfig = await mergeOmniChannelConfig(
        adminDb,
        chatbotId,
        buildWhatsAppBizMergePayload({
            omniConfig,
            accessToken,
            preflightResult: preflight.result,
            webhookStatus:
                preflight.result.webhookActive === true
                    ? "connected"
                    : omniConfig?.whatsappBusiness?.webhookStatus || omniConfig?.whatsapp?.webhookStatus || "disconnected",
        })
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
