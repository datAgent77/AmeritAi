import type { QuickActionButton, QuickActionModuleId } from "@/types/chatbot"

type QuickActionDefinition = Omit<QuickActionButton, "visible" | "order"> & {
    iconName: string
    title: {
        tr: string
        en: string
    }
    localized: {
        tr: {
            label: string
            triggerMessage: string
        }
        en: {
            label: string
            triggerMessage: string
        }
    }
    inferenceTexts: string[]
    enabledWhen: (data: Record<string, any>) => boolean
}

type QuickActionsConfig = {
    enabled: boolean
    buttons: QuickActionButton[]
}

function normalizeText(value: unknown) {
    return String(value || "").trim().toLocaleLowerCase("tr-TR")
}

const QUICK_ACTION_DEFINITIONS = {
    appointments: {
        id: "appointments",
        label: "Randevu Al",
        moduleId: "appointments",
        triggerMessage: "randevu almak istiyorum",
        iconName: "Calendar",
        title: {
            tr: "Randevu",
            en: "Appointments",
        },
        localized: {
            tr: {
                label: "Randevu Al",
                triggerMessage: "randevu almak istiyorum",
            },
            en: {
                label: "Book Appointment",
                triggerMessage: "I want to book an appointment",
            },
        },
        inferenceTexts: [
            "Randevu Al",
            "Randevu",
            "Book Appointment",
            "Appointments",
            "randevu almak istiyorum",
            "book an appointment",
        ],
        enabledWhen: (data) => data.enableAppointments === true,
    },
    humanHandoff: {
        id: "humanHandoff",
        label: "Temsilci İste",
        moduleId: "humanHandoff",
        triggerMessage: "bir temsilciyle görüşmek istiyorum",
        iconName: "Users",
        title: {
            tr: "Temsilci",
            en: "Human Handoff",
        },
        localized: {
            tr: {
                label: "Temsilci İste",
                triggerMessage: "bir temsilciyle görüşmek istiyorum",
            },
            en: {
                label: "Talk to an Agent",
                triggerMessage: "I want to talk to a human agent",
            },
        },
        inferenceTexts: [
            "Temsilci İste",
            "Temsilci",
            "Human Handoff",
            "Talk to Human",
            "bir temsilciyle görüşmek istiyorum",
            "i want to talk to a human agent",
        ],
        enabledWhen: (data) => data.enableHumanHandoff === true,
    },
    leadCollection: {
        id: "leadCollection",
        label: "İletişim Bırak",
        moduleId: "leadCollection",
        triggerMessage: "iletişim bilgilerimi bırakmak istiyorum",
        iconName: "FileText",
        title: {
            tr: "İletişim Formu",
            en: "Lead Collection",
        },
        localized: {
            tr: {
                label: "İletişim Bırak",
                triggerMessage: "iletişim bilgilerimi bırakmak istiyorum",
            },
            en: {
                label: "Leave Contact",
                triggerMessage: "I want to leave my contact information",
            },
        },
        inferenceTexts: [
            "İletişim Bırak",
            "İletişim Formu",
            "Lead Collection",
            "Leave Contact",
            "iletişim bilgilerimi bırakmak istiyorum",
            "i want to leave my contact information",
        ],
        enabledWhen: (data) => data.enableLeadCollection === true,
    },
    visualDiagnosis: {
        id: "visualDiagnosis",
        label: "Görsel Analiz",
        moduleId: "visualDiagnosis",
        triggerMessage: "görsel analizi başlatmak istiyorum",
        iconName: "ImageIcon",
        title: {
            tr: "Görsel Tanı",
            en: "Visual Diagnosis",
        },
        localized: {
            tr: {
                label: "Görsel Analiz",
                triggerMessage: "görsel analizi başlatmak istiyorum",
            },
            en: {
                label: "Image Analysis",
                triggerMessage: "I want to start visual diagnosis",
            },
        },
        inferenceTexts: [
            "Görsel Analiz",
            "Görsel Tanı",
            "Visual Diagnosis",
            "Image Analysis",
            "görsel analizi başlatmak istiyorum",
            "i want to start visual diagnosis",
        ],
        enabledWhen: (data) => data.enableVisualDiagnosis === true,
    },
    kvkkConsent: {
        id: "kvkkConsent",
        label: "KVKK Onayı",
        moduleId: "kvkkConsent",
        triggerMessage: "kvkk onay metnini görmek istiyorum",
        iconName: "ShieldCheck",
        title: {
            tr: "KVKK",
            en: "KVKK & Privacy",
        },
        localized: {
            tr: {
                label: "KVKK Onayı",
                triggerMessage: "kvkk onay metnini görmek istiyorum",
            },
            en: {
                label: "Privacy Consent",
                triggerMessage: "I want to review the privacy consent",
            },
        },
        inferenceTexts: [
            "KVKK Onayı",
            "KVKK",
            "Privacy Consent",
            "KVKK & Privacy",
            "kvkk onay metnini görmek istiyorum",
            "i want to review the privacy consent",
        ],
        enabledWhen: (data) => data.enableKvkkConsent === true || data.kvkkConsent?.enabled === true,
    },
    proactiveMessaging: {
        id: "proactiveMessaging",
        label: "Bana Yol Göster",
        moduleId: "proactiveMessaging",
        triggerMessage: "ihtiyacıma göre bana birkaç soru sorarak yardımcı ol",
        iconName: "Sparkles",
        title: {
            tr: "Proaktif Etkileşim",
            en: "Proactive Messaging",
        },
        localized: {
            tr: {
                label: "Bana Yol Göster",
                triggerMessage: "ihtiyacıma göre bana birkaç soru sorarak yardımcı ol",
            },
            en: {
                label: "Guide Me",
                triggerMessage: "Guide me proactively based on my needs",
            },
        },
        inferenceTexts: [
            "Bana Yol Göster",
            "Proaktif Etkileşim",
            "Proactive Messaging",
            "Guide Me",
            "ihtiyacıma göre bana birkaç soru sorarak yardımcı ol",
            "guide me proactively based on my needs",
        ],
        enabledWhen: (data) => data.enableProactiveMessaging === true,
    },
    digitalWaiter: {
        id: "digitalWaiter",
        label: "Menüden Öner",
        moduleId: "digitalWaiter",
        triggerMessage: "menüden bana öneri yap ve sipariş konusunda yardımcı ol",
        iconName: "UtensilsCrossed",
        title: {
            tr: "Restoran ve Kafe AI",
            en: "Restaurant & Cafe AI",
        },
        localized: {
            tr: {
                label: "Menüden Öner",
                triggerMessage: "menüden bana öneri yap ve sipariş konusunda yardımcı ol",
            },
            en: {
                label: "Suggest from Menu",
                triggerMessage: "Help me choose from the menu",
            },
        },
        inferenceTexts: [
            "Menüden Öner",
            "Restoran ve Kafe AI",
            "Digital Waiter",
            "Restaurant & Cafe AI",
            "menüden bana öneri yap ve sipariş konusunda yardımcı ol",
            "help me choose from the menu",
        ],
        enabledWhen: (data) => data.enableDigitalWaiter === true || data.digitalWaiter != null,
    },
    surveyManager: {
        id: "surveyManager",
        label: "Ankete Katil",
        moduleId: "surveyManager",
        triggerMessage: "ankete katilmak istiyorum",
        iconName: "BarChart3",
        title: {
            tr: "Anket ve Oylama",
            en: "Survey & Polling",
        },
        localized: {
            tr: {
                label: "Ankete Katıl",
                triggerMessage: "ankete katılmak istiyorum",
            },
            en: {
                label: "Take Survey",
                triggerMessage: "I want to take the survey",
            },
        },
        inferenceTexts: [
            "Ankete Katil",
            "Ankete Katıl",
            "Anket ve Oylama",
            "Survey & Polling",
            "Take Survey",
            "ankete katilmak istiyorum",
            "ankete katılmak istiyorum",
            "i want to take the survey",
        ],
        enabledWhen: (data) => data.enableSurveyManager === true
            && data.surveyWidgetConfig?.showCta !== false
            && data.surveyWidgetConfig?.activeSurvey != null,
    },
} as const satisfies Record<QuickActionModuleId, QuickActionDefinition>

