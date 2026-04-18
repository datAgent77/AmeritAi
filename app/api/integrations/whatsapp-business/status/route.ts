import { authorizeIntegrationAccess } from "@/lib/integration-plan-access"
import { getAdminDb } from "@/lib/firebase-admin"
import { discoverWhatsAppBusinesses } from "@/lib/meta-setup"
import { buildWhatsAppBizStatus, getWhatsAppUserAccessToken } from "@/lib/integrations/whatsapp-business/setup"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return Response.json({ error: "Firebase Admin başlatılamadı." }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const chatbotId = searchParams.get("chatbotId") || ""

    if (!chatbotId) {
        return Response.json({ error: "chatbotId zorunlu." }, { status: 400 })
    }

    const access = await authorizeIntegrationAccess(req, chatbotId, "meta-channels")
    if (!access.ok) return access.response

    const chatbotRef = adminDb.collection("chatbots").doc(chatbotId)
    const [configSnapshot, chatbotSnapshot] = await Promise.all([
        adminDb.collection("omni_channel_configs").doc(chatbotId).get(),
        chatbotRef.get(),
    ])
    const omniConfig = (configSnapshot.data() || {}) as Record<string, any>
    const accessToken = getWhatsAppUserAccessToken(omniConfig)
    const availableBusinesses = accessToken ? (await discoverWhatsAppBusinesses(accessToken)).businesses : []

    return Response.json(
        await buildWhatsAppBizStatus({
            adminDb,
            chatbotId,
            origin: new URL(req.url).origin,
            omniConfig,
            availableBusinesses,
            includeDiagnostics: access.isSuperAdmin || access.isAgencyAdmin,
            legacyIntegrations: chatbotSnapshot.data()?.integrations || {},
        })
    )
}
