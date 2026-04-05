import crypto from "crypto"
import { getAdminStorage } from "@/lib/firebase-admin"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import {
    DEFAULT_TWILIO_FALLBACK_VOICE,
    DEFAULT_VOICE_LOCALE,
    resolveTwilioFallbackVoice,
    type VoiceReadinessResult,
} from "@/lib/omni/voice-config"
import type { VoiceTtsProvider } from "@/lib/omni/types"

const ELEVENLABS_DEFAULT_MODEL = "eleven_multilingual_v2"
const VOICE_TTS_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const VOICE_TTS_SIGNED_URL_MS = 15 * 60 * 1000

export interface RenderVoicePromptParams {
    chatbotId: string
    text: string
    locale?: string | null
    ttsProvider?: VoiceTtsProvider | null
    twilioFallbackVoice?: string | null
    elevenLabsVoiceId?: string | null
    elevenLabsModelId?: string | null
    source: string
    metadata?: Record<string, unknown>
}

export interface RenderVoicePromptResult {
    twimlFragment: string
    provider: VoiceTtsProvider
    fallbackUsed: boolean
    cacheHit?: boolean
    assetPath?: string | null
    fallbackReason?: string | null
}

function escapeXml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&apos;")
}

function buildTwilioSay(text: string, locale?: string | null, voice?: string | null) {
    const normalizedLocale = locale || DEFAULT_VOICE_LOCALE
    const normalizedVoice = voice || DEFAULT_TWILIO_FALLBACK_VOICE
    return `<Say voice="${escapeXml(normalizedVoice)}" language="${escapeXml(normalizedLocale)}">${escapeXml(text)}</Say>`
}

function buildCachePath(params: {
    chatbotId: string
    text: string
    locale?: string | null
    voiceId?: string | null
    modelId?: string | null
}) {
    const hash = crypto
        .createHash("sha256")
        .update(
            JSON.stringify({
                locale: params.locale || DEFAULT_VOICE_LOCALE,
                voiceId: params.voiceId || null,
                modelId: params.modelId || ELEVENLABS_DEFAULT_MODEL,
                text: params.text,
            })
        )
        .digest("hex")

    return `omni/voice-tts/${params.chatbotId}/${hash}.mp3`
}

async function buildElevenLabsAudio(params: {
    chatbotId: string
    text: string
    locale?: string | null
    voiceId: string
    modelId?: string | null
}) {
    const storage = getAdminStorage()
    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!storage || !apiKey) {
        throw new Error("ElevenLabs managed rendering is not configured")
    }

    const path = buildCachePath({
        chatbotId: params.chatbotId,
        text: params.text,
        locale: params.locale,
        voiceId: params.voiceId,
        modelId: params.modelId,
    })
    const bucket = storage.bucket()
    const fileRef = bucket.file(path)
    const [exists] = await fileRef.exists()
    const now = Date.now()

    if (!exists) {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${params.voiceId}`, {
            method: "POST",
            headers: {
                Accept: "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": apiKey,
            },
            body: JSON.stringify({
                text: params.text,
                model_id: params.modelId || ELEVENLABS_DEFAULT_MODEL,
                output_format: "mp3_44100_128",
            }),
        })

        if (!response.ok) {
            const errorBody = await response.text().catch(() => "")
            throw new Error(errorBody || `ElevenLabs TTS failed with status ${response.status}`)
        }

        const audioBuffer = Buffer.from(await response.arrayBuffer())
        await fileRef.save(audioBuffer, {
            metadata: {
                contentType: "audio/mpeg",
                cacheControl: "private, max-age=900",
                metadata: {
                    chatbotId: params.chatbotId,
                    ttlAt: String(now + VOICE_TTS_CACHE_TTL_MS),
                    ttsProvider: "elevenlabs",
                    voiceId: params.voiceId,
                    modelId: params.modelId || ELEVENLABS_DEFAULT_MODEL,
                },
            },
        })
    }

    const [signedUrl] = await fileRef.getSignedUrl({
        action: "read",
        expires: now + VOICE_TTS_SIGNED_URL_MS,
    })

    return {
        signedUrl,
        path,
        cacheHit: exists,
    }
}

export async function renderVoicePrompt(params: RenderVoicePromptParams): Promise<RenderVoicePromptResult> {
    const locale = params.locale || DEFAULT_VOICE_LOCALE
    const fallbackVoice = params.twilioFallbackVoice || DEFAULT_TWILIO_FALLBACK_VOICE
    const requestedProvider = params.ttsProvider === "elevenlabs" ? "elevenlabs" : "twilio"

    if (requestedProvider !== "elevenlabs") {
        return {
            twimlFragment: buildTwilioSay(params.text, locale, fallbackVoice),
            provider: "twilio",
            fallbackUsed: false,
            assetPath: null,
            fallbackReason: null,
        }
    }

    try {
        if (!params.elevenLabsVoiceId) {
            throw new Error("ElevenLabs voice ID is not configured")
        }

        const rendered = await buildElevenLabsAudio({
            chatbotId: params.chatbotId,
            text: params.text,
            locale,
            voiceId: params.elevenLabsVoiceId,
            modelId: params.elevenLabsModelId,
        })

        await logOmniAuditEvent({
            chatbotId: params.chatbotId,
            channel: "voice",
            eventType: "voice.tts.elevenlabs_success",
            result: "success",
            source: params.source,
            message: "ElevenLabs TTS rendered successfully",
            metadata: {
                ...params.metadata,
                locale,
                voiceId: params.elevenLabsVoiceId,
                modelId: params.elevenLabsModelId || ELEVENLABS_DEFAULT_MODEL,
                cacheHit: rendered.cacheHit,
                assetPath: rendered.path,
            },
        })

        return {
            twimlFragment: `<Play>${escapeXml(rendered.signedUrl)}</Play>`,
            provider: "elevenlabs",
            fallbackUsed: false,
            cacheHit: rendered.cacheHit,
            assetPath: rendered.path,
            fallbackReason: null,
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "ElevenLabs TTS failed"

        await logOmniAuditEvent({
            chatbotId: params.chatbotId,
            channel: "voice",
            eventType: "voice.tts.elevenlabs_fallback",
            result: "error",
            source: params.source,
            message,
            metadata: {
                ...params.metadata,
                locale,
                voiceId: params.elevenLabsVoiceId || null,
                modelId: params.elevenLabsModelId || ELEVENLABS_DEFAULT_MODEL,
            },
        })

        return {
            twimlFragment: buildTwilioSay(params.text, locale, fallbackVoice),
            provider: "twilio",
            fallbackUsed: true,
            assetPath: null,
            fallbackReason: message,
        }
    }
}

export function isVoiceTtsCachePath(path: string) {
    return path.startsWith("omni/voice-tts/")
}
