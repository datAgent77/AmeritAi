import type { MetaConsoleChannelState, WhatsAppBizChannelConfig, WhatsAppBizPreflightResult } from "@/lib/omni/types"

export const WHATSAPP_BIZ_TRANSITIONS: Record<MetaConsoleChannelState, MetaConsoleChannelState[]> = {
    not_started: ["checking"],
    checking: ["needs_user_action", "pending_verification", "connected", "failed"],
    needs_user_action: ["checking"],
    pending_verification: ["connected", "failed"],
    connected: ["degraded", "reauth_required"],
    degraded: ["connected", "reauth_required", "failed"],
    reauth_required: ["checking"],
    failed: ["checking"],
}

export const WHATSAPP_BIZ_STATE_MESSAGES: Record<MetaConsoleChannelState, string> = {
    not_started: "WhatsApp Business henüz bağlanmadı.",
    checking: "Bağlantı durumu kontrol ediliyor...",
    needs_user_action: "Kurulumu tamamlamak için bir adım gerekiyor.",
    pending_verification: "Bağlantı doğrulanıyor, biraz bekleyin.",
    connected: "WhatsApp Business aktif ve mesaj alıyor.",
    degraded: "WhatsApp bağlantısı var ancak mesaj akışı sorunlu görünüyor.",
    reauth_required: "WhatsApp bağlantısının yenilenmesi gerekiyor.",
    failed: "Bağlantı kurulamadı. Tekrar deneyin.",
}

function isExpired(value?: string | null) {
    if (!value) return false
    const expiresAt = new Date(value).getTime()
    return Number.isFinite(expiresAt) && expiresAt <= Date.now()
}

export function resolveWhatsAppBizState(params: {
    config: WhatsAppBizChannelConfig
    preflightResult?: WhatsAppBizPreflightResult | null
}): MetaConsoleChannelState {
    const preflight = params.preflightResult ?? params.config.preflightResult

    if (!params.config.accessTokenRef) {
        return "not_started"
    }

    if (isExpired(params.config.tokenExpiresAt)) {
        return "reauth_required"
    }

    if (!preflight) {
        return params.config.phoneNumberId ? "pending_verification" : "checking"
    }

    if (preflight.overallOk && params.config.wabaId && params.config.phoneNumberId && params.config.webhookStatus === "connected") {
        return "connected"
    }

    if (params.config.wabaId && params.config.phoneNumberId && params.config.webhookStatus !== "connected") {
        return "pending_verification"
    }

    if (
        preflight.embeddedSignupCompleted === false ||
        preflight.wabaPresent === false ||
        preflight.phoneNumberVerified === false ||
        preflight.tokenPresent === false
    ) {
        return "needs_user_action"
    }

    if (params.config.wabaId || params.config.phoneNumberId) {
        return "degraded"
    }

    return preflight.failureReason ? "failed" : "checking"
}

export function getWhatsAppBizWizardStep(state: MetaConsoleChannelState, config: WhatsAppBizChannelConfig) {
    if (state === "connected") return 4
    if (state === "pending_verification" || state === "degraded") return 3
    if (config.wabaId || config.phoneNumberId) return 2
    if (config.accessTokenRef) return 1
    return 0
}
