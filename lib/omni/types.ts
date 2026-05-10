import type { PartnerCapabilities, PartnerLevel, ResolvedPartnerBranding } from "@/lib/management/types"
import type { EvolutionApiChannelConfig } from "@/lib/integrations/evolution-api/types"

export type ProductEntitlementKey = "chatbot" | "omniChannel" | "cookieConsent" | "copywriter" | "leadFinder"

export type ProductEntitlements = Record<ProductEntitlementKey, boolean>

export const DEFAULT_PRODUCT_ENTITLEMENTS: ProductEntitlements = {
    chatbot: false,
    omniChannel: false,
    cookieConsent: false,
    copywriter: false,
    leadFinder: false,
}

export type OmniChannel = "web" | "whatsapp" | "instagram" | "messenger" | "voice"

export type AssistantCapabilityId =
    | "generalChatbot"
    | "knowledgeBase"
    | "appointments"
    | "leadCollection"
    | "dynamicContext"
    | "productCatalog"
    | "salesOptimization"
    | "digitalWaiter"
    | "visualDiagnosis"
    | "gamification"

export interface ChannelBehaviorOverride {
    mode?: string
    maxResponseSentences?: number
    disallowRichUi?: boolean
    requiresConfirmation?: boolean
    handoffMode?: "inline" | "callback_ticket"
    collectFields?: string[]
    notes?: string
}

export interface AssistantCapability {
    id: AssistantCapabilityId
    title: string
    description: string
    supportedChannels: OmniChannel[]
    defaultEnabledChannels: OmniChannel[]
    requiresIdentity?: boolean
    requiresRichUI?: boolean
    allowedActions: OmniAllowedAction[]
    channelBehaviorOverrides?: Partial<Record<OmniChannel, ChannelBehaviorOverride>>
}

export interface ChannelPolicy {
    channel: OmniChannel
    responseStyle: string
    maxVerbosity: "short" | "medium" | "long"
    safeFormatting: string[]
    handoffMode: "inline" | "callback_ticket"
    followUpChannels?: OmniChannel[]
    repeatCriticalFields?: boolean
    allowRichUi?: boolean
    transcriptSummary?: boolean
    identityRequiredForSensitiveData?: boolean
}

export interface OmniAssistantCoreSettings {
    enabledCapabilityIds?: AssistantCapabilityId[]
    channelCapabilityOverrides?: Partial<Record<OmniChannel, AssistantCapabilityId[]>>
    enabledActions?: OmniAllowedAction[]
    brandVoicePrompt?: string | null
    channelPolicyOverrides?: Partial<Record<OmniChannel, Partial<ChannelPolicy>>>
    knowledgeGovernance?: OmniKnowledgeGovernanceSettings
    customerMemory?: OmniCustomerMemorySettings
    assistantProfiles?: OmniAssistantProfile[]
    channelAssistantProfiles?: Partial<Record<OmniChannel, string>>
}

export interface OmniKnowledgeGovernanceSettings {
    sourcePriority?: Array<"policy" | "crm" | "knowledge_base" | "catalog" | "fallback">
    staleAfterHours?: number | null
    includeFreshnessHints?: boolean
    includeConfidenceHints?: boolean
}

export interface OmniCustomerMemorySettings {
    enabled?: boolean
    maxFacts?: number | null
    storePreferences?: boolean
    storeOpenIssues?: boolean
    storeConversationSummary?: boolean
}

export interface OmniAssistantProfile {
    id: string
    name: string
    description?: string | null
    prompt?: string | null
    active?: boolean
    channelToneOverrides?: Partial<Record<OmniChannel, string>>
}

export type OmniWorkspaceAgentStatus = "primary" | "active" | "inactive"

export interface OmniWorkspaceAgentSummary {
    id: string
    name: string
    description?: string | null
    prompt?: string | null
    active: boolean
    status: OmniWorkspaceAgentStatus
    isPrimary: boolean
    channels: OmniChannel[]
    capabilityIds: AssistantCapabilityId[]
    conversationVolume: number
    openCallbacks: number
    openLeads: number
    pendingAppointments: number
    outcomeRate: number
    averageDurationSeconds: number
    lastActivityAt?: string | null
}

