import { authorizeIntegrationAccess } from "@/lib/integration-plan-access"
import { getAdminDb } from "@/lib/firebase-admin"
import { discoverWhatsAppBusinesses } from "@/lib/meta-setup"
import { WhatsAppBizSaveChannelSchema } from "@/lib/integrations/whatsapp-business/schemas"
import { buildWhatsAppBizMergePayload, buildWhatsAppBizStatus, getWhatsAppUserAccessToken } from "@/lib/integrations/whatsapp-business/setup"
import { runWhatsAppBizPreflight } from "@/lib/integrations/whatsapp-business/preflight"
import { mergeOmniChannelConfig } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const parsed = WhatsAppBizSaveChannelSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
        return Response.json({ error: "Geçersiz seçim." }, { status: 400 })
    }

    const { chatbotId, wabaId, phoneNumberId, displayNumber } = parsed.data
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
        return Response.json({ error: "Bağlantı bilgisi bulunamadı." }, { status: 400 })
    }

    const discovery = await discoverWhatsAppBusinesses(accessToken)
    const business = discovery.businesses.find((item) => item.id === wabaId)
    const phone = business?.phoneNumbers.find((item) => item.id === phoneNumberId)

    if (!business || !phone) {
        return Response.json({ error: "Seçilen WhatsApp hesabı artık erişilebilir değil." }, { status: 400 })
    }

    const preflight = await runWhatsAppBizPreflight(accessToken, chatbotId, adminDb)
    const nextConfig = await mergeOmniChannelConfig(
        adminDb,
        chatbotId,
        buildWhatsAppBizMergePayload({
            omniConfig,
            accessToken,
            wabaId,
            phoneNumberId,
            displayNumber: displayNumber || phone.displayNumber || null,
            preflightResult: preflight.result,
            webhookStatus: "pending",
        })
    )

    await chatbotRef.set(
        {
            integrations: {
                whatsapp: {
                    connected: false,
                    businessAccountId: wabaId,
                    phoneNumberId,
                    displayNumber: displayNumber || phone.displayNumber || null,
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
