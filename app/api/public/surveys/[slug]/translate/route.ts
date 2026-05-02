import { NextResponse } from "next/server"
import { OpenAI } from "openai"
import { getAdminDb } from "@/lib/firebase-admin"
import { buildPublicSurvey, fetchSurveyBySlug } from "@/lib/surveys/service"
import type { PublicSurveyDefinition } from "@/lib/surveys/types"

export const dynamic = "force-dynamic"

const SUPPORTED_LANGUAGES = new Set(["tr", "en", "es", "fr", "de"])
const LANGUAGE_NAMES: Record<string, string> = {
    tr: "Turkish",
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
}

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null
const translationCache = new Map<string, PublicSurveyDefinition>()

type TranslationEntry = {
    key: string
    text: string
}

function normalizeLanguage(value: string | null) {
    const language = String(value || "en").toLowerCase().split(/[-_]/)[0]
    return SUPPORTED_LANGUAGES.has(language) ? language : "en"
}

function addEntry(entries: TranslationEntry[], key: string, text: unknown) {
    const value = typeof text === "string" ? text.trim() : ""
    if (value) entries.push({ key, text: value })
}

function collectSurveyText(survey: PublicSurveyDefinition) {
    const entries: TranslationEntry[] = []

    addEntry(entries, "title", survey.title)
    addEntry(entries, "description", survey.description)
    addEntry(entries, "introTitle", survey.introTitle)
    addEntry(entries, "introText", survey.introText)
    addEntry(entries, "thankYouTitle", survey.thankYouTitle)
    addEntry(entries, "thankYouText", survey.thankYouText)
    addEntry(entries, "consent.title", survey.consent.title)
    addEntry(entries, "consent.body", survey.consent.body)
    addEntry(entries, "consent.checkboxLabel", survey.consent.checkboxLabel)
    addEntry(entries, "contactCapture.title", survey.contactCapture.title)
    addEntry(entries, "contactCapture.description", survey.contactCapture.description)

    survey.questions.forEach((question) => {
        addEntry(entries, `questions.${question.id}.title`, question.title)
        addEntry(entries, `questions.${question.id}.description`, question.description)
        question.options?.forEach((option, index) => {
            addEntry(entries, `questions.${question.id}.options.${index}`, option)
        })
    })

    return entries
}

function applyTranslations(survey: PublicSurveyDefinition, translations: Map<string, string>): PublicSurveyDefinition {
    return {
        ...survey,
        title: translations.get("title") || survey.title,
        description: translations.get("description") || survey.description,
        introTitle: translations.get("introTitle") || survey.introTitle,
        introText: translations.get("introText") || survey.introText,
        thankYouTitle: translations.get("thankYouTitle") || survey.thankYouTitle,
        thankYouText: translations.get("thankYouText") || survey.thankYouText,
        consent: {
            ...survey.consent,
            title: translations.get("consent.title") || survey.consent.title,
            body: translations.get("consent.body") || survey.consent.body,
            checkboxLabel: translations.get("consent.checkboxLabel") || survey.consent.checkboxLabel,
        },
        contactCapture: {
            ...survey.contactCapture,
            title: translations.get("contactCapture.title") || survey.contactCapture.title,
            description: translations.get("contactCapture.description") || survey.contactCapture.description,
        },
        questions: survey.questions.map((question) => {
            const optionLabels = Object.fromEntries(
                (question.options || []).map((option, index) => [
                    option,
                    translations.get(`questions.${question.id}.options.${index}`) || option,
                ])
            )

            return {
                ...question,
                title: translations.get(`questions.${question.id}.title`) || question.title,
                description: translations.get(`questions.${question.id}.description`) || question.description,
                optionLabels,
            }
        }),
    }
}

async function translateSurvey(survey: PublicSurveyDefinition, language: string) {
    const entries = collectSurveyText(survey)
    if (!openai || entries.length === 0) return survey

    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
            {
                role: "system",
                content:
                    "Translate survey UI content faithfully. Preserve meaning, tone, product names, placeholders, and line breaks. Return only JSON.",
            },
            {
                role: "user",
                content: JSON.stringify({
                    targetLanguage: LANGUAGE_NAMES[language] || "English",
                    items: entries,
                    outputSchema: {
                        translations: [{ key: "same key from input", text: "translated text" }],
                    },
                }),
            },
        ],
    })

    const rawContent = completion.choices?.[0]?.message?.content || "{}"
    const parsed = JSON.parse(rawContent) as { translations?: Array<{ key?: string; text?: string }> }
    const translations = new Map<string, string>()

    for (const item of Array.isArray(parsed.translations) ? parsed.translations : []) {
        if (typeof item.key === "string" && typeof item.text === "string" && item.text.trim()) {
            translations.set(item.key, item.text.trim())
        }
    }

    return applyTranslations(survey, translations)
}

export async function GET(req: Request, { params }: { params: { slug: string } }) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const language = normalizeLanguage(new URL(req.url).searchParams.get("language"))
    const survey = await fetchSurveyBySlug(adminDb, params.slug)
    if (!survey || survey.status !== "published") {
        return NextResponse.json({ error: "Survey not found" }, { status: 404 })
    }

    const publicSurvey = buildPublicSurvey(survey)
    const cacheKey = `${publicSurvey.id}:${survey.updatedAt || ""}:${language}`
    const cachedSurvey = translationCache.get(cacheKey)
    if (cachedSurvey) {
        return NextResponse.json({ survey: cachedSurvey, translated: true })
    }

    try {
        const translatedSurvey = await translateSurvey(publicSurvey, language)
        translationCache.set(cacheKey, translatedSurvey)
        return NextResponse.json({ survey: translatedSurvey, translated: translatedSurvey !== publicSurvey })
    } catch (error) {
        console.warn("[surveys] translation failed, falling back to source survey", error)
        return NextResponse.json({ survey: publicSurvey, translated: false })
    }
}