export interface OmniAgentAnalysisDraft {
    successCriteria: string[]
    failureSignals: string[]
    reviewerNotes?: string | null
}

export interface OmniAgentDataCollectionDraft {
    enabled: boolean
    fields: Array<{
        id: string
        label: string
        description?: string | null
        required?: boolean
    }>
    destination?: string | null
}

export interface OmniWorkspaceAgentDetail {
    agent: OmniWorkspaceAgentSummary
    general: {
        brandVoicePrompt?: string | null
        channelAssignments: Partial<Record<OmniChannel, string>>
        toneOverrides: Partial<Record<OmniChannel, string>>
    }
    evaluation: {
        draft: OmniAgentAnalysisDraft
        implemented: false
    }
    dataCollection: {
        draft: OmniAgentDataCollectionDraft
        implemented: false
    }
    audio: {
        voiceEnabled: boolean
        activeNumbers: number
        usesElevenLabs: boolean
        defaultProvider?: string | null
        fallbackProvider?: string | null
    }
    tools: {
        enabledActions: OmniAllowedAction[]
        integrationDependencies: string[]
    }
    llms: {
        mode: "workspace-shared"
        channelAssignments: Partial<Record<OmniChannel, string>>
        notes: string[]
    }
    knowledge: {
        knowledgeGovernance: OmniKnowledgeGovernanceSettings
        sharedKnowledgeBase: true
    }
    advanced: {
        customerMemory: OmniCustomerMemorySettings
        channelPolicies: Partial<Record<OmniChannel, Partial<ChannelPolicy>>>
        futureSlots: string[]
    }
}

export interface OmniOverviewFilters {
    range: "7d" | "30d" | "90d"
    granularity: "day" | "week"
    agentId?: string | null
}

export interface OmniOverviewPayload {
    generatedAt: string
    filters: OmniOverviewFilters
    scope: {
        chatbotId: string
        accountName?: string | null
        activeAgentId?: string | null
    }
    availableAgents: Array<{
        id: string
        name: string
        isPrimary: boolean
    }>
    headline: {
        activeConversations: number
        conversationCount: number
        averageDurationSeconds: number
        totalCostUsd: number
        averageCostUsd: number
        openCallbacks: number
        openLeads: number
    }
    timeline: Array<{
        bucket: string
        label: string
        conversations: number
        callbacks: number
        leads: number
    }>
    insights: {
        successRate: number
        csatScore?: number | null
        criticalEvents: number
    }
    channelHealth: Array<{
        channel: OmniChannel
        enabled: boolean
        ready: boolean
        blockers: string[]
    }>
    criticalEvents: Array<{
        id?: string
        channel: string
        eventType: string
        message?: string | null
        createdAt?: string | null
        result: string
    }>
}

export interface OmniDirectoryAccountRecord {
    id: string
    email?: string | null
    companyName?: string | null
    firstName?: string | null
    lastName?: string | null
    phone?: string | null
    industry?: string | null
    partnerId?: string | null
    partnerName?: string | null
    agencyId?: string | null
    agencyName?: string | null
    partnerLevel?: PartnerLevel | null
    partnerLogoUrl?: string | null
    isActive: boolean
    isArchived: boolean
    omniEnabled: boolean
    createdAt?: string | null
    planId?: string | null
    subscriptionStatus?: string | null
    subscriptionBillingPeriod?: string | null
}

export interface OmniDirectoryAgencyRecord {
    id: string
    email?: string | null
    partnerName?: string | null
    agencyName?: string | null
    firstName?: string | null
    lastName?: string | null
    phone?: string | null
    isActive: boolean
    isArchived: boolean
    omniEnabledAccounts: number
    customerCount: number
    createdAt?: string | null
    partnerLevel: PartnerLevel
    partnerLogoUrl?: string | null
    capabilities?: PartnerCapabilities
}

export interface OmniViewerManagementMeta {
    canSwitchAccounts: boolean
    viewerCapabilities?: PartnerCapabilities | null
    resolvedPartnerBranding?: ResolvedPartnerBranding
}

