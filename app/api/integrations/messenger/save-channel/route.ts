import { authorizeIntegrationAccess } from "@/lib/integration-plan-access"
import { getAdminDb } from "@/lib/firebase-admin"
import { isMetaPlatformAppAvailable } from "@/lib/meta-setup"
import { buildMessengerDMStatus, buildMessengerDMMergePayload } from "@/lib/integrations/messenger/setup"
import { MessengerDMSaveChannelSchema } from "@/lib/integrations/messenger/schemas"
import { mergeOmniChannelConfig } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const parsed = MessengerDMSaveChannelSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return Response.json({ error: "Geçersiz istek." }, { status: 400 })

    const { chatbotId, pageId, pageName } = parsed.data
    const access = await authorizeIntegrationAccess(req, chatbotId, "meta-channels")
    if (!access.ok) return access.response

    const adminDb = getAdminDb()
    if (!adminDb) return Response.json({ error: "Firebase Admin başlatılamadı." }, { status: 500 })

    const configSnapshot = await adminDb.collection("omni_channel_configs").doc(chatbotId).get()
    const omniConfig = (configSnapshot.data() || {}) as Record<string, any>

    const nextConfig = await mergeOmniChannelConfig(
        adminDb,
        chatbotId,
        buildMessengerDMMergePayload({ omniConfig, pageId, pageName })
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
