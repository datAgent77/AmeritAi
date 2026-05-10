import { authorizeIntegrationAccess } from "@/lib/integration-plan-access"
import { getAdminDb } from "@/lib/firebase-admin"
import { EvolutionApiActionSchema } from "@/lib/integrations/evolution-api/schemas"
import { getEvolutionApiKey, getEvolutionQrCode, normalizeEvolutionApiConfig } from "@/lib/integrations/evolution-api/setup"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const parsed = EvolutionApiActionSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
        return Response.json({ error: "Geçersiz QR isteği." }, { status: 400 })
    }

    const { chatbotId } = parsed.data
    const access = await authorizeIntegrationAccess(req, chatbotId, "evolution-api")
    if (!access.ok) return access.response

    const adminDb = getAdminDb()
    if (!adminDb) {
        return Response.json({ error: "Firebase Admin başlatılamadı." }, { status: 500 })
    }

    const config = normalizeEvolutionApiConfig(((await adminDb.collection("omni_channel_configs").doc(chatbotId).get()).data() || {}).evolutionApi)
    const apiKey = getEvolutionApiKey(config)
    if (!config.baseUrl || !apiKey || !config.instanceName) {
        return Response.json({ error: "Evolution API bağlantı bilgileri eksik." }, { status: 400 })
    }

    const qrCode = await getEvolutionQrCode({
        baseUrl: config.baseUrl,
        apiKey,
        instanceName: config.instanceName,
    })

    return Response.json({ ok: true, qrCode })
}
