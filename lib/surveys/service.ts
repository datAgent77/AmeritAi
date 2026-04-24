import crypto from "crypto"
import { randomUUID } from "crypto"
import { SURVEY_OTHER_CHOICE_VALUE } from "@/lib/surveys/types"
import type {
    NormalizedSurveySubmission,
    PublicSurveyDefinition,
    SurveyAggregateRecord,
    SurveyAnswerValue,
    SurveyAnalyticsPayload,
    SurveyChannel,
    SurveyContactCaptureConfig,
    SurveyConsentConfig,
    SurveyDefinition,
    SurveyModuleConfig,
    SurveyQuestion,
    SurveyQuestionAggregate,
    SurveyResponseAnswer,
    SurveyResponseContact,
    SurveyResponseRecord,
    SurveyStatus,
    SurveyTemplateType,
    SurveyWidgetConfig,
} from "@/lib/surveys/types"
import { buildQuestionsForTemplate, DEFAULT_SURVEY_CONSENT, DEFAULT_SURVEY_CONTACT_CAPTURE, getTemplateDefaults } from "@/lib/surveys/templates"
import * as XLSX from "xlsx"

type RateLimitEntry = {
    count: number
    resetAt: number
}

const surveyIpRateLimits = new Map<string, RateLimitEntry>()
const surveyFingerprintRateLimits = new Map<string, RateLimitEntry>()

const SURVEY_IP_LIMIT = 20
const SURVEY_IP_WINDOW_MS = 15 * 60 * 1000
const SURVEY_FINGERPRINT_LIMIT = 3
const SURVEY_FINGERPRINT_WINDOW_MS = 60 * 60 * 1000
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL?.trim()
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
const REDIS_RATE_LIMIT_ENABLED = Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN)
const OTHER_CHOICE_VALUE = SURVEY_OTHER_CHOICE_VALUE

export const SURVEY_COLLECTION = "surveys"
export const SURVEY_RESPONSE_COLLECTION = "survey_responses"
export const SURVEY_AGGREGATE_COLLECTION = "survey_aggregates"
export const SURVEY_PID_COOKIE = "vion_survey_pid"

function nowIso() {
    return new Date().toISOString()
}

function normalizeText(value: unknown, fallback = "") {
    return String(value ?? fallback).trim()
}

function normalizeMultilineText(value: unknown, fallback = "") {
    return String(value ?? fallback).replace(/\r\n/g, "\n").trim()
}

function normalizeBoolean(value: unknown, fallback = false) {
    return typeof value === "boolean" ? value : fallback
}

function normalizeArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? value as T[] : []
}

function parseDateValue(value: unknown) {
    if (!value) return null
    if (value instanceof Date) return value.toISOString()
    if (typeof value === "string") return value
    if (typeof value === "object" && value && typeof (value as { toDate?: () => Date }).toDate === "function") {
        return (value as { toDate: () => Date }).toDate().toISOString()
    }
    return null
}

function sanitizeStatus(value: unknown, fallback: SurveyStatus = "draft"): SurveyStatus {
    return value === "published" || value === "closed" || value === "archived" || value === "draft" ? value : fallback
}

function sanitizeTemplateType(value: unknown): SurveyTemplateType {
    return value === "political_poll" || value === "satisfaction" || value === "market_research" ? value : "blank"
}

function sanitizeQuestionType(value: unknown): SurveyQuestion["type"] {
    return value === "singleChoice"
        || value === "multiChoice"
        || value === "shortText"
        || value === "longText"
        || value === "number"
        ? value
        : "singleChoice"
}

