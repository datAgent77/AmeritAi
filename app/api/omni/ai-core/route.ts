import { NextResponse } from "next/server"
import { ASSISTANT_CAPABILITIES, OMNI_CHANNELS } from "@/lib/omni/assistant-capabilities"
import { DEFAULT_CHANNEL_POLICIES } from "@/lib/omni/channel-policies"
import {
    authorizeOmniRequest,
    authorizedForOmniPermission,
    getOmniChannelConfig,
    jsonError,
    mergeOmniChannelConfig,
} from "@/lib/omni/server-utils"
import type {
    AssistantCapabilityId,
    OmniAssistantCoreSettings,
    OmniAssistantProfile,
    OmniChannel,
    OmniCustomerMemorySettings,
    OmniKnowledgeGovernanceSettings,
} from "@/lib/omni/types"

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
            web: "Stay clear, helpful, and reusable across channels.",
        },
    },
]

const DEFAULT_CHANNEL_ASSISTANT_PROFILES: Record<OmniChannel, string> = {
    web: "omni-default",
    whatsapp: "omni-default",
    instagram: "omni-default",
    voice: "omni-default",
}

const CAPABILITY_IDS = new Set(ASSISTANT_CAPABILITIES.map((capability) => capability.id))

function buildActionCatalog() {
    return Array.from(new Set(ASSISTANT_CAPABILITIES.flatMap((capability) => capability.allowedActions))).sort()
}

function normalizeCapabilityIdList(input: unknown): AssistantCapabilityId[] | undefined {
    if (!Array.isArray(input)) return undefined

    const normalized = Array.from(
        new Set(input.filter((id): id is AssistantCapabilityId => typeof id === "string" && CAPABILITY_IDS.has(id as AssistantCapabilityId)))
    )

    return normalized
}

function normalizeChannelCapabilityOverrides(
    input: Partial<Record<OmniChannel, AssistantCapabilityId[]>> | null | undefined
): Partial<Record<OmniChannel, AssistantCapabilityId[]>> | undefined {
    if (!input || typeof input !== "object") return undefined

    const normalizedEntries = OMNI_CHANNELS.flatMap((channel) => {
        if (!Object.prototype.hasOwnProperty.call(input, channel)) return []
        return [[channel, normalizeCapabilityIdList(input[channel]) || []] as const]
    })

    if (normalizedEntries.length === 0) return undefined
    return Object.fromEntries(normalizedEntries) as Partial<Record<OmniChannel, AssistantCapabilityId[]>>
}

function normalizeKnowledgeGovernance(input: OmniKnowledgeGovernanceSettings | null | undefined): OmniKnowledgeGovernanceSettings {
    return {
        sourcePriority:
            Array.isArray(input?.sourcePriority) && input.sourcePriority.length > 0
                ? input.sourcePriority.filter(Boolean)
                : DEFAULT_KNOWLEDGE_GOVERNANCE.sourcePriority,
        staleAfterHours: typeof input?.staleAfterHours === "number" ? Math.max(1, Math.min(input.staleAfterHours, 168)) : DEFAULT_KNOWLEDGE_GOVERNANCE.staleAfterHours,
        includeFreshnessHints: input?.includeFreshnessHints !== false,
        includeConfidenceHints: input?.includeConfidenceHints !== false,
    }
}

function normalizeCustomerMemory(input: OmniCustomerMemorySettings | null | undefined): OmniCustomerMemorySettings {
    return {
        enabled: input?.enabled !== false,
        maxFacts: typeof input?.maxFacts === "number" ? Math.max(1, Math.min(input.maxFacts, 10)) : DEFAULT_CUSTOMER_MEMORY.maxFacts,
        storePreferences: input?.storePreferences !== false,
        storeOpenIssues: input?.storeOpenIssues !== false,
        storeConversationSummary: input?.storeConversationSummary !== false,
    }
}

