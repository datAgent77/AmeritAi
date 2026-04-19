import type { LucideIcon } from "lucide-react"

export type OmniAppNavGroupId = "build" | "operate" | "govern" | "manage"

export type OmniAppView =
    | "overview"
    | "agents"
    | "agent-detail"
    | "knowledge"
    | "tools"
    | "channels"
    | "channel-web-widget"
    | "channel-whatsapp"
    | "channel-instagram"
    | "channel-voice"
    | "channel-delivery"
    | "conversations"
    | "users"
    | "testing"
    | "experiments"
    | "versioning"
    | "analytics"
    | "settings"
    | "console-bridge"

export interface OmniAppNavItem {
    id: string
    label: string
    href: string
    icon: LucideIcon
    match?: string[]
}

export interface OmniAppNavGroup {
    id: OmniAppNavGroupId
    label: string
    items: OmniAppNavItem[]
}

export interface OmniAppPageDefinition {
    path: string
    title: string
    description: string
    eyebrow: string
    view: OmniAppView
    icon?: LucideIcon
    context?: Record<string, string>
    consoleHref?: string
}

export interface OmniAppWorkspaceSummary {
    id: string
    label: string
    activeAgentCount: number
    conversationCount: number
    readinessScore: number
    enabledChannels: number
    readyChannels: number
    openCallbacks: number
    updatedAt: string | null
}

export interface OmniAppAgentSummary {
    id: string
    name: string
    description: string | null
    status: "primary" | "active" | "inactive"
    channels: string[]
    branchLabel: string
    versionLabel: string
    conversationVolume: number
    outcomeRate: number
    lastActivityAt: string | null
}

export interface OmniAppUserSummary {
    id: string
    displayName: string | null
    primaryIdentity: string | null
    linkedChannels: string[]
    leadCount: number
    appointmentCount: number
    callbackCount: number
    requiresReview: boolean
    lastInteractionAt: string | null
}

export interface OmniAppConversationSummary {
    id: string
    displayName: string | null
    channel: string
    messageCount: number
    lastDisposition: string | null
    assistantProfileId: string | null
    updatedAt: string | null
}

export interface OmniAppTestRun {
    id: string
    channel: string
    action: string
    result: "success" | "blocked" | "error"
    message: string | null
    createdAt: string | null
}

export interface OmniAppExperiment {
    id: string
    name: string
    status: "draft" | "running" | "paused" | "completed"
    controlLabel: string
    candidateLabel: string
    trafficSplit: string
    successDelta: string
    updatedAt: string | null
}

export interface OmniAppAgentBranch {
    id: string
    agentId: string
    name: string
    status: "live" | "candidate" | "draft" | "archived"
    trafficPercent: number
    updatedAt: string | null
}

export interface OmniAppAgentVersion {
    id: string
    branchId: string
    label: string
    state: "live" | "candidate" | "draft" | "archived"
    notes: string[]
    createdAt: string | null
}

export interface OmniAppTrafficDeployment {
    id: string
    branchId: string
    label: string
    trafficPercent: number
    status: "live" | "candidate" | "paused"
}
