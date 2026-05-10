import crypto from "crypto"
import { authorizeIntegrationAccess } from "@/lib/integration-plan-access"
import { getAdminDb } from "@/lib/firebase-admin"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { getPublicAppOrigin, mergeOmniChannelConfig } from "@/lib/omni/server-utils"
import { EvolutionApiConnectSchema } from "@/lib/integrations/evolution-api/schemas"
import {
    buildEvolutionApiMergePayload,
    buildEvolutionApiWebhookUrl,
    createEvolutionInstance,
    getEvolutionApiKey,
    getEvolutionConnectionState,
    normalizeEvolutionApiConfig,
    setEvolutionWebhook,
} from "@/lib/integrations/evolution-api/setup"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const parsed = EvolutionApiConnectSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
        return Response.json({ error: "Geçersiz Evolution API bağlantı isteği." }, { status: 400 })
    }

    const { chatbotId, baseUrl, instanceName, phoneNumber, createInstance } = parsed.data
    const access = await authorizeIntegrationAccess(req, chatbotId, "evolution-api")
    if (!access.ok) return access.response

    const adminDb = getAdminDb()
    if (!adminDb) {
        return Response.json({ error: "Firebase Admin başlatılamadı." }, { status: 500 })
    }

    const snapshot = await adminDb.collection("omni_channel_configs").doc(chatbotId).get()
    const currentConfig = snapshot.exists ? snapshot.data() || {} : {}
    const currentEvolution = normalizeEvolutionApiConfig(currentConfig.evolutionApi)
    const apiKey = String(parsed.data.apiKey || "").trim() || getEvolutionApiKey(currentEvolution)
    if (!apiKey) {
        return Response.json({ error: "Evolution API key gereklidir." }, { status: 400 })
    }
    const webhookSecret = currentEvolution.webhookSecret || cryptoRandomSecret()
    const webhookUrl = buildEvolutionApiWebhookUrl(getPublicAppOrigin(req), chatbotId, webhookSecret)

    let instanceId = currentEvolution.instanceId || null
    if (createInstance) {
        const created = await createEvolutionInstance({
            baseUrl,
            apiKey,
            instanceName,
            phoneNumber: phoneNumber || null,
            webhookUrl,
        })
        instanceId = created?.instance?.instanceId || created?.instance?.id || instanceId
    } else {
        await setEvolutionWebhook({ baseUrl, apiKey, instanceName, webhookUrl })
    }

    let connectionState = currentEvolution.connectionState || "unknown"
    try {
        connectionState = await getEvolutionConnectionState({ baseUrl, apiKey, instanceName })
    } catch {
        connectionState = "unknown"
    }

    const merged = await mergeOmniChannelConfig(adminDb, chatbotId, {
        ...buildEvolutionApiMergePayload({
            currentConfig: {
                ...currentConfig,
                evolutionApi: {
                    ...(currentConfig.evolutionApi || {}),
                    webhookSecret,
                },
            },
            baseUrl,
            apiKey,
            instanceName,
            phoneNumber: phoneNumber || null,
            webhookUrl,
            instanceId,
            connectionState,
        }),
    })

    await logOmniAuditEvent({
        chatbotId,
        channel: "whatsapp",
        eventType: "evolution_api.connected",
        result: "success",
        source: "api/integrations/evolution-api/connect",
        message: "Evolution API WhatsApp bağlantısı kaydedildi",
        metadata: {
            instanceName,
            createInstance: Boolean(createInstance),
            connectionState,
        },
    })

    return Response.json({
        ok: true,
        config: normalizeEvolutionApiConfig(merged.evolutionApi),
    })
}

function cryptoRandomSecret() {
    return crypto.randomBytes(24).toString("hex")
}
