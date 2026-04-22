export type HumanHandoffTriggerSource = "user_request" | "assistant_trigger"
export type HumanHandoffBusinessDayCode = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun"

export const DEFAULT_HUMAN_HANDOFF_BUSINESS_DAYS: HumanHandoffBusinessDayCode[] = [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
]

type SupportedLanguage = "tr" | "en"

const DAY_LABELS: Record<HumanHandoffBusinessDayCode, { tr: string; en: string }> = {
    Mon: { tr: "Pzt", en: "Mon" },
    Tue: { tr: "Sal", en: "Tue" },
    Wed: { tr: "Çar", en: "Wed" },
    Thu: { tr: "Per", en: "Thu" },
    Fri: { tr: "Cum", en: "Fri" },
    Sat: { tr: "Cmt", en: "Sat" },
    Sun: { tr: "Paz", en: "Sun" },
}

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
    businessHoursEnabled: boolean
    businessHoursStart: string
    businessHoursEnd: string
    businessHoursTimezone: string
    businessDays: HumanHandoffBusinessDayCode[]
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
    businessHoursEnabled: false,
    businessHoursStart: "09:00",
    businessHoursEnd: "18:00",
    businessHoursTimezone: "UTC",
    businessDays: DEFAULT_HUMAN_HANDOFF_BUSINESS_DAYS,
}

const HUMAN_HANDOFF_PATTERNS = [
    /\bmusteri temsilcisi\b/i,
    /\bmusteri temsilcisine\b/i,
    /\bmusteri temsilcisiyle\b/i,
    /\bmusteri hizmetleri\b/i,
    /\bmusteri hizmetlerine baglan\b/i,
    /\bmusteri hizmetlerine baglanmak\b/i,
    /\bmusteri hizmeti temsilcisi\b/i,
    /\bcanli destek\b/i,
    /\bcanli destege baglan\b/i,
    /\bcanli destege aktar\b/i,
    /\bcanli destege yonlendir\b/i,
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
    /\btemsilciye aktar/i,
    /\btemsilciye yonlendir/i,
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

    const configuredBusinessDays = Array.isArray(settings.businessDays)
        ? settings.businessDays.filter(isHumanHandoffBusinessDayCode)
        : []

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
        businessHoursEnabled: settings.businessHoursEnabled === true || source.enableBusinessHours === true,
        businessHoursStart: typeof settings.businessHoursStart === "string" && settings.businessHoursStart.trim()
            ? settings.businessHoursStart.trim()
            : (typeof source.businessHoursStart === "string" && source.businessHoursStart.trim()
                ? source.businessHoursStart.trim()
                : "09:00"),
        businessHoursEnd: typeof settings.businessHoursEnd === "string" && settings.businessHoursEnd.trim()
            ? settings.businessHoursEnd.trim()
            : (typeof source.businessHoursEnd === "string" && source.businessHoursEnd.trim()
                ? source.businessHoursEnd.trim()
                : "18:00"),
        businessHoursTimezone: typeof settings.businessHoursTimezone === "string" && settings.businessHoursTimezone.trim()
            ? settings.businessHoursTimezone.trim()
            : (typeof source.timezone === "string" && source.timezone.trim()
                ? source.timezone.trim()
                : "UTC"),
        businessDays: configuredBusinessDays.length > 0
            ? configuredBusinessDays
            : DEFAULT_HUMAN_HANDOFF_BUSINESS_DAYS,
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

export function isHumanHandoffBusinessDayCode(value: unknown): value is HumanHandoffBusinessDayCode {
    return value === "Mon"
        || value === "Tue"
        || value === "Wed"
        || value === "Thu"
        || value === "Fri"
        || value === "Sat"
        || value === "Sun"
}

function normalizeLanguage(language?: string | null): SupportedLanguage {
    return String(language || "").toLowerCase().startsWith("tr") ? "tr" : "en"
}

function resolveSafeTimeZone(timeZone: string) {
    try {
        Intl.DateTimeFormat("en-US", { timeZone }).format(new Date())
        return timeZone
    } catch {
        return "UTC"
    }
}

function parseTimeToMinutes(value: string) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return null

    const hours = Number(match[1])
    const minutes = Number(match[2])
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null

    return (hours * 60) + minutes
}

function getLocalizedDateParts(date: Date, timeZone: string) {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: resolveSafeTimeZone(timeZone),
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    })

    const parts = formatter.formatToParts(date)
    const weekday = parts.find((part) => part.type === "weekday")?.value as HumanHandoffBusinessDayCode | undefined
    const hour = Number(parts.find((part) => part.type === "hour")?.value || "0")
    const minute = Number(parts.find((part) => part.type === "minute")?.value || "0")

    return {
        weekday: isHumanHandoffBusinessDayCode(weekday) ? weekday : "Mon",
        minutes: (hour * 60) + minute,
    }
}