export interface OmniContactMemoryRecord {
    id?: string
    chatbotId: string
    contactKey: string
    canonicalContactId?: string | null
    displayName?: string | null
    preferredLanguage?: string | null
    summary?: string | null
    preferences?: string[]
    openIssues?: string[]
    recentTopics?: string[]
    lastChannel?: OmniChannel | null
    lastDisposition?: string | null
    sourceSessionIds?: string[]
    createdAt?: string | null
    updatedAt?: string | null
    lastInteractionAt?: string | null
}

export interface OmniChatSessionExtensions {
    channel?: OmniChannel
    contactKey?: string | null
    canonicalContactId?: string | null
    channelMeta?: Record<string, unknown> | null
    handoffStatus?: string | null
    transcriptSummary?: string | null
    lastDisposition?: string | null
    assistantProfileId?: string | null
}

export type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "completed"

export interface OmniAppointmentSettings {
    workingDays: string[]
    workingHoursStart: string
    workingHoursEnd: string
    appointmentDuration: number
    googleCalendarConnected: boolean
    outlookCalendarConnected: boolean
}

export interface OmniAppointmentRecord {
    id?: string
    chatbotId: string
    customerName: string
    customerEmail: string
    customerPhone: string
    date: string
    time: string
    type?: string | null
    status: AppointmentStatus
    source?: "chatbot" | "google" | "outlook" | "manual" | "omni" | null
    sourceChannel?: OmniChannel | null
    sourceSessionId?: string | null
    sessionId?: string | null
    contactKey?: string | null
    canonicalContactId?: string | null
    assignedTo?: string | null
    notes?: string | null
    createdAt?: string | null
    updatedAt?: string | null
    confirmedAt?: string | null
}

export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "archived"

export interface OmniLeadRecord {
    id?: string
    chatbotId: string
    name: string
    email?: string | null
    phone?: string | null
    source?: string | null
    status?: LeadStatus
    sourceChannel?: OmniChannel | null
    sourceSessionId?: string | null
    contactKey?: string | null
    canonicalContactId?: string | null
    assignedTo?: string | null
    notes?: string | null
    customFields?: Record<string, unknown>
    createdAt?: string | null
    updatedAt?: string | null
}

export type OmniActionId =
    | "create_callback_request"
    | "create_appointment"
    | "create_lead"
    | "check_business_hours"
    | "handoff_to_human"
    | "call_staff"
    | "request_bill"

/** Prompt-level action hints used in AI system instructions. Not executable via executeOmniAction. */
export type OmniPromptActionHint =
    | "answer"
    | "summarize"
    | "retrieve_knowledge"
    | "cite_policy"
    | "search_catalog"
    | "recommend_product"
    | "share_follow_up_link"
    | "qualify_lead"
    | "nudge_conversion"
    | "browse_menu"
    | "capture_order_intent"
    | "inspect_image"
    | "ask_for_upload"
    | "launch_game"
    | "award_points"
    | "read_customer_context"
    | "confirm_slot"

export type OmniAllowedAction = OmniActionId | OmniPromptActionHint

export interface OmniActionExecutionRequest {
    chatbotId: string
    actionId: OmniActionId
    sourceChannel?: OmniChannel | null
    sourceSessionId?: string | null
    contactKey?: string | null
    canonicalContactId?: string | null
    payload?: Record<string, any>
}

export interface OmniActionExecutionResult {
    actionId: OmniActionId
    recordType: "callback" | "appointment" | "lead" | "business_hours" | "waiter_request"
    record: unknown
    message?: string
}

export interface OmniOperationsSettings {
    workspaceLabel?: string | null
    defaultAssignee?: string | null
    callbackAssignee?: string | null
    appointmentAssignee?: string | null
    leadAssignee?: string | null
    escalationEmail?: string | null
    escalationPhone?: string | null
    callbackSlaHours?: number | null
    reviewMode?: "assistant" | "human_review"
    notes?: string | null
    teamMembers?: OmniTeamMember[]
}

export interface OmniTeamMember {
    id: string
    name: string
    email?: string | null
    role?: "sales" | "support" | "operations" | "manager"
    active?: boolean
}

export type OmniProvisioningTaskStatus = "todo" | "in_progress" | "blocked" | "done"

export interface OmniProvisioningTask {
    id: string
    channel: Extract<OmniProviderChannel, "voice" | "whatsapp" | "instagram" | "messenger">
    label: string
    status: OmniProvisioningTaskStatus
    owner?: string | null
    notes?: string | null
    updatedAt?: string | null
}

