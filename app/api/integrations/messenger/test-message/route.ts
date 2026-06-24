import { authorizeIntegrationAccess } from "@/lib/integration-plan-access"
import { getAdminDb } from "@/lib/firebase-admin"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { sendOmniMessengerText } from "@/lib/omni/channel-dispatch"
import { decryptToken } from "@/lib/omni/token-cipher"
import { MessengerDMTestMessageSchema } from "@/lib/integrations/messenger/schemas"
import { mergeOmniChannelConfig } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const parsed = MessengerDMTestMessageSchema.safeParse(await req.json().catch(() => null))
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
    const accessToken = decryptToken(omniConfig?.messengerDM?.accessTokenRef)
    const pageId = omniConfig?.messengerDM?.pageId

    if (!accessToken || !pageId) {
        return Response.json({ error: "Messenger bağlantısı test mesajı için hazır değil." }, { status: 400 })
    }

    try {
        const delivery = await sendOmniMessengerText({
            adminDb,
            chatbotId,
            recipientId,
            text: text || "Merhaba, bu AmeritAI kurulum test mesajıdır.",
            pageId,
            accessToken,
            source: "api/integrations/messenger/test-message",
            metadata: {
                testMessage: true,
            },
        })

        await logOmniAuditEvent({
            chatbotId,
            channel: "messenger",
            eventType: "messenger.test_message",
            result: "success",
            source: "api/integrations/messenger/test-message",
            message: "Messenger DM test mesajı gönderildi",
            metadata: {
                recipientId,
                messageId: delivery.messageId,
                deliveryAttemptId: delivery.deliveryAttemptId,
            },
        })

        await mergeOmniChannelConfig(adminDb, chatbotId, {
            messengerDM: {
                ...(omniConfig?.messengerDM || {}),
                lastTestedAt: new Date().toISOString(),
            },
        })

        return Response.json({
            ok: true,
            messageId: delivery.messageId,
            deliveryAttemptId: delivery.deliveryAttemptId,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Messenger test mesajı gönderilemedi."

        await logOmniAuditEvent({
            chatbotId,
            channel: "messenger",
            eventType: "messenger.test_message",
            result: "error",
            source: "api/integrations/messenger/test-message",
            message,
            metadata: {
                recipientId,
                deliveryAttemptId:
                    error instanceof Error ? (error as Error & { deliveryAttemptId?: string | null }).deliveryAttemptId || null : null,
            },
        })

        return Response.json({ error: message }, { status: 400 })
    }
}
