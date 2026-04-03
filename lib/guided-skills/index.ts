import { MODULES_REGISTRY } from "@/lib/modules-registry"
import type { OmniActionId } from "@/lib/omni/types"
import type {
    GuidedSkillCard,
    GuidedSkillChannel,
    GuidedSkillClientEvent,
    GuidedSkillMessageCard,
    GuidedSkillMessageOption,
    GuidedSkillMessageUi,
    GuidedSkillRecord,
    GuidedSkillSelectionState,
    GuidedSkillShortcut,
    GuidedSkillState,
    GuidedSkillStep,
    GuidedSkillSubmit,
} from "@/lib/guided-skills/types"

const SUPPORTED_CHANNELS: GuidedSkillChannel[] = ["web", "whatsapp", "instagram"]
const SUPPORTED_PRESENTATIONS = new Set(["chips", "cards"])
const SUPPORTED_SUBMIT_MODES = new Set(["confirm_only", "omni_action"])
export type GuidedLanguage = "tr" | "en" | "de" | "es" | "fr"

const GUIDED_COPY: Record<GuidedLanguage, {
    startMenuTitle: string
    startMenuFooter: string
    textMenuFooter: string
}> = {
    tr: {
        startMenuTitle: "Hazır guided akışlar:",
        startMenuFooter: "Başlamak için numara veya akış adını yazabilirsiniz.",
        textMenuFooter: "Yanıt olarak numara ya da seçenek adını yazabilirsiniz.",
    },
    en: {
        startMenuTitle: "Available guided flows:",
        startMenuFooter: "Reply with a number or flow name to start.",
        textMenuFooter: "Reply with a number or option name.",
    },
    de: {
        startMenuTitle: "Verfugbare Guided-Flows:",
        startMenuFooter: "Antworte mit einer Nummer oder dem Flow-Namen, um zu starten.",
        textMenuFooter: "Antworte mit einer Nummer oder dem Namen der Option.",
    },
    es: {
        startMenuTitle: "Flujos Guided disponibles:",
        startMenuFooter: "Responde con un numero o el nombre del flujo para comenzar.",
        textMenuFooter: "Responde con un numero o el nombre de la opcion.",
    },
    fr: {
        startMenuTitle: "Flux Guided disponibles:",
        startMenuFooter: "Repondez avec un numero ou le nom du flux pour commencer.",
        textMenuFooter: "Repondez avec un numero ou le nom de l'option.",
    },
}

