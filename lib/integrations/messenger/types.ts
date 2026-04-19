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

export const MESSENGER_DM_PREFLIGHT_MESSAGES = {
    hasFacebookPage: {
        ok: "Facebook Sayfanız bulundu.",
        fail: "Hesabınıza bağlı bir Facebook Sayfası bulunamadı.",
    },
    pageIsMessagingEligible: {
        ok: "Sayfanız mesajlaşmaya uygun.",
        fail: "Seçili sayfa Messenger mesajlaşmasına uygun değil.",
    },
    tokenPresent: {
        ok: "Bağlantı bilgileri kayıtlı.",
        fail: "Bağlantı bilgisi bulunamadı, yeniden bağlanın.",
    },
    webhookActive: {
        ok: "Mesaj akışı aktif.",
        fail: "Mesaj akışı şu anda aktif görünmüyor.",
    },
} as const
