import type { QuickActionButton } from "@/types/chatbot"

export const QUICK_ACTION_DEFINITIONS = {
    appointments: {
        id: "appointments",
        label: "Randevu Al",
        moduleId: "appointments",
        triggerMessage: "randevu almak istiyorum",
    },
    humanHandoff: {
        id: "humanHandoff",
        label: "Temsilci İste",
        moduleId: "humanHandoff",
        triggerMessage: "bir temsilciyle görüşmek istiyorum",
    },
    leadCollection: {
        id: "leadCollection",
        label: "İletişim Bırak",
        moduleId: "leadCollection",
        triggerMessage: "iletişim bilgilerimi bırakmak istiyorum",
    },
} as const satisfies Record<QuickActionButton["moduleId"], Omit<QuickActionButton, "visible" | "order">>

export type QuickActionModuleId = keyof typeof QUICK_ACTION_DEFINITIONS

type QuickActionsConfig = {
    enabled: boolean
    buttons: QuickActionButton[]
}

function normalizeText(value: unknown) {
    return String(value || "").trim().toLocaleLowerCase("tr-TR")
}

export function isQuickActionModuleId(value: unknown): value is QuickActionModuleId {
    return typeof value === "string" && value in QUICK_ACTION_DEFINITIONS
}

export function getQuickActionDefinition(moduleId: QuickActionModuleId) {
    return QUICK_ACTION_DEFINITIONS[moduleId]
}

function getEnabledQuickActionModules(data: Record<string, any>) {
    const enabled: QuickActionModuleId[] = []

    if (data.enableAppointments === true) enabled.push("appointments")
    if (data.enableHumanHandoff === true) enabled.push("humanHandoff")
    if (data.enableLeadCollection === true) enabled.push("leadCollection")

    return enabled
}

function inferQuickActionModuleId(button: Partial<QuickActionButton>) {
    const normalizedTrigger = normalizeText(button.triggerMessage)
    const normalizedLabel = normalizeText(button.label)

    const inferredByTrigger = (Object.keys(QUICK_ACTION_DEFINITIONS) as QuickActionModuleId[]).find((moduleId) =>
        normalizeText(QUICK_ACTION_DEFINITIONS[moduleId].triggerMessage) === normalizedTrigger
    )

    if (inferredByTrigger) return inferredByTrigger

    const inferredByLabel = (Object.keys(QUICK_ACTION_DEFINITIONS) as QuickActionModuleId[]).find((moduleId) =>
        normalizeText(QUICK_ACTION_DEFINITIONS[moduleId].label) === normalizedLabel
    )

    if (inferredByLabel) return inferredByLabel

    if (isQuickActionModuleId(button.moduleId)) return button.moduleId

    return null
}

function buildDefaultQuickActionsFromModules(enabledModules: QuickActionModuleId[]): QuickActionsConfig {
    const buttons = enabledModules.map((moduleId, index) => {
        const definition = getQuickActionDefinition(moduleId)
        return {
            ...definition,
            visible: true,
            order: index,
        }
    })

    return {
        enabled: buttons.length > 0,
        buttons,
    }
}

export function normalizeQuickActionButton(
    button: Partial<QuickActionButton>,
    index: number,
    options?: {
        allowedModules?: Set<QuickActionModuleId>
    }
): QuickActionButton | null {
    const inferredModuleId = inferQuickActionModuleId(button)
    if (!inferredModuleId) return null

    if (options?.allowedModules && !options.allowedModules.has(inferredModuleId)) {
        return null
    }

    const definition = getQuickActionDefinition(inferredModuleId)
    const rawLabel = typeof button.label === "string" ? button.label.trim() : ""
    const normalizedLabel = normalizeText(rawLabel)
    const labelLooksStale = rawLabel !== ""
        && (Object.keys(QUICK_ACTION_DEFINITIONS) as QuickActionModuleId[]).some((moduleId) =>
            moduleId !== inferredModuleId
            && normalizeText(QUICK_ACTION_DEFINITIONS[moduleId].label) === normalizedLabel
        )

    const rawId = typeof button.id === "string" ? button.id.trim() : ""
    const idLooksStale = isQuickActionModuleId(rawId) && rawId !== inferredModuleId

    return {
        id: rawId && !idLooksStale ? rawId : definition.id,
        label: rawLabel && !labelLooksStale ? rawLabel : definition.label,
        moduleId: inferredModuleId,
        triggerMessage: definition.triggerMessage,
        visible: typeof button.visible === "boolean" ? button.visible : true,
        order: typeof button.order === "number" ? button.order : index,
    }
}

export function resolveQuickActionsConfig(data: Record<string, any>): QuickActionsConfig {
    const enabledModules = getEnabledQuickActionModules(data)
    const allowedModules = new Set(enabledModules)
    const fallback = buildDefaultQuickActionsFromModules(enabledModules)
    const savedQuickActions = data.quickActions

    if (!savedQuickActions || !Array.isArray(savedQuickActions.buttons)) {
        return fallback
    }

    const normalizedButtons = savedQuickActions.buttons
        .map((button: Partial<QuickActionButton>, index: number) => normalizeQuickActionButton(button, index, { allowedModules }))
        .filter((button: QuickActionButton | null): button is QuickActionButton => button !== null)

    const existingModuleIds = new Set(normalizedButtons.map((button: QuickActionButton) => button.moduleId))
    for (const moduleId of enabledModules) {
        if (!existingModuleIds.has(moduleId)) {
            const definition = getQuickActionDefinition(moduleId)
            normalizedButtons.push({
                ...definition,
                visible: true,
                order: normalizedButtons.length,
            })
        }
    }

    const buttons = normalizedButtons
        .sort((left: QuickActionButton, right: QuickActionButton) => left.order - right.order)
        .map((button: QuickActionButton, index: number) => ({ ...button, order: index }))

    if (buttons.length === 0) {
        return {
            enabled: savedQuickActions.enabled === true ? fallback.enabled : false,
            buttons: fallback.buttons,
        }
    }

    return {
        enabled: typeof savedQuickActions.enabled === "boolean"
            ? savedQuickActions.enabled && buttons.length > 0
            : buttons.length > 0,
        buttons,
    }
}
