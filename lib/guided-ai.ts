import type { GuidedSkillMessageUi } from "@/lib/guided-skills/types"

export const AI_GUIDED_SKILL_ID = "__ai_guided_options"
export const GUIDED_OPTIONS_START_MARKER = "[[VION_GUIDED_OPTIONS]]"
export const GUIDED_OPTIONS_END_MARKER = "[[/VION_GUIDED_OPTIONS]]"

const GUIDED_LANGUAGE_COPY: Record<string, {
    languageName: string
    title: string
    examples: string[]
    fallbackOptions: string[]
    placeholderOptions: string[]
}> = {
    tr: {
        languageName: "Turkish",
        title: "AI seçenekleri",
        examples: ["Fiyatları göster", "Randevu al", "Temsilciyle görüş"],
        fallbackOptions: ["Daha fazla bilgi ver", "İletişime geç", "Başa dön"],
        placeholderOptions: ["Seçenek 1", "Seçenek 2", "Seçenek 3"],
    },
    en: {
        languageName: "English",
        title: "AI options",
        examples: ["Show pricing", "Book an appointment", "Talk to a representative"],
        fallbackOptions: ["Tell me more", "Contact the team", "Start over"],
        placeholderOptions: ["Option 1", "Option 2", "Option 3"],
    },
    de: {
        languageName: "German",
        title: "KI-Optionen",
        examples: ["Preise anzeigen", "Termin buchen", "Mit einem Mitarbeiter sprechen"],
        fallbackOptions: ["Mehr erfahren", "Team kontaktieren", "Neu starten"],
        placeholderOptions: ["Option 1", "Option 2", "Option 3"],
    },
    fr: {
        languageName: "French",
        title: "Options IA",
        examples: ["Voir les prix", "Prendre rendez-vous", "Parler à un conseiller"],
        fallbackOptions: ["En savoir plus", "Contacter l'equipe", "Recommencer"],
        placeholderOptions: ["Option 1", "Option 2", "Option 3"],
    },
    es: {
        languageName: "Spanish",
        title: "Opciones de IA",
        examples: ["Ver precios", "Reservar una cita", "Hablar con un representante"],
        fallbackOptions: ["Dame más información", "Contactar al equipo", "Empezar de nuevo"],
        placeholderOptions: ["Opción 1", "Opción 2", "Opción 3"],
    },
    it: {
        languageName: "Italian",
        title: "Opzioni IA",
        examples: ["Mostra i prezzi", "Prenota un appuntamento", "Parla con un operatore"],
        fallbackOptions: ["Dimmi di più", "Contatta il team", "Ricomincia"],
        placeholderOptions: ["Opzione 1", "Opzione 2", "Opzione 3"],
    },
    pt: {
        languageName: "Portuguese",
        title: "Opções de IA",
        examples: ["Ver preços", "Marcar um horário", "Falar com um representante"],
        fallbackOptions: ["Conte-me mais", "Contactar a equipe", "Recomeçar"],
        placeholderOptions: ["Opção 1", "Opção 2", "Opção 3"],
    },
}

function getGuidedLanguageCopy(language?: string | null) {
    const normalized = String(language || "").trim().toLowerCase().split("-")[0] || "en"
    return GUIDED_LANGUAGE_COPY[normalized] || {
        ...GUIDED_LANGUAGE_COPY.en,
        languageName: normalized === "en" ? "English" : `the user's conversation language (${normalized})`,
    }
}

