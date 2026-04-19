import type { MessengerDMChannelConfig, MessengerDMPreflightResult, MetaConsoleChannelState } from "@/lib/omni/types"

export const MESSENGER_DM_STATE_MESSAGES: Record<MetaConsoleChannelState, string> = {
    not_started: "Facebook Messenger henüz bağlanmadı.",
    checking: "Bağlantı durumu kontrol ediliyor...",
    needs_user_action: "Kurulumu tamamlamak için bir adım gerekiyor.",
    pending_verification: "Bağlantı doğrulanıyor, biraz bekleyin.",
    connected: "Facebook Messenger aktif ve mesaj alıyor.",
    degraded: "Messenger bağlantısı var ancak mesajlar gelmiyor.",
    reauth_required: "Messenger izninin yenilenmesi gerekiyor.",
    failed: "Bağlantı kurulamadı. Tekrar deneyin.",
}

function isExpired(value?: string | null) {
    if (!value) return false
    const expiresAt = new Date(value).getTime()
    return Number.isFinite(expiresAt) && expiresAt <= Date.now()
}

export function resolveMessengerDMState(params: {
    config: MessengerDMChannelConfig
    preflightResult?: MessengerDMPreflightResult | null
}): MetaConsoleChannelState {
    const preflight = params.preflightResult ?? params.config.preflightResult

    if (!params.config.accessTokenRef) return "not_started"
    if (isExpired(params.config.tokenExpiresAt)) return "reauth_required"

    if (!preflight) {
        return params.config.pageId ? "pending_verification" : "checking"
    }

    if (preflight.overallOk && params.config.pageId && params.config.webhookStatus === "connected") {
        return "connected"
    }

    if (params.config.pageId && params.config.webhookStatus !== "connected") {
        return "pending_verification"
    }

    if (preflight.hasFacebookPage === false || preflight.pageIsMessagingEligible === false || preflight.tokenPresent === false) {
        return "needs_user_action"
    }

    if (params.config.pageId) return "degraded"

    return preflight.failureReason ? "failed" : "checking"
}

export function getMessengerDMWizardStep(state: MetaConsoleChannelState, config: MessengerDMChannelConfig) {
    if (state === "connected") return 3
    if (state === "pending_verification" || state === "degraded") return 2
    if (config.accessTokenRef) return 1
    return 0
}
