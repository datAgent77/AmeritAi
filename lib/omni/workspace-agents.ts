import { ASSISTANT_CAPABILITIES, OMNI_CHANNELS, resolveCapabilityIdsForChannel } from "@/lib/omni/assistant-capabilities"
import { toIsoOrNull, toMillis } from "@/lib/omni/server-utils"
import type {
    AssistantCapabilityId,
    OmniActionId,
    OmniAllowedAction,
    OmniAssistantCoreSettings,
    OmniAssistantProfile,
    OmniChannel,
    OmniOverviewFilters,
    OmniOverviewPayload,
    OmniWorkspaceAgentDetail,
    OmniWorkspaceAgentSummary,
} from "@/lib/omni/types"

interface ChatSessionRecord {
    id: string
    channel?: OmniChannel | string | null
    createdAt?: unknown
    updatedAt?: unknown
    assistantProfileId?: string | null
    messages?: Array<{ createdAt?: unknown }>
}

interface CallbackRecord {
    id: string
    sourceSessionId?: string | null
    sourceChannel?: OmniChannel | string | null
    status?: string | null
    resolutionStatus?: string | null
    createdAt?: unknown
    updatedAt?: unknown
}

interface LeadRecord {
    id: string
    sourceSessionId?: string | null
    status?: string | null
    createdAt?: unknown
    updatedAt?: unknown
}

interface AppointmentRecord {
    id: string
    sourceSessionId?: string | null
    status?: string | null
    createdAt?: unknown
    updatedAt?: unknown
}

const DEFAULT_ASSISTANT_PROFILE: OmniAssistantProfile = {
    id: "omni-default",
    name: "Default",
    description: "Balanced default assistant profile.",
    prompt: "",
    active: true,
    channelToneOverrides: {
        web: "Stay clear, helpful, and reusable across channels.",
        whatsapp: "Keep replies short, direct, and mobile-friendly.",
        instagram: "Keep replies concise, conversational, and informal without losing clarity.",
        voice: "Keep answers concise, natural, and confirm critical details out loud.",
    },
}

const DEFAULT_CHANNEL_ASSIGNMENTS: Record<OmniChannel, string> = {
    web: "omni-default",
    whatsapp: "omni-default",
    instagram: "omni-default",
    voice: "omni-default",
}

const DEFAULT_KNOWLEDGE_GOVERNANCE = {
    sourcePriority: ["policy", "crm", "knowledge_base", "catalog", "fallback"] as Array<
        "policy" | "crm" | "knowledge_base" | "catalog" | "fallback"
    >,
    staleAfterHours: 24,
    includeFreshnessHints: true,
    includeConfidenceHints: true,
}

const DEFAULT_CUSTOMER_MEMORY = {
    enabled: true,
    maxFacts: 5,
    storePreferences: true,
    storeOpenIssues: true,
    storeConversationSummary: true,
}

function normalizeProfiles(input?: OmniAssistantProfile[] | null) {
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

    if (normalized.length === 0) {
        return [DEFAULT_ASSISTANT_PROFILE]
    }

    if (!normalized.some((profile) => profile.id === DEFAULT_ASSISTANT_PROFILE.id)) {
        return [DEFAULT_ASSISTANT_PROFILE, ...normalized]
    }

    return normalized
}

function normalizeChannelAssignments(
    input: Partial<Record<OmniChannel, string>> | null | undefined,
    profiles: OmniAssistantProfile[]
) {
    const profileIds = new Set(profiles.map((profile) => profile.id))
    return Object.fromEntries(
        OMNI_CHANNELS.map((channel) => {
            const selected = input?.[channel]
            return [channel, selected && profileIds.has(selected) ? selected : DEFAULT_CHANNEL_ASSIGNMENTS[channel]]
        })
    ) as Record<OmniChannel, string>
}

function normalizeAssistantCoreSettings(input?: OmniAssistantCoreSettings | null) {
    const assistantProfiles = normalizeProfiles(input?.assistantProfiles)
    return {
        assistantProfiles,
        channelAssistantProfiles: normalizeChannelAssignments(input?.channelAssistantProfiles, assistantProfiles),
        enabledCapabilityIds: input?.enabledCapabilityIds || [],
        channelCapabilityOverrides: input?.channelCapabilityOverrides || {},
        enabledActions: (Array.isArray(input?.enabledActions) ? input?.enabledActions : []) as OmniAllowedAction[],
        brandVoicePrompt: input?.brandVoicePrompt || "",
        knowledgeGovernance: input?.knowledgeGovernance || DEFAULT_KNOWLEDGE_GOVERNANCE,
        customerMemory: input?.customerMemory || DEFAULT_CUSTOMER_MEMORY,
        channelPolicyOverrides: input?.channelPolicyOverrides || {},
    }
}

