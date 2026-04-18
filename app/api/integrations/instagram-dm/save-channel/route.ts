import { authorizeIntegrationAccess } from "@/lib/integration-plan-access"
import { getAdminDb } from "@/lib/firebase-admin"
import { discoverMetaPages } from "@/lib/meta-setup"
import { InstagramDMSaveChannelSchema } from "@/lib/integrations/instagram-dm/schemas"
import { buildInstagramDMMergePayload, buildInstagramDMStatus, getInstagramUserAccessToken } from "@/lib/integrations/instagram-dm/setup"
import { runInstagramDMPreflight } from "@/lib/integrations/instagram-dm/preflight"
import { mergeOmniChannelConfig } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const parsed = InstagramDMSaveChannelSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
        return Response.json({ error: "Geçersiz seçim." }, { status: 400 })
    }

    const { chatbotId, pageId, pageName, instagramAccountId, instagramUsername } = parsed.data
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
        return Response.json({ error: "Bağlantı bilgisi bulunamadı, yeniden bağlanın." }, { status: 400 })
    }

    const pages = await discoverMetaPages(accessToken)
    const selectedPage = pages.pages.find((page) => page.id === pageId && page.instagramAccount?.id === instagramAccountId)

    if (!selectedPage || !selectedPage.instagramAccount) {
        return Response.json({ error: "Seçilen sayfa artık erişilebilir değil." }, { status: 400 })
    }

    const preflight = await runInstagramDMPreflight(accessToken, chatbotId, adminDb)
    const nextConfig = await mergeOmniChannelConfig(
        adminDb,
        chatbotId,
        buildInstagramDMMergePayload({
            omniConfig,
            accessToken,
            pageId,
            pageName,
            instagramAccountId,
            instagramUsername: instagramUsername || selectedPage.instagramAccount.username || null,
            pageAccessToken: selectedPage.pageAccessToken || accessToken,
            preflightResult: preflight.result,
            webhookStatus: "pending",
        })
    )

    await chatbotRef.set(
        {
            integrations: {
                instagram: {
                    connected: false,
                    pageId,
                    accountId: instagramAccountId,
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
            availablePages: preflight.availablePages,
            legacyIntegrations: chatbotSnapshot.data()?.integrations || {},
        })
    )
}
