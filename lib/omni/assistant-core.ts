import { generateAIResponse, type AIMessage } from "@/lib/ai-service"
import { resolveConversationLanguage, toCopyLanguage } from "@/lib/conversation-language"
import { getAdminDb } from "@/lib/firebase-admin"
import { getConfiguredCapabilitiesForChannel } from "@/lib/omni/assistant-capabilities"
import { getChannelPolicy } from "@/lib/omni/channel-policies"
import { getOmniContactMemory } from "@/lib/omni/memory"
import type {
    OmniAllowedAction,
    OmniAssistantCoreSettings,
    OmniAssistantProfile,
    OmniChannel,
    OmniCustomerMemorySettings,
    OmniKnowledgeGovernanceSettings,
} from "@/lib/omni/types"

export interface OmniAssistantCoreContext {
    channel: OmniChannel
    capabilityIds: string[]
    allowedActions: OmniAllowedAction[]
    policy: ReturnType<typeof getChannelPolicy>
    supportsRichUi: boolean
    requiresIdentityForSensitiveData: boolean
    brandVoicePrompt?: string | null
    assistantProfileId?: string | null
    knowledgeGovernance: OmniKnowledgeGovernanceSettings
    customerMemory: OmniCustomerMemorySettings
    memorySummary?: string | null
    systemInstruction: string
}

export interface VoiceTurnGenerationInput {
    chatbotId: string
    transcript: string
    contactKey?: string | null
    messages?: Array<{ role: string; content: string }>
    language?: string
}

export interface VoiceTurnGenerationResult {
    rawResponse: string
    spokenResponse: string
    shouldOfferCallback: boolean
    assistantProfileId?: string | null
}

export interface TextTurnGenerationInput {
    chatbotId: string
    channel: Extract<OmniChannel, "web" | "whatsapp" | "instagram" | "messenger">
    transcript: string
    contactKey?: string | null
    messages?: Array<{ role: string; content: string }>
    language?: string
}

const DEFAULT_KNOWLEDGE_GOVERNANCE: OmniKnowledgeGovernanceSettings = {
    sourcePriority: ["policy", "crm", "knowledge_base", "catalog", "fallback"],
    staleAfterHours: 24,
    includeFreshnessHints: true,
    includeConfidenceHints: true,
}

const DEFAULT_CUSTOMER_MEMORY: OmniCustomerMemorySettings = {
    enabled: true,
    maxFacts: 5,
    storePreferences: true,
    storeOpenIssues: true,
    storeConversationSummary: true,
}

const DEFAULT_ASSISTANT_PROFILES: OmniAssistantProfile[] = [
    {
        id: "omni-default",
        name: "Default",
        description: "Balanced default assistant profile.",
        prompt: "",
        active: true,
        channelToneOverrides: {
            voice: "Keep answers concise, natural, and confirm critical details out loud.",
            whatsapp: "Keep replies short, direct, and mobile-friendly.",
            instagram: "Keep replies concise, conversational, and informal without losing clarity.",
            messenger: "Keep replies short, conversational, and friendly like Facebook Messenger support.",
            web: "Stay clear, helpful, and reusable across channels.",
        },
    },
]

const DEFAULT_CHANNEL_ASSISTANT_PROFILES: Record<OmniChannel, string> = {
    web: "omni-default",
    whatsapp: "omni-default",
    instagram: "omni-default",
    messenger: "omni-default",
    voice: "omni-default",
}

export interface TextTurnGenerationResult {
    rawResponse: string
    replyText: string
    shouldOfferCallback: boolean
    assistantProfileId?: string | null
}

type RichUiIntent = "booking" | "lead" | "handoff"

const RICH_UI_MARKERS: Array<{ intent: RichUiIntent; pattern: RegExp }> = [
    { intent: "booking", pattern: /\[SHOW_BOOKING_FORM\]/i },
    { intent: "lead", pattern: /\[SHOW_LEAD_FORM\]/i },
    { intent: "handoff", pattern: /\[SHOW_HANDOFF_FORM\]/i },
]

