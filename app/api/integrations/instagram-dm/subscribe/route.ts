import { authorizeIntegrationAccess } from "@/lib/integration-plan-access"
import { getAdminDb } from "@/lib/firebase-admin"
import { subscribeWebhook } from "@/lib/integrations/meta-shared/webhook"
import { buildInstagramDMMergePayload, buildInstagramDMStatus, getInstagramUserAccessToken } from "@/lib/integrations/instagram-dm/setup"
import { runInstagramDMPreflight } from "@/lib/integrations/instagram-dm/preflight"
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
    const pageId = omniConfig?.instagramDM?.pageId || omniConfig?.instagram?.pageId
    const channelAccessToken = decryptToken(omniConfig?.instagramDM?.accessTokenRef) || decryptToken(omniConfig?.instagram?.accessTokenRef)
    const userAccessToken = getInstagramUserAccessToken(omniConfig) || channelAccessToken

    if (!pageId || !channelAccessToken) {
        return Response.json({ error: "Önce Facebook sayfanızı seçin." }, { status: 400 })
    }

    await subscribeWebhook({
        channel: "instagram",
        pageId,
        accessToken: channelAccessToken,
    })

    const preflight = userAccessToken
        ? await runInstagramDMPreflight(userAccessToken, chatbotId, adminDb)
        : { result: omniConfig?.instagramDM?.preflightResult, availablePages: [] }

    const nextConfig = await mergeOmniChannelConfig(
        adminDb,
        chatbotId,
        buildInstagramDMMergePayload({
            omniConfig,
            preflightResult:
                preflight.result &&
                typeof preflight.result === "object"
                    ? {
                          ...preflight.result,
                          webhookActive: true,
                          failureReason:
                              preflight.result.failureReason === "Mesaj akışı şu anda aktif görünmüyor."
                                  ? null
                                  : preflight.result.failureReason,
                      }
                    : null,
            webhookStatus: "connected",
            lastConnectedAt: new Date().toISOString(),
        })
    )

    await chatbotRef.set(
        {
            integrations: {
                instagram: {
                    connected: true,
                    pageId: nextConfig?.instagram?.pageId || null,
                    accountId: nextConfig?.instagram?.accountId || null,
                    connectedAt: new Date().toISOString(),
                },
            },
        },
        { merge: true }
    )

    return Response.json(
        await buildInstagramDMStatus({
            adminDb,
            chatbotId,
            origin: new URL(req.url).origin,
            omniConfig: nextConfig,
            availablePages: preflight.availablePages || [],
            legacyIntegrations: chatbotSnapshot.data()?.integrations || {},
        })
    )
}