export type OmniProviderChannel = "whatsapp" | "instagram" | "messenger" | "voice" | "telegram"
export type OmniDeliveryStatus = "success" | "failed"
export type OmniDeliveryDirection = "outbound" | "inbound"
export type OmniDeliveryErrorClass = "config" | "auth" | "rate_limit" | "provider" | "network" | "unknown"
export type OmniDeliveryRetryMode = "none" | "manual" | "auto"
export type OmniDeliveryRetryState = "none" | "pending" | "processing" | "retried" | "exhausted"
export type OmniSmokeRunChannel = Extract<OmniProviderChannel, "voice" | "whatsapp" | "instagram" | "messenger">
export type OmniSmokeRunAction = "health_check" | "test_message" | "test_call" | "test_call_status"
export type OmniSmokeRunResult = "success" | "error" | "blocked"

export interface OmniDeliveryAttemptRecord {
    id?: string
    chatbotId: string
    channel: OmniProviderChannel
    provider: string
    direction: OmniDeliveryDirection
    source: string
    status: OmniDeliveryStatus
    sessionId?: string | null
    callbackId?: string | null
    destination?: string | null
    payloadText?: string | null
    providerMessageId?: string | null
    providerTargetId?: string | null
    voiceNumberId?: string | null
    retryEligible?: boolean
    retryOfAttemptId?: string | null
    attemptNumber?: number
    errorClass?: OmniDeliveryErrorClass | null
    errorMessage?: string | null
    retryMode?: OmniDeliveryRetryMode
    retryState?: OmniDeliveryRetryState
    nextRetryAt?: string | null
    lastRetryAt?: string | null
    maxRetryAttempts?: number
    metadata?: Record<string, unknown>
    createdAt?: string | null
}

export interface OmniSmokeRunRecord {
    id?: string
    chatbotId: string
    channel: OmniSmokeRunChannel
    provider: string
    action: OmniSmokeRunAction
    result: OmniSmokeRunResult
    source: string
    message?: string | null
    target?: string | null
    metadata?: Record<string, unknown>
    createdAt?: string | null
}

export interface OmniMigrationSnapshotConfig {
    whatsapp?: Record<string, unknown>
    assistantCore?: Partial<OmniAssistantCoreSettings> | Record<string, unknown>
    operations?: Partial<OmniOperationsSettings> | Record<string, unknown>
    migration?: Record<string, unknown>
}

export interface OmniMigrationSnapshotRecord {
    id?: string
    chatbotId: string
    source: string
    action: string
    applied: string[]
    config: OmniMigrationSnapshotConfig
    createdAt?: string | null
    restoredAt?: string | null
    restoreCount?: number
    lastRestoreBy?: string | null
}

export interface ContactGraphRecord {
    id?: string
    chatbotId: string
    canonicalContactId?: string | null
    displayName?: string | null
    verifiedPhone?: string | null
    whatsappNumber?: string | null
    email?: string | null
    instagramHandle?: string | null
    linkedChannels: OmniChannel[]
    contactKey?: string | null
    matchingStrategy?: "verified_phone" | "whatsapp_number" | "email" | "channel_handle"
    notes?: string | null
    manualMergeReview?: boolean
    mergedInto?: string | null
    linkedContactIds?: string[]
    linkedContactKeys?: string[]
    createdAt?: string | null
    updatedAt?: string | null
    lastInteractionAt?: string | null
}

export interface ContactAliasRecord {
    id?: string
    chatbotId: string
    aliasType: string
    aliasValue: string
    canonicalContactId: string
    sourceChannel?: OmniChannel | null
    verified?: boolean
    createdAt?: string | null
    updatedAt?: string | null
}

export type CallbackTriggerSource = "user_request" | "assistant_trigger"
export type CallbackPriority = "low" | "normal" | "high"
export type CallbackRequestStatus = "pending" | "scheduled" | "in_progress" | "completed" | "cancelled" | "resolved"
export type CallbackResolutionStatus = "open" | "waiting" | "completed" | "resolved" | "failed"