const PLAIN_CHANNEL_FALLBACKS = {
    tr: {
        booking: "Randevu olusturabilmem icin tercih ettiginiz tarih ve saat ile ad soyad ve telefon ya da e-posta bilginizi buradan tek mesajda yazin.",
        lead: "Size donus yapabilmemiz icin adinizi ve telefon ya da e-posta bilginizi buradan tek mesajda paylasin.",
        handoff: "Sizi temsilcimize yonlendirebilmem icin adinizi ve telefon ya da e-posta bilginizi buradan paylasin.",
    },
    en: {
        booking: "To book your appointment, send your preferred date and time plus your full name and phone or email in one message here.",
        lead: "To help our team follow up, send your name and phone or email in one message here.",
        handoff: "To connect you with our team, send your name and phone or email here in one message.",
    },
    de: {
        booking: "Damit ich den Termin anlegen kann, senden Sie bitte Ihren gewunschten Tag und Ihre Uhrzeit sowie Ihren Namen und Ihre Telefon- oder E-Mail-Adresse in einer Nachricht.",
        lead: "Damit unser Team Sie erreichen kann, senden Sie bitte Ihren Namen und Ihre Telefon- oder E-Mail-Adresse in einer Nachricht.",
        handoff: "Damit ich Sie an unser Team weiterleiten kann, senden Sie bitte Ihren Namen und Ihre Telefon- oder E-Mail-Adresse in einer Nachricht.",
    },
    fr: {
        booking: "Pour reserver votre rendez-vous, envoyez ici en un seul message la date et l'heure souhaitees ainsi que votre nom et votre telephone ou e-mail.",
        lead: "Pour que notre equipe puisse vous recontacter, envoyez ici votre nom et votre telephone ou e-mail en un seul message.",
        handoff: "Pour vous mettre en relation avec notre equipe, envoyez ici votre nom et votre telephone ou e-mail en un seul message.",
    },
    es: {
        booking: "Para reservar su cita, envie aqui en un solo mensaje la fecha y hora preferidas junto con su nombre y su telefono o correo.",
        lead: "Para que nuestro equipo pueda contactarle, envie aqui su nombre y su telefono o correo en un solo mensaje.",
        handoff: "Para derivarle a nuestro equipo, envie aqui su nombre y su telefono o correo en un solo mensaje.",
    },
} as const

function normalizeMessageRole(role?: string): AIMessage["role"] {
    if (role === "assistant" || role === "system") return role
    return "user"
}

function stripMarkdown(value: string) {
    return value
        .replace(/\[SHOW_(?:LEAD|HANDOFF|BOOKING)_FORM\]/gi, "")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/[`*_>#~-]/g, "")
        .replace(/\s+/g, " ")
        .trim()
}

function truncateSentences(value: string, maxSentences: number) {
    if (!value) return value
    const sentences = value
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean)

    if (sentences.length <= maxSentences) {
        return sentences.join(" ")
    }

    return sentences.slice(0, maxSentences).join(" ")
}

export function sanitizeVoiceResponse(value: string) {
    const plainText = stripMarkdown(value)
        .replace(/\bhttps?:\/\/\S+/gi, "")
        .replace(/\s+/g, " ")
        .trim()

    return truncateSentences(plainText, 3)
}

export function detectCallbackIntent(value: string) {
    const normalized = value.toLowerCase()
    return /(callback|geri ara|geri arama|beni ara|biri arasın|representative|agent|human|insanla görüş|yetkili|müşteri temsilcisi)/.test(normalized)
}

export function detectVoiceCallbackIntent(value: string) {
    return detectCallbackIntent(value)
}

function detectRichUiIntent(value: string): RichUiIntent | null {
    for (const entry of RICH_UI_MARKERS) {
        if (entry.pattern.test(value)) {
            return entry.intent
        }
    }
    return null
}

function buildPlainChannelFallback(intent: RichUiIntent, language?: string | null) {
    const resolvedLanguage = resolveConversationLanguage({
        explicitLanguage: language,
        userText: language,
        fallback: "en",
    })
    const copy = PLAIN_CHANNEL_FALLBACKS[toCopyLanguage(resolvedLanguage)]
    return copy[intent]
}

export function sanitizeTextResponse(
    value: string,
    channel: Extract<OmniChannel, "web" | "whatsapp" | "instagram" | "messenger">,
    language?: string | null
) {
    const richUiIntent = detectRichUiIntent(value)
    if (channel !== "web" && richUiIntent) {
        return buildPlainChannelFallback(richUiIntent, language)
    }

    const plainText = value
        .replace(/\[SHOW_(?:LEAD|HANDOFF|BOOKING)_FORM\]/gi, "")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1: $2")
        .replace(/[`*_>#~]/g, "")
        .replace(/\r/g, "")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()

    const maxSentences = channel === "instagram" || channel === "messenger" ? 2 : channel === "whatsapp" ? 4 : 6
    return truncateSentences(plainText.replace(/\n+/g, " "), maxSentences)
}

export function buildOmniAssistantCoreContext(channel: OmniChannel): OmniAssistantCoreContext {
    const capabilities = getConfiguredCapabilitiesForChannel(channel)
    const policy = getChannelPolicy(channel)
    const supportsRichUi = policy.allowRichUi === true && capabilities.some((capability) => capability.requiresRichUI)
    const allowedActions = Array.from(new Set(capabilities.flatMap((capability) => capability.allowedActions)))

    return {
        channel,
        capabilityIds: capabilities.map((capability) => capability.id),
        allowedActions,
        policy,
        supportsRichUi,
        requiresIdentityForSensitiveData: policy.identityRequiredForSensitiveData === true,
        brandVoicePrompt: null,
        assistantProfileId: DEFAULT_CHANNEL_ASSISTANT_PROFILES[channel],
        knowledgeGovernance: DEFAULT_KNOWLEDGE_GOVERNANCE,
        customerMemory: DEFAULT_CUSTOMER_MEMORY,
        memorySummary: null,
        systemInstruction: [
            `Channel: ${channel}`,
            `Response style: ${policy.responseStyle}`,
            `Verbosity: ${policy.maxVerbosity}`,
            `Handoff mode: ${policy.handoffMode}`,
            `Capabilities: ${capabilities.map((capability) => capability.title).join(", ")}`,
            `Allowed actions: ${allowedActions.join(", ")}`,
        ].join("\n"),
    }
}

async function loadStoredAssistantCoreSettings(chatbotId: string): Promise<OmniAssistantCoreSettings> {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return {}
    }

    const snapshot = await adminDb.collection("omni_channel_configs").doc(chatbotId).get()
    const config = snapshot.exists ? snapshot.data() || {} : {}
    return (config.assistantCore || {}) as OmniAssistantCoreSettings
}

