export type MetaSharedWebhookStatus = "connected" | "pending" | "disconnected"

export type MetaSharedAppConfig = {
    appId: string
    appSecret: string
    verifyToken: string
}

export type MetaSharedAppConfigOverrides = {
    appId?: string | null
    appSecret?: string | null
    verifyToken?: string | null
}

export type MetaChannelConnectTarget = "instagram" | "whatsapp"