function getPrimaryAgentId(profiles: OmniAssistantProfile[]) {
    if (profiles.some((profile) => profile.id === DEFAULT_ASSISTANT_PROFILE.id)) {
        return DEFAULT_ASSISTANT_PROFILE.id
    }
    return profiles.find((profile) => profile.active !== false)?.id || profiles[0]?.id || DEFAULT_ASSISTANT_PROFILE.id
}

function getSessionLastActivityAt(session: ChatSessionRecord) {
    const candidates = [
        toMillis(session.updatedAt),
        ...((session.messages || []).map((message) => toMillis(message?.createdAt)).filter((value) => value > 0)),
        toMillis(session.createdAt),
    ]
    const max = Math.max(...candidates, 0)
    return max > 0 ? max : 0
}

function getSessionDurationSeconds(session: ChatSessionRecord) {
    const createdAt = toMillis(session.createdAt)
    const lastActivityAt = getSessionLastActivityAt(session)
    if (!createdAt || !lastActivityAt || lastActivityAt <= createdAt) return 0
    return Math.round((lastActivityAt - createdAt) / 1000)
}

export function resolveSessionAgentId(
    session: Pick<ChatSessionRecord, "assistantProfileId">,
    primaryAgentId: string
) {
    return session.assistantProfileId || primaryAgentId
}

function isOpenCallback(record: CallbackRecord) {
    return record.resolutionStatus !== "completed" && record.status !== "resolved"
}

function isOpenLead(record: LeadRecord) {
    return record.status === "new" || record.status === "contacted" || record.status === "qualified"
}

function isConvertedLead(record: LeadRecord) {
    return record.status === "converted"
}

function isPendingAppointment(record: AppointmentRecord) {
    return record.status === "pending" || record.status === "confirmed"
}

function isCompletedAppointment(record: AppointmentRecord) {
    return record.status === "completed"
}

function uniqueChannels(channels: Array<OmniChannel | null | undefined>) {
    return Array.from(new Set(channels.filter((channel): channel is OmniChannel => Boolean(channel))))
}

export function buildWorkspaceAgentSummaries(params: {
    assistantCore?: OmniAssistantCoreSettings | null
    sessions: ChatSessionRecord[]
    callbacks?: CallbackRecord[]
    leads?: LeadRecord[]
    appointments?: AppointmentRecord[]
}) {
    const settings = normalizeAssistantCoreSettings(params.assistantCore)
    const primaryAgentId = getPrimaryAgentId(settings.assistantProfiles)
    const sessionAgentMap = new Map<string, string>()

    params.sessions.forEach((session) => {
        sessionAgentMap.set(session.id, resolveSessionAgentId(session, primaryAgentId))
    })

    return settings.assistantProfiles.map<OmniWorkspaceAgentSummary>((profile) => {
        const channels = uniqueChannels(
            OMNI_CHANNELS.filter((channel) => settings.channelAssistantProfiles[channel] === profile.id)
        )

        const sessions = params.sessions.filter((session) => sessionAgentMap.get(session.id) === profile.id)
        const openCallbacks = (params.callbacks || []).filter((callback) => sessionAgentMap.get(callback.sourceSessionId || "") === profile.id && isOpenCallback(callback)).length
        const openLeads = (params.leads || []).filter((lead) => sessionAgentMap.get(lead.sourceSessionId || "") === profile.id && isOpenLead(lead)).length
        const pendingAppointments = (params.appointments || []).filter(
            (appointment) => sessionAgentMap.get(appointment.sourceSessionId || "") === profile.id && isPendingAppointment(appointment)
        ).length
        const convertedLeads = (params.leads || []).filter(
            (lead) => sessionAgentMap.get(lead.sourceSessionId || "") === profile.id && isConvertedLead(lead)
        ).length
        const completedAppointments = (params.appointments || []).filter(
            (appointment) => sessionAgentMap.get(appointment.sourceSessionId || "") === profile.id && isCompletedAppointment(appointment)
        ).length
        const durationSamples = sessions.map(getSessionDurationSeconds).filter((value) => value > 0)
        const averageDurationSeconds =
            durationSamples.length > 0 ? Math.round(durationSamples.reduce((sum, value) => sum + value, 0) / durationSamples.length) : 0
        const lastActivityAt = sessions
            .map(getSessionLastActivityAt)
            .sort((left, right) => right - left)[0]

        const capabilityIds = Array.from(
            new Set(
                channels.flatMap((channel) => resolveCapabilityIdsForChannel(channel, settings))
            )
        ) as AssistantCapabilityId[]

        const completedOutcomes = convertedLeads + completedAppointments
        const trackedOutcomes = completedOutcomes + openLeads + pendingAppointments

        return {
            id: profile.id,
            name: profile.name,
            description: profile.description || "",
            prompt: profile.prompt || "",
            active: profile.active !== false,
            status:
                profile.id === primaryAgentId ? "primary" : profile.active !== false ? "active" : "inactive",
            isPrimary: profile.id === primaryAgentId,
            channels,
            capabilityIds,
            conversationVolume: sessions.length,
            openCallbacks,
            openLeads,
            pendingAppointments,
            outcomeRate: trackedOutcomes > 0 ? Math.round((completedOutcomes / trackedOutcomes) * 100) : 0,
            averageDurationSeconds,
            lastActivityAt: lastActivityAt ? new Date(lastActivityAt).toISOString() : null,
        }
    })
}

