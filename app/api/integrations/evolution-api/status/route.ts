import { authorizeIntegrationAccess } from "@/lib/integration-plan-access"
import { getAdminDb } from "@/lib/firebase-admin"
import {
    buildEvolutionStatusPayload,
    getEvolutionApiKey,
    getEvolutionConnectionState,
    normalizeEvolutionApiConfig,
} from "@/lib/integrations/evolution-api/setup"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const chatbotId = searchParams.get("chatbotId") || ""
    if (!chatbotId) {
        return Response.json({ error: "chatbotId is required" }, { status: 400 })
    }

    const access = await authorizeIntegrationAccess(req, chatbotId, "evolution-api")
    if (!access.ok) return access.response

    const adminDb = getAdminDb()
    if (!adminDb) {
        return Response.json({ error: "Firebase Admin başlatılamadı." }, { status: 500 })
    }

    const snapshot = await adminDb.collection("omni_channel_configs").doc(chatbotId).get()
    const currentConfig = snapshot.exists ? snapshot.data() || {} : {}
    const config = normalizeEvolutionApiConfig(currentConfig.evolutionApi)
    const apiKey = getEvolutionApiKey(config)

    let nextConfig = config
    if (config.enabled && config.baseUrl && apiKey && config.instanceName) {
        try {
            const connectionState = await getEvolutionConnectionState({
                baseUrl: config.baseUrl,
                apiKey,
                instanceName: config.instanceName,
            })
            nextConfig = {
                ...config,
                connectionState,
                lastHealthCheckAt: new Date().toISOString(),
                lastError: null,
            }
            await adminDb.collection("omni_channel_configs").doc(chatbotId).set({ evolutionApi: nextConfig }, { merge: true })
        } catch (error) {
            nextConfig = {
                ...config,
                connectionState: "unknown",
                lastHealthCheckAt: new Date().toISOString(),
                lastError: error instanceof Error ? error.message : "Evolution API health check failed",
            }
        }
    }

    return Response.json(buildEvolutionStatusPayload(nextConfig))
}