function normalizeKnowledgeGovernance(input?: OmniKnowledgeGovernanceSettings | null): OmniKnowledgeGovernanceSettings {
    return {
        sourcePriority:
            Array.isArray(input?.sourcePriority) && input.sourcePriority.length > 0
                ? input.sourcePriority.filter(Boolean)
                : DEFAULT_KNOWLEDGE_GOVERNANCE.sourcePriority,
        staleAfterHours: typeof input?.staleAfterHours === "number" ? input.staleAfterHours : DEFAULT_KNOWLEDGE_GOVERNANCE.staleAfterHours,
        includeFreshnessHints: input?.includeFreshnessHints !== false,
        includeConfidenceHints: input?.includeConfidenceHints !== false,
    }
}

function normalizeCustomerMemory(input?: OmniCustomerMemorySettings | null): OmniCustomerMemorySettings {
    return {
        enabled: input?.enabled !== false,
        maxFacts: typeof input?.maxFacts === "number" ? input.maxFacts : DEFAULT_CUSTOMER_MEMORY.maxFacts,
        storePreferences: input?.storePreferences !== false,
        storeOpenIssues: input?.storeOpenIssues !== false,
        storeConversationSummary: input?.storeConversationSummary !== false,
    }
}

function normalizeAssistantProfiles(input?: OmniAssistantProfile[] | null): OmniAssistantProfile[] {
    const normalized = Array.isArray(input)
        ? input
              .map((profile) => ({
                  id: String(profile?.id || "").trim(),
                  name: String(profile?.name || "").trim(),
                  description: typeof profile?.description === "string" ? profile.description.trim() : "",
                  prompt: typeof profile?.prompt === "string" ? profile.prompt : "",
                  active: profile?.active !== false,
                  channelToneOverrides: profile?.channelToneOverrides || {},
              }))
              .filter((profile) => profile.id && profile.name)
        : []

    return normalized.length > 0 ? normalized : DEFAULT_ASSISTANT_PROFILES
}

function normalizeChannelAssistantProfiles(
    input: Partial<Record<OmniChannel, string>> | null | undefined,
    profiles: OmniAssistantProfile[]
): Partial<Record<OmniChannel, string>> {
    const profileIds = new Set(profiles.map((profile) => profile.id))
    return Object.fromEntries(
        Object.entries(DEFAULT_CHANNEL_ASSISTANT_PROFILES).map(([channel, fallbackId]) => {
            const selected = input?.[channel as OmniChannel]
            return [channel, selected && profileIds.has(selected) ? selected : fallbackId]
        })
    ) as Partial<Record<OmniChannel, string>>
}