export function buildWorkspaceAgentDetail(params: {
    assistantCore?: OmniAssistantCoreSettings | null
    sessions: ChatSessionRecord[]
    callbacks?: CallbackRecord[]
    leads?: LeadRecord[]
    appointments?: AppointmentRecord[]
    agentId: string
    voiceIntegration?: {
        enabled?: boolean
        ttsProviderDefault?: string | null
        ttsFallbackProvider?: string | null
        elevenLabsManaged?: boolean
    } | null
    voiceNumbers?: Array<{ routingStatus?: string | null }> | null
}) {
    const settings = normalizeAssistantCoreSettings(params.assistantCore)
    const summaries = buildWorkspaceAgentSummaries({
        assistantCore: params.assistantCore,
        sessions: params.sessions,
        callbacks: params.callbacks,
        leads: params.leads,
        appointments: params.appointments,
    })
    const agent = summaries.find((summary) => summary.id === params.agentId)

    if (!agent) {
        return null
    }

    const profile = settings.assistantProfiles.find((item) => item.id === agent.id) || DEFAULT_ASSISTANT_PROFILE
    const activeVoiceNumbers = (params.voiceNumbers || []).filter((number) => number.routingStatus === "active").length
    const toolDependencies = uniqueChannels(agent.channels)
        .map((channel) => channel === "voice" ? "Voice routing" : channel === "whatsapp" ? "WhatsApp webhook" : channel === "instagram" ? "Instagram webhook" : "Web widget")

    return {
        agent,
        general: {
            brandVoicePrompt: settings.brandVoicePrompt,
            channelAssignments: settings.channelAssistantProfiles,
            toneOverrides: profile.channelToneOverrides || {},
        },
        evaluation: {
            draft: {
                successCriteria: [
                    "Resolve the customer request without unnecessary escalation.",
                    "Stay within the configured channel policy and tone.",
                ],
                failureSignals: [
                    "Conversation stalls without a clear next step.",
                    "High-friction handoff or missing required fields.",
                ],
                reviewerNotes: "Runtime evaluation pipeline is not implemented in phase 1.",
            },
            implemented: false as const,
        },
        dataCollection: {
            draft: {
                enabled: false,
                fields: [
                    {
                        id: "contact_reason",
                        label: "Contact reason",
                        description: "Primary issue or buying intent extracted from the conversation.",
                        required: false,
                    },
                    {
                        id: "handoff_needed",
                        label: "Handoff needed",
                        description: "Flag for whether the conversation needs a human follow-up.",
                        required: false,
                    },
                ],
                destination: "Workspace analytics adapter",
            },
            implemented: false as const,
        },
        audio: {
            voiceEnabled: params.voiceIntegration?.enabled === true,
            activeNumbers: activeVoiceNumbers,
            usesElevenLabs:
                params.voiceIntegration?.ttsProviderDefault === "elevenlabs" || params.voiceIntegration?.elevenLabsManaged === true,
            defaultProvider: params.voiceIntegration?.ttsProviderDefault || null,
            fallbackProvider: params.voiceIntegration?.ttsFallbackProvider || null,
        },
        tools: {
            enabledActions: settings.enabledActions,
            integrationDependencies: toolDependencies,
        },
        llms: {
            mode: "workspace-shared" as const,
            channelAssignments: settings.channelAssistantProfiles,
            notes: [
                "Phase 1 keeps model routing shared at the workspace level.",
                "Per-agent model overrides and experiments are reserved for a later phase.",
            ],
        },
        knowledge: {
            knowledgeGovernance: settings.knowledgeGovernance,
            sharedKnowledgeBase: true as const,
        },
        advanced: {
            customerMemory: settings.customerMemory,
            channelPolicies: settings.channelPolicyOverrides,
            futureSlots: [
                "Version history",
                "Traffic splits",
                "Real-time monitoring hooks",
            ],
        },
    } satisfies OmniWorkspaceAgentDetail
}