export type QuickActionDefinitionMap = typeof QUICK_ACTION_DEFINITIONS
export type QuickActionDefinitionEntry = QuickActionDefinitionMap[QuickActionModuleId]
export type QuickActionsModuleOption = {
    moduleId: QuickActionModuleId
    label: string
}

export const QUICK_ACTION_MODULE_IDS = Object.keys(QUICK_ACTION_DEFINITIONS) as QuickActionModuleId[]

export function isQuickActionModuleId(value: unknown): value is QuickActionModuleId {
    return typeof value === "string" && value in QUICK_ACTION_DEFINITIONS
}

export function getQuickActionDefinition(moduleId: QuickActionModuleId) {
    return QUICK_ACTION_DEFINITIONS[moduleId]
}

function resolveQuickActionLocale(language: string | undefined): "tr" | "en" {
    return language === "tr" ? "tr" : "en"
}

export function getQuickActionDisplayLabel(button: Pick<QuickActionButton, "label" | "moduleId">, language: string) {
    const definition = getQuickActionDefinition(button.moduleId)
    return definition.localized[resolveQuickActionLocale(language)].label
}

export function getQuickActionTriggerMessage(button: Pick<QuickActionButton, "triggerMessage" | "moduleId">, language: string) {
    const definition = getQuickActionDefinition(button.moduleId)
    return definition.localized[resolveQuickActionLocale(language)].triggerMessage
}

