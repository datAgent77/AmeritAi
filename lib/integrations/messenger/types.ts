import type { MessengerDMChannelConfig, MessengerDMPreflightResult, MetaConsoleChannelState } from "@/lib/omni/types"

export type { MessengerDMChannelConfig, MessengerDMPreflightResult, MetaConsoleChannelState }

export interface MessengerPageOption {
    id: string
    name: string
}

export interface MessengerDMStatusPayload {
    channel: "messenger-dm"
    config: MessengerDMChannelConfig
    stateMessage: string
    webhookUrl: string
    availablePages: MessengerPageOption[]
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

const MESSENGER_DM_PREFLIGHT_MESSAGES_I18N = {
    hasFacebookPage: {
        ok: { tr: "Facebook Sayfanız bulundu.", en: "Your Facebook Page was found.", es: "Se encontró tu página de Facebook." },
        fail: { tr: "Hesabınıza bağlı bir Facebook Sayfası bulunamadı.", en: "No Facebook Page linked to your account was found.", es: "No se encontró ninguna página de Facebook vinculada a tu cuenta." },
    },
    pageIsMessagingEligible: {
        ok: { tr: "Sayfanız mesajlaşmaya uygun.", en: "Your page is eligible for messaging.", es: "Tu página es apta para mensajería." },
        fail: { tr: "Seçili sayfa Messenger mesajlaşmasına uygun değil.", en: "The selected page is not eligible for Messenger messaging.", es: "La página seleccionada no es apta para la mensajería de Messenger." },
    },
    tokenPresent: {
        ok: { tr: "Bağlantı bilgileri kayıtlı.", en: "Connection details are saved.", es: "Los datos de conexión están guardados." },
        fail: { tr: "Bağlantı bilgisi bulunamadı, yeniden bağlanın.", en: "No connection details found, please reconnect.", es: "No se encontraron datos de conexión, vuelve a conectar." },
    },
    webhookActive: {
        ok: { tr: "Mesaj akışı aktif.", en: "Message flow is active.", es: "El flujo de mensajes está activo." },
        fail: { tr: "Mesaj akışı şu anda aktif görünmüyor.", en: "The message flow does not appear active right now.", es: "El flujo de mensajes no parece estar activo en este momento." },
    },
} as const

type PreflightMessagePair = { ok: string; fail: string }

export function getMessengerPreflightMessages(language: string): Record<keyof typeof MESSENGER_DM_PREFLIGHT_MESSAGES_I18N, PreflightMessagePair> {
    const lang = (language === "tr" || language === "es") ? language : "en"
    const out = {} as Record<string, PreflightMessagePair>
    for (const [key, val] of Object.entries(MESSENGER_DM_PREFLIGHT_MESSAGES_I18N)) {
        out[key] = { ok: val.ok[lang] ?? val.ok.en, fail: val.fail[lang] ?? val.fail.en }
    }
    return out as Record<keyof typeof MESSENGER_DM_PREFLIGHT_MESSAGES_I18N, PreflightMessagePair>
}

// Backward-compatible default (English) for non-UI callers.
export const MESSENGER_DM_PREFLIGHT_MESSAGES = getMessengerPreflightMessages("en")