export interface CallbackRequestRecord {
    id?: string
    chatbotId: string
    contactKey?: string | null
    canonicalContactId?: string | null
    displayName?: string | null
    owner?: string | null
    priority: CallbackPriority
    status: CallbackRequestStatus
    dueAt?: string | null
    sourceSessionId?: string | null
    sourceChannel: OmniChannel
    resolutionStatus: CallbackResolutionStatus
    notes?: string | null
    voiceNumberId?: string | null
    activeCallSid?: string | null
    lastAttemptAt?: string | null
    createdAt?: string | null
    updatedAt?: string | null
    triggerSource?: CallbackTriggerSource | null
    notificationEmail?: string | null
    emailNotifiedAt?: string | null
    inAppNotifiedAt?: string | null
}

export type VoiceRoutingStatus = "draft" | "active" | "paused"
export type VoiceCarrierProvider = "verimor" | "turk_telekom" | "vodafone_business" | "other"
export type VoiceRoutingMode = "twilio_direct" | "twilio_byoc"
export type VoiceTtsProvider = "twilio" | "elevenlabs"
export type VoiceCallControlProvider = "twilio"

export interface VoiceNumberRecord {
    id?: string
    chatbotId: string
    phoneNumber: string
    carrierProvider?: VoiceCarrierProvider
    carrierLabel?: string | null
    carrierRouteRef?: string | null
    routingMode?: VoiceRoutingMode
    providerNumberId?: string | null
    twilioNumberSid?: string | null
    defaultLocale?: string | null
    ttsVoice?: string | null
    ttsProvider?: VoiceTtsProvider
    twilioFallbackVoice?: string | null
    elevenLabsVoiceId?: string | null
    elevenLabsModelId?: string | null
    byocTrunkSidOverride?: string | null
    routingStatus: VoiceRoutingStatus
    businessHours?: string | null
    callbackEnabled?: boolean
    greetingMessage?: string | null
    fallbackChannel?: Extract<OmniChannel, "voice" | "whatsapp"> | null
    createdAt?: string | null
    updatedAt?: string | null
}

export interface VoiceChannelHealth {
    inboundWebhook: string
    turnWebhook: string
    statusWebhook: string
    transcriptRetention: string
    callbackMode: string
    enabled?: boolean
    activeNumbers: number
    outboundReady: boolean
    carrierConfigured?: boolean
    callControlConfigured?: boolean
    renderingConfigured?: boolean
    defaultRoutingMode?: VoiceRoutingMode
    callControlProvider?: VoiceCallControlProvider
    ttsProviderDefault?: VoiceTtsProvider
    ttsFallbackProvider?: "twilio"
}

export interface VoiceIntegrationConfig {
    enabled?: boolean
    callControlProvider?: VoiceCallControlProvider
    accountSid?: string | null
    authToken?: string | null
    defaultByocTrunkSid?: string | null
    elevenLabsManaged?: boolean
    elevenLabsApiKeyRef?: string | null
    ttsProviderDefault?: VoiceTtsProvider
    ttsFallbackProvider?: "twilio"
}

export interface WebChannelConfig {
    enabled: boolean
}

export type MetaConsoleChannelState =
    | "not_started"
    | "checking"
    | "needs_user_action"
    | "pending_verification"
    | "connected"
    | "degraded"
    | "reauth_required"
    | "failed"

export interface InstagramDMPreflightResult {
    checkedAt: string | null
    hasFacebookPage: boolean | null
    instagramLinkedToPage: boolean | null
    instagramIsProfessional: boolean | null
    messageAccessEnabled: boolean | null
    tokenPresent: boolean | null
    webhookActive: boolean | null
    overallOk: boolean
    failureReason: string | null
}

export interface InstagramDMChannelConfig {
    state: MetaConsoleChannelState
    preflightResult: InstagramDMPreflightResult | null
    pageId: string | null
    pageName: string | null
    instagramAccountId: string | null
    instagramUsername: string | null
    accessTokenRef: string | null
    tokenExpiresAt: string | null
    webhookStatus: "connected" | "pending" | "disconnected"
    lastConnectedAt: string | null
    lastTestedAt: string | null
    wizardStep: number
}

export interface WhatsAppBizPreflightResult {
    checkedAt: string | null
    embeddedSignupCompleted: boolean | null
    wabaPresent: boolean | null
    phoneNumberVerified: boolean | null
    tokenPresent: boolean | null
    webhookActive: boolean | null
    overallOk: boolean
    failureReason: string | null
}

