import { authorizeIntegrationAccess } from "@/lib/integration-plan-access"
import { getAdminDb } from "@/lib/firebase-admin"
import { isMetaPlatformAppAvailable } from "@/lib/meta-setup"
import { buildDefaultMessengerDMConfig, buildMessengerDMStatus } from "@/lib/integrations/messenger/setup"
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

    const nextConfig = await mergeOmniChannelConfig(adminDb, chatbotId, {
        messengerDM: buildDefaultMessengerDMConfig(),
        messenger: {
            ...(omniConfig?.messenger || {}),
            enabled: false,
            accessTokenRef: null,
            webhookStatus: "disconnected",
            setupStatus: "not_started",
            setupStage: "prerequisites",
        },
    })

    await chatbotRef.set(
        {
            integrations: {
                messenger: {
                    connected: false,
                },
            },
        },
        { merge: true }
    )

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
