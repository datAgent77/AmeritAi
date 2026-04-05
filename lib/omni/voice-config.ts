import type {
    VoiceCarrierProvider,
    VoiceCallControlProvider,
    VoiceIntegrationConfig,
    VoiceNumberRecord,
    VoiceRoutingMode,
    VoiceRoutingStatus,
    VoiceTtsProvider,
} from "@/lib/omni/types"

export const DEFAULT_VOICE_LOCALE = "tr-TR"
export const DEFAULT_TWILIO_FALLBACK_VOICE = "alice"

export interface VoiceReadinessResult {
    enabled: boolean
    ready: boolean
    blockers: string[]
    carrierConfigured: boolean
    callControlConfigured: boolean
    renderingConfigured: boolean
    activeNumbers: number
    configuredNumbers: number
    defaultRoutingMode: VoiceRoutingMode
    callControlProvider: VoiceCallControlProvider
    ttsProviderDefault: VoiceTtsProvider
    ttsFallbackProvider: "twilio"
    usesByoc: boolean
    usesElevenLabs: boolean
}

function normalizePhoneNumber(value?: string | null) {
    if (!value) return null
    const cleaned = value.replace(/[^\d+]/g, "")
    return cleaned || null
}

function normalizeCarrierProvider(value: unknown): VoiceCarrierProvider {
    if (value === "verimor" || value === "turk_telekom" || value === "vodafone_business") {
        return value
    }
    return "other"
}

function normalizeRoutingMode(value: unknown): VoiceRoutingMode {
    return value === "twilio_byoc" ? "twilio_byoc" : "twilio_direct"
}

function normalizeTtsProvider(value: unknown): VoiceTtsProvider {
    return value === "elevenlabs" ? "elevenlabs" : "twilio"
}

function normalizeRoutingStatus(value: unknown): VoiceRoutingStatus {
    return value === "active" || value === "paused" ? value : "draft"
}

export function normalizeVoiceIntegrationConfig(config: any): VoiceIntegrationConfig {
    const hasManagedKey = Boolean(process.env.ELEVENLABS_API_KEY)
    return {
        enabled: typeof config?.enabled === "boolean" ? config.enabled : undefined,
        callControlProvider: "twilio",
        accountSid: config?.accountSid || null,
        authToken: config?.authToken || null,
        defaultByocTrunkSid: config?.defaultByocTrunkSid || null,
        elevenLabsManaged: config?.elevenLabsManaged !== false,
        elevenLabsApiKeyRef: config?.elevenLabsApiKeyRef || (hasManagedKey ? "env:ELEVENLABS_API_KEY" : null),
        ttsProviderDefault: normalizeTtsProvider(config?.ttsProviderDefault),
        ttsFallbackProvider: "twilio",
    }
}

export function normalizeVoiceNumberRecord(input: any): VoiceNumberRecord {
    const providerNumberId = input?.providerNumberId || input?.twilioNumberSid || null
    const twilioFallbackVoice = input?.twilioFallbackVoice || input?.ttsVoice || DEFAULT_TWILIO_FALLBACK_VOICE
    const routingMode = normalizeRoutingMode(input?.routingMode)
    const ttsProvider = normalizeTtsProvider(input?.ttsProvider)

    return {
        id: input?.id,
        chatbotId: input?.chatbotId || "",
        phoneNumber: normalizePhoneNumber(input?.phoneNumber) || String(input?.phoneNumber || ""),
        carrierProvider: normalizeCarrierProvider(input?.carrierProvider),
        carrierLabel: input?.carrierLabel || null,
        carrierRouteRef: input?.carrierRouteRef || null,
        routingMode,
        providerNumberId,
        twilioNumberSid: input?.twilioNumberSid || providerNumberId,
        defaultLocale: input?.defaultLocale || DEFAULT_VOICE_LOCALE,
        ttsVoice: input?.ttsVoice || twilioFallbackVoice,
        ttsProvider,
        twilioFallbackVoice,
        elevenLabsVoiceId: input?.elevenLabsVoiceId || null,
        elevenLabsModelId: input?.elevenLabsModelId || null,
        byocTrunkSidOverride: input?.byocTrunkSidOverride || null,
        routingStatus: normalizeRoutingStatus(input?.routingStatus),
        businessHours: input?.businessHours || null,
        callbackEnabled: input?.callbackEnabled !== false,
        greetingMessage: input?.greetingMessage || null,
        fallbackChannel: input?.fallbackChannel === "whatsapp" ? "whatsapp" : "voice",
        createdAt: input?.createdAt || null,
        updatedAt: input?.updatedAt || null,
    }
}

export function normalizeVoiceNumberRecords(records: any[]): VoiceNumberRecord[] {
    return Array.isArray(records) ? records.map((record) => normalizeVoiceNumberRecord(record)) : []
}

