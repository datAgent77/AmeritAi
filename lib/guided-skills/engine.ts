import { executeOmniAction } from "@/lib/omni/action-execution"
import {
    buildGuidedSkillMessageUi,
    buildGuidedSkillStartMenu,
    getGuidedSkillStep,
    getGuidedStepVirtualIndexes,
    isGuidedModuleEnabled,
    listEnabledGuidedSkills,
    matchGuidedSkillShortcut,
    resolveGuidedLanguage,
} from "@/lib/guided-skills"
import type {
    GuidedSkillChannel,
    GuidedSkillClientEvent,
    GuidedSkillMessageUi,
    GuidedSkillRecord,
    GuidedSkillSelectionState,
    GuidedSkillState,
    GuidedSkillStep,
} from "@/lib/guided-skills/types"

function getCopy(language?: string | null, transcript?: string | null) {
    const locale = resolveGuidedLanguage(language, transcript)
    if (locale === "tr") {
        return {
            cancelled: "Akış iptal edildi.",
            selectFirst: "Devam etmeden önce bir seçim yapın.",
            completed: "İşlem tamamlandı.",
            unavailable: "Bu akış artık kullanılamıyor.",
        }
    }

    if (locale === "de") {
        return {
            cancelled: "Flow abgebrochen.",
            selectFirst: "Bitte treffen Sie zuerst eine Auswahl.",
            completed: "Vorgang abgeschlossen.",
            unavailable: "Dieser Flow ist derzeit nicht verfugbar.",
        }
    }

    if (locale === "es") {
        return {
            cancelled: "Flujo cancelado.",
            selectFirst: "Haz una seleccion antes de continuar.",
            completed: "Proceso completado.",
            unavailable: "Este flujo ya no esta disponible.",
        }
    }

    if (locale === "fr") {
        return {
            cancelled: "Flux annule.",
            selectFirst: "Veuillez faire une selection avant de continuer.",
            completed: "Operation terminee.",
            unavailable: "Ce flux n'est plus disponible.",
        }
    }

    return {
        cancelled: "Flow cancelled.",
        selectFirst: "Please make a selection before continuing.",
        completed: "Completed.",
        unavailable: "This flow is no longer available.",
    }
}

function cloneSelections(selections: GuidedSkillState["selections"]) {
    return Object.fromEntries(Object.entries(selections).map(([key, value]) => [key, { ...value }]))
}

function buildOptionSelection(step: GuidedSkillStep, optionId: string, transcript?: string | null) {
    const option = step.options.find((item) => item.id === optionId)
    if (!option) return null
    return {
        stepId: step.id,
        optionId: option.id,
        label: option.label,
        selectionValue: option.selectionValue || option.label,
        payloadPatch: option.payloadPatch,
        selectedAt: new Date().toISOString(),
    } satisfies GuidedSkillSelectionState
}

function buildState(params: {
    previous?: GuidedSkillState | null
    skillId: string
    channel: GuidedSkillChannel
    stepId: string
    selections: GuidedSkillState["selections"]
    status?: GuidedSkillState["status"]
}) {
    const now = new Date().toISOString()
    return {
        skillId: params.skillId,
        stepId: params.stepId,
        selections: params.selections,
        channel: params.channel,
        status: params.status || "active",
        startedAt: params.previous?.startedAt || now,
        updatedAt: now,
    } satisfies GuidedSkillState
}

function buildAssistantContent(step: GuidedSkillStep, guidedUi: GuidedSkillMessageUi | null) {
    return guidedUi?.textMenu || step.prompt
}

function buildActionPayload(skill: GuidedSkillRecord, state: GuidedSkillState) {
    const guidedSelections = Object.fromEntries(
        Object.entries(state.selections).map(([stepId, selection]) => [
            stepId,
            {
                optionId: selection.optionId,
                label: selection.label,
                selectionValue: selection.selectionValue || selection.label,
            },
        ])
    )

    return Object.values(state.selections).reduce<Record<string, unknown>>(
        (accumulator, selection) => ({
            ...accumulator,
            ...(selection.payloadPatch || {}),
        }),
        {
            guidedSkillId: skill.id,
            guidedSkillTitle: skill.title,
            guidedSelections,
        }
    )
}