function resolveAssistantProfile(
    channel: OmniChannel,
    profiles: OmniAssistantProfile[],
    mapping: Partial<Record<OmniChannel, string>>
) {
    const selectedId = mapping[channel]
    const selectedProfile =
        profiles.find((profile) => profile.id === selectedId && profile.active !== false) ||
        profiles.find((profile) => profile.active !== false) ||
        DEFAULT_ASSISTANT_PROFILES[0]

    return {
        assistantProfileId: selectedProfile?.id || DEFAULT_CHANNEL_ASSISTANT_PROFILES[channel],
        selectedProfile,
    }
}

async function resolveOmniAssistantCoreContext(chatbotId: string, channel: OmniChannel, contactKey?: string | null): Promise<OmniAssistantCoreContext> {
    const settings = await loadStoredAssistantCoreSettings(chatbotId)
    const filteredCapabilities = getConfiguredCapabilitiesForChannel(channel, settings)
    const basePolicy = getChannelPolicy(channel)
    const policy = {
        ...basePolicy,
        ...(settings.channelPolicyOverrides?.[channel] || {}),
    }
    const allowedActions = Array.from(
        new Set(
            (
                Array.isArray(settings.enabledActions) && settings.enabledActions.length > 0
                    ? settings.enabledActions
                    : filteredCapabilities.flatMap((capability) => capability.allowedActions)
            ).filter(Boolean)
        )
    )
    const knowledgeGovernance = normalizeKnowledgeGovernance(settings.knowledgeGovernance)
    const customerMemory = normalizeCustomerMemory(settings.customerMemory)
    const assistantProfiles = normalizeAssistantProfiles(settings.assistantProfiles)
    const channelAssistantProfiles = normalizeChannelAssistantProfiles(settings.channelAssistantProfiles, assistantProfiles)
    const { assistantProfileId, selectedProfile } = resolveAssistantProfile(channel, assistantProfiles, channelAssistantProfiles)
    const adminDb = getAdminDb()
    const memory =
        adminDb && contactKey && customerMemory.enabled
            ? await getOmniContactMemory(adminDb, chatbotId, contactKey, {
                  channel,
              })
            : null
    const memorySummary = customerMemory.enabled ? memory?.summary || null : null

    return {
        channel,
        capabilityIds: filteredCapabilities.map((capability) => capability.id),
        allowedActions,
        policy,
        supportsRichUi: policy.allowRichUi === true && filteredCapabilities.some((capability) => capability.requiresRichUI),
        requiresIdentityForSensitiveData: policy.identityRequiredForSensitiveData === true,
        brandVoicePrompt: settings.brandVoicePrompt || null,
        assistantProfileId,
        knowledgeGovernance,
        customerMemory,
        memorySummary,
        systemInstruction: [
            `Channel: ${channel}`,
            `Response style: ${policy.responseStyle}`,
            `Verbosity: ${policy.maxVerbosity}`,
            `Handoff mode: ${policy.handoffMode}`,
            `Capabilities: ${filteredCapabilities.map((capability) => capability.title).join(", ") || "none"}`,
            `Allowed actions: ${allowedActions.join(", ") || "none"}`,
            `Knowledge priority: ${(knowledgeGovernance.sourcePriority || DEFAULT_KNOWLEDGE_GOVERNANCE.sourcePriority || []).join(" > ")}`,
            `Treat information older than ${knowledgeGovernance.staleAfterHours || 24} hours as potentially stale.`,
            knowledgeGovernance.includeFreshnessHints ? "When relevant, mention freshness if you are relying on uncertain or time-sensitive context." : null,
            knowledgeGovernance.includeConfidenceHints ? "Avoid overstating certainty. If context is incomplete, say so plainly." : null,
            selectedProfile?.name ? `Assistant profile: ${selectedProfile.name}` : null,
            selectedProfile?.description ? `Profile description: ${selectedProfile.description}` : null,
            selectedProfile?.prompt ? `Profile prompt: ${selectedProfile.prompt}` : null,
            selectedProfile?.channelToneOverrides?.[channel] ? `Channel tone override: ${selectedProfile.channelToneOverrides[channel]}` : null,
            memorySummary ? `Customer memory:\n${memorySummary}` : null,
            settings.brandVoicePrompt ? `Brand voice: ${settings.brandVoicePrompt}` : null,
        ]
            .filter(Boolean)
            .join("\n"),
    }
}

