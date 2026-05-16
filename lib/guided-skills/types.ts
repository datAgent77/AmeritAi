export type GuidedSkillChannel = "web" | "whatsapp" | "instagram"

export type GuidedSkillActionId =
    | "create_callback_request"
    | "create_appointment"
    | "create_lead"
    | "check_business_hours"
    | "handoff_to_human"
    | "call_staff"
    | "request_bill"

export type GuidedSkillStepPresentation = "chips" | "cards"

export interface GuidedSkillOption {
    id: string
    label: string
    aliases: string[]
    nextStepId?: string | null
    selectionValue?: string | null
    payloadPatch?: Record<string, unknown>
}

export interface GuidedSkillCard {
    optionId: string
    title: string
    description?: string | null
    badge?: string | null
    metadata?: string | null
    imageUrl?: string | null
}

export interface GuidedSkillSubmitConfirmOnly {
    mode: "confirm_only"
    label: string
    successMessage: string
    externalUrl?: string | null
}

export interface GuidedSkillSubmitOmniAction {
    mode: "omni_action"
    label: string
    actionId: GuidedSkillActionId
    successMessage: string
    externalUrl?: string | null
}

export type GuidedSkillSubmit = GuidedSkillSubmitConfirmOnly | GuidedSkillSubmitOmniAction

export interface GuidedSkillStep {
    id: string
    prompt: string
    presentation: GuidedSkillStepPresentation
    options: GuidedSkillOption[]
    cards?: GuidedSkillCard[]
    submit?: GuidedSkillSubmit | null
    cancelLabel?: string | null
}

export interface GuidedSkillRecord {
    id: string
    chatbotId: string
    title: string
    description?: string | null
    enabled: boolean
    channels: GuidedSkillChannel[]
    startStepId: string
    startAliases: string[]
    steps: GuidedSkillStep[]
    createdAt?: string | null
    updatedAt?: string | null
}

export interface GuidedSkillSelectionState {
    stepId: string
    optionId: string
    label: string
    selectionValue?: string | null
    payloadPatch?: Record<string, unknown>
    selectedAt?: string | null
}

export interface GuidedSkillState {
    skillId: string
    stepId: string
    selections: Record<string, GuidedSkillSelectionState>
    channel: GuidedSkillChannel
    status: "active" | "completed" | "cancelled"
    startedAt: string
    updatedAt: string
}

export interface GuidedSkillMessageOption {
    id: string
    label: string
    aliases: string[]
    nextStepId?: string | null
    selected?: boolean
}

export interface GuidedSkillMessageCard {
    optionId: string
    title: string
    description?: string | null
    badge?: string | null
    metadata?: string | null
    imageUrl?: string | null
    selected?: boolean
}

export interface GuidedSkillMessageSubmit {
    label: string
    mode: GuidedSkillSubmit["mode"]
}

export interface GuidedSkillMessageUi {
    type: "guided-step"
    skillId: string
    skillTitle: string
    stepId: string
    prompt: string
    presentation: GuidedSkillStepPresentation
    options: GuidedSkillMessageOption[]
    cards: GuidedSkillMessageCard[]
    submit?: GuidedSkillMessageSubmit | null
    cancelLabel?: string | null
    textMenu?: string | null
}

export interface GuidedSkillShortcut {
    id: string
    title: string
    description?: string | null
    presentation: GuidedSkillStepPresentation
}

export interface GuidedSkillClientEvent {
    skillId: string
    stepId?: string | null
    optionId?: string | null
    label?: string | null
    source?: "shortcut" | "guided_ui" | "text_menu" | "free_text"
}