function resolveStepAction(step: GuidedSkillStep, transcript?: string | null, guidedEvent?: GuidedSkillClientEvent | null) {
    const explicitOptionId = guidedEvent?.optionId?.trim()
    if (explicitOptionId === "__cancel") {
        return { type: "cancel" as const }
    }
    if (explicitOptionId === "__submit") {
        return { type: "submit" as const }
    }

    if (explicitOptionId) {
        const option = step.options.find((item) => item.id === explicitOptionId)
        if (option) {
            return { type: "option" as const, optionId: option.id }
        }
    }

    const normalizedTranscript = String(transcript || "").trim()
    if (!normalizedTranscript) return null

    const { submitIndex, cancelIndex } = getGuidedStepVirtualIndexes(step)
    const numeric = Number.parseInt(normalizedTranscript, 10)
    if (Number.isInteger(numeric)) {
        if (numeric >= 1 && numeric <= step.options.length) {
            return { type: "option" as const, optionId: step.options[numeric - 1]?.id }
        }
        if (submitIndex && numeric === submitIndex) {
            return { type: "submit" as const }
        }
        if (cancelIndex && numeric === cancelIndex) {
            return { type: "cancel" as const }
        }
    }

    const lowered = normalizedTranscript.toLocaleLowerCase("tr-TR")
    const matchedOption = step.options.find((option) => {
        if (option.label.toLocaleLowerCase("tr-TR") === lowered) return true
        return option.aliases.some((alias) => alias.toLocaleLowerCase("tr-TR") === lowered)
    })

    if (matchedOption) {
        return { type: "option" as const, optionId: matchedOption.id }
    }

    if (step.submit?.label?.toLocaleLowerCase("tr-TR") === lowered) {
        return { type: "submit" as const }
    }

    if (step.cancelLabel?.toLocaleLowerCase("tr-TR") === lowered) {
        return { type: "cancel" as const }
    }

    return null
}

export interface GuidedSkillEngineInput {
    adminDb: any
    chatbotId: string
    channel: GuidedSkillChannel
    sessionId?: string | null
    transcript?: string | null
    guidedEvent?: GuidedSkillClientEvent | null
    currentState?: GuidedSkillState | null
    contactKey?: string | null
    canonicalContactId?: string | null
    language?: string | null
    guidedModuleEnabled?: boolean | null
}

export interface GuidedSkillEngineResult {
    handled: boolean
    assistantContent?: string
    assistantGuidedUi?: GuidedSkillMessageUi | null
    nextState?: GuidedSkillState | null
    guidedTextMenu?: string | null
    lastDisposition?: string | null
    handoffStatus?: string | null
}

