import type { Language } from "@/lib/translations"

export type OmniTranslate = (key: string) => string

function humanizeOmniKey(key: string) {
    const readable = key
        .replace(/[._-]+/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .trim()

    if (!readable) return key
    return readable.charAt(0).toUpperCase() + readable.slice(1)
}

function toDate(value: unknown): Date | null {
    if (!value) return null
    const date = value instanceof Date ? value : new Date(value as string)
    return Number.isNaN(date.getTime()) ? null : date
}

export function formatOmniCopy(
    template: string,
    vars: Record<string, string | number | null | undefined> = {}
) {
    return Object.entries(vars).reduce((result, [key, value]) => {
        return result.replaceAll(`{${key}}`, value == null ? "" : String(value))
    }, template)
}

export function getOmniCopy(
    t: OmniTranslate,
    key: string,
    fallback: string,
    vars?: Record<string, string | number | null | undefined>
) {
    const translated = t(key)
    const resolved = translated === key || translated === humanizeOmniKey(key) ? fallback : translated
    return formatOmniCopy(resolved, vars)
}

export function getOmniLocale(language: Language) {
    return language === "tr" ? "tr-TR" : "en-US"
}

export function formatOmniDateTime(
    value: unknown,
    language: Language,
    options: Intl.DateTimeFormatOptions = {
        dateStyle: "medium",
        timeStyle: "short",
    }
) {
    const date = toDate(value)
    if (!date) return "-"
    return new Intl.DateTimeFormat(getOmniLocale(language), options).format(date)
}

export function formatOmniDate(
    value: unknown,
    language: Language,
    options: Intl.DateTimeFormatOptions = {
        dateStyle: "medium",
    }
) {
    const date = toDate(value)
    if (!date) return "-"
    return new Intl.DateTimeFormat(getOmniLocale(language), options).format(date)
}

export function getOmniEnumLabel(t: OmniTranslate, group: string, value?: string | null) {
    if (!value) return t("omni.common.notAvailable")
    return t(`omni.enum.${group}.${value}`)
}

export function getOmniChannelLabel(t: OmniTranslate, channel?: string | null) {
    return getOmniEnumLabel(t, "channel", channel)
}

export function getOmniCapabilityTitle(t: OmniTranslate, capabilityId: string, fallback?: string | null) {
    const translated = t(`omni.capability.${capabilityId}.title`)
    return translated || fallback || capabilityId
}

export function getOmniCapabilityDescription(t: OmniTranslate, capabilityId: string, fallback?: string | null) {
    const translated = t(`omni.capability.${capabilityId}.description`)
    return translated || fallback || capabilityId
}
