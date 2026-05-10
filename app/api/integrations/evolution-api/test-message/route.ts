import { authorizeIntegrationAccess } from "@/lib/integration-plan-access"
import { getAdminDb } from "@/lib/firebase-admin"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { recordOmniDeliveryAttempt } from "@/lib/omni/delivery-attempts"
import { EvolutionApiTestMessageSchema } from "@/lib/integrations/evolution-api/schemas"
import { getEvolutionApiKey, normalizeEvolutionApiConfig, sendEvolutionText } from "@/lib/integrations/evolution-api/setup"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const parsed = EvolutionApiTestMessageSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
        return Response.json({ error: "Geçersiz test mesajı isteği." }, { status: 400 })
    }

    const { chatbotId, to, text } = parsed.data
    const access = await authorizeIntegrationAccess(req, chatbotId, "evolution-api")
    if (!access.ok) return access.response

    const adminDb = getAdminDb()
    if (!adminDb) {
        return Response.json({ error: "Firebase Admin başlatılamadı." }, { status: 500 })
    }

    const snapshot = await adminDb.collection("omni_channel_configs").doc(chatbotId).get()
    const config = normalizeEvolutionApiConfig((snapshot.data() || {}).evolutionApi)
    const apiKey = getEvolutionApiKey(config)
    if (!config.enabled || !config.baseUrl || !apiKey || !config.instanceName) {
        return Response.json({ error: "Evolution API bağlantısı test mesajı için hazır değil." }, { status: 400 })
    }

    const payload = await sendEvolutionText({
        baseUrl: config.baseUrl,
        apiKey,
        instanceName: config.instanceName,
        to,
        text: text || "Merhaba, bu Vion Evolution API test mesajıdır.",
    })
    const providerMessageId = payload?.key?.id || payload?.messageId || payload?.id || null
    const attempt = await recordOmniDeliveryAttempt(adminDb, {
        chatbotId,
        channel: "whatsapp",
        provider: "evolution-api",
        direction: "outbound",
        source: "api/integrations/evolution-api/test-message",
        status: "success",
        destination: to,
        payloadText: text || "Merhaba, bu Vion Evolution API test mesajıdır.",
        providerMessageId,
        providerTargetId: config.instanceName,
        metadata: {
            testMessage: true,
        },
    })

    await adminDb.collection("omni_channel_configs").doc(chatbotId).set({
        evolutionApi: {
            ...config,
            lastTestedAt: new Date().toISOString(),
            lastError: null,
        },
    }, { merge: true })

    await logOmniAuditEvent({
        chatbotId,
        channel: "whatsapp",
        eventType: "evolution_api.test_message",
        result: "success",
        source: "api/integrations/evolution-api/test-message",
        message: "Evolution API test mesajı gönderildi",
        metadata: {
            to,
            messageId: providerMessageId,
            deliveryAttemptId: attempt.id || null,
        },
    })

    return Response.json({
        ok: true,
        messageId: providerMessageId,
        deliveryAttemptId: attempt.id || null,
    })
}