export async function resolveGuidedSkillTurn(input: GuidedSkillEngineInput): Promise<GuidedSkillEngineResult> {
    const copy = getCopy(input.language, input.transcript)
    const moduleEnabled =
        typeof input.guidedModuleEnabled === "boolean"
            ? input.guidedModuleEnabled
            : await isGuidedModuleEnabled(input.adminDb, input.chatbotId)

    if (!moduleEnabled) {
        return {
            handled: false,
            guidedTextMenu: null,
            nextState: input.currentState || null,
        }
    }

    const skills = await listEnabledGuidedSkills(input.adminDb, input.chatbotId, input.channel)
    const activeState = input.currentState?.status === "active" ? input.currentState : null

    if (!activeState) {
        const selectedSkill = matchGuidedSkillShortcut(skills, {
            transcript: input.transcript,
            guidedEvent: input.guidedEvent,
        })

        if (!selectedSkill) {
            return {
                handled: false,
                guidedTextMenu: input.channel === "web" ? null : buildGuidedSkillStartMenu(skills, { language: input.language, transcript: input.transcript }),
                nextState: input.currentState || null,
            }
        }

        const startStep = getGuidedSkillStep(selectedSkill, selectedSkill.startStepId)
        if (!startStep) {
            return {
                handled: true,
                assistantContent: copy.unavailable,
                assistantGuidedUi: null,
                nextState: buildState({
                    previous: input.currentState,
                    skillId: selectedSkill.id,
                    channel: input.channel,
                    stepId: selectedSkill.startStepId,
                    selections: {},
                    status: "cancelled",
                }),
                guidedTextMenu: input.channel === "web" ? null : buildGuidedSkillStartMenu(skills, { language: input.language, transcript: input.transcript }),
                lastDisposition: "guided_skill_unavailable",
            }
        }

        const nextState = buildState({
            previous: input.currentState,
            skillId: selectedSkill.id,
            channel: input.channel,
            stepId: startStep.id,
            selections: {},
            status: "active",
        })
        const guidedUi = buildGuidedSkillMessageUi(selectedSkill, startStep, nextState, input.channel, input.language, input.transcript)

        return {
            handled: true,
            assistantContent: buildAssistantContent(startStep, guidedUi),
            assistantGuidedUi: input.channel === "web" ? guidedUi : null,
            nextState,
            guidedTextMenu: guidedUi.textMenu || null,
            lastDisposition: "guided_skill_started",
        }
    }

    const activeSkill = skills.find((skill) => skill.id === activeState.skillId)
    if (!activeSkill) {
        return {
            handled: true,
            assistantContent: copy.unavailable,
            assistantGuidedUi: null,
            nextState: {
                ...activeState,
                status: "cancelled",
                updatedAt: new Date().toISOString(),
            },
            guidedTextMenu: null,
            lastDisposition: "guided_skill_unavailable",
        }
    }

    const step = getGuidedSkillStep(activeSkill, activeState.stepId)
    if (!step) {
        return {
            handled: true,
            assistantContent: copy.unavailable,
            assistantGuidedUi: null,
            nextState: {
                ...activeState,
                status: "cancelled",
                updatedAt: new Date().toISOString(),
            },
            guidedTextMenu: null,
            lastDisposition: "guided_skill_unavailable",
        }
    }

    const resolvedAction = resolveStepAction(step, input.transcript, input.guidedEvent)
    if (!resolvedAction) {
        return {
            handled: false,
            nextState: activeState,
            guidedTextMenu: null,
        }
    }

    if (resolvedAction.type === "cancel") {
        return {
            handled: true,
            assistantContent: copy.cancelled,
            assistantGuidedUi: null,
            nextState: {
                ...activeState,
                status: "cancelled",
                updatedAt: new Date().toISOString(),
            },
            guidedTextMenu: null,
            lastDisposition: "guided_skill_cancelled",
        }
    }

    const nextSelections = cloneSelections(activeState.selections)

    if (resolvedAction.type === "option") {
        const selection = buildOptionSelection(step, resolvedAction.optionId || "", input.transcript)
        if (!selection) {
            return {
                handled: false,
                nextState: activeState,
                guidedTextMenu: null,
            }
        }

        nextSelections[step.id] = selection
        const selectedOption = step.options.find((option) => option.id === selection.optionId)
        const nextStep = selectedOption?.nextStepId ? getGuidedSkillStep(activeSkill, selectedOption.nextStepId) : null

        if (nextStep) {
            const nextState = buildState({
                previous: activeState,
                skillId: activeSkill.id,
                channel: input.channel,
                stepId: nextStep.id,
                selections: nextSelections,
            })
            const guidedUi = buildGuidedSkillMessageUi(activeSkill, nextStep, nextState, input.channel, input.language, input.transcript)

            return {
                handled: true,
                assistantContent: buildAssistantContent(nextStep, guidedUi),
                assistantGuidedUi: input.channel === "web" ? guidedUi : null,
                nextState,
                guidedTextMenu: guidedUi.textMenu || null,
                lastDisposition: "guided_skill_step",
            }
        }

        const nextState = buildState({
            previous: activeState,
            skillId: activeSkill.id,
            channel: input.channel,
            stepId: step.id,
            selections: nextSelections,
        })
        const guidedUi = buildGuidedSkillMessageUi(activeSkill, step, nextState, input.channel, input.language, input.transcript)

        return {
            handled: true,
            assistantContent: buildAssistantContent(step, guidedUi),
            assistantGuidedUi: input.channel === "web" ? guidedUi : null,
            nextState,
            guidedTextMenu: guidedUi.textMenu || null,
            lastDisposition: "guided_skill_step",
        }
    }

    if (!step.submit) {
        return {
            handled: true,
            assistantContent: copy.completed,
            assistantGuidedUi: null,
            nextState: buildState({
                previous: activeState,
                skillId: activeSkill.id,
                channel: input.channel,
                stepId: step.id,
                selections: nextSelections,
                status: "completed",
            }),
            guidedTextMenu: null,
            lastDisposition: "guided_skill_completed",
        }
    }

    if (step.options.length > 0 && !nextSelections[step.id]) {
        const nextState = buildState({
            previous: activeState,
            skillId: activeSkill.id,
            channel: input.channel,
            stepId: step.id,
            selections: nextSelections,
        })
        const guidedUi = buildGuidedSkillMessageUi(activeSkill, step, nextState, input.channel, input.language, input.transcript)

        return {
            handled: true,
            assistantContent: copy.selectFirst,
            assistantGuidedUi: input.channel === "web" ? guidedUi : null,
            nextState,
            guidedTextMenu: guidedUi.textMenu || null,
            lastDisposition: "guided_skill_waiting_selection",
        }
    }

    if (step.submit.mode === "omni_action") {
        const actionResult = await executeOmniAction(input.adminDb, {
            chatbotId: input.chatbotId,
            actionId: step.submit.actionId,
            sourceChannel: input.channel,
            sourceSessionId: input.sessionId || null,
            contactKey: input.contactKey || null,
            canonicalContactId: input.canonicalContactId || null,
            payload: buildActionPayload(
                activeSkill,
                buildState({
                    previous: activeState,
                    skillId: activeSkill.id,
                    channel: input.channel,
                    stepId: step.id,
                    selections: nextSelections,
                })
            ),
        })

        const handoffStatus =
            actionResult.actionId === "create_callback_request" || actionResult.actionId === "handoff_to_human"
                ? "callback_requested"
                : null

        return {
            handled: true,
            assistantContent: step.submit.successMessage,
            assistantGuidedUi: null,
            nextState: buildState({
                previous: activeState,
                skillId: activeSkill.id,
                channel: input.channel,
                stepId: step.id,
                selections: nextSelections,
                status: "completed",
            }),
            guidedTextMenu: null,
            lastDisposition: actionResult.actionId,
            handoffStatus,
        }
    }

    return {
        handled: true,
        assistantContent: step.submit.successMessage,
        assistantGuidedUi: null,
        nextState: buildState({
            previous: activeState,
            skillId: activeSkill.id,
            channel: input.channel,
            stepId: step.id,
            selections: nextSelections,
            status: "completed",
        }),
        guidedTextMenu: null,
        lastDisposition: "guided_skill_completed",
    }
}