export function slugifySurveyTitle(value: string) {
    const normalized = value
        .toLocaleLowerCase("tr-TR")
        .replace(/ı/g, "i")
        .replace(/ş/g, "s")
        .replace(/ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")

    return normalized || `survey-${Date.now()}`
}

export async function generateUniqueSurveySlug(
    adminDb: any,
    _chatbotId: string,
    desiredSlug: string,
    excludeSurveyId?: string | null
) {
    const baseSlug = slugifySurveyTitle(desiredSlug)
    const snapshot = await adminDb.collection(SURVEY_COLLECTION).get()
    const used = new Set(
        snapshot.docs
            .map((doc: any) => ({ id: doc.id, slug: normalizeText(doc.data()?.slug) }))
            .filter((item: { id: string; slug: string }) => item.id !== excludeSurveyId && item.slug)
            .map((item: { slug: string }) => item.slug)
    )

    if (!used.has(baseSlug)) return baseSlug

    let suffix = 2
    while (used.has(`${baseSlug}-${suffix}`)) {
        suffix += 1
    }
    return `${baseSlug}-${suffix}`
}

export function buildDefaultSurveyWidgetConfig(config?: Partial<SurveyWidgetConfig> | null): SurveyWidgetConfig {
    return {
        showCta: config?.showCta !== false,
        widgetActiveSurveyId: typeof config?.widgetActiveSurveyId === "string" && config.widgetActiveSurveyId.trim()
            ? config.widgetActiveSurveyId
            : null,
        defaultConsentTitle: normalizeText(config?.defaultConsentTitle, DEFAULT_SURVEY_CONSENT.title) || DEFAULT_SURVEY_CONSENT.title,
        defaultConsentText: normalizeMultilineText(config?.defaultConsentText, DEFAULT_SURVEY_CONSENT.body) || DEFAULT_SURVEY_CONSENT.body,
        defaultConsentCheckboxLabel:
            normalizeText(config?.defaultConsentCheckboxLabel, DEFAULT_SURVEY_CONSENT.checkboxLabel) || DEFAULT_SURVEY_CONSENT.checkboxLabel,
        activeSurvey: config?.activeSurvey || null,
    }
}

export function buildSurveyModuleConfig(config?: Partial<SurveyWidgetConfig> | null): SurveyModuleConfig {
    const normalized = buildDefaultSurveyWidgetConfig(config)
    return {
        showCta: normalized.showCta,
        widgetActiveSurveyId: normalized.widgetActiveSurveyId,
        defaultConsentTitle: normalized.defaultConsentTitle,
        defaultConsentText: normalized.defaultConsentText,
        defaultConsentCheckboxLabel: normalized.defaultConsentCheckboxLabel,
    }
}

export function sanitizeSurveyQuestion(input: Partial<SurveyQuestion>, index = 0): SurveyQuestion {
    const type = sanitizeQuestionType(input.type)
    const options = normalizeArray<string>(input.options)
        .map((option) => normalizeText(option))
        .filter(Boolean)

    const question: SurveyQuestion = {
        id: normalizeText(input.id) || `question_${index + 1}_${randomUUID().slice(0, 6)}`,
        type,
        title: normalizeText(input.title, `Soru ${index + 1}`) || `Soru ${index + 1}`,
        description: normalizeMultilineText(input.description) || "",
        required: normalizeBoolean(input.required, true),
        allowOther: (type === "singleChoice" || type === "multiChoice") ? normalizeBoolean(input.allowOther, false) : false,
        demographicKey: normalizeText(input.demographicKey) || "",
    }

    if (type === "singleChoice" || type === "multiChoice") {
        question.options = options.length ? options : ["Secenek 1", "Secenek 2"]
    }

    return question
}

export function sanitizeSurveyConsent(input: Partial<SurveyConsentConfig> | null | undefined, defaults?: Partial<SurveyWidgetConfig> | null): SurveyConsentConfig {
    return {
        title: normalizeText(input?.title, defaults?.defaultConsentTitle || DEFAULT_SURVEY_CONSENT.title) || DEFAULT_SURVEY_CONSENT.title,
        body: normalizeMultilineText(input?.body, defaults?.defaultConsentText || DEFAULT_SURVEY_CONSENT.body) || DEFAULT_SURVEY_CONSENT.body,
        checkboxLabel:
            normalizeText(input?.checkboxLabel, defaults?.defaultConsentCheckboxLabel || DEFAULT_SURVEY_CONSENT.checkboxLabel)
            || DEFAULT_SURVEY_CONSENT.checkboxLabel,
        required: true,
    }
}

export function sanitizeSurveyContactCapture(input: Partial<SurveyContactCaptureConfig> | null | undefined): SurveyContactCaptureConfig {
    const enabled = normalizeBoolean(input?.enabled, DEFAULT_SURVEY_CONTACT_CAPTURE.enabled)
    const nameEnabled = normalizeBoolean(input?.nameEnabled, DEFAULT_SURVEY_CONTACT_CAPTURE.nameEnabled)
    const emailEnabled = normalizeBoolean(input?.emailEnabled, DEFAULT_SURVEY_CONTACT_CAPTURE.emailEnabled)
    const phoneEnabled = normalizeBoolean(input?.phoneEnabled, DEFAULT_SURVEY_CONTACT_CAPTURE.phoneEnabled)

    return {
        enabled,
        nameEnabled,
        emailEnabled,
        phoneEnabled,
        nameRequired: enabled && nameEnabled ? normalizeBoolean(input?.nameRequired, false) : false,
        emailRequired: enabled && emailEnabled ? normalizeBoolean(input?.emailRequired, false) : false,
        phoneRequired: enabled && phoneEnabled ? normalizeBoolean(input?.phoneRequired, false) : false,
        title: normalizeText(input?.title, DEFAULT_SURVEY_CONTACT_CAPTURE.title) || DEFAULT_SURVEY_CONTACT_CAPTURE.title,
        description:
            normalizeMultilineText(input?.description, DEFAULT_SURVEY_CONTACT_CAPTURE.description) || DEFAULT_SURVEY_CONTACT_CAPTURE.description,
    }
}

export function sanitizeSurveyChannels(value: unknown, fallback: SurveyChannel[] = ["publicPage"]): SurveyChannel[] {
    const channels = normalizeArray<SurveyChannel>(value)
        .filter((channel) => channel === "publicPage" || channel === "widget")
    return channels.length ? Array.from(new Set(channels)) : fallback
}

export function buildSurveyDefinition(input: Partial<SurveyDefinition> & {
    chatbotId: string
    title?: string
    templateType?: SurveyTemplateType
}, options?: {
    existing?: SurveyDefinition | null
    widgetDefaults?: Partial<SurveyWidgetConfig> | null
    slug?: string
    status?: SurveyStatus
}): SurveyDefinition {
    const templateType = sanitizeTemplateType(input.templateType || options?.existing?.templateType)
    const templateDefaults = getTemplateDefaults(templateType)
    const existing = options?.existing || null
    const createdAt = existing?.createdAt || nowIso()
    const updatedAt = nowIso()
    const questionsInput = Array.isArray(input.questions) && input.questions.length > 0
        ? input.questions
        : existing?.questions?.length
            ? existing.questions
            : buildQuestionsForTemplate(templateType)

    return {
        id: normalizeText(input.id, existing?.id || "") || existing?.id || "",
        chatbotId: input.chatbotId,
        title: normalizeText(input.title, existing?.title || templateDefaults.title) || templateDefaults.title,
        description: normalizeMultilineText(input.description, existing?.description || templateDefaults.description) || templateDefaults.description,
        slug: options?.slug || normalizeText(input.slug, existing?.slug || ""),
        templateType,
        channels: sanitizeSurveyChannels(input.channels, existing?.channels || ["publicPage"]),
        introTitle: normalizeText(input.introTitle, existing?.introTitle || templateDefaults.introTitle) || templateDefaults.introTitle,
        introText: normalizeMultilineText(input.introText, existing?.introText || templateDefaults.introText) || templateDefaults.introText,
        thankYouTitle:
            normalizeText(input.thankYouTitle, existing?.thankYouTitle || templateDefaults.thankYouTitle) || templateDefaults.thankYouTitle,
        thankYouText:
            normalizeMultilineText(input.thankYouText, existing?.thankYouText || templateDefaults.thankYouText) || templateDefaults.thankYouText,
        consent: sanitizeSurveyConsent(input.consent, options?.widgetDefaults),
        contactCapture: sanitizeSurveyContactCapture(input.contactCapture),
        questions: questionsInput.map((questionItem, index) => sanitizeSurveyQuestion(questionItem, index)),
        status: sanitizeStatus(options?.status || input.status, existing?.status || "draft"),
        publishedAt: options?.status === "published" ? nowIso() : parseDateValue(input.publishedAt) || existing?.publishedAt || null,
        closedAt: options?.status === "closed" ? nowIso() : parseDateValue(input.closedAt) || existing?.closedAt || null,
        createdAt,
        updatedAt,
        responseCount: typeof input.responseCount === "number" ? input.responseCount : existing?.responseCount || 0,
        lastResponseAt: parseDateValue(input.lastResponseAt) || existing?.lastResponseAt || null,
    }
}

export function buildSurveyFromTemplate(input: {
    chatbotId: string
    templateType: SurveyTemplateType
    widgetDefaults?: Partial<SurveyWidgetConfig> | null
}) {
    return buildSurveyDefinition({
        chatbotId: input.chatbotId,
        templateType: input.templateType,
        questions: buildQuestionsForTemplate(input.templateType),
    }, {
        widgetDefaults: input.widgetDefaults,
    })
}

export function serializeSurvey(id: string, data: Record<string, any>): SurveyDefinition {
    return {
        id,
        chatbotId: normalizeText(data.chatbotId),
        title: normalizeText(data.title),
        description: normalizeMultilineText(data.description),
        slug: normalizeText(data.slug),
        templateType: sanitizeTemplateType(data.templateType),
        channels: sanitizeSurveyChannels(data.channels),
        introTitle: normalizeText(data.introTitle),
        introText: normalizeMultilineText(data.introText),
        thankYouTitle: normalizeText(data.thankYouTitle),
        thankYouText: normalizeMultilineText(data.thankYouText),
        consent: sanitizeSurveyConsent(data.consent),
        contactCapture: sanitizeSurveyContactCapture(data.contactCapture),
        questions: normalizeArray<SurveyQuestion>(data.questions).map((item, index) => sanitizeSurveyQuestion(item, index)),
        status: sanitizeStatus(data.status),
        publishedAt: parseDateValue(data.publishedAt),
        closedAt: parseDateValue(data.closedAt),
        createdAt: parseDateValue(data.createdAt) || nowIso(),
        updatedAt: parseDateValue(data.updatedAt) || parseDateValue(data.createdAt) || nowIso(),
        responseCount: typeof data.responseCount === "number" ? data.responseCount : 0,
        lastResponseAt: parseDateValue(data.lastResponseAt),
    }
}

export function buildPublicSurvey(survey: SurveyDefinition): PublicSurveyDefinition {
    return {
        id: survey.id,
        chatbotId: survey.chatbotId,
        title: survey.title,
        description: survey.description,
        slug: survey.slug,
        introTitle: survey.introTitle,
        introText: survey.introText,
        thankYouTitle: survey.thankYouTitle,
        thankYouText: survey.thankYouText,
        consent: survey.consent,
        contactCapture: survey.contactCapture,
        questions: survey.questions,
    }
}

export function serializeSurveyAggregate(survey: SurveyDefinition, data?: Record<string, any> | null): SurveyAggregateRecord {
    return {
        surveyId: survey.id,
        chatbotId: survey.chatbotId,
        totalResponses: typeof data?.totalResponses === "number" ? data.totalResponses : 0,
        questionStats: (data?.questionStats && typeof data.questionStats === "object" ? data.questionStats : {}) as Record<string, SurveyQuestionAggregate>,
        updatedAt: parseDateValue(data?.updatedAt) || survey.updatedAt,
    }
}

function hashValue(value: string) {
    return crypto.createHash("sha256").update(value).digest("hex")
}

export function getRequesterIp(req: Request): string {
    return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || req.headers.get("x-real-ip")
        || "unknown"
}

export function createSurveyFingerprint(pid: string, surveyId: string, ip: string, userAgent: string) {
    return hashValue(`${pid}:${surveyId}:${ip}:${userAgent}`)
}

export function createIpHash(ip: string) {
    return hashValue(ip)
}

export function createParticipantId() {
    return randomUUID()
}

function parseNumericResult(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : null
    }
    return null
}

