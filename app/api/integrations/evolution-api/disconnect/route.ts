import { authorizeIntegrationAccess } from "@/lib/integration-plan-access"
import { getAdminDb } from "@/lib/firebase-admin"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { EvolutionApiActionSchema } from "@/lib/integrations/evolution-api/schemas"
import { buildDefaultEvolutionApiConfig } from "@/lib/integrations/evolution-api/setup"
import { mergeOmniChannelConfig } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const parsed = EvolutionApiActionSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
        return Response.json({ error: "Geçersiz istek." }, { status: 400 })
    }

    const { chatbotId } = parsed.data
    const access = await authorizeIntegrationAccess(req, chatbotId, "evolution-api")
    if (!access.ok) return access.response

    const adminDb = getAdminDb()
    if (!adminDb) {
        return Response.json({ error: "Firebase Admin başlatılamadı." }, { status: 500 })
    }

    await mergeOmniChannelConfig(adminDb, chatbotId, {
        evolutionApi: buildDefaultEvolutionApiConfig(),
        whatsapp: {
            connectionMode: "tenant_meta_app",
        },
    })

    await logOmniAuditEvent({
        chatbotId,
        channel: "whatsapp",
        eventType: "evolution_api.disconnected",
        result: "success",
        source: "api/integrations/evolution-api/disconnect",
        message: "Evolution API bağlantısı kapatıldı",
    })

    return Response.json({ ok: true })
}