export function getGuidedOptionsSystemInstruction(language?: string | null) {
    const copy = getGuidedLanguageCopy(language)
    const examples = copy.examples.map((item) => `"${item}"`).join(", ")
    const fallbackOptions = copy.fallbackOptions.map((item) => `"${item}"`).join(", ")
    const placeholderOptions = copy.placeholderOptions.map((item) => `"${item}"`).join(",")

    return language === "tr"
        ? `\n\n# GUIDED MODULU AKTIF
Bu modül aktifken cevaplarını iki parçalı üret:
1. Kullanıcıya görünen kısa, düz metin cevabı. Markdown tablo, uzun liste veya teknik JSON gösterme.
2. Cevabın en sonunda makinenin okuyacağı seçenek bloğu.

Dil kuralları:
- Görünen cevap ve JSON içindeki tüm options değerleri kullanıcının konuşma diliyle aynı dilde olmalı: ${copy.languageName}.
- Bağlam, eğitim metni veya özel talimat başka dilde olsa bile Guided seçeneklerini ${copy.languageName} diline çevir.
- JSON key adı her zaman "options" olarak kalsın; sadece seçenek metinlerini çevir.

Seçenek kuralları:
- Her cevapta kullanıcının bir sonraki en mantıklı adımını temsil eden 2-4 kısa seçenek üret.
- Seçenekler kullanıcı cümlesi gibi yazılsın: ${examples} gibi.
- Seçenekler yanıttaki metni tekrar etmesin; kullanıcının ilerleyebileceği aksiyonları daraltsın.
- Gereksizse bile güvenli seçenekler ver: ${fallbackOptions} gibi.
- Seçenek bloğunu sadece aşağıdaki formatta yaz:
${GUIDED_OPTIONS_START_MARKER}
{"options":[${placeholderOptions}]}
${GUIDED_OPTIONS_END_MARKER}
- Bu markerları açıklama metninde anlatma.`
        : `\n\n# GUIDED MODULE ACTIVE
When this module is active, produce every answer in two parts:
1. A short, plain text answer visible to the user. Do not use markdown tables, long lists, or visible technical JSON.
2. A machine-readable options block at the very end of the answer.

Language rules:
- The visible answer and every string inside the JSON options array MUST be in the user's conversation language: ${copy.languageName}.
- Even if context, training data, or admin instructions are in another language, translate the Guided option labels into ${copy.languageName}.
- Keep the JSON key name exactly "options"; translate only the option text values.

Option rules:
- Generate 2-4 concise options that represent the user's most useful next steps.
- Write options as user utterances, for example: ${examples}.
- Options must not repeat the answer; they should narrow the next action.
- If no specific next step is obvious, provide safe options such as ${fallbackOptions}.
- Write the options block only in this exact format:
${GUIDED_OPTIONS_START_MARKER}
{"options":[${placeholderOptions}]}
${GUIDED_OPTIONS_END_MARKER}
- Do not explain these markers in the visible answer.`
}

function sanitizeOptionLabel(value: unknown) {
    return String(value || "")
        .replace(/\*\*/g, "")
        .replace(/[`_]/g, "")
        .replace(/\s+/g, " ")
        .replace(/^[-*\d.)\s]+/, "")
        .replace(/[.:;,\s]+$/, "")
        .trim()
        .slice(0, 80)
}

function deriveOptionsFromVisibleContent(content: string): string[] {
    const candidates = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .map((line) => {
            const listMatch = line.match(/^(?:\d+[.)]|[-*•])\s+(.+)$/)
            if (!listMatch) return ""

            const item = listMatch[1].trim()
            const boldTitle = item.match(/^\*\*([^*]+)\*\*/)
            if (boldTitle?.[1]) return boldTitle[1]

            const colonIndex = item.search(/[:：]/)
            if (colonIndex > 2 && colonIndex <= 80) {
                return item.slice(0, colonIndex)
            }

            const dashTitle = item.split(/\s[-–—]\s/)[0]
            return dashTitle || item
        })
        .map(sanitizeOptionLabel)
        .filter((label) => label.length >= 3)

    return Array.from(new Set(candidates)).slice(0, 4)
}

export function extractGuidedOptionsFromContent(rawContent: string): { content: string; options: string[] } {
    const content = String(rawContent || "")
    const blockPattern = new RegExp(`${GUIDED_OPTIONS_START_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([\\s\\S]*?)${GUIDED_OPTIONS_END_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`)
    const match = content.match(blockPattern)

    if (!match) {
        return {
            content: content.trim(),
            options: deriveOptionsFromVisibleContent(content),
        }
    }

    const visibleContent = content.replace(blockPattern, "").trim()
    try {
        const parsed = JSON.parse(match[1].trim())
        const rawOptions: unknown[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.options) ? parsed.options : []
        const options = Array.from(new Set(rawOptions.map(sanitizeOptionLabel).filter(Boolean))).slice(0, 4)
        return {
            content: visibleContent,
            options,
        }
    } catch {
        return {
            content: visibleContent,
            options: [] as string[],
        }
    }
}

export function buildAiGeneratedGuidedUi(params: {
    assistantMessageId: string
    content: string
    options: string[]
    language?: string | null
}): GuidedSkillMessageUi | null {
    const options = params.options.map(sanitizeOptionLabel).filter(Boolean).slice(0, 4)
    if (options.length === 0) return null

    return {
        type: "guided-step",
        skillId: AI_GUIDED_SKILL_ID,
        skillTitle: getGuidedLanguageCopy(params.language).title,
        stepId: params.assistantMessageId,
        prompt: params.content,
        presentation: "chips",
        options: options.map((label, index) => ({
            id: `ai-option-${index + 1}`,
            label,
            aliases: [label],
        })),
        cards: [],
        submit: null,
        cancelLabel: null,
        textMenu: null,
    }
}
