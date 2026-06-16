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

const WHATSAPP_PREFLIGHT_MESSAGES_I18N = {
    embeddedSignupCompleted: {
        ok: { tr: "WhatsApp Business hesabı bulundu.", en: "WhatsApp Business account found.", es: "Se encontró la cuenta de WhatsApp Business." },
        fail: { tr: "WhatsApp Business kurulumu tamamlanmamış.", en: "WhatsApp Business setup is not complete.", es: "La configuración de WhatsApp Business no está completa." },
    },
    wabaPresent: {
        ok: { tr: "WhatsApp İşletme Hesabı bağlı.", en: "WhatsApp Business Account is connected.", es: "La cuenta de WhatsApp Business está conectada." },
        fail: { tr: "WhatsApp İşletme Hesabı bulunamadı.", en: "WhatsApp Business Account not found.", es: "No se encontró la cuenta de WhatsApp Business." },
    },
    phoneNumberVerified: {
        ok: { tr: "Telefon numaranız doğrulandı.", en: "Your phone number is verified.", es: "Tu número de teléfono está verificado." },
        fail: { tr: "Telefon numaranız doğrulanmamış veya kayıtlı değil.", en: "Your phone number is not verified or registered.", es: "Tu número de teléfono no está verificado o registrado." },
    },
    tokenPresent: {
        ok: { tr: "Bağlantı bilgileri kayıtlı.", en: "Connection details are saved.", es: "Los datos de conexión están guardados." },
        fail: { tr: "Bağlantı bilgisi bulunamadı.", en: "No connection details found.", es: "No se encontraron datos de conexión." },
    },
    webhookActive: {
        ok: { tr: "Mesaj akışı aktif.", en: "Message flow is active.", es: "El flujo de mensajes está activo." },
        fail: { tr: "Mesaj akışı şu anda aktif görünmüyor.", en: "The message flow does not appear active right now.", es: "El flujo de mensajes no parece estar activo en este momento." },
    },
} as const

type WaPreflightMessagePair = { ok: string; fail: string }

export function getWhatsappPreflightMessages(language: string): Record<keyof typeof WHATSAPP_PREFLIGHT_MESSAGES_I18N, WaPreflightMessagePair> {
    const lang = (language === "tr" || language === "es") ? language : "en"
    const out = {} as Record<string, WaPreflightMessagePair>
    for (const [key, val] of Object.entries(WHATSAPP_PREFLIGHT_MESSAGES_I18N)) {
        out[key] = { ok: val.ok[lang] ?? val.ok.en, fail: val.fail[lang] ?? val.fail.en }
    }
    return out as Record<keyof typeof WHATSAPP_PREFLIGHT_MESSAGES_I18N, WaPreflightMessagePair>
}

// Backward-compatible default (English) for non-UI callers.
export const WHATSAPP_PREFLIGHT_MESSAGES = getWhatsappPreflightMessages("en")
