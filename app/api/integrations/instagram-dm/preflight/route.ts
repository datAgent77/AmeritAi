import { authorizeIntegrationAccess } from "@/lib/integration-plan-access"
import { getAdminDb } from "@/lib/firebase-admin"
import { discoverMetaPages } from "@/lib/meta-setup"
import { buildInstagramDMMergePayload, buildInstagramDMStatus, getInstagramUserAccessToken } from "@/lib/integrations/instagram-dm/setup"
import { runInstagramDMPreflight } from "@/lib/integrations/instagram-dm/preflight"
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
    const accessToken = getInstagramUserAccessToken(omniConfig)

    if (!accessToken) {
        const status = await buildInstagramDMStatus({
            adminDb,
            chatbotId,
            origin: new URL(req.url).origin,
            omniConfig,
            availablePages: [],
            legacyIntegrations: chatbotSnapshot.data()?.integrations || {},
        })
        return Response.json({
            ...status,
            error: "Bağlantı bilgisi bulunamadı, yeniden bağlanın.",
        })
    }

    const preflight = await runInstagramDMPreflight(accessToken, chatbotId, adminDb)
    const nextConfig = await mergeOmniChannelConfig(
        adminDb,
        chatbotId,
        buildInstagramDMMergePayload({
            omniConfig,
            accessToken,
            preflightResult: preflight.result,
            webhookStatus:
                preflight.result.webhookActive === true
                    ? "connected"
                    : omniConfig?.instagramDM?.webhookStatus || omniConfig?.instagram?.webhookStatus || "disconnected",
        })
    )

    return Response.json(
        await buildInstagramDMStatus({
            adminDb,
            chatbotId,
            origin: new URL(req.url).origin,
            omniConfig: nextConfig,
            availablePages: preflight.availablePages,
            legacyIntegrations: chatbotSnapshot.data()?.integrations || {},
        })
    )
}