export function formatHumanHandoffBusinessHours(language?: string | null, settings?: Pick<HumanHandoffSettings, "businessDays" | "businessHoursStart" | "businessHoursEnd" | "businessHoursTimezone"> | null) {
    const resolvedLanguage = normalizeLanguage(language)
    const businessDays = settings?.businessDays?.length ? settings.businessDays : DEFAULT_HUMAN_HANDOFF_BUSINESS_DAYS
    const daySummary = businessDays.length === 5
        && DEFAULT_HUMAN_HANDOFF_BUSINESS_DAYS.every((day, index) => businessDays[index] === day)
        ? (resolvedLanguage === "tr" ? "Hafta içi" : "Weekdays")
        : businessDays.map((day) => DAY_LABELS[day][resolvedLanguage]).join(", ")

    const start = settings?.businessHoursStart || DEFAULT_HUMAN_HANDOFF_SETTINGS.businessHoursStart
    const end = settings?.businessHoursEnd || DEFAULT_HUMAN_HANDOFF_SETTINGS.businessHoursEnd
    const timeZone = settings?.businessHoursTimezone || DEFAULT_HUMAN_HANDOFF_SETTINGS.businessHoursTimezone

    return `${daySummary} ${start}-${end} (${resolveSafeTimeZone(timeZone)})`
}

export function isHumanHandoffWithinBusinessHours(settings: Pick<HumanHandoffSettings, "enabled" | "businessHoursEnabled" | "businessDays" | "businessHoursStart" | "businessHoursEnd" | "businessHoursTimezone">, now = new Date()) {
    if (!settings.enabled) return false
    if (!settings.businessHoursEnabled) return true

    const businessDays = settings.businessDays?.length ? settings.businessDays : DEFAULT_HUMAN_HANDOFF_BUSINESS_DAYS
    const startMinutes = parseTimeToMinutes(settings.businessHoursStart)
    const endMinutes = parseTimeToMinutes(settings.businessHoursEnd)
    if (startMinutes == null || endMinutes == null) return true

    const localized = getLocalizedDateParts(now, settings.businessHoursTimezone)
    if (!businessDays.includes(localized.weekday)) return false

    if (startMinutes === endMinutes) return true
    if (endMinutes > startMinutes) {
        return localized.minutes >= startMinutes && localized.minutes < endMinutes
    }

    return localized.minutes >= startMinutes || localized.minutes < endMinutes
}

export function getHumanHandoffUnavailableMessage(language?: string | null) {
    const resolvedLanguage = normalizeLanguage(language)
    if (resolvedLanguage === "tr") {
        return "Şu anda müşteri temsilcisine aktarma kullanılamıyor. İsterseniz size buradan yardımcı olmaya devam edebilirim."
    }

    return "Human handoff is not available right now. I can continue helping you here in chat."
}

export function getHumanHandoffContactPromptMessage(language?: string | null, settings?: HumanHandoffSettings | null) {
    const resolvedLanguage = normalizeLanguage(language)
    const isOutsideBusinessHours = settings?.businessHoursEnabled === true
        && !isHumanHandoffWithinBusinessHours(settings)
    const schedule = formatHumanHandoffBusinessHours(resolvedLanguage, settings || null)

    if (resolvedLanguage === "tr") {
        if (isOutsideBusinessHours) {
            return `Müşteri temsilcisi ekibimiz şu anda mesai dışında. Mesai saatlerimiz ${schedule}. İletişim bilgilerinizi paylaşın, ekibimiz mesai saatlerinde sizinle iletişime geçsin.\n[SHOW_HANDOFF_FORM]`
        }

        return "Temsilci ile görüşmek için iletişim bilgilerinizi paylaşın, ekibimiz size ulaşsın.\n[SHOW_HANDOFF_FORM]"
    }

    if (isOutsideBusinessHours) {
        return `Our human support team is currently outside business hours. Our business hours are ${schedule}. Share your contact details and our team will reach out during business hours.\n[SHOW_HANDOFF_FORM]`
    }

    return "Share your contact info so our agent can reach out to you.\n[SHOW_HANDOFF_FORM]"
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

export function getHumanHandoffOutsideBusinessHoursMessage(language?: string | null, settings?: HumanHandoffSettings | null) {
    const resolvedLanguage = normalizeLanguage(language)
    const schedule = formatHumanHandoffBusinessHours(resolvedLanguage, settings || null)

    if (resolvedLanguage === "tr") {
        return `Talebinizi aldım ancak müşteri temsilcisi ekibimiz şu anda mesai dışında. Mesai saatlerimiz ${schedule}. Ekibimiz uygun saatlerde sizinle iletişime geçecek.`
    }

    return `I recorded your request, but our human support team is currently outside business hours. Our business hours are ${schedule}. Our team will reach out during business hours.`
}