async function runRedisCommand(args: Array<string | number>): Promise<unknown | null> {
    if (!REDIS_RATE_LIMIT_ENABLED || !UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) return null

    try {
        const response = await fetch(UPSTASH_REDIS_REST_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(args),
            cache: "no-store",
        })

        if (!response.ok) return null
        const payload = await response.json() as { result?: unknown; error?: string }
        if (payload?.error) return null
        return payload?.result ?? null
    } catch (error) {
        console.error("Survey Redis rate limit command failed:", error)
        return null
    }
}

async function consumeRedisRateLimit(key: string, limit: number, windowMs: number) {
    const incrementResult = await runRedisCommand(["INCR", key])
    const count = parseNumericResult(incrementResult)
    if (count === null) return null

    const ttlResult = await runRedisCommand(["PTTL", key])
    let resetInMs = parseNumericResult(ttlResult)
    if (resetInMs === null) return null
    if (resetInMs < 0) {
        await runRedisCommand(["PEXPIRE", key, windowMs])
        resetInMs = windowMs
    }

    return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        resetInMs: Math.max(0, resetInMs),
    }
}

async function consumeMemoryRateLimit(map: Map<string, RateLimitEntry>, key: string, limit: number, windowMs: number) {
    const now = Date.now()
    const current = map.get(key)

    if (!current || now > current.resetAt) {
        const next = { count: 1, resetAt: now + windowMs }
        map.set(key, next)
        return {
            allowed: true,
            remaining: limit - 1,
            resetInMs: windowMs,
        }
    }

    current.count += 1
    map.set(key, current)
    return {
        allowed: current.count <= limit,
        remaining: Math.max(0, limit - current.count),
        resetInMs: Math.max(0, current.resetAt - now),
    }
}

