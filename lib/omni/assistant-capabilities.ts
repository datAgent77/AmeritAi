import type { AssistantCapability, AssistantCapabilityId, OmniAssistantCoreSettings, OmniChannel } from "@/lib/omni/types"
import { MODULES_REGISTRY, type ModuleId } from "@/lib/modules-registry"

export const OMNI_CHANNELS: OmniChannel[] = ["web", "whatsapp", "instagram", "messenger", "voice"]

export const ASSISTANT_CAPABILITIES: AssistantCapability[] = [
    {
        id: "generalChatbot",
        title: "General Chatbot",
        description: "Shared conversational core used by every channel adapter.",
        supportedChannels: OMNI_CHANNELS,
        defaultEnabledChannels: OMNI_CHANNELS,
        allowedActions: ["answer", "summarize", "handoff_to_human"],
        channelBehaviorOverrides: {
            voice: {
                maxResponseSentences: 3,
                notes: "Keep turns short and confirmation-driven.",
            },
        },
    },
    {
        id: "knowledgeBase",
        title: "Knowledge Base",
        description: "Tenant knowledge base, uploaded documents, FAQs, and policy content.",
        supportedChannels: OMNI_CHANNELS,
        defaultEnabledChannels: OMNI_CHANNELS,
        allowedActions: ["retrieve_knowledge", "cite_policy", "summarize"],
    },
    {
        id: "appointments",
        title: "Appointments",
        description: "Structured booking flows with explicit confirmation for date, time, and contact details.",
        supportedChannels: OMNI_CHANNELS,
        defaultEnabledChannels: ["web", "whatsapp", "instagram", "messenger", "voice"],
        allowedActions: ["create_appointment", "confirm_slot", "check_business_hours", "handoff_to_human"],
        channelBehaviorOverrides: {
            voice: {
                requiresConfirmation: true,
                maxResponseSentences: 2,
                notes: "Repeat date and time back before committing.",
            },
        },
    },
    {
        id: "leadCollection",
        title: "Lead Collection",
        description: "Collects lead details and creates callback tickets when forms are not available.",
        supportedChannels: OMNI_CHANNELS,
        defaultEnabledChannels: ["web", "whatsapp", "instagram", "messenger", "voice"],
        allowedActions: ["create_lead", "create_callback_request"],
        channelBehaviorOverrides: {
            voice: {
                mode: "callback_ticket",
                collectFields: ["name", "phone"],
                disallowRichUi: true,
                handoffMode: "callback_ticket",
                notes: "Prefer concise capture and escalate to callback queue.",
            },
        },
    },
    {
        id: "dynamicContext",
        title: "Dynamic Context",
        description: "Reads CRM or runtime context when the customer identity is trusted.",
        supportedChannels: OMNI_CHANNELS,
        defaultEnabledChannels: ["web", "whatsapp", "instagram", "messenger"],
        requiresIdentity: true,
        allowedActions: ["read_customer_context"],
        channelBehaviorOverrides: {
            voice: {
                requiresConfirmation: true,
                notes: "Only surface sensitive context after explicit identity confirmation.",
            },
        },
    },
    {
        id: "productCatalog",
        title: "Product Catalog / Personal Shopper",
        description: "Structured catalog retrieval with shortlist recommendations.",
        supportedChannels: OMNI_CHANNELS,
        defaultEnabledChannels: ["web", "whatsapp", "instagram", "messenger", "voice"],
        requiresRichUI: true,
        allowedActions: ["search_catalog", "recommend_product", "share_follow_up_link"],
        channelBehaviorOverrides: {
            voice: {
                disallowRichUi: true,
                maxResponseSentences: 3,
                notes: "Voice can recommend a short shortlist, then hand off detail to SMS or WhatsApp.",
            },
        },
    },
    {
        id: "salesOptimization",
        title: "Sales Optimization",
        description: "Adaptive conversion prompts and next-best-action logic.",
        supportedChannels: OMNI_CHANNELS,
        defaultEnabledChannels: ["web", "whatsapp", "instagram", "messenger", "voice"],
        allowedActions: ["qualify_lead", "nudge_conversion", "create_callback_request"],
        channelBehaviorOverrides: {
            voice: {
                maxResponseSentences: 2,
                notes: "Use soft prompts instead of aggressive upsell tactics.",
            },
        },
    },
    {
        id: "digitalWaiter",
        title: "Digital Waiter",
        description: "Restaurant-specific ordering and menu guidance.",
        supportedChannels: ["web", "whatsapp", "voice"],
        defaultEnabledChannels: ["web", "whatsapp"],
        allowedActions: ["browse_menu", "capture_order_intent", "create_callback_request"],
        channelBehaviorOverrides: {
            voice: {
                maxResponseSentences: 2,
                notes: "Only enable for tenants with voice ordering operations.",
            },
        },
    },
    {
        id: "visualDiagnosis",
        title: "Visual Diagnosis",
        description: "Image-based analysis workflows.",
        supportedChannels: ["web", "whatsapp", "instagram", "messenger"],
        defaultEnabledChannels: ["web"],
        requiresRichUI: true,
        allowedActions: ["inspect_image", "ask_for_upload"],
    },
    {
        id: "gamification",
        title: "Gamification",
        description: "Engagement mechanics and reward-driven experiences.",
        supportedChannels: ["web"],
        defaultEnabledChannels: ["web"],
        requiresRichUI: true,
        allowedActions: ["launch_game", "award_points"],
    },
]