export interface WhatsAppBizChannelConfig {
    state: MetaConsoleChannelState
    preflightResult: WhatsAppBizPreflightResult | null
    wabaId: string | null
    phoneNumberId: string | null
    displayNumber: string | null
    accessTokenRef: string | null
    tokenExpiresAt: string | null
    webhookStatus: "connected" | "pending" | "disconnected"
    lastConnectedAt: string | null
    lastTestedAt: string | null
    wizardStep: number
}

export interface MessengerDMPreflightResult {
    checkedAt: string | null
    hasFacebookPage: boolean | null
    pageIsMessagingEligible: boolean | null
    tokenPresent: boolean | null
    webhookActive: boolean | null
    overallOk: boolean
    failureReason: string | null
}

export interface MessengerDMChannelConfig {
    state: MetaConsoleChannelState
    preflightResult: MessengerDMPreflightResult | null
    pageId: string | null
    pageName: string | null
    accessTokenRef: string | null
    tokenExpiresAt: string | null
    webhookStatus: "connected" | "pending" | "disconnected"
    lastConnectedAt: string | null
    lastTestedAt: string | null
    wizardStep: number
}

export interface InstagramChannelConfig {
    enabled: boolean
    accountId?: string | null
    pageId?: string | null
    appId?: string | null
    appSecretRef?: string | null
    accessTokenRef?: string | null
    verifyToken?: string | null
    webhookStatus?: "connected" | "pending" | "disconnected"
    responseWindow?: string | null
    defaultReplyMode?: "assistant" | "human_review"
    setupStatus?: "not_started" | "draft" | "ready_for_live" | "live" | "error"
    setupStage?: "prerequisites" | "token" | "discovery" | "draft" | "go_live" | "live"
    connectionMode?: "tenant_meta_app" | "platform_meta_app" | "evolution_api_qr"
    lastHealthCheckAt?: string | null
    lastSetupError?: string | null
}

export interface MessengerChannelConfig {
    enabled: boolean
    pageId?: string | null
    appId?: string | null
    appSecretRef?: string | null
    accessTokenRef?: string | null
    verifyToken?: string | null
    webhookStatus?: "connected" | "pending" | "disconnected"
    defaultReplyMode?: "assistant" | "human_review"
    setupStatus?: "not_started" | "draft" | "ready_for_live" | "live" | "error"
    setupStage?: "prerequisites" | "token" | "discovery" | "draft" | "go_live" | "live"
    connectionMode?: "tenant_meta_app" | "platform_meta_app" | "evolution_api_qr"
    lastHealthCheckAt?: string | null
    lastSetupError?: string | null
}

export interface WhatsAppChannelConfig {
    enabled: boolean
    businessAccountId?: string | null
    phoneNumberId?: string | null
    displayNumber?: string | null
    appSecretRef?: string | null
    accessTokenRef?: string | null
    verifyToken?: string | null
    templateNamespace?: string | null
    webhookStatus?: "connected" | "pending" | "disconnected"
    defaultReplyMode?: "assistant" | "human_review"
    setupStatus?: "not_started" | "draft" | "ready_for_live" | "live" | "error"
    setupStage?: "prerequisites" | "token" | "discovery" | "draft" | "go_live" | "live"
    connectionMode?: "tenant_meta_app" | "platform_meta_app" | "evolution_api_qr"
    lastHealthCheckAt?: string | null
    lastSetupError?: string | null
}

export interface OmniChannelConfigDocument {
    chatbotId?: string
    web?: WebChannelConfig
    instagram?: InstagramChannelConfig
    messenger?: MessengerChannelConfig
    whatsapp?: WhatsAppChannelConfig
    instagramDM?: InstagramDMChannelConfig
    whatsappBusiness?: WhatsAppBizChannelConfig
    messengerDM?: MessengerDMChannelConfig
    evolutionApi?: EvolutionApiChannelConfig
    voiceIntegration?: VoiceIntegrationConfig
    assistantCore?: Partial<OmniAssistantCoreSettings> | Record<string, unknown>
    metaSetup?: Record<string, unknown>
    updatedAt?: string | Date | null
    [key: string]: unknown
}
