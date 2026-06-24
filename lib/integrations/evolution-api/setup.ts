import crypto from "crypto"
import { decryptToken, encryptToken } from "@/lib/omni/token-cipher"
import type { OmniChannelConfigDocument } from "@/lib/omni/types"
import type { EvolutionApiChannelConfig, EvolutionApiConnectionState, EvolutionApiStatusPayload } from "@/lib/integrations/evolution-api/types"

const EVOLUTION_EVENTS = ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT", "SEND_MESSAGE"]

function normalizeBaseUrl(baseUrl?: string | null) {
    return String(baseUrl || "").trim().replace(/\/+$/, "")
}

function normalizeConnectionState(value: unknown): EvolutionApiConnectionState {
    const state = String(value || "").toLowerCase()
    if (state === "open" || state === "connected") return "open"
    if (state === "connecting") return "connecting"
    if (state === "close" || state === "closed" || state === "disconnected") return "close"
    return "unknown"
}

export function buildDefaultEvolutionApiConfig(): EvolutionApiChannelConfig {
    return {
        enabled: false,
        provider: "evolution-api",
        mode: "qr_whatsapp_web",
        baseUrl: null,
        apiKeyRef: null,
        instanceName: null,
        instanceId: null,
        phoneNumber: null,
        webhookSecret: null,
        webhookUrl: null,
        webhookStatus: "disconnected",
        connectionState: "unknown",
        lastConnectedAt: null,
        lastHealthCheckAt: null,
        lastTestedAt: null,
        lastError: null,
    }
}

export function normalizeEvolutionApiConfig(config: any): EvolutionApiChannelConfig {
    const defaults = buildDefaultEvolutionApiConfig()
    return {
        ...defaults,
        ...config,
        enabled: config?.enabled === true,
        provider: "evolution-api",
        mode: config?.mode === "cloud_api" ? "cloud_api" : "qr_whatsapp_web",
        baseUrl: normalizeBaseUrl(config?.baseUrl) || null,
        apiKeyRef: config?.apiKeyRef || null,
        instanceName: config?.instanceName || null,
        instanceId: config?.instanceId || null,
        phoneNumber: config?.phoneNumber || null,
        webhookSecret: config?.webhookSecret || null,
        webhookUrl: config?.webhookUrl || null,
        webhookStatus:
            config?.webhookStatus === "connected" || config?.webhookStatus === "pending" ? config.webhookStatus : "disconnected",
        connectionState: normalizeConnectionState(config?.connectionState),
        lastConnectedAt: config?.lastConnectedAt || null,
        lastHealthCheckAt: config?.lastHealthCheckAt || null,
        lastTestedAt: config?.lastTestedAt || null,
        lastError: config?.lastError || null,
    }
}

export function getEvolutionApiKey(config: EvolutionApiChannelConfig | undefined | null) {
    const value = config?.apiKeyRef || null
    return decryptToken(value) || value || null
}

export function buildEvolutionApiWebhookUrl(origin: string, chatbotId: string, secret: string) {
    return `${origin.replace(/\/+$/, "")}/api/integrations/evolution-api/webhook?chatbotId=${encodeURIComponent(chatbotId)}&secret=${encodeURIComponent(secret)}`
}

export function buildEvolutionApiMergePayload(input: {
    currentConfig: OmniChannelConfigDocument
    baseUrl: string
    apiKey: string
    instanceName: string
    phoneNumber?: string | null
    webhookUrl: string
    instanceId?: string | null
    connectionState?: EvolutionApiConnectionState
}) {
    const current = normalizeEvolutionApiConfig(input.currentConfig?.evolutionApi)
    const webhookSecret = current.webhookSecret || crypto.randomBytes(24).toString("hex")

    return {
        evolutionApi: {
            ...current,
            enabled: true,
            baseUrl: normalizeBaseUrl(input.baseUrl),
            apiKeyRef: encryptToken(input.apiKey),
            instanceName: input.instanceName,
            instanceId: input.instanceId ?? current.instanceId,
            phoneNumber: input.phoneNumber || current.phoneNumber || null,
            webhookSecret,
            webhookUrl: input.webhookUrl,
            webhookStatus: "connected",
            connectionState: input.connectionState || current.connectionState || "unknown",
            lastConnectedAt: new Date().toISOString(),
            lastHealthCheckAt: new Date().toISOString(),
            lastError: null,
        },
        whatsapp: {
            ...(input.currentConfig?.whatsapp || {}),
            enabled: true,
            connectionMode: "evolution_api_qr",
            webhookStatus: "connected",
            setupStatus: "live",
            setupStage: "live",
            lastHealthCheckAt: new Date().toISOString(),
            lastSetupError: null,
        },
    }
}

