import {
    normalizeConversationLanguage,
    resolveConversationLanguage,
} from "@/lib/conversation-language";

export const OPENAI_VOICE_NAMES = [
    "alloy",
    "ash",
    "ballad",
    "coral",
    "echo",
    "fable",
    "onyx",
    "nova",
    "sage",
    "shimmer",
    "verse",
] as const;

export type OpenAIVoiceName = typeof OPENAI_VOICE_NAMES[number];

const OPENAI_VOICE_SET = new Set<string>(OPENAI_VOICE_NAMES);

export type ElevenLabsSpeechPreset = {
    modelId: string;
    languageCode?: string;
    voiceSettings: {
        stability: number;
        similarityBoost: number;
        style: number;
        useSpeakerBoost: boolean;
    };
};

export function resolveVoiceHintLanguage(params: {
    uiLanguage?: string | null;
    initialLanguage?: string | null;
    browserLanguage?: string | null;
}): string | null {
    const configuredLanguage = normalizeConversationLanguage(params.initialLanguage);
    if (configuredLanguage) {
        return configuredLanguage;
    }

    const uiLanguage = normalizeConversationLanguage(params.uiLanguage);
    const browserLanguage = normalizeConversationLanguage(params.browserLanguage);

    if (uiLanguage && browserLanguage && uiLanguage === browserLanguage) {
        return uiLanguage;
    }

    if (uiLanguage === "tr" || browserLanguage === "tr") {
        return "tr";
    }

    return null;
}

export function resolveVoiceTextLanguage(params: {
    text?: string | null;
    explicitLanguage?: string | null;
    initialLanguage?: string | null;
    browserLanguage?: string | null;
    fallback?: string | null;
}): string {
    const hintLanguage =
        normalizeConversationLanguage(params.explicitLanguage)
        || resolveVoiceHintLanguage({
            uiLanguage: params.explicitLanguage,
            initialLanguage: params.initialLanguage,
            browserLanguage: params.browserLanguage,
        })
        || normalizeConversationLanguage(params.fallback);

    return resolveConversationLanguage({
        explicitLanguage: hintLanguage,
        userText: params.text,
        fallback: hintLanguage || "en",
    });
}

export function toVoiceLocale(language?: string | null): string {
    const normalized = normalizeConversationLanguage(language) || "en";

    switch (normalized) {
        case "tr":
            return "tr-TR";
        case "de":
            return "de-DE";
        case "fr":
            return "fr-FR";
        case "es":
            return "es-ES";
        default:
            return "en-US";
    }
}

export function normalizeOpenAiVoiceName(value?: string | null): OpenAIVoiceName | null {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) return null;
    if (!OPENAI_VOICE_SET.has(normalized)) return null;
    return normalized as OpenAIVoiceName;
}

export function resolveOpenAiVoiceName(language?: string | null, preferredVoice?: string | null): OpenAIVoiceName {
    const preferred = normalizeOpenAiVoiceName(preferredVoice);
    if (preferred) {
        return preferred;
    }

    const normalizedLanguage = normalizeConversationLanguage(language) || "en";
    if (normalizedLanguage === "tr") {
        return "sage";
    }

    return "alloy";
}

export function resolveElevenLabsSpeechPreset(language?: string | null): ElevenLabsSpeechPreset {
    const normalizedLanguage = normalizeConversationLanguage(language) || "en";

    if (normalizedLanguage === "tr") {
        return {
            modelId: "eleven_flash_v2_5",
            languageCode: "tr",
            voiceSettings: {
                stability: 0.62,
                similarityBoost: 0.78,
                style: 0.08,
                useSpeakerBoost: true,
            },
        };
    }

    return {
        modelId: "eleven_multilingual_v2",
        voiceSettings: {
            stability: 0.45,
            similarityBoost: 0.82,
            style: 0.2,
            useSpeakerBoost: true,
        },
    };
}

export function buildOpenAiSpeechInstructions(language?: string | null): string {
    const normalizedLanguage = normalizeConversationLanguage(language) || "en";

    if (normalizedLanguage === "tr") {
        return "Speak fluent, natural everyday Turkish with clear pronunciation, short conversational sentences, gentle pauses, and a warm non-corporate tone. Read numbers, dates, and names distinctly.";
    }

    return "Speak in a natural, warm, human conversational tone with short clear sentences and distinct pronunciation for names, dates, and numbers.";
}

export function pickSpeechSynthesisVoice(
    voices: SpeechSynthesisVoice[],
    params: {
        language?: string | null;
        preferredVoice?: string | null;
    }
): SpeechSynthesisVoice | null {
    if (!voices.length) return null;

    const normalizedLanguage = normalizeConversationLanguage(params.language) || "en";
    const preferredLocale = toVoiceLocale(normalizedLanguage).toLowerCase();
    const preferredNeedle = String(params.preferredVoice || "").trim().toLowerCase();

    let bestVoice: SpeechSynthesisVoice | null = null;
    let bestScore = -1;

    for (const voice of voices) {
        const voiceLang = String(voice.lang || "").toLowerCase();
        const voiceName = `${voice.name || ""} ${voice.voiceURI || ""}`.toLowerCase();

        let score = 0;

        if (preferredNeedle && voiceName.includes(preferredNeedle)) {
            score += 80;
        }

        if (voiceLang === preferredLocale) {
            score += 50;
        } else if (voiceLang.startsWith(`${normalizedLanguage}-`) || voiceLang === normalizedLanguage) {
            score += 40;
        }

        if (normalizedLanguage === "tr" && /(turkish|turk|türk)/i.test(voice.name || "")) {
            score += 20;
        }

        if (voice.default) {
            score += 5;
        }

        if (score > bestScore) {
            bestScore = score;
            bestVoice = voice;
        }
    }

    return bestVoice;
}