export function getQuickActionModuleOptions(language: "tr" | "en" = "tr"): QuickActionsModuleOption[] {
    return QUICK_ACTION_MODULE_IDS.map((moduleId) => ({
        moduleId,
        label: QUICK_ACTION_DEFINITIONS[moduleId].title[language],
    }))
}

function getEnabledQuickActionModules(data: Record<string, any>) {
    return QUICK_ACTION_MODULE_IDS.filter((moduleId) => QUICK_ACTION_DEFINITIONS[moduleId].enabledWhen(data))
}

function inferQuickActionModuleId(button: Partial<QuickActionButton>) {
    const normalizedTrigger = normalizeText(button.triggerMessage)
    if (normalizedTrigger) {
        const inferredByTrigger = QUICK_ACTION_MODULE_IDS.find((moduleId) => {
            const definition = QUICK_ACTION_DEFINITIONS[moduleId]
            const knownTriggers = [
                normalizeText(definition.triggerMessage),
                ...definition.inferenceTexts.map((value) => normalizeText(value)),
            ]
            return knownTriggers.includes(normalizedTrigger)
        })

        if (inferredByTrigger) return inferredByTrigger
    }

    const normalizedLabel = normalizeText(button.label)
    if (normalizedLabel) {
        const inferredByLabel = QUICK_ACTION_MODULE_IDS.find((moduleId) => {
            const definition = QUICK_ACTION_DEFINITIONS[moduleId]
            const knownLabels = [
                normalizeText(definition.label),
                normalizeText(definition.title.tr),
                normalizeText(definition.title.en),
                ...definition.inferenceTexts.map((value) => normalizeText(value)),
            ]
            return knownLabels.includes(normalizedLabel)
        })

        if (inferredByLabel) return inferredByLabel
    }

    const normalizedId = normalizeText(button.id)
    if (normalizedId) {
        const inferredById = QUICK_ACTION_MODULE_IDS.find((moduleId) => normalizeText(QUICK_ACTION_DEFINITIONS[moduleId].id) === normalizedId)
        if (inferredById) return inferredById
    }

    return isQuickActionModuleId(button.moduleId) ? button.moduleId : null
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
        && QUICK_ACTION_MODULE_IDS.some((moduleId) =>
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

export function areQuickActionsEqual(left: QuickActionsConfig | undefined, right: QuickActionsConfig | undefined) {
    if (!left && !right) return true
    if (!left || !right) return false
    if (left.enabled !== right.enabled) return false
    if (left.buttons.length !== right.buttons.length) return false

    return left.buttons.every((button, index) => {
        const other = right.buttons[index]
        return Boolean(other)
            && button.id === other.id
            && button.label === other.label
            && button.moduleId === other.moduleId
            && button.triggerMessage === other.triggerMessage
            && button.visible === other.visible
            && button.order === other.order
    })
}

export function resolveQuickActionsConfig(data: Record<string, any>): QuickActionsConfig {
    const enabledModules = getEnabledQuickActionModules(data)
    const allowedModules = new Set(enabledModules)
    const fallback = buildDefaultQuickActionsFromModules(enabledModules)
    const savedQuickActions = data.quickActions

    if (!savedQuickActions || !Array.isArray(savedQuickActions.buttons)) {
        return fallback
    }

    const dedupedByModule = new Map<QuickActionModuleId, QuickActionButton>()
    for (const [index, rawButton] of savedQuickActions.buttons.entries()) {
        const normalizedButton = normalizeQuickActionButton(rawButton as Partial<QuickActionButton>, index, { allowedModules })
        if (!normalizedButton) continue
        if (dedupedByModule.has(normalizedButton.moduleId)) continue
        dedupedByModule.set(normalizedButton.moduleId, normalizedButton)
    }

    const normalizedButtons = Array.from(dedupedByModule.values())
    const existingModuleIds = new Set(normalizedButtons.map((button) => button.moduleId))

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
        .sort((left, right) => left.order - right.order)
        .map((button, index) => ({ ...button, order: index }))

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