export async function generateOmniVoiceTurn(input: VoiceTurnGenerationInput): Promise<VoiceTurnGenerationResult> {
    const context = await resolveOmniAssistantCoreContext(input.chatbotId, "voice", input.contactKey)
    const history = (input.messages || [])
        .slice(-10)
        .map((message) => ({
            role: normalizeMessageRole(message.role),
            content: message.content,
        }))

    const messages: AIMessage[] = [
        {
            role: "system",
            content: [
                context.systemInstruction,
                "Voice-specific rules:",
                "- Keep every answer natural and brief.",
                "- Never use markdown or visual formatting.",
                "- If the customer asks for a human or callback, acknowledge it clearly.",
                "- Repeat critical details when relevant.",
            ].join("\n"),
        },
        ...history,
        {
            role: "user",
            content: input.transcript,
        },
    ]

    const result = await generateAIResponse(
        input.chatbotId,
        messages,
        undefined,
        false,
        undefined,
        true,
        input.language
    )

    const rawResponse = typeof result.content === "string" ? result.content : ""
    const spokenResponse = sanitizeVoiceResponse(rawResponse)
    const shouldOfferCallback = detectVoiceCallbackIntent(input.transcript) || /callback|geri ara|human|representative/i.test(rawResponse)

    return {
        rawResponse,
        spokenResponse,
        shouldOfferCallback,
        assistantProfileId: context.assistantProfileId,
    }
}

export async function generateOmniTextTurn(input: TextTurnGenerationInput): Promise<TextTurnGenerationResult> {
    const context = await resolveOmniAssistantCoreContext(input.chatbotId, input.channel, input.contactKey)
    const history = (input.messages || [])
        .slice(-12)
        .map((message) => ({
            role: normalizeMessageRole(message.role),
            content: message.content,
        }))
    const plainChannelFlowRules = [
        "- If a web flow would normally open [SHOW_BOOKING_FORM], [SHOW_LEAD_FORM], or [SHOW_HANDOFF_FORM], never output those markers here.",
        "- Messaging channels do not support inline forms, so collect the required details directly in chat.",
        "- For appointments, ask for the preferred day and time first, then the name, then the phone or email, and confirm the summary clearly.",
        "- For lead or human handoff requests, ask for the name and phone or email directly in chat and confirm the follow-up step.",
    ]

    const channelSpecificRules =
        input.channel === "instagram"
            ? [
                  "Instagram DM-specific rules:",
                  "- Keep replies concise and conversational.",
                  "- Use plain text only.",
                  "- Do not mention unsupported UI elements or forms.",
                  ...plainChannelFlowRules,
              ]
            : input.channel === "messenger"
              ? [
                    "Messenger-specific rules:",
                    "- Keep replies concise, human, and service-oriented.",
                    "- Use plain text only.",
                    "- Prefer one clear next step per message.",
                    ...plainChannelFlowRules,
                ]
            : input.channel === "whatsapp"
              ? [
                    "WhatsApp-specific rules:",
                    "- Keep replies short and mobile-friendly.",
                    "- Use plain text only.",
                    "- Prefer one clear next step over long explanations.",
                    ...plainChannelFlowRules,
                ]
              : [
                    "Web-specific rules:",
                    "- Keep the answer clear and helpful.",
                    "- Prefer plain text that can be reused across channels.",
                ]

    const messages: AIMessage[] = [
        {
            role: "system",
            content: [
                context.systemInstruction,
                ...channelSpecificRules,
                "General rules:",
                "- If the customer asks for a person or callback, acknowledge it clearly.",
                "- Avoid markdown-heavy formatting.",
                "- Stay grounded in the tenant knowledge base and do not invent facts.",
            ].join("\n"),
        },
        ...history,
        {
            role: "user",
            content: input.transcript,
        },
    ]

    const result = await generateAIResponse(
        input.chatbotId,
        messages,
        undefined,
        false,
        undefined,
        false,
        input.language
    )

    const rawResponse = typeof result.content === "string" ? result.content : ""
    const replyText = sanitizeTextResponse(rawResponse, input.channel, input.language || input.transcript)
    const shouldOfferCallback = detectCallbackIntent(input.transcript) || detectCallbackIntent(rawResponse)

    return {
        rawResponse,
        replyText,
        shouldOfferCallback,
        assistantProfileId: context.assistantProfileId,
    }
}