const CAPABILITY_IDS = new Set(ASSISTANT_CAPABILITIES.map((capability) => capability.id))

const CAPABILITY_TO_MODULE: Partial<Record<AssistantCapabilityId, ModuleId>> = {
    generalChatbot: "generalChatbot",
    knowledgeBase: "knowledgeBase",
    appointments: "appointments",
    leadCollection: "leadCollection",
    dynamicContext: "dynamicContext",
    productCatalog: "productCatalog",
    salesOptimization: "salesOptimization",
    digitalWaiter: "digitalWaiter",
    visualDiagnosis: "visualDiagnosis",
    gamification: "gamification",
}

export function isCapabilityModuleReady(capabilityId: AssistantCapabilityId): boolean {
    const moduleId = CAPABILITY_TO_MODULE[capabilityId]
    if (!moduleId) return true
    const mod = MODULES_REGISTRY[moduleId]
    return mod ? mod.status === "ready" || mod.status === "beta" : false
}

export function getCapabilitiesForChannel(channel: OmniChannel) {
    return ASSISTANT_CAPABILITIES.filter((capability) => capability.supportedChannels.includes(channel))
}

export function getCapabilityById(id: string) {
    return ASSISTANT_CAPABILITIES.find((capability) => capability.id === id)
}

function normalizeCapabilityIds(ids: unknown): AssistantCapabilityId[] {
    if (!Array.isArray(ids)) return []
    return Array.from(
        new Set(
            ids.filter((id): id is AssistantCapabilityId => typeof id === "string" && CAPABILITY_IDS.has(id as AssistantCapabilityId))
        )
    )
}

export function resolveCapabilityIdsForChannel(
    channel: OmniChannel,
    settings?: Pick<OmniAssistantCoreSettings, "enabledCapabilityIds" | "channelCapabilityOverrides"> | null
) {
    const supportedCapabilities = getCapabilitiesForChannel(channel)
    const supportedIds = new Set(supportedCapabilities.map((capability) => capability.id))
    const hasChannelOverride = Boolean(settings?.channelCapabilityOverrides && Object.prototype.hasOwnProperty.call(settings.channelCapabilityOverrides, channel))

    let resolvedIds: AssistantCapabilityId[]

    if (hasChannelOverride) {
        resolvedIds = normalizeCapabilityIds(settings?.channelCapabilityOverrides?.[channel]).filter((id) => supportedIds.has(id))
    } else {
        const globalIds = normalizeCapabilityIds(settings?.enabledCapabilityIds)
        resolvedIds = globalIds.length > 0
            ? globalIds.filter((id) => supportedIds.has(id))
            : supportedCapabilities.map((capability) => capability.id)
    }

    return resolvedIds.filter((id) => isCapabilityModuleReady(id))
}

export function getConfiguredCapabilitiesForChannel(
    channel: OmniChannel,
    settings?: Pick<OmniAssistantCoreSettings, "enabledCapabilityIds" | "channelCapabilityOverrides"> | null
) {
    const enabledIds = new Set(resolveCapabilityIdsForChannel(channel, settings))
    return getCapabilitiesForChannel(channel).filter((capability) => enabledIds.has(capability.id))
}
