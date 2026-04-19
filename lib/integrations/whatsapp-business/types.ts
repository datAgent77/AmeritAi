import type {
    MetaConsoleChannelState,
    WhatsAppBizChannelConfig,
    WhatsAppBizPreflightResult,
} from "@/lib/omni/types"

export type { MetaConsoleChannelState, WhatsAppBizChannelConfig, WhatsAppBizPreflightResult }

export interface WhatsAppPhoneOption {
    id: string
    displayNumber: string | null
    verifiedName: string | null
}

export interface WhatsAppBusinessOption {
    id: string
    name: string
    phoneNumbers: WhatsAppPhoneOption[]
}

export interface WhatsAppBizStatusPayload {
    channel: "whatsapp-business"
    config: WhatsAppBizChannelConfig
    stateMessage: string
    webhookUrl: string
    availableBusinesses: WhatsAppBusinessOption[]
    platformAppAvailable?: boolean
    diagnostics?: {
        rawConfig: Record<string, unknown>
        rawLegacyConfig: Record<string, unknown>
        rawIntegration: Record<string, unknown>
        lastWebhookAt: string | null
        recentAuditEvents: Array<{
            id?: string
            eventType?: string
            result?: string
            message?: string | null
            createdAt?: string | null
        }>
    }
}

export const WHATSAPP_PREFLIGHT_MESSAGES = {
    embeddedSignupCompleted: {
        ok: "WhatsApp Business hesabı bulundu.",
        fail: "WhatsApp Business kurulumu tamamlanmamış.",
    },
    wabaPresent: {
        ok: "WhatsApp İşletme Hesabı bağlı.",
        fail: "WhatsApp İşletme Hesabı bulunamadı.",
    },
    phoneNumberVerified: {
        ok: "Telefon numaranız doğrulandı.",
        fail: "Telefon numaranız doğrulanmamış veya kayıtlı değil.",
    },
    tokenPresent: {
        ok: "Bağlantı bilgileri kayıtlı.",
        fail: "Bağlantı bilgisi bulunamadı.",
    },
    webhookActive: {
        ok: "Mesaj akışı aktif.",
        fail: "Mesaj akışı şu anda aktif görünmüyor.",
    },
} as const
