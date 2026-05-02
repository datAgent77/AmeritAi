export type SurveyTemplateType = "blank" | "political_poll" | "satisfaction" | "market_research"
export type SurveyChannel = "publicPage" | "widget"
export type SurveyStatus = "draft" | "published" | "closed" | "archived"
export type SurveyQuestionType = "singleChoice" | "multiChoice" | "shortText" | "longText" | "number"
export const SURVEY_OTHER_CHOICE_VALUE = "__other__"

export interface SurveyQuestion {
    id: string
    type: SurveyQuestionType
    title: string
    description?: string
    required: boolean
    options?: string[]
    optionLabels?: Record<string, string>
    allowOther?: boolean
    demographicKey?: string
}

export interface SurveyConsentConfig {
    title: string
    body: string
    checkboxLabel: string
    required: boolean
}

export interface SurveyContactCaptureConfig {
    enabled: boolean
    nameEnabled: boolean
    emailEnabled: boolean
    phoneEnabled: boolean
    nameRequired: boolean
    emailRequired: boolean
    phoneRequired: boolean
    title?: string
    description?: string
}

export interface SurveyDefinition {
    id: string
    chatbotId: string
    title: string
    description: string
    slug: string
    templateType: SurveyTemplateType
    channels: SurveyChannel[]
    introTitle: string
    introText: string
    thankYouTitle: string
    thankYouText: string
    consent: SurveyConsentConfig
    contactCapture: SurveyContactCaptureConfig
    questions: SurveyQuestion[]
    status: SurveyStatus
    publishedAt: string | null
    closedAt: string | null
    createdAt: string
    updatedAt: string
    responseCount: number
    lastResponseAt: string | null
}

export type SurveyAnswerValue = string | string[] | number | null

export interface SurveyResponseAnswer {
    questionId: string
    questionTitle: string
    questionType: SurveyQuestionType
    value: SurveyAnswerValue
    otherText?: string | null
}

export interface SurveyResponseContact {
    name?: string | null
    email?: string | null
    phone?: string | null
}

export interface SurveyResponseMetadata {
    source: SurveyChannel | "publicPage"
    ipHash: string
    pid: string
    userAgent: string
}

export interface SurveyResponseRecord {
    id: string
    chatbotId: string
    surveyId: string
    fingerprintHash: string
    answers: SurveyResponseAnswer[]
    contact: SurveyResponseContact
    consentSnapshot: SurveyConsentConfig
    metadata: SurveyResponseMetadata
    createdAt: string
    updatedAt: string
}

export interface SurveyQuestionAggregate {
    questionId: string
    questionTitle: string
    questionType: SurveyQuestionType
    totalAnswered: number
    optionCounts?: Record<string, number>
    otherCount?: number
    numericSummary?: {
        count: number
        sum: number
        min: number
        max: number
        average: number
    }
}

export interface SurveyAggregateRecord {
    surveyId: string
    chatbotId: string
    totalResponses: number
    questionStats: Record<string, SurveyQuestionAggregate>
    updatedAt: string
}

export interface PublicSurveyDefinition {
    id: string
    chatbotId: string
    title: string
    description: string
    slug: string
    introTitle: string
    introText: string
    thankYouTitle: string
    thankYouText: string
    consent: SurveyConsentConfig
    contactCapture: SurveyContactCaptureConfig
    questions: SurveyQuestion[]
}

export interface SurveyWidgetConfig {
    showCta: boolean
    autoOpenOnLoad?: boolean
    widgetActiveSurveyId: string | null
    defaultConsentTitle: string
    defaultConsentText: string
    defaultConsentCheckboxLabel: string
    activeSurvey?: PublicSurveyDefinition | null
}

export interface SurveyModuleConfig {
    showCta: boolean
    autoOpenOnLoad?: boolean
    widgetActiveSurveyId: string | null
    defaultConsentTitle: string
    defaultConsentText: string
    defaultConsentCheckboxLabel: string
}

export interface SurveyAnalyticsPayload {
    survey: SurveyDefinition
    aggregate: SurveyAggregateRecord
    responses: SurveyResponseRecord[]
}

export interface NormalizedSurveySubmission {
    answers: SurveyResponseAnswer[]
    contact: SurveyResponseContact
}