function getRangeDays(range: OmniOverviewFilters["range"]) {
    if (range === "90d") return 90
    if (range === "7d") return 7
    return 30
}

function bucketLabelFromDate(date: Date, granularity: OmniOverviewFilters["granularity"]) {
    if (granularity === "week") {
        const weekStart = new Date(date)
        const weekday = weekStart.getUTCDay() || 7
        weekStart.setUTCDate(weekStart.getUTCDate() - weekday + 1)
        weekStart.setUTCHours(0, 0, 0, 0)
        return weekStart.toISOString().slice(0, 10)
    }

    return date.toISOString().slice(0, 10)
}

function formatBucketLabel(bucket: string, granularity: OmniOverviewFilters["granularity"]) {
    if (granularity === "week") {
        return `Week of ${bucket.slice(5)}`
    }
    return bucket.slice(5)
}

export function buildOverviewPayload(params: {
    chatbotId: string
    accountName?: string | null
    assistantCore?: OmniAssistantCoreSettings | null
    sessions: ChatSessionRecord[]
    callbacks?: CallbackRecord[]
    leads?: LeadRecord[]
    appointments?: AppointmentRecord[]
    criticalEvents?: Array<{
        id?: string
        channel: string
        eventType: string
        message?: string | null
        createdAt?: string | null
        result: string
    }>
    channelHealth?: OmniOverviewPayload["channelHealth"]
    filters: OmniOverviewFilters
}) {
    const summaries = buildWorkspaceAgentSummaries({
        assistantCore: params.assistantCore,
        sessions: params.sessions,
        callbacks: params.callbacks,
        leads: params.leads,
        appointments: params.appointments,
    })
    const primaryAgentId = summaries.find((summary) => summary.isPrimary)?.id || summaries[0]?.id || DEFAULT_ASSISTANT_PROFILE.id
    const activeAgentId = params.filters.agentId || null
    const sessionAgentId = new Map<string, string>()
    params.sessions.forEach((session) => {
        sessionAgentId.set(session.id, resolveSessionAgentId(session, primaryAgentId))
    })

    const rangeDays = getRangeDays(params.filters.range)
    const rangeStart = Date.now() - rangeDays * 24 * 60 * 60 * 1000
    const filteredSessions = params.sessions.filter((session) => {
        const activityAt = getSessionLastActivityAt(session)
        if (!activityAt || activityAt < rangeStart) return false
        if (!activeAgentId) return true
        return sessionAgentId.get(session.id) === activeAgentId
    })
    const filteredCallbacks = (params.callbacks || []).filter((callback) => {
        const activityAt = Math.max(toMillis(callback.updatedAt), toMillis(callback.createdAt))
        if (!activityAt || activityAt < rangeStart) return false
        if (!activeAgentId) return true
        return sessionAgentId.get(callback.sourceSessionId || "") === activeAgentId
    })
    const filteredLeads = (params.leads || []).filter((lead) => {
        const activityAt = Math.max(toMillis(lead.updatedAt), toMillis(lead.createdAt))
        if (!activityAt || activityAt < rangeStart) return false
        if (!activeAgentId) return true
        return sessionAgentId.get(lead.sourceSessionId || "") === activeAgentId
    })
    const filteredAppointments = (params.appointments || []).filter((appointment) => {
        const activityAt = Math.max(toMillis(appointment.updatedAt), toMillis(appointment.createdAt))
        if (!activityAt || activityAt < rangeStart) return false
        if (!activeAgentId) return true
        return sessionAgentId.get(appointment.sourceSessionId || "") === activeAgentId
    })

    const durationSamples = filteredSessions.map(getSessionDurationSeconds).filter((value) => value > 0)
    const averageDurationSeconds =
        durationSamples.length > 0 ? Math.round(durationSamples.reduce((sum, value) => sum + value, 0) / durationSamples.length) : 0

    const buckets = new Map<string, { bucket: string; label: string; conversations: number; callbacks: number; leads: number }>()
    filteredSessions.forEach((session) => {
        const activityAt = getSessionLastActivityAt(session)
        if (!activityAt) return
        const bucket = bucketLabelFromDate(new Date(activityAt), params.filters.granularity)
        const current = buckets.get(bucket) || {
            bucket,
            label: formatBucketLabel(bucket, params.filters.granularity),
            conversations: 0,
            callbacks: 0,
            leads: 0,
        }
        current.conversations += 1
        buckets.set(bucket, current)
    })
    filteredCallbacks.forEach((callback) => {
        const activityAt = Math.max(toMillis(callback.updatedAt), toMillis(callback.createdAt))
        if (!activityAt) return
        const bucket = bucketLabelFromDate(new Date(activityAt), params.filters.granularity)
        const current = buckets.get(bucket) || {
            bucket,
            label: formatBucketLabel(bucket, params.filters.granularity),
            conversations: 0,
            callbacks: 0,
            leads: 0,
        }
        current.callbacks += 1
        buckets.set(bucket, current)
    })
    filteredLeads.forEach((lead) => {
        const activityAt = Math.max(toMillis(lead.updatedAt), toMillis(lead.createdAt))
        if (!activityAt) return
        const bucket = bucketLabelFromDate(new Date(activityAt), params.filters.granularity)
        const current = buckets.get(bucket) || {
            bucket,
            label: formatBucketLabel(bucket, params.filters.granularity),
            conversations: 0,
            callbacks: 0,
            leads: 0,
        }
        current.leads += 1
        buckets.set(bucket, current)
    })

    const openCallbacks = filteredCallbacks.filter(isOpenCallback).length
    const openLeads = filteredLeads.filter(isOpenLead).length
    const completedOutcomes =
        filteredLeads.filter(isConvertedLead).length + filteredAppointments.filter(isCompletedAppointment).length
    const trackedOutcomes = completedOutcomes + openLeads + filteredAppointments.filter(isPendingAppointment).length

    return {
        generatedAt: new Date().toISOString(),
        filters: params.filters,
        scope: {
            chatbotId: params.chatbotId,
            accountName: params.accountName || null,
            activeAgentId,
        },
        availableAgents: summaries.map((summary) => ({
            id: summary.id,
            name: summary.name,
            isPrimary: summary.isPrimary,
        })),
        headline: {
            activeConversations: filteredSessions.length,
            conversationCount: filteredSessions.length,
            averageDurationSeconds,
            totalCostUsd: 0,
            averageCostUsd: 0,
            openCallbacks,
            openLeads,
        },
        timeline: Array.from(buckets.values()).sort((left, right) => left.bucket.localeCompare(right.bucket)),
        insights: {
            successRate: trackedOutcomes > 0 ? Math.round((completedOutcomes / trackedOutcomes) * 100) : 0,
            csatScore: null,
            criticalEvents: (params.criticalEvents || []).length,
        },
        channelHealth: params.channelHealth || [],
        criticalEvents: params.criticalEvents || [],
    } satisfies OmniOverviewPayload
}

export function buildAgentCapabilityCatalog() {
    return ASSISTANT_CAPABILITIES.map((capability) => ({
        id: capability.id,
        title: capability.title,
        supportedChannels: capability.supportedChannels,
        allowedActions: capability.allowedActions.filter(
            (action): action is Extract<OmniAllowedAction, OmniActionId> | Exclude<OmniAllowedAction, OmniActionId> => Boolean(action)
        ),
    }))
}