export async function consumeSurveyRateLimit(ip: string, fingerprintHash: string) {
    const ipResult = await consumeRedisRateLimit(`ratelimit:surveys:ip:${ip}`, SURVEY_IP_LIMIT, SURVEY_IP_WINDOW_MS)
        || await consumeMemoryRateLimit(surveyIpRateLimits, ip, SURVEY_IP_LIMIT, SURVEY_IP_WINDOW_MS)

    if (!ipResult.allowed) {
        return {
            allowed: false,
            reason: "IP rate limit exceeded",
            remaining: 0,
            resetInMs: ipResult.resetInMs,
        }
    }

    const fingerprintResult =
        await consumeRedisRateLimit(`ratelimit:surveys:fingerprint:${fingerprintHash}`, SURVEY_FINGERPRINT_LIMIT, SURVEY_FINGERPRINT_WINDOW_MS)
        || await consumeMemoryRateLimit(
            surveyFingerprintRateLimits,
            fingerprintHash,
            SURVEY_FINGERPRINT_LIMIT,
            SURVEY_FINGERPRINT_WINDOW_MS
        )

    if (!fingerprintResult.allowed) {
        return {
            allowed: false,
            reason: "Participant rate limit exceeded",
            remaining: 0,
            resetInMs: fingerprintResult.resetInMs,
        }
    }

    return {
        allowed: true,
        remaining: Math.min(ipResult.remaining, fingerprintResult.remaining),
        resetInMs: Math.min(ipResult.resetInMs, fingerprintResult.resetInMs),
    }
}

