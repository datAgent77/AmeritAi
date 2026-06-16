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

const INSTAGRAM_DM_PREFLIGHT_MESSAGES_I18N = {
    hasFacebookPage: {
        ok: { tr: "Facebook Sayfanız bulundu.", en: "Your Facebook Page was found.", es: "Se encontró tu página de Facebook." },
        fail: { tr: "Hesabınıza bağlı bir Facebook Sayfası bulunamadı.", en: "No Facebook Page linked to your account was found.", es: "No se encontró ninguna página de Facebook vinculada a tu cuenta." },
    },
    instagramLinkedToPage: {
        ok: { tr: "Instagram hesabı Facebook Sayfanıza bağlı.", en: "Instagram account is linked to your Facebook Page.", es: "La cuenta de Instagram está vinculada a tu página de Facebook." },
        fail: { tr: "Instagram hesabınız bu sayfaya bağlı değil.", en: "Your Instagram account is not linked to this page.", es: "Tu cuenta de Instagram no está vinculada a esta página." },
    },
    instagramIsProfessional: {
        ok: { tr: "Instagram hesabınız işletme hesabı.", en: "Your Instagram account is a business account.", es: "Tu cuenta de Instagram es una cuenta de empresa." },
        fail: { tr: "Instagram hesabınız kişisel. İşletme hesabına geçiş gerekli.", en: "Your Instagram account is personal. Switching to a business account is required.", es: "Tu cuenta de Instagram es personal. Se requiere cambiar a una cuenta de empresa." },
    },
    messageAccessEnabled: {
        ok: { tr: "Mesaj erişimi açık.", en: "Message access is enabled.", es: "El acceso a los mensajes está activado." },
        fail: { tr: "Instagram'da 'Mesajlara Erişime İzin Ver' seçeneği kapalı.", en: "The 'Allow Access to Messages' option is off in Instagram.", es: "La opción 'Permitir acceso a los mensajes' está desactivada en Instagram." },
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

type IgPreflightMessagePair = { ok: string; fail: string }

export function getInstagramDmPreflightMessages(language: string): Record<keyof typeof INSTAGRAM_DM_PREFLIGHT_MESSAGES_I18N, IgPreflightMessagePair> {
    const lang = (language === "tr" || language === "es") ? language : "en"
    const out = {} as Record<string, IgPreflightMessagePair>
    for (const [key, val] of Object.entries(INSTAGRAM_DM_PREFLIGHT_MESSAGES_I18N)) {
        out[key] = { ok: val.ok[lang] ?? val.ok.en, fail: val.fail[lang] ?? val.fail.en }
    }
    return out as Record<keyof typeof INSTAGRAM_DM_PREFLIGHT_MESSAGES_I18N, IgPreflightMessagePair>
}

// Backward-compatible default (English) for non-UI callers.
export const INSTAGRAM_DM_PREFLIGHT_MESSAGES = getInstagramDmPreflightMessages("en")

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
