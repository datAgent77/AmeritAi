export type HumanHandoffTriggerSource = "user_request" | "assistant_trigger"

export interface HumanHandoffSettings {
    enabled: boolean
    notificationEmail?: string
    notifyEmail: boolean
    notifyInApp: boolean
    triggerOnUserRequest: boolean
    triggerOnAssistantHandoff: boolean
    customWaitMessage?: string
    notifyWhatsApp?: boolean
    whatsappNumber?: string
    notifyInstagram?: boolean
    instagramAccountId?: string
}

export const DEFAULT_HUMAN_HANDOFF_SETTINGS: HumanHandoffSettings = {
    enabled: false,
    notificationEmail: "",
    notifyEmail: true,
    notifyInApp: true,
    triggerOnUserRequest: true,
    triggerOnAssistantHandoff: true,
    customWaitMessage: "",
    notifyWhatsApp: false,
    whatsappNumber: "",
    notifyInstagram: false,
    instagramAccountId: "",
}

const HUMAN_HANDOFF_PATTERNS = [
    /\bmusteri temsilcisi\b/i,
    /\bmusteri hizmetleri\b/i,
    /\bmusteri hizmetlerine baglan\b/i,
    /\bmusteri hizmetlerine baglanmak\b/i,
    /\bmusteri hizmeti temsilcisi\b/i,
    /\bcanli destek\b/i,
    /\bcanli destege baglan\b/i,
    /\bcanli temsilci\b/i,
    /\binsan temsilci\b/i,
    /\byetkili ile gorus/i,
    /\bbeni arayin\b/i,
    // "canlı biriyle / canlı ile" patterns — e.g. "canlı biriyle konuşmak istiyorum"
    /\bcanli biri/i,
    /\bcanliyla\b/i,
    /\bcanli ile\b/i,
    /\bcanli birine\b/i,
    /\bcanli insanla\b/i,
    // "insanla / gerçek biriyle" patterns
    /\binsanla konus/i,
    /\binsanla gorus/i,
    /\bgercek biriyle\b/i,
    /\bgercek bir insanla\b/i,
    // "temsilciyle" patterns
    /\btemsilciyle\b/i,
    /\btemsilciye baglan/i,
    /\btemsilci ile\b/i,
    // English patterns
    /\bcustomer service\b/i,
    /\blive support\b/i,
    /\brepresentative\b/i,
    /\blive agent\b/i,
    /\bhuman agent\b/i,
    /\bsupport agent\b/i,
    /\btalk to (a )?human\b/i,
    /\bspeak (to|with) (a )?human\b/i,
    /\bconnect me (to|with) (a )?(human|person|agent)\b/i,
]

export function resolveHumanHandoffSettings(mergedData?: Record<string, any> | null): HumanHandoffSettings {
    const source = mergedData || {}
    const settings = source.humanHandoffSettings && typeof source.humanHandoffSettings === "object"
        ? source.humanHandoffSettings
        : {}

    return {
        enabled: source.enableHumanHandoff === true,
        notificationEmail: typeof settings.notificationEmail === "string" ? settings.notificationEmail.trim() : "",
        notifyEmail: settings.notifyEmail !== false,
        notifyInApp: settings.notifyInApp !== false,
        triggerOnUserRequest: settings.triggerOnUserRequest !== false,
        triggerOnAssistantHandoff: settings.triggerOnAssistantHandoff !== false,
        customWaitMessage: typeof settings.customWaitMessage === "string" ? settings.customWaitMessage.trim() : "",
        notifyWhatsApp: settings.notifyWhatsApp === true,
        whatsappNumber: typeof settings.whatsappNumber === "string" ? settings.whatsappNumber.trim() : "",
        notifyInstagram: settings.notifyInstagram === true,
        instagramAccountId: typeof settings.instagramAccountId === "string" ? settings.instagramAccountId.trim() : "",
    }
}

export function isExplicitHumanHandoffRequest(text: string) {
    let normalized = String(text || "").trim()
    if (!normalized) return false

    // Normalize Turkish characters to ASCII equivalents for regex matching
    normalized = normalized
        .replace(/ğ/g, "g")
        .replace(/Ğ/g, "G")
        .replace(/ü/g, "u")
        .replace(/Ü/g, "U")
        .replace(/ş/g, "s")
        .replace(/Ş/g, "S")
        .replace(/ı/g, "i")
        .replace(/İ/g, "I")
        .replace(/ö/g, "o")
        .replace(/Ö/g, "O")
        .replace(/ç/g, "c")
        .replace(/Ç/g, "C");

    return HUMAN_HANDOFF_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function resolveHumanHandoffNotificationEmail(input: {
    settings: HumanHandoffSettings
    mergedData?: Record<string, any> | null
    omniChannelConfig?: Record<string, any> | null
}) {
    const mergedData = input.mergedData || {}
    const omniChannelConfig = input.omniChannelConfig || {}
    const candidates = [
        input.settings.notificationEmail,
        omniChannelConfig?.operations?.escalationEmail,
        mergedData.leadNotificationEmail,
        mergedData.email,
    ]

    for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim()) {
            return candidate.trim()
        }
    }

    return null
}

export function getHumanHandoffAssistantMessage(language?: string | null, customWaitMessage?: string | null) {
    if (customWaitMessage && customWaitMessage.trim() !== "") {
        return customWaitMessage.trim()
    }

    const normalized = String(language || "").toLowerCase()
    if (normalized.startsWith("tr")) {
        return "Talebinizi musteri temsilcisine ilettim. Ekibimiz en kisa surede sizinle iletisime gececek."
    }

    return "I forwarded your request to a human representative. Our team will contact you as soon as possible."
}
