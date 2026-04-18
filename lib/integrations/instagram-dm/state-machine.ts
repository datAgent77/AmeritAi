import type { InstagramDMChannelConfig, InstagramDMPreflightResult, MetaConsoleChannelState } from "@/lib/omni/types"

export const INSTAGRAM_DM_TRANSITIONS: Record<MetaConsoleChannelState, MetaConsoleChannelState[]> = {
    not_started: ["checking"],
    checking: ["needs_user_action", "pending_verification", "connected", "failed"],
    needs_user_action: ["checking"],
    pending_verification: ["connected", "failed"],
    connected: ["degraded", "reauth_required"],
    degraded: ["connected", "reauth_required", "failed"],
    reauth_required: ["checking"],
    failed: ["checking"],
}

export const INSTAGRAM_DM_STATE_MESSAGES: Record<MetaConsoleChannelState, string> = {
    not_started: "Instagram DM henüz bağlanmadı.",
    checking: "Bağlantı durumu kontrol ediliyor...",
    needs_user_action: "Kurulumu tamamlamak için bir adım gerekiyor.",
    pending_verification: "Bağlantı doğrulanıyor, biraz bekleyin.",
    connected: "Instagram DM aktif ve mesaj alıyor.",
    degraded: "Instagram bağlantısı var ancak mesajlar gelmiyor.",
    reauth_required: "Instagram izninin yenilenmesi gerekiyor.",
    failed: "Bağlantı kurulamadı. Tekrar deneyin.",
}

function isExpired(value?: string | null) {
    if (!value) return false
    const expiresAt = new Date(value).getTime()
    return Number.isFinite(expiresAt) && expiresAt <= Date.now()
}

export function resolveInstagramDMState(params: {
    config: InstagramDMChannelConfig
    preflightResult?: InstagramDMPreflightResult | null
}): MetaConsoleChannelState {
    const preflight = params.preflightResult ?? params.config.preflightResult

    if (!params.config.accessTokenRef) {
        return "not_started"
    }

    if (isExpired(params.config.tokenExpiresAt)) {
        return "reauth_required"
    }

    if (!preflight) {
        return params.config.pageId ? "pending_verification" : "checking"
    }

    if (preflight.overallOk && params.config.pageId && params.config.instagramAccountId && params.config.webhookStatus === "connected") {
        return "connected"
    }

    if (params.config.pageId && params.config.instagramAccountId && params.config.webhookStatus !== "connected") {
        return "pending_verification"
    }

    if (
        preflight.hasFacebookPage === false ||
        preflight.instagramLinkedToPage === false ||
        preflight.instagramIsProfessional === false ||
        preflight.messageAccessEnabled === false ||
        preflight.tokenPresent === false
    ) {
        return "needs_user_action"
    }

    if (params.config.pageId || params.config.instagramAccountId) {
        return "degraded"
    }

    return preflight.failureReason ? "failed" : "checking"
}

export function getInstagramDMWizardStep(state: MetaConsoleChannelState, config: InstagramDMChannelConfig) {
    if (state === "connected") return 3
    if (state === "pending_verification" || state === "degraded") return 2
    if (config.accessTokenRef) return 1
    return 0
}
