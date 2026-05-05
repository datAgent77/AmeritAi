import type { LocalizedStringListValue, LocalizedTextValue } from "@/types/chatbot"

type SupportedLocale = "tr" | "en"

function toLocale(language: string): SupportedLocale {
    return language === "tr" ? "tr" : "en"
}

function trim(value: unknown): string {
    return typeof value === "string" ? value.trim() : ""
}

export function resolveLocalizedText(
    sourceValue: string | undefined,
    localizedValue: LocalizedTextValue | undefined,
    language: string,
    fallback = ""
) {
    const locale = toLocale(language)
    const oppositeLocale: SupportedLocale = locale === "tr" ? "en" : "tr"
    const localizedPrimary = trim(localizedValue?.[locale])
    const localizedFallback = trim(localizedValue?.[oppositeLocale])
    const source = trim(sourceValue)
    return localizedPrimary || localizedFallback || source || fallback
}

export function resolveLocalizedSuggestions(
    sourceValues: string[] | undefined,
    localizedValue: LocalizedStringListValue | undefined,
    language: string
) {
    const locale = toLocale(language)
    const oppositeLocale: SupportedLocale = locale === "tr" ? "en" : "tr"
    const source = Array.isArray(sourceValues) ? sourceValues : []
    const localizedPrimary = Array.isArray(localizedValue?.[locale]) ? localizedValue?.[locale] || [] : []
    const localizedFallback = Array.isArray(localizedValue?.[oppositeLocale]) ? localizedValue?.[oppositeLocale] || [] : []
    const maxLength = Math.max(source.length, localizedPrimary.length, localizedFallback.length)

    return Array.from({ length: maxLength }).map((_, index) => {
        return trim(localizedPrimary[index]) || trim(localizedFallback[index]) || trim(source[index])
    })
}
