import type {
    InstagramDMChannelConfig,
    InstagramDMPreflightResult,
    MetaConsoleChannelState,
} from "@/lib/omni/types"

export type { InstagramDMChannelConfig, InstagramDMPreflightResult, MetaConsoleChannelState }

export interface InstagramDMPageOption {
    id: string
    name: string
    instagramAccountId: string | null
    instagramUsername: string | null
}

export interface InstagramDMStatusPayload {
    channel: "instagram-dm"
    config: InstagramDMChannelConfig
    stateMessage: string
    webhookUrl: string
    availablePages: InstagramDMPageOption[]
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

export const INSTAGRAM_DM_PREFLIGHT_MESSAGES = {
    hasFacebookPage: {
        ok: "Facebook Sayfanız bulundu.",
        fail: "Hesabınıza bağlı bir Facebook Sayfası bulunamadı.",
    },
    instagramLinkedToPage: {
        ok: "Instagram hesabı Facebook Sayfanıza bağlı.",
        fail: "Instagram hesabınız bu sayfaya bağlı değil.",
    },
    instagramIsProfessional: {
        ok: "Instagram hesabınız işletme hesabı.",
        fail: "Instagram hesabınız kişisel. İşletme hesabına geçiş gerekli.",
    },
    messageAccessEnabled: {
        ok: "Mesaj erişimi açık.",
        fail: "Instagram'da 'Mesajlara Erişime İzin Ver' seçeneği kapalı.",
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

export const CHANNEL_ERROR_MESSAGES = {
    login_cancelled: "Giriş iptal edildi. Meta hesabınıza tekrar giriş yapın.",
    no_facebook_page: "Bağlı bir Facebook Sayfası bulunamadı. Sayfanızı oluşturduktan sonra tekrar deneyin.",
    instagram_not_linked: "Instagram hesabınız Facebook Sayfanıza henüz bağlanmamış.",
    instagram_not_professional: "Instagram hesabınız kişisel. Mesajlaşma için işletme hesabına geçiş gerekli.",
    message_access_disabled: "Instagram'da mesaj erişimi kapalı. Ayarlar → Gizlilik → Mesajlar bölümünden açabilirsiniz.",
    webhook_verify_failed: "Bağlantı doğrulaması başarısız. Tekrar deneyin.",
    token_expired: "Oturum süreniz dolmuş. Yeniden bağlanmanız gerekiyor.",
    partial_success: "Bazı adımlar tamamlandı ancak bağlantı henüz aktif değil.",
} as const