export function getSurveyRateLimitHeaders(result: { remaining: number; resetInMs: number }) {
    return {
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetInMs / 1000)),
    }
}

function ensureObjectRecord(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function normalizeEmail(value: unknown) {
    return normalizeText(value).toLowerCase()
}

function normalizePhone(value: unknown) {
    return normalizeText(value)
}

function getSubmittedValue(record: Record<string, unknown>, questionId: string) {
    const raw = record[questionId]
    return ensureObjectRecord(raw)
}

function isEmptyValue(value: SurveyAnswerValue) {
    return value === null
        || value === ""
        || value === undefined
        || (Array.isArray(value) && value.length === 0)
}

export function validateSurveySubmission(
    survey: PublicSurveyDefinition,
    payload: Record<string, unknown>
): NormalizedSurveySubmission {
    const answersInput = ensureObjectRecord(payload.answers)
    const contactInput = ensureObjectRecord(payload.contact)
    const consentAccepted = payload.consentAccepted === true

    if (survey.consent.required && !consentAccepted) {
        throw new Error("Consent is required")
    }

    const normalizedAnswers: SurveyResponseAnswer[] = survey.questions.map((question) => {
        const submitted = getSubmittedValue(answersInput, question.id)
        const rawValue = submitted.value
        const otherText = normalizeText(submitted.otherText)
        let value: SurveyAnswerValue = null

        if (question.type === "singleChoice") {
            const selected = normalizeText(rawValue)
            if (selected) {
                if (selected === OTHER_CHOICE_VALUE && question.allowOther) {
                    if (!otherText) throw new Error(`Other text is required for question "${question.title}"`)
                    value = OTHER_CHOICE_VALUE
                } else if (question.options?.includes(selected)) {
                    value = selected
                } else {
                    throw new Error(`Invalid option for question "${question.title}"`)
                }
            }
        } else if (question.type === "multiChoice") {
            const values = normalizeArray<string>(rawValue).map((item) => normalizeText(item)).filter(Boolean)
            if (values.length > 0) {
                const invalidOption = values.find((item) => item !== OTHER_CHOICE_VALUE && !question.options?.includes(item))
                if (invalidOption) {
                    throw new Error(`Invalid option for question "${question.title}"`)
                }
                if (values.includes(OTHER_CHOICE_VALUE) && question.allowOther && !otherText) {
                    throw new Error(`Other text is required for question "${question.title}"`)
                }
                value = Array.from(new Set(values))
            }
        } else if (question.type === "number") {
            if (rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== "") {
                const parsed = Number(rawValue)
                if (!Number.isFinite(parsed)) {
                    throw new Error(`Invalid number for question "${question.title}"`)
                }
                value = parsed
            }
        } else {
            const textValue = normalizeText(rawValue)
            if (textValue) {
                value = textValue
            }
        }

        if (question.required && isEmptyValue(value)) {
            throw new Error(`Question "${question.title}" is required`)
        }

        return {
            questionId: question.id,
            questionTitle: question.title,
            questionType: question.type,
            value,
            otherText: otherText || null,
        }
    })

    const contactConfig = survey.contactCapture
    const contact: SurveyResponseContact = {}

    if (contactConfig.enabled) {
        const name = normalizeText(contactInput.name)
        const email = normalizeEmail(contactInput.email)
        const phone = normalizePhone(contactInput.phone)

        if (contactConfig.nameEnabled) {
            if (contactConfig.nameRequired && !name) throw new Error("Name is required")
            contact.name = name || null
        }
        if (contactConfig.emailEnabled) {
            if (contactConfig.emailRequired && !email) throw new Error("Email is required")
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email address")
            contact.email = email || null
        }
        if (contactConfig.phoneEnabled) {
            if (contactConfig.phoneRequired && !phone) throw new Error("Phone is required")
            if (phone && !/^[0-9+\-() ]{6,20}$/.test(phone)) throw new Error("Invalid phone number")
            contact.phone = phone || null
        }
    }

    return {
        answers: normalizedAnswers,
        contact,
    }
}

function createEmptyQuestionAggregate(question: SurveyQuestion): SurveyQuestionAggregate {
    return {
        questionId: question.id,
        questionTitle: question.title,
        questionType: question.type,
        totalAnswered: 0,
        optionCounts: question.type === "singleChoice" || question.type === "multiChoice"
            ? Object.fromEntries((question.options || []).map((option) => [option, 0]))
            : undefined,
        otherCount: question.allowOther ? 0 : undefined,
        numericSummary: question.type === "number"
            ? {
                count: 0,
                sum: 0,
                min: 0,
                max: 0,
                average: 0,
            }
            : undefined,
    }
}

export function applyResponseToAggregate(
    survey: SurveyDefinition,
    aggregate: SurveyAggregateRecord | null,
    answers: SurveyResponseAnswer[]
): SurveyAggregateRecord {
    const nextQuestionStats: Record<string, SurveyQuestionAggregate> = {
        ...(aggregate?.questionStats || {}),
    }

    for (const question of survey.questions) {
        if (!nextQuestionStats[question.id]) {
            nextQuestionStats[question.id] = createEmptyQuestionAggregate(question)
        }
    }

    for (const answer of answers) {
        if (isEmptyValue(answer.value)) continue
        const stat = nextQuestionStats[answer.questionId] || createEmptyQuestionAggregate({
            id: answer.questionId,
            type: answer.questionType,
            title: answer.questionTitle,
            required: false,
        })

        stat.totalAnswered += 1

        if (answer.questionType === "singleChoice") {
            const choice = String(answer.value)
            if (choice === OTHER_CHOICE_VALUE) {
                stat.otherCount = (stat.otherCount || 0) + 1
            } else if (stat.optionCounts) {
                stat.optionCounts[choice] = (stat.optionCounts[choice] || 0) + 1
            }
        }

        if (answer.questionType === "multiChoice" && Array.isArray(answer.value)) {
            for (const selected of answer.value) {
                if (selected === OTHER_CHOICE_VALUE) {
                    stat.otherCount = (stat.otherCount || 0) + 1
                } else if (stat.optionCounts) {
                    stat.optionCounts[selected] = (stat.optionCounts[selected] || 0) + 1
                }
            }
        }

        if (answer.questionType === "number" && typeof answer.value === "number") {
            const previous = stat.numericSummary || { count: 0, sum: 0, min: answer.value, max: answer.value, average: answer.value }
            const count = previous.count + 1
            const sum = previous.sum + answer.value
            stat.numericSummary = {
                count,
                sum,
                min: previous.count === 0 ? answer.value : Math.min(previous.min, answer.value),
                max: previous.count === 0 ? answer.value : Math.max(previous.max, answer.value),
                average: sum / count,
            }
        }

        nextQuestionStats[answer.questionId] = stat
    }

    return {
        surveyId: survey.id,
        chatbotId: survey.chatbotId,
        totalResponses: (aggregate?.totalResponses || 0) + 1,
        questionStats: nextQuestionStats,
        updatedAt: nowIso(),
    }
}

export async function buildSurveyAnalytics(adminDb: any, survey: SurveyDefinition): Promise<SurveyAnalyticsPayload> {
    const [aggregateSnapshot, responseSnapshot] = await Promise.all([
        adminDb.collection(SURVEY_AGGREGATE_COLLECTION).doc(survey.id).get(),
        adminDb.collection(SURVEY_RESPONSE_COLLECTION).where("surveyId", "==", survey.id).get(),
    ])

    const aggregate = serializeSurveyAggregate(survey, aggregateSnapshot.exists ? aggregateSnapshot.data() || {} : {})
    const responses = responseSnapshot.docs
        .map((doc: any) => serializeSurveyResponse(doc.id, doc.data() || {}))
        .sort((left: SurveyResponseRecord, right: SurveyResponseRecord) => right.createdAt.localeCompare(left.createdAt))

    return {
        survey,
        aggregate,
        responses,
    }
}

export function serializeSurveyResponse(id: string, data: Record<string, any>): SurveyResponseRecord {
    return {
        id,
        chatbotId: normalizeText(data.chatbotId),
        surveyId: normalizeText(data.surveyId),
        fingerprintHash: normalizeText(data.fingerprintHash),
        answers: normalizeArray<SurveyResponseAnswer>(data.answers).map((answer) => ({
            questionId: normalizeText(answer.questionId),
            questionTitle: normalizeText(answer.questionTitle),
            questionType: sanitizeQuestionType(answer.questionType),
            value: (Array.isArray(answer.value) ? answer.value.map((item) => normalizeText(item)) : answer.value) as SurveyAnswerValue,
            otherText: normalizeText(answer.otherText) || null,
        })),
        contact: {
            name: normalizeText(data.contact?.name) || null,
            email: normalizeEmail(data.contact?.email) || null,
            phone: normalizePhone(data.contact?.phone) || null,
        },
        consentSnapshot: sanitizeSurveyConsent(data.consentSnapshot),
        metadata: {
            source: data.metadata?.source === "widget" ? "widget" : "publicPage",
            ipHash: normalizeText(data.metadata?.ipHash),
            pid: normalizeText(data.metadata?.pid),
            userAgent: normalizeText(data.metadata?.userAgent),
        },
        createdAt: parseDateValue(data.createdAt) || nowIso(),
        updatedAt: parseDateValue(data.updatedAt) || parseDateValue(data.createdAt) || nowIso(),
    }
}

export async function fetchSurveyById(adminDb: any, id: string) {
    const snapshot = await adminDb.collection(SURVEY_COLLECTION).doc(id).get()
    if (!snapshot.exists) return null
    return serializeSurvey(snapshot.id, snapshot.data() || {})
}

export async function fetchSurveyList(adminDb: any, chatbotId: string) {
    const snapshot = await adminDb.collection(SURVEY_COLLECTION).where("chatbotId", "==", chatbotId).get()
    return snapshot.docs
        .map((doc: any) => serializeSurvey(doc.id, doc.data() || {}))
        .sort((left: SurveyDefinition, right: SurveyDefinition) => right.updatedAt.localeCompare(left.updatedAt))
}

export async function fetchSurveyBySlug(adminDb: any, slug: string) {
    const snapshot = await adminDb.collection(SURVEY_COLLECTION).where("slug", "==", slug).limit(10).get()
    if (snapshot.empty) return null
    return snapshot.docs
        .map((doc: any) => serializeSurvey(doc.id, doc.data() || {}))
        .find((survey: SurveyDefinition) => survey.slug === slug) || null
}

export function buildSurveyExportRows(payload: SurveyAnalyticsPayload) {
    return payload.responses.map((response) => {
        const row: Record<string, string | number> = {
            responseId: response.id,
            createdAt: response.createdAt,
            source: response.metadata.source,
            respondentName: response.contact.name || "",
            respondentEmail: response.contact.email || "",
            respondentPhone: response.contact.phone || "",
        }

        for (const answer of response.answers) {
            const normalizedValue = (() => {
                if (Array.isArray(answer.value)) {
                    return answer.value
                        .map((item) => item === OTHER_CHOICE_VALUE ? (answer.otherText || "Other") : item)
                        .join(" | ")
                }
                if (answer.value === OTHER_CHOICE_VALUE) {
                    return answer.otherText || "Other"
                }
                return answer.value ?? ""
            })()

            row[answer.questionTitle] = typeof normalizedValue === "number" ? normalizedValue : String(normalizedValue)
            if (answer.otherText) {
                row[`${answer.questionTitle} (Other)`] = answer.otherText
            }
        }

        return row
    })
}

export function createSurveyExportBuffer(payload: SurveyAnalyticsPayload, format: "csv" | "xlsx") {
    const rows = buildSurveyExportRows(payload)
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "responses")

    if (format === "csv") {
        return Buffer.from(XLSX.utils.sheet_to_csv(worksheet), "utf8")
    }

    return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer
}