export function resolveVoiceChannelEnabled(params: {
    integration?: Partial<VoiceIntegrationConfig> | null
    voiceNumbers?: Array<Partial<VoiceNumberRecord> | Record<string, unknown>> | null
}) {
    const integration = normalizeVoiceIntegrationConfig(params.integration)
    if (typeof integration.enabled === "boolean") {
        return integration.enabled
    }

    const numbers = normalizeVoiceNumberRecords((params.voiceNumbers as any[]) || [])
    return (
        numbers.length > 0 ||
        Boolean(integration.accountSid) ||
        Boolean(integration.authToken) ||
        Boolean(integration.defaultByocTrunkSid)
    )
}

export function resolveVoiceRoutingMode(number: Partial<VoiceNumberRecord> | null | undefined): VoiceRoutingMode {
    return normalizeRoutingMode(number?.routingMode)
}

export function resolveVoiceTtsProvider(
    number: Partial<VoiceNumberRecord> | null | undefined,
    integration?: Partial<VoiceIntegrationConfig> | null
): VoiceTtsProvider {
    return normalizeTtsProvider(number?.ttsProvider || integration?.ttsProviderDefault)
}

export function resolveTwilioFallbackVoice(number: Partial<VoiceNumberRecord> | null | undefined) {
    return number?.twilioFallbackVoice || number?.ttsVoice || DEFAULT_TWILIO_FALLBACK_VOICE
}

export function resolveProviderNumberId(number: Partial<VoiceNumberRecord> | null | undefined) {
    return number?.providerNumberId || number?.twilioNumberSid || null
}

export function resolveByocTrunkSid(
    number: Partial<VoiceNumberRecord> | null | undefined,
    integration?: Partial<VoiceIntegrationConfig> | null
) {
    return number?.byocTrunkSidOverride || integration?.defaultByocTrunkSid || null
}

export function buildVoiceReadiness(params: {
    publicOrigin: boolean
    integration: VoiceIntegrationConfig
    voiceNumbers: Array<VoiceNumberRecord | Record<string, unknown>>
}) : VoiceReadinessResult {
    const integration = normalizeVoiceIntegrationConfig(params.integration)
    const numbers = normalizeVoiceNumberRecords(params.voiceNumbers as any[])
    const enabled = resolveVoiceChannelEnabled({ integration, voiceNumbers: numbers })
    const activeNumbers = numbers.filter((number) => number.routingStatus === "active")
    const usesByoc = activeNumbers.some((number) => resolveVoiceRoutingMode(number) === "twilio_byoc")
    const usesElevenLabs = activeNumbers.some((number) => resolveVoiceTtsProvider(number, integration) === "elevenlabs")
    const carrierConfigured = activeNumbers.every((number) => Boolean(number.carrierProvider && number.phoneNumber))
    const callControlConfigured = Boolean(integration.accountSid && integration.authToken)
    const renderingConfigured =
        activeNumbers.length === 0
            ? false
            : activeNumbers.every((number) => {
                  const provider = resolveVoiceTtsProvider(number, integration)
                  if (provider === "twilio") {
                      return Boolean(resolveTwilioFallbackVoice(number))
                  }
                  return Boolean(integration.elevenLabsManaged && integration.elevenLabsApiKeyRef && number.elevenLabsVoiceId)
              })

    const blockers = enabled
        ? ([
              params.publicOrigin ? null : "Public URL yok. Voice callback icin preview veya tunnel gerekiyor.",
              activeNumbers.length > 0 ? null : "En az bir aktif voice number gerekiyor.",
              carrierConfigured ? null : "Carrier provider ve phone number aktif voice satirlarinda eksik.",
              callControlConfigured ? null : "Twilio call control credentials eksik.",
              !usesByoc || resolveByocTrunkSid(activeNumbers[0], integration)
                  ? null
                  : "BYOC routing secili ama trunk SID eksik.",
              !usesElevenLabs || integration.elevenLabsApiKeyRef
                  ? null
                  : "ElevenLabs managed API key tanimli degil.",
              !usesElevenLabs || activeNumbers.every((number) => resolveVoiceTtsProvider(number, integration) !== "elevenlabs" || Boolean(number.elevenLabsVoiceId))
                  ? null
                  : "ElevenLabs TTS icin voice ID eksik.",
          ].filter(Boolean) as string[])
        : ["Voice channel disabled."]

    return {
        enabled,
        ready: enabled && blockers.length === 0,
        blockers,
        carrierConfigured,
        callControlConfigured,
        renderingConfigured,
        activeNumbers: activeNumbers.length,
        configuredNumbers: numbers.length,
        defaultRoutingMode: usesByoc ? "twilio_byoc" : "twilio_direct",
        callControlProvider: integration.callControlProvider || "twilio",
        ttsProviderDefault: integration.ttsProviderDefault || "twilio",
        ttsFallbackProvider: "twilio",
        usesByoc,
        usesElevenLabs,
    }
}
