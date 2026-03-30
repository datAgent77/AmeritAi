export type ConversationLanguage = "tr" | "en" | "de" | "fr" | "es" | "ar" | "ru";
export type CopyLanguage = "tr" | "en" | "de" | "fr" | "es";

const LANGUAGE_KEYWORDS: Record<ConversationLanguage, RegExp[]> = {
    tr: [
        /\b(merhaba|selam|teşekkür|tesekkur|fiyat|ücret|urun|ürün|yardım|yardim|randevu|adres|telefon|saat|hangi|nasıl|nasil|ne kadar|var mı|yardımcı)\b/giu,
    ],
    en: [
        /\b(hello|hi|thanks|thank you|price|how much|what|how|where|can you|do you|please|appointment|available|product|support|help|i need|i want|buy|order|shipping|return|refund|book|schedule)\b/giu,
    ],
    de: [
        /\b(hallo|danke|preis|wie viel|produkt|termin|verfugbar|verfügbar|hilfe|bitte|ich mochte|ich möchte)\b/giu,
    ],
    fr: [
        /\b(bonjour|merci|prix|combien|produit|rendez-vous|disponible|aide|s'il vous plaît|svp)\b/giu,
    ],
    es: [
        /\b(hola|gracias|precio|cuanto|cuánto|producto|cita|disponible|ayuda|por favor)\b/giu,
    ],
    ar: [],
    ru: [],
};

function countMatches(pattern: RegExp, text: string): number {
    const matches = text.match(pattern);
    return matches ? matches.length : 0;
}

export function normalizeConversationLanguage(input?: string | null): ConversationLanguage | null {
    const normalized = String(input || "").trim().toLowerCase();
    if (!normalized || normalized === "auto") return null;
    if (normalized.startsWith("tr")) return "tr";
    if (normalized.startsWith("en")) return "en";
    if (normalized.startsWith("de")) return "de";
    if (normalized.startsWith("fr")) return "fr";
    if (normalized.startsWith("es")) return "es";
    if (normalized.startsWith("ar")) return "ar";
    if (normalized.startsWith("ru")) return "ru";
    return null;
}

export function detectConversationLanguage(text?: string | null): ConversationLanguage | null {
    const input = String(text || "").trim();
    if (!input) return null;

    if (/[\u0600-\u06FF]/u.test(input)) return "ar";
    if (/[Ѐ-ӿ]/u.test(input)) return "ru";
    if (/[çğıöşüİı]/u.test(input)) return "tr";
    if (/[äöüß]/iu.test(input)) return "de";
    if (/[áéíóúñ¿¡]/iu.test(input)) return "es";

    const scores = new Map<ConversationLanguage, number>();
    for (const [language, patterns] of Object.entries(LANGUAGE_KEYWORDS) as Array<[ConversationLanguage, RegExp[]]>) {
        const score = patterns.reduce((total, pattern) => total + countMatches(pattern, input), 0);
        if (score > 0) {
            scores.set(language, score);
        }
    }

    if (scores.size === 0) return null;

    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) {
        return null;
    }

    return ranked[0][0];
}

export function resolveConversationLanguage(params: {
    explicitLanguage?: string | null;
    userText?: string | null;
    fallback?: ConversationLanguage;
}): ConversationLanguage {
    const detected = detectConversationLanguage(params.userText);
    if (detected) return detected;
    return normalizeConversationLanguage(params.explicitLanguage) || params.fallback || "en";
}

export function toCopyLanguage(language?: string | null): CopyLanguage {
    const normalized = normalizeConversationLanguage(language);
    if (normalized === "tr" || normalized === "de" || normalized === "fr" || normalized === "es") {
        return normalized;
    }
    return "en";
}
