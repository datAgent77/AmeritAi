import { authorizeIntegrationAccess } from "@/lib/integration-plan-access"
import { getAdminDb } from "@/lib/firebase-admin"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { sendOmniInstagramText } from "@/lib/omni/channel-dispatch"
import { decryptToken } from "@/lib/omni/token-cipher"
import { InstagramDMTestMessageSchema } from "@/lib/integrations/instagram-dm/schemas"
import { mergeOmniChannelConfig } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const parsed = InstagramDMTestMessageSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
        return Response.json({ error: "Geçersiz test mesajı isteği." }, { status: 400 })
    }

    const { chatbotId, recipientId, text } = parsed.data
    const access = await authorizeIntegrationAccess(req, chatbotId, "meta-channels")
    if (!access.ok) return access.response

    const adminDb = getAdminDb()
    if (!adminDb) {
        return Response.json({ error: "Firebase Admin başlatılamadı." }, { status: 500 })
    }

    const omniConfig = ((await adminDb.collection("omni_channel_configs").doc(chatbotId).get()).data() || {}) as Record<string, any>
    const accessToken = decryptToken(omniConfig?.instagram?.accessTokenRef) || decryptToken(omniConfig?.instagramDM?.accessTokenRef)
    const endpointTarget = omniConfig?.instagram?.accountId || omniConfig?.instagramDM?.instagramAccountId || omniConfig?.instagram?.pageId

    if (!accessToken || !endpointTarget) {
        return Response.json({ error: "Instagram bağlantısı test mesajı için hazır değil." }, { status: 400 })
    }

    try {
        const delivery = await sendOmniInstagramText({
            adminDb,
            chatbotId,
            recipientId,
            text: text || "Merhaba, bu AmeritAI kurulum test mesajıdır.",
            endpointTarget,
            accessToken,
            source: "api/integrations/instagram-dm/test-message",
            metadata: {
                testMessage: true,
            },
        })

        await logOmniAuditEvent({
            chatbotId,
            channel: "instagram",
            eventType: "instagram.test_message",
            result: "success",
            source: "api/integrations/instagram-dm/test-message",
            message: "Instagram DM test mesajı gönderildi",
            metadata: {
                recipientId,
                messageId: delivery.messageId,
                deliveryAttemptId: delivery.deliveryAttemptId,
            },
        })

        await mergeOmniChannelConfig(adminDb, chatbotId, {
            instagramDM: {
                ...(omniConfig?.instagramDM || {}),
                lastTestedAt: new Date().toISOString(),
            },
        })

        return Response.json({
            ok: true,
            messageId: delivery.messageId,
            deliveryAttemptId: delivery.deliveryAttemptId,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Instagram test mesajı gönderilemedi."

        await logOmniAuditEvent({
            chatbotId,
            channel: "instagram",
            eventType: "instagram.test_message",
            result: "error",
            source: "api/integrations/instagram-dm/test-message",
            message,
            metadata: {
                recipientId,
                deliveryAttemptId:
                    error instanceof Error ? (error as Error & { deliveryAttemptId?: string | null }).deliveryAttemptId || null : null,
            },
        })

        return Response.json(
            {
                error: message,
            },
            { status: 400 }
        )
    }
}
