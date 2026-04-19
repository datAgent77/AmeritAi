import { authorizeIntegrationAccess } from "@/lib/integration-plan-access"
import { getAdminDb } from "@/lib/firebase-admin"
import { isMetaPlatformAppAvailable } from "@/lib/meta-setup"
import { buildMessengerDMStatus, getMessengerUserAccessToken } from "@/lib/integrations/messenger/setup"
import { runMessengerDMPreflight } from "@/lib/integrations/messenger/preflight"
import { mergeOmniChannelConfig } from "@/lib/omni/server-utils"
import { buildMessengerDMMergePayload } from "@/lib/integrations/messenger/setup"

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
    const accessToken = getMessengerUserAccessToken(omniConfig)

    if (!accessToken) {
        return Response.json({ error: "Bağlantı bilgisi bulunamadı. Yeniden bağlanın." }, { status: 400 })
    }

    const preflight = await runMessengerDMPreflight(accessToken, chatbotId, adminDb)
    const nextConfig = await mergeOmniChannelConfig(
        adminDb,
        chatbotId,
        buildMessengerDMMergePayload({ omniConfig, preflightResult: preflight.result })
    )

    const chatbotSnapshot = await adminDb.collection("chatbots").doc(chatbotId).get()
    return Response.json({
        ...(await buildMessengerDMStatus({
            adminDb,
            chatbotId,
            origin: new URL(req.url).origin,
            omniConfig: nextConfig,
            availablePages: preflight.availablePages,
            includeDiagnostics: access.isSuperAdmin || access.isAgencyAdmin,
            legacyIntegrations: chatbotSnapshot.data()?.integrations || {},
        })),
        platformAppAvailable: isMetaPlatformAppAvailable(),
    })
}
