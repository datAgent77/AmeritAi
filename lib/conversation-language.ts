export type ConversationLanguage = string;
export type CopyLanguage = "tr" | "en" | "de" | "fr" | "es";

const LANGUAGE_KEYWORDS: Array<[ConversationLanguage, RegExp[]]> = [
    ["tr", [
        /\b(merhaba|selam|teşekkür|tesekkur|fiyat|ücret|urun|ürün|yardım|yardim|randevu|adres|telefon|saat|hangi|nasıl|nasil|ne kadar|var mı|yardımcı)\b/giu,
    ]],
    ["en", [
        /\b(hello|hi|thanks|thank you|price|how much|what|how|where|can you|do you|please|appointment|available|product|support|help|i need|i want|buy|order|shipping|return|refund|book|schedule)\b/giu,
    ]],
    ["de", [
        /\b(hallo|danke|preis|wie viel|produkt|termin|verfugbar|verfügbar|hilfe|bitte|ich mochte|ich möchte)\b/giu,
    ]],
    ["fr", [
        /\b(bonjour|merci|prix|combien|produit|rendez-vous|disponible|aide|s'il vous plaît|svp)\b/giu,
    ]],
    ["es", [
        /\b(hola|gracias|precio|cuanto|cuánto|producto|cita|disponible|ayuda|por favor)\b/giu,
    ]],
    ["it", [
        /\b(ciao|grazie|prezzo|quanto costa|prodotto|appuntamento|disponibile|aiuto|per favore)\b/giu,
    ]],
    ["pt", [
        /\b(olá|ola|obrigado|obrigada|preço|preco|quanto custa|produto|consulta|disponível|disponivel|ajuda|por favor)\b/giu,
    ]],
    ["nl", [
        /\b(hallo|dank|prijs|hoeveel|product|afspraak|beschikbaar|help alstublieft|alsjeblieft)\b/giu,
    ]],
    ["pl", [
        /\b(cześć|czesc|dziękuję|dziekuje|cena|ile kosztuje|produkt|wizyta|dostępny|dostepny|pomoc|proszę|prosze)\b/giu,
    ]],
];

const LEGACY_LANGUAGE_ALIASES: Record<string, string> = {
    iw: "he",
    in: "id",
    ji: "yi",
};

function countMatches(pattern: RegExp, text: string): number {
    const matches = text.match(pattern);
    return matches ? matches.length : 0;
}

function shouldPreferEnglishOverTurkishFallback(text?: string | null): boolean {
    const input = String(text || "").trim();
    if (!input) return false;

    // Guard only for plain Latin-script content (common English user input).
    const hasLatinLetters = /[A-Za-z]/.test(input);
    const hasTurkishSpecificChars = /[çğıöşüİı]/u.test(input);
    const hasOnlyAscii = /^[\x00-\x7F]+$/.test(input);
    const words = input.match(/[A-Za-z]+/g) || [];
    const letterCount = words.join("").length;
    const looksLikeSentence = words.length >= 2 || letterCount >= 12;
    return hasLatinLetters && hasOnlyAscii && !hasTurkishSpecificChars && looksLikeSentence;
}

export function normalizeConversationLanguage(input?: string | null): ConversationLanguage | null {
    const normalized = String(input || "").trim().toLowerCase().replace(/_/g, "-");
    if (!normalized || normalized === "auto") return null;

    const primaryLanguage = normalized.split("-")[0]?.trim();
    if (!/^[a-z]{2,3}$/.test(primaryLanguage || "")) {
        return null;
    }

    return LEGACY_LANGUAGE_ALIASES[primaryLanguage] || primaryLanguage;
}

export function detectConversationLanguage(text?: string | null): ConversationLanguage | null {
    const input = String(text || "").trim();
    if (!input) return null;

    if (/[\u06AF\u0686\u0698\u067E]/u.test(input)) return "fa";
    if (/[\u0590-\u05FF]/u.test(input)) return "he";
    if (/[\u0900-\u097F]/u.test(input)) return "hi";
    if (/[\u0E00-\u0E7F]/u.test(input)) return "th";
    if (/[\u0370-\u03FF]/u.test(input)) return "el";
    if (/[\uAC00-\uD7AF]/u.test(input)) return "ko";
    if (/[\u3040-\u30FF]/u.test(input)) return "ja";
    if (/[\u4E00-\u9FFF]/u.test(input)) return "zh";
    if (/[\u0600-\u06FF]/u.test(input)) return "ar";
    if (/[іїєґІЇЄҐ]/u.test(input)) return "uk";
    if (/[Ѐ-ӿ]/u.test(input)) return "ru";
    if (/[çğıöşüİı]/u.test(input)) return "tr";
    if (/[äöüß]/iu.test(input)) return "de";
    if (/[áéíóúñ¿¡]/iu.test(input)) return "es";
    if (/[àâæçéèêëîïôœùûüÿ]/iu.test(input)) return "fr";
    if (/[ãõêôáàç]/iu.test(input)) return "pt";
    if (/[ąćęłńóśźż]/iu.test(input)) return "pl";
    if (/[ăâîșşțţ]/iu.test(input)) return "ro";

    const scores = new Map<ConversationLanguage, number>();
    for (const [language, patterns] of LANGUAGE_KEYWORDS) {
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

    const normalizedExplicit = normalizeConversationLanguage(params.explicitLanguage);
    if (normalizedExplicit === "tr" && shouldPreferEnglishOverTurkishFallback(params.userText)) {
        return "en";
    }

    return normalizedExplicit || params.fallback || "en";
}

export function toCopyLanguage(language?: string | null): CopyLanguage {
    const normalized = normalizeConversationLanguage(language);
    if (normalized === "tr" || normalized === "de" || normalized === "fr" || normalized === "es") {
        return normalized;
    }
    return "en";
}
