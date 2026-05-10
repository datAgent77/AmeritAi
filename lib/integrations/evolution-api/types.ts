export type EvolutionApiConnectionState = "open" | "connecting" | "close" | "unknown"

export interface EvolutionApiChannelConfig {
    enabled: boolean
    provider: "evolution-api"
    mode: "qr_whatsapp_web" | "cloud_api"
    baseUrl?: string | null
    apiKeyRef?: string | null
    instanceName?: string | null
    instanceId?: string | null
    phoneNumber?: string | null
    webhookSecret?: string | null
    webhookUrl?: string | null
    webhookStatus?: "connected" | "pending" | "disconnected"
    connectionState?: EvolutionApiConnectionState
    lastConnectedAt?: string | null
    lastHealthCheckAt?: string | null
    lastTestedAt?: string | null
    lastError?: string | null
}

export interface EvolutionApiStatusPayload {
    channel: "evolution-api"
    config: Omit<EvolutionApiChannelConfig, "apiKeyRef" | "webhookSecret"> & {
        apiKeyConfigured: boolean
        webhookSecretConfigured: boolean
    }
    ready: boolean
    blockers: string[]
    qrCode?: string | null
}
