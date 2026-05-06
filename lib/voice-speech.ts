import OpenAI from "openai";
import { getAdminDb } from "@/lib/firebase-admin";
import {
    buildOpenAiSpeechInstructions,
    resolveElevenLabsSpeechPreset,
    resolveOpenAiVoiceName,
    resolveVoiceTextLanguage,
} from "@/lib/voice-runtime";

const DEFAULT_ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const ELEVENLABS_FAILURE_COOLDOWN_MS = 10 * 60 * 1000;
const elevenLabsUnavailableUntil = new Map<string, number>();

type VoiceProvider = "elevenlabs" | "openai" | "klassifier";

type TenantVoiceConfig = {
    voiceProvider?: string;
    preferredVoice?: string;
    elevenLabsVoiceId?: string;
    elevenLabsApiKey?: string;
    initialLanguage?: string;
};

type SynthesizeSpeechParams = {
    text: string;
    chatbotId?: string | null;
    voiceId?: string | null;
    preferredVoice?: string | null;
    provider?: string | null;
    language?: string | null;
    disableFallback?: boolean;
};

function normalizeVoiceProvider(value?: string | null): VoiceProvider {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "elevenlabs") return "elevenlabs";
    if (normalized === "klassifier") return "klassifier";
    return "openai";
}

function getElevenLabsCacheKey(apiKey?: string | null, voiceId?: string | null) {
    const keyTail = String(apiKey || "").trim().slice(-8) || "env";
    const actualVoiceId = String(voiceId || DEFAULT_ELEVENLABS_VOICE_ID).trim() || DEFAULT_ELEVENLABS_VOICE_ID;
    return `${keyTail}:${actualVoiceId}`;
}

function isElevenLabsCoolingDown(apiKey?: string | null, voiceId?: string | null) {
    const unavailableUntil = elevenLabsUnavailableUntil.get(getElevenLabsCacheKey(apiKey, voiceId)) || 0;
    return unavailableUntil > Date.now();
}

function markElevenLabsCoolingDown(apiKey?: string | null, voiceId?: string | null) {
    elevenLabsUnavailableUntil.set(
        getElevenLabsCacheKey(apiKey, voiceId),
        Date.now() + ELEVENLABS_FAILURE_COOLDOWN_MS
    );
}

function isElevenLabsPlanError(error: Error) {
    return /paid_plan_required|payment_required/i.test(error.message);
}

async function readTenantVoiceConfig(chatbotId?: string | null): Promise<TenantVoiceConfig> {
    if (!chatbotId) return {};

    const adminDb = getAdminDb();
    if (!adminDb) return {};

    try {
        const [userDoc, chatbotDoc] = await Promise.all([
            adminDb.collection("users").doc(chatbotId).get().catch(() => null),
            adminDb.collection("chatbots").doc(chatbotId).get().catch(() => null),
        ]);

        return {
            ...(userDoc?.exists ? (userDoc.data() as TenantVoiceConfig) : {}),
            ...(chatbotDoc?.exists ? (chatbotDoc.data() as TenantVoiceConfig) : {}),
        };
    } catch (error) {
        console.error("[Voice] Failed to load tenant voice config:", error);
        return {};
    }
}

async function speakWithElevenLabs(params: {
    text: string;
    apiKey?: string | null;
    voiceId?: string | null;
    language?: string | null;
}): Promise<ArrayBuffer> {
    const apiKey = String(params.apiKey || process.env.ELEVENLABS_API_KEY || "").trim();
    if (!apiKey) {
        throw new Error("ElevenLabs API key not configured");
    }

    const actualVoiceId = String(params.voiceId || DEFAULT_ELEVENLABS_VOICE_ID).trim() || DEFAULT_ELEVENLABS_VOICE_ID;
    const preset = resolveElevenLabsSpeechPreset(params.language);

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${actualVoiceId}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "xi-api-key": apiKey,
        },
        body: JSON.stringify({
            text: params.text,
            model_id: preset.modelId,
            ...(preset.languageCode ? { language_code: preset.languageCode } : {}),
            voice_settings: {
                stability: preset.voiceSettings.stability,
                similarity_boost: preset.voiceSettings.similarityBoost,
                style: preset.voiceSettings.style,
                use_speaker_boost: preset.voiceSettings.useSpeakerBoost,
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`.trim());
    }

    return response.arrayBuffer();
}

async function speakWithOpenAI(params: {
    text: string;
    language?: string | null;
    preferredVoice?: string | null;
}): Promise<ArrayBuffer> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OpenAI API key not configured");
    }

    const openai = new OpenAI({ apiKey });
    const response = await openai.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: resolveOpenAiVoiceName(params.language, params.preferredVoice),
        input: params.text.slice(0, 4096),
        response_format: "mp3",
        instructions: buildOpenAiSpeechInstructions(params.language),
    });

    return response.arrayBuffer();
}

export async function synthesizeSpeech(params: SynthesizeSpeechParams): Promise<ArrayBuffer> {
    const tenantConfig = await readTenantVoiceConfig(params.chatbotId);
    const resolvedLanguage = resolveVoiceTextLanguage({
        text: params.text,
        explicitLanguage: params.language,
        initialLanguage: tenantConfig.initialLanguage,
        fallback: "en",
    });

    const requestedProvider = normalizeVoiceProvider(params.provider || tenantConfig.voiceProvider);
    const preferredVoice = params.preferredVoice || tenantConfig.preferredVoice;
    const elevenLabsVoiceId = params.voiceId || tenantConfig.elevenLabsVoiceId;
    const elevenLabsApiKey = tenantConfig.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY;
    const canTryElevenLabs = !isElevenLabsCoolingDown(elevenLabsApiKey, elevenLabsVoiceId);

    const providers: VoiceProvider[] = params.disableFallback
        ? [requestedProvider]
        : requestedProvider === "elevenlabs"
            ? (canTryElevenLabs ? ["elevenlabs", "openai"] : ["openai"])
            : (canTryElevenLabs ? ["openai", "elevenlabs"] : ["openai"]);

    let lastError: Error | null = null;

    for (const provider of providers) {
        try {
            if (provider === "elevenlabs") {
                return await speakWithElevenLabs({
                    text: params.text,
                    apiKey: elevenLabsApiKey,
                    voiceId: elevenLabsVoiceId,
                    language: resolvedLanguage,
                });
            }

            return await speakWithOpenAI({
                text: params.text,
                language: resolvedLanguage,
                preferredVoice,
            });
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (provider === "elevenlabs" && isElevenLabsPlanError(lastError)) {
                markElevenLabsCoolingDown(elevenLabsApiKey, elevenLabsVoiceId);
            }
            console.error(`[Voice] ${provider} synthesis failed:`, lastError);
        }
    }

    throw lastError || new Error("No speech provider available");
}