function asObject(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function normalizeStringArray(value: unknown) {
    if (!Array.isArray(value)) return []
    return Array.from(new Set(value.map((item) => String(item || "").trim()).filter(Boolean)))
}

function normalizePayloadPatch(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined
}

function normalizeSubmit(value: unknown): GuidedSkillSubmit | null {
    const record = asObject(value)
    const mode = String(record.mode || "").trim()
    const label = String(record.label || "").trim()
    const successMessage = String(record.successMessage || "").trim()

    if (!SUPPORTED_SUBMIT_MODES.has(mode) || !label || !successMessage) {
        return null
    }

    if (mode === "omni_action") {
        const actionId = String(record.actionId || "").trim()
        if (!actionId) return null
        return {
            mode: "omni_action",
            label,
            actionId: actionId as OmniActionId,
            successMessage,
            externalUrl: typeof record.externalUrl === "string" ? record.externalUrl.trim() || null : null,
        }
    }

    return {
        mode: "confirm_only",
        label,
        successMessage,
        externalUrl: typeof record.externalUrl === "string" ? record.externalUrl.trim() || null : null,
    }
}

function normalizeOption(value: unknown, index: number) {
    const record = asObject(value)
    const label = String(record.label || "").trim()
    if (!label) return null

    return {
        id: String(record.id || `option-${index + 1}`).trim(),
        label,
        aliases: normalizeStringArray(record.aliases),
        nextStepId: typeof record.nextStepId === "string" ? record.nextStepId.trim() || null : null,
        selectionValue: typeof record.selectionValue === "string" ? record.selectionValue.trim() || null : null,
        payloadPatch: normalizePayloadPatch(record.payloadPatch),
    }
}

function normalizeCard(value: unknown) {
    const record = asObject(value)
    const optionId = String(record.optionId || "").trim()
    const title = String(record.title || "").trim()
    if (!optionId || !title) return null

    return {
        optionId,
        title,
        description: typeof record.description === "string" ? record.description.trim() || null : null,
        badge: typeof record.badge === "string" ? record.badge.trim() || null : null,
        metadata: typeof record.metadata === "string" ? record.metadata.trim() || null : null,
        imageUrl: typeof record.imageUrl === "string" ? record.imageUrl.trim() || null : null,
    }
}

function normalizeStep(value: unknown, index: number): GuidedSkillStep | null {
    const record = asObject(value)
    const prompt = String(record.prompt || "").trim()
    if (!prompt) return null

    const options = Array.isArray(record.options)
        ? record.options
              .map((item, optionIndex) => normalizeOption(item, optionIndex))
              .filter((item): item is NonNullable<ReturnType<typeof normalizeOption>> => Boolean(item))
        : []

    const submit = normalizeSubmit(record.submit)

    if (options.length === 0 && !submit) {
        return null
    }

    const cards = Array.isArray(record.cards)
        ? record.cards
              .map((item) => normalizeCard(item))
              .filter((item): item is NonNullable<ReturnType<typeof normalizeCard>> => Boolean(item))
        : []

    return {
        id: String(record.id || `step-${index + 1}`).trim(),
        prompt,
        presentation: SUPPORTED_PRESENTATIONS.has(String(record.presentation || "").trim())
            ? (String(record.presentation).trim() as GuidedSkillStep["presentation"])
            : "chips",
        options,
        cards,
        submit,
        cancelLabel: typeof record.cancelLabel === "string" ? record.cancelLabel.trim() || null : null,
    }
}

function toIsoString(value: unknown) {
    if (!value) return null
    if (typeof value === "string") return value
    if (typeof (value as { toDate?: () => Date }).toDate === "function") {
        return (value as { toDate: () => Date }).toDate().toISOString()
    }
    if (value instanceof Date) return value.toISOString()
    return null
}

export function resolveGuidedLanguage(language?: string | null, transcript?: string | null): GuidedLanguage {
    const normalized = String(language || "").toLowerCase()
    if (normalized.startsWith("tr")) return "tr"
    if (normalized.startsWith("de")) return "de"
    if (normalized.startsWith("es")) return "es"
    if (normalized.startsWith("fr")) return "fr"
    if (normalized.startsWith("en")) return "en"

    const text = String(transcript || "")
    if (/[çğıöşüÇĞİÖŞÜ]/.test(text) || /\b(check-in|iptal|degisiklik|değişiklik|bilet|uçak)\b/i.test(text)) return "tr"
    return "en"
}

function getGuidedCopy(language?: string | null, transcript?: string | null) {
    return GUIDED_COPY[resolveGuidedLanguage(language, transcript)]
}

export function normalizeGuidedSkillRecord(input: unknown, overrides?: { id?: string; chatbotId?: string }): GuidedSkillRecord | null {
    const record = asObject(input)
    const title = String(record.title || "").trim()
    const chatbotId = String(overrides?.chatbotId || record.chatbotId || "").trim()
    const id = String(overrides?.id || record.id || "").trim()

    if (!title || !chatbotId) {
        return null
    }

    const steps = Array.isArray(record.steps)
        ? record.steps
              .map((item, index) => normalizeStep(item, index))
              .filter((item): item is GuidedSkillStep => Boolean(item))
        : []

    if (steps.length === 0) {
        return null
    }

    const stepIds = new Set(steps.map((step) => step.id))
    const startStepCandidate = String(record.startStepId || steps[0]?.id || "").trim()
    const startStepId = stepIds.has(startStepCandidate) ? startStepCandidate : steps[0].id

    const channels = normalizeStringArray(record.channels).filter((channel): channel is GuidedSkillChannel =>
        SUPPORTED_CHANNELS.includes(channel as GuidedSkillChannel)
    )

    return {
        id: id || crypto.randomUUID(),
        chatbotId,
        title,
        description: typeof record.description === "string" ? record.description.trim() || null : null,
        enabled: record.enabled !== false,
        channels: channels.length > 0 ? channels : ["web"],
        startStepId,
        startAliases: normalizeStringArray(record.startAliases),
        steps,
        createdAt: toIsoString(record.createdAt),
        updatedAt: toIsoString(record.updatedAt),
    }
}

export function getGuidedSkillStep(skill: GuidedSkillRecord, stepId?: string | null) {
    const resolvedStepId = stepId || skill.startStepId
    return skill.steps.find((step) => step.id === resolvedStepId) || skill.steps[0] || null
}

export function buildGuidedSkillShortcut(skill: GuidedSkillRecord): GuidedSkillShortcut {
    const startStep = getGuidedSkillStep(skill, skill.startStepId)
    return {
        id: skill.id,
        title: skill.title,
        description: skill.description || null,
        presentation: startStep?.presentation || "chips",
    }
}

function buildMessageCards(cards: GuidedSkillCard[], selectedOptionId?: string | null): GuidedSkillMessageCard[] {
    return cards.map((card) => ({
        ...card,
        selected: selectedOptionId === card.optionId,
    }))
}

function buildMessageOptions(skill: GuidedSkillRecord, step: GuidedSkillStep, selections: Record<string, GuidedSkillSelectionState>): GuidedSkillMessageOption[] {
    const currentSelection = selections[step.id]
    return step.options.map((option) => ({
        id: option.id,
        label: option.label,
        aliases: option.aliases,
        nextStepId: option.nextStepId || null,
        selected: currentSelection?.optionId === option.id,
    }))
}

function buildTextMenuLines(step: GuidedSkillStep) {
    const lines = step.options.map((option, index) => `${index + 1}. ${option.label}`)
    const submitIndex = step.submit ? lines.length + 1 : null
    const cancelIndex = step.cancelLabel ? lines.length + (submitIndex ? 2 : 1) : null

    if (step.submit && submitIndex) {
        lines.push(`${submitIndex}. ${step.submit.label}`)
    }

    if (step.cancelLabel && cancelIndex) {
        lines.push(`${cancelIndex}. ${step.cancelLabel}`)
    }

    return { lines, submitIndex, cancelIndex }
}

export function buildGuidedSkillTextMenu(
    skill: GuidedSkillRecord,
    step: GuidedSkillStep,
    params?: { language?: string | null; transcript?: string | null }
) {
    const copy = getGuidedCopy(params?.language, params?.transcript)
    const { lines } = buildTextMenuLines(step)
    return [step.prompt, "", ...lines, "", copy.textMenuFooter].join("\n").trim()
}

export function buildGuidedSkillMessageUi(
    skill: GuidedSkillRecord,
    step: GuidedSkillStep,
    state?: GuidedSkillState | null,
    channel: GuidedSkillChannel = "web",
    language?: string | null,
    transcript?: string | null
): GuidedSkillMessageUi {
    const selections = state?.selections || {}
    const currentSelection = selections[step.id]
    const cards = step.cards && step.cards.length > 0
        ? buildMessageCards(step.cards, currentSelection?.optionId)
        : step.presentation === "cards"
          ? step.options.map((option) => ({
                optionId: option.id,
                title: option.label,
                description: null,
                badge: null,
                metadata: null,
                imageUrl: null,
                selected: currentSelection?.optionId === option.id,
            }))
          : []

    return {
        type: "guided-step",
        skillId: skill.id,
        skillTitle: skill.title,
        stepId: step.id,
        prompt: step.prompt,
        presentation: step.presentation,
        options: buildMessageOptions(skill, step, selections),
        cards,
        submit: step.submit
            ? {
                  label: step.submit.label,
                  mode: step.submit.mode,
              }
            : null,
        cancelLabel: step.cancelLabel || null,
        textMenu: channel === "web" ? null : buildGuidedSkillTextMenu(skill, step, { language, transcript }),
    }
}

export function getGuidedStepVirtualIndexes(step: GuidedSkillStep) {
    return buildTextMenuLines(step)
}

export function normalizeGuidedSkillState(input: unknown): GuidedSkillState | null {
    const record = asObject(input)
    const skillId = String(record.skillId || "").trim()
    const stepId = String(record.stepId || "").trim()
    const channel = String(record.channel || "").trim()
    const status = String(record.status || "").trim()

    if (!skillId || !stepId || !SUPPORTED_CHANNELS.includes(channel as GuidedSkillChannel)) {
        return null
    }

    const selectionsRecord = asObject(record.selections)
    const selections = Object.fromEntries(
        Object.entries(selectionsRecord).flatMap(([key, value]) => {
            const selection = asObject(value)
            const optionId = String(selection.optionId || "").trim()
            const label = String(selection.label || "").trim()
            const stepValue = String(selection.stepId || "").trim()
            if (!optionId || !label || !stepValue) return []
            return [[
                key,
                {
                    stepId: stepValue,
                    optionId,
                    label,
                    selectionValue: typeof selection.selectionValue === "string" ? selection.selectionValue.trim() || null : null,
                    payloadPatch: normalizePayloadPatch(selection.payloadPatch),
                    selectedAt: toIsoString(selection.selectedAt),
                } satisfies GuidedSkillSelectionState,
            ]]
        })
    )

    return {
        skillId,
        stepId,
        selections,
        channel: channel as GuidedSkillChannel,
        status: status === "completed" || status === "cancelled" ? status : "active",
        startedAt: toIsoString(record.startedAt) || new Date().toISOString(),
        updatedAt: toIsoString(record.updatedAt) || new Date().toISOString(),
    }
}

export async function listGuidedSkills(adminDb: any, chatbotId: string): Promise<GuidedSkillRecord[]> {
    const snapshot = await adminDb.collection("guided_skills").where("chatbotId", "==", chatbotId).get()
    return snapshot.docs
        .map((doc: any): GuidedSkillRecord | null => normalizeGuidedSkillRecord(doc.data(), { id: doc.id, chatbotId }))
        .filter((skill: GuidedSkillRecord | null): skill is GuidedSkillRecord => Boolean(skill))
        .sort((left: GuidedSkillRecord, right: GuidedSkillRecord) => left.title.localeCompare(right.title))
}

export async function listEnabledGuidedSkills(
    adminDb: any,
    chatbotId: string,
    channel: GuidedSkillChannel
): Promise<GuidedSkillRecord[]> {
    const skills = await listGuidedSkills(adminDb, chatbotId)
    return skills.filter((skill) => skill.enabled && skill.channels.includes(channel))
}

export async function isGuidedModuleEnabled(adminDb: any, chatbotId: string) {
    if (MODULES_REGISTRY.guided?.status !== "ready") {
        return false
    }

    const [chatbotSnapshot, userSnapshot] = await Promise.all([
        adminDb.collection("chatbots").doc(chatbotId).get().catch(() => null),
        adminDb.collection("users").doc(chatbotId).get().catch(() => null),
    ])

    const chatbotEnabled = chatbotSnapshot?.exists ? chatbotSnapshot.data()?.enableGuided === true : false
    const userEnabled = userSnapshot?.exists ? userSnapshot.data()?.enableGuided === true : false

    return chatbotEnabled || userEnabled
}

export function buildGuidedSkillStartMenu(
    skills: GuidedSkillRecord[],
    params?: { language?: string | null; transcript?: string | null }
) {
    if (skills.length === 0) return null
    const copy = getGuidedCopy(params?.language, params?.transcript)
    const lines = skills.map((skill, index) => {
        const suffix = skill.description ? ` - ${skill.description}` : ""
        return `${index + 1}. ${skill.title}${suffix}`
    })
    return [copy.startMenuTitle, ...lines, "", copy.startMenuFooter].join("\n").trim()
}

export function matchGuidedSkillShortcut(
    skills: GuidedSkillRecord[],
    input: { transcript?: string | null; guidedEvent?: GuidedSkillClientEvent | null }
) {
    const guidedSkillId = input.guidedEvent?.skillId?.trim()
    if (guidedSkillId) {
        return skills.find((skill) => skill.id === guidedSkillId) || null
    }

    const transcript = String(input.transcript || "").trim()
    if (!transcript) return null

    const numeric = Number.parseInt(transcript, 10)
    if (Number.isInteger(numeric) && numeric > 0 && numeric <= skills.length) {
        return skills[numeric - 1] || null
    }

    const lowered = transcript.toLocaleLowerCase("tr-TR")
    return (
        skills.find((skill) => skill.title.toLocaleLowerCase("tr-TR") === lowered) ||
        skills.find((skill) => skill.startAliases.some((alias) => alias.toLocaleLowerCase("tr-TR") === lowered)) ||
        null
    )
}
