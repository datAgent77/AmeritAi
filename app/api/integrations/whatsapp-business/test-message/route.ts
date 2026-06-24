import { authorizeIntegrationAccess } from "@/lib/integration-plan-access"
import { getAdminDb } from "@/lib/firebase-admin"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { sendOmniWhatsAppText } from "@/lib/omni/channel-dispatch"
import { decryptToken } from "@/lib/omni/token-cipher"
import { WhatsAppBizTestMessageSchema } from "@/lib/integrations/whatsapp-business/schemas"
import { mergeOmniChannelConfig } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const parsed = WhatsAppBizTestMessageSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
        return Response.json({ error: "Geçersiz test mesajı isteği." }, { status: 400 })
    }

    const { chatbotId, to, text } = parsed.data
    const access = await authorizeIntegrationAccess(req, chatbotId, "meta-channels")
    if (!access.ok) return access.response

    const adminDb = getAdminDb()
    if (!adminDb) {
        return Response.json({ error: "Firebase Admin başlatılamadı." }, { status: 500 })
    }

    const omniConfig = ((await adminDb.collection("omni_channel_configs").doc(chatbotId).get()).data() || {}) as Record<string, any>
    const accessToken = decryptToken(omniConfig?.whatsapp?.accessTokenRef) || decryptToken(omniConfig?.whatsappBusiness?.accessTokenRef)
    const phoneNumberId = omniConfig?.whatsapp?.phoneNumberId || omniConfig?.whatsappBusiness?.phoneNumberId

    if (!accessToken || !phoneNumberId) {
        return Response.json({ error: "WhatsApp bağlantısı test mesajı için hazır değil." }, { status: 400 })
    }

    const delivery = await sendOmniWhatsAppText({
        adminDb,
        chatbotId,
        to,
        text: text || "Merhaba, bu AmeritAI kurulum test mesajıdır.",
        phoneNumberId,
        accessToken,
        source: "api/integrations/whatsapp-business/test-message",
        metadata: {
            testMessage: true,
        },
    })

    await logOmniAuditEvent({
        chatbotId,
        channel: "whatsapp",
        eventType: "whatsapp.test_message",
        result: "success",
        source: "api/integrations/whatsapp-business/test-message",
        message: "WhatsApp test mesajı gönderildi",
        metadata: {
            to,
            messageId: delivery.messageId,
        },
    })

    await mergeOmniChannelConfig(adminDb, chatbotId, {
        whatsappBusiness: {
            ...(omniConfig?.whatsappBusiness || {}),
            lastTestedAt: new Date().toISOString(),
        },
    })

    return Response.json({
        ok: true,
        messageId: delivery.messageId,
        deliveryAttemptId: delivery.deliveryAttemptId,
    })
}
