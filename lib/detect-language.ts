/**
 * Lightweight language detection for messaging contacts (tr / es / en).
 *
 * Used to set a contact's `preferredLanguage` memory hint from their inbound
 * message instead of hardcoding a single language. Defaults to English so the
 * US-first product does not bias non-Turkish contacts toward Turkish.
 *
 * This is a cheap heuristic (character sets + common stopwords), good enough for
 * a soft memory hint. The assistant still detects language per-message at reply
 * time; this only nudges long-term contact memory.
 */
export type ContactLanguage = "tr" | "es" | "en";

const TR_CHARS = /[çğışöüİ]/i;
const ES_MARKS = /[ñ¿¡]/i;

const TR_WORDS = new Set([
    "ve", "bir", "için", "icin", "merhaba", "selam", "evet", "hayır", "hayir",
    "nasıl", "nasil", "fiyat", "var", "yok", "teşekkür", "tesekkur", "lütfen", "lutfen",
    "rezervasyon", "kamp", "çadır", "cadir", "günlük", "gunluk", "istiyorum",
]);

const ES_WORDS = new Set([
    "hola", "gracias", "precio", "está", "esta", "qué", "que", "cómo", "como",
    "por", "favor", "sí", "quiero", "reserva", "disponible", "buenos", "días", "dias",
    "necesito", "cuánto", "cuanto", "cuesta",
]);

export function detectContactLanguage(raw: unknown): ContactLanguage {
    const text = typeof raw === "string" ? raw.trim() : "";
    if (!text) return "en";

    // Distinctive character sets first.
    if (TR_CHARS.test(text)) return "tr";
    if (ES_MARKS.test(text)) return "es";

    // Stopword scoring for messages without distinctive characters.
    const tokens = text.toLowerCase().split(/[^a-zçğışöüñ]+/i).filter(Boolean);
    let tr = 0;
    let es = 0;
    for (const token of tokens) {
        if (TR_WORDS.has(token)) tr++;
        if (ES_WORDS.has(token)) es++;
    }

    if (tr > es && tr > 0) return "tr";
    if (es > tr && es > 0) return "es";
    return "en";
}