export async function evolutionFetch<T = any>(params: {
    baseUrl: string
    apiKey: string
    path: string
    method?: string
    body?: Record<string, unknown>
}): Promise<T> {
    const response = await fetch(`${normalizeBaseUrl(params.baseUrl)}${params.path}`, {
        method: params.method || "GET",
        headers: {
            "Content-Type": "application/json",
            apikey: params.apiKey,
        },
        body: params.body ? JSON.stringify(params.body) : undefined,
        cache: "no-store",
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
        const message = payload?.message || payload?.error || payload?.response?.message || `Evolution API request failed (${response.status})`
        throw new Error(Array.isArray(message) ? message.join(", ") : String(message))
    }
    return payload as T
}

export async function createEvolutionInstance(params: {
    baseUrl: string
    apiKey: string
    instanceName: string
    phoneNumber?: string | null
    webhookUrl: string
}) {
    return evolutionFetch({
        baseUrl: params.baseUrl,
        apiKey: params.apiKey,
        path: "/instance/create",
        method: "POST",
        body: {
            instanceName: params.instanceName,
            integration: "WHATSAPP-BAILEYS",
            qrcode: true,
            number: params.phoneNumber || undefined,
            rejectCall: true,
            msgCall: "Bu hat AmeritAI destek asistanı ile yönetiliyor.",
            groupsIgnore: true,
            alwaysOnline: false,
            readMessages: true,
            readStatus: false,
            syncFullHistory: false,
            webhook: {
                url: params.webhookUrl,
                byEvents: false,
                base64: false,
                events: EVOLUTION_EVENTS,
            },
        },
    })
}

export async function setEvolutionWebhook(params: {
    baseUrl: string
    apiKey: string
    instanceName: string
    webhookUrl: string
}) {
    return evolutionFetch({
        baseUrl: params.baseUrl,
        apiKey: params.apiKey,
        path: `/webhook/set/${encodeURIComponent(params.instanceName)}`,
        method: "POST",
        body: {
            enabled: true,
            url: params.webhookUrl,
            webhookByEvents: false,
            webhookBase64: false,
            events: EVOLUTION_EVENTS,
        },
    })
}

export async function getEvolutionConnectionState(params: {
    baseUrl: string
    apiKey: string
    instanceName: string
}) {
    const payload = await evolutionFetch<any>({
        baseUrl: params.baseUrl,
        apiKey: params.apiKey,
        path: `/instance/connectionState/${encodeURIComponent(params.instanceName)}`,
    })
    return normalizeConnectionState(payload?.instance?.state || payload?.state || payload?.connectionState)
}

export async function getEvolutionQrCode(params: {
    baseUrl: string
    apiKey: string
    instanceName: string
}) {
    const payload = await evolutionFetch<any>({
        baseUrl: params.baseUrl,
        apiKey: params.apiKey,
        path: `/instance/connect/${encodeURIComponent(params.instanceName)}`,
    })
    return payload?.base64 || payload?.qrcode?.base64 || payload?.code || payload?.qrcode || null
}

export async function sendEvolutionText(params: {
    baseUrl: string
    apiKey: string
    instanceName: string
    to: string
    text: string
}) {
    return evolutionFetch<any>({
        baseUrl: params.baseUrl,
        apiKey: params.apiKey,
        path: `/message/sendText/${encodeURIComponent(params.instanceName)}`,
        method: "POST",
        body: {
            number: params.to.replace(/[^\d]/g, ""),
            text: params.text,
        },
    })
}

export function buildEvolutionStatusPayload(config: EvolutionApiChannelConfig, qrCode?: string | null): EvolutionApiStatusPayload {
    const { apiKeyRef, webhookSecret, ...safeConfig } = config
    const blockers = [
        config.enabled ? null : "Evolution API entegrasyonu pasif.",
        config.baseUrl ? null : "Evolution API base URL eksik.",
        config.apiKeyRef ? null : "Evolution API key eksik.",
        config.instanceName ? null : "Instance name eksik.",
        config.webhookUrl ? null : "Webhook URL eksik.",
    ].filter(Boolean) as string[]

    return {
        channel: "evolution-api",
        config: {
            ...safeConfig,
            apiKeyConfigured: Boolean(apiKeyRef),
            webhookSecretConfigured: Boolean(webhookSecret),
        },
        ready: blockers.length === 0,
        blockers,
        qrCode: qrCode || null,
    }
}