function normalizeAssistantProfiles(input: OmniAssistantProfile[] | null | undefined): OmniAssistantProfile[] {
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

function normalizeSettings(input: Partial<OmniAssistantCoreSettings> | null | undefined): OmniAssistantCoreSettings {
    const assistantProfiles = normalizeAssistantProfiles(input?.assistantProfiles)
    return {
        enabledCapabilityIds: normalizeCapabilityIdList(input?.enabledCapabilityIds),
        channelCapabilityOverrides: normalizeChannelCapabilityOverrides(input?.channelCapabilityOverrides),
        enabledActions: Array.isArray(input?.enabledActions) ? input?.enabledActions : undefined,
        brandVoicePrompt: typeof input?.brandVoicePrompt === "string" ? input.brandVoicePrompt : "",
        channelPolicyOverrides: input?.channelPolicyOverrides || {},
        knowledgeGovernance: normalizeKnowledgeGovernance(input?.knowledgeGovernance),
        customerMemory: normalizeCustomerMemory(input?.customerMemory),
        assistantProfiles,
        channelAssistantProfiles: normalizeChannelAssistantProfiles(input?.channelAssistantProfiles, assistantProfiles),
    }
}

function normalizePartialSettings(
    input: Partial<OmniAssistantCoreSettings> | null | undefined,
    currentProfiles: OmniAssistantProfile[]
): Partial<OmniAssistantCoreSettings> {
    if (!input) return {}

    const next: Partial<OmniAssistantCoreSettings> = {}

    if ("enabledCapabilityIds" in input) {
        next.enabledCapabilityIds = normalizeCapabilityIdList(input.enabledCapabilityIds)
    }

    if ("channelCapabilityOverrides" in input) {
        next.channelCapabilityOverrides = normalizeChannelCapabilityOverrides(input.channelCapabilityOverrides)
    }

    if ("enabledActions" in input) {
        next.enabledActions = Array.isArray(input.enabledActions) ? input.enabledActions : undefined
    }

    if ("brandVoicePrompt" in input) {
        next.brandVoicePrompt = typeof input.brandVoicePrompt === "string" ? input.brandVoicePrompt : ""
    }

    if ("channelPolicyOverrides" in input) {
        next.channelPolicyOverrides = input.channelPolicyOverrides || {}
    }

    if ("knowledgeGovernance" in input) {
        next.knowledgeGovernance = normalizeKnowledgeGovernance(input.knowledgeGovernance)
    }

    if ("customerMemory" in input) {
        next.customerMemory = normalizeCustomerMemory(input.customerMemory)
    }

    const effectiveProfiles = "assistantProfiles" in input ? normalizeAssistantProfiles(input.assistantProfiles) : currentProfiles

    if ("assistantProfiles" in input) {
        next.assistantProfiles = effectiveProfiles
    }

    if ("channelAssistantProfiles" in input || "assistantProfiles" in input) {
        next.channelAssistantProfiles = normalizeChannelAssistantProfiles(input.channelAssistantProfiles, effectiveProfiles)
    }

    return next
}

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const chatbotId = searchParams.get("chatbotId")

    if (!chatbotId) {
        return jsonError("chatbotId is required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "aiCore.view")) {
        return jsonError("Forbidden", 403)
    }

    const config = await getOmniChannelConfig(authz.adminDb, chatbotId)
    const settings = normalizeSettings(config.assistantCore)

    return NextResponse.json({
        assistantCore: settings,
        defaults: {
            capabilities: ASSISTANT_CAPABILITIES,
            channelPolicies: DEFAULT_CHANNEL_POLICIES,
            actions: buildActionCatalog(),
        },
    })
}

export async function POST(req: Request) {
    const body = await req.json()
    const chatbotId = body.chatbotId

    if (!chatbotId) {
        return jsonError("chatbotId is required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "aiCore.manage")) {
        return jsonError("Forbidden", 403)
    }

    const currentConfig = await getOmniChannelConfig(authz.adminDb, chatbotId)
    const currentSettings = normalizeSettings(currentConfig.assistantCore)
    const partialSettings = normalizePartialSettings(body.assistantCore, currentSettings.assistantProfiles || DEFAULT_ASSISTANT_PROFILES)
    const nextSettings = {
        ...currentSettings,
        ...partialSettings,
        channelCapabilityOverrides: {
            ...(currentSettings.channelCapabilityOverrides || {}),
            ...(partialSettings.channelCapabilityOverrides || {}),
        },
        channelPolicyOverrides: {
            ...(currentSettings.channelPolicyOverrides || {}),
            ...((partialSettings.channelPolicyOverrides || {}) as Record<string, unknown>),
        },
    }

    const merged = await mergeOmniChannelConfig(authz.adminDb, chatbotId, {
        assistantCore: nextSettings,
    })

    return NextResponse.json({
        ok: true,
        assistantCore: normalizeSettings(merged.assistantCore),
        defaults: {
            capabilities: ASSISTANT_CAPABILITIES,
            channelPolicies: DEFAULT_CHANNEL_POLICIES,
            actions: buildActionCatalog(),
        },
    })
}
