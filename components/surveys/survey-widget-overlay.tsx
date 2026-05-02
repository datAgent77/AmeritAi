"use client"

import { useEffect, useMemo, useState } from "react"
import { ClipboardList, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SurveyResponseForm } from "@/components/surveys/survey-response-form"
import type { PublicSurveyDefinition } from "@/lib/surveys/types"

type SurveyWidgetOverlayProps = {
    show: boolean
    survey: PublicSurveyDefinition | null | undefined
    brandColor?: string
    language?: string
    onClose: () => void
    onSubmit: (payload: {
        consentAccepted: boolean
        answers: Record<string, { value: string | string[] | number | null; otherText?: string }>
        contact: {
            name?: string
            email?: string
            phone?: string
        }
    }) => Promise<void>
}

const SUPPORTED_SURVEY_LANGUAGES = new Set(["tr", "en", "es", "fr", "de"])
type SurveyWidgetLanguage = "tr" | "en" | "es" | "fr" | "de"

function resolveSurveyLanguage(language?: string): SurveyWidgetLanguage {
    const sourceLanguage = language || (typeof navigator !== "undefined" ? navigator.language : "en")
    const normalized = String(sourceLanguage || "en").toLowerCase().split(/[-_]/)[0]
    return SUPPORTED_SURVEY_LANGUAGES.has(normalized) ? normalized as SurveyWidgetLanguage : "en"
}

export function SurveyWidgetOverlay({ show, survey, brandColor = "#111827", language, onClose, onSubmit }: SurveyWidgetOverlayProps) {
    const resolvedLanguage = useMemo(() => resolveSurveyLanguage(language), [language])
    const [displaySurvey, setDisplaySurvey] = useState<PublicSurveyDefinition | null>(survey || null)
    const moduleLabel = {
        tr: "Anket",
        en: "Survey",
        es: "Encuesta",
        fr: "Questionnaire",
        de: "Umfrage",
    }[resolvedLanguage]
    const closeLabel = {
        tr: "Anketi kapat",
        en: "Close survey",
        es: "Cerrar encuesta",
        fr: "Fermer le questionnaire",
        de: "Umfrage schließen",
    }[resolvedLanguage]
    const submitLabel = {
        tr: "Anketi Gönder",
        en: "Submit Survey",
        es: "Enviar encuesta",
        fr: "Envoyer le questionnaire",
        de: "Umfrage senden",
    }[resolvedLanguage]

    useEffect(() => {
        if (!show) return
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose()
            }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [onClose, show])

    useEffect(() => {
        if (!show || !survey) {
            setDisplaySurvey(survey || null)
            return
        }

        let isCurrent = true
        setDisplaySurvey(survey)

        const loadTranslatedSurvey = async () => {
            try {
                const response = await fetch(
                    `/api/public/surveys/${encodeURIComponent(survey.slug)}/translate?language=${encodeURIComponent(resolvedLanguage)}`,
                    { cache: "no-store" }
                )
                if (!response.ok) return
                const payload = await response.json() as { survey?: PublicSurveyDefinition }
                if (isCurrent && payload.survey) {
                    setDisplaySurvey(payload.survey)
                }
            } catch (error) {
                console.warn("Survey translation could not be loaded", error)
            }
        }

        void loadTranslatedSurvey()

        return () => {
            isCurrent = false
        }
    }, [resolvedLanguage, show, survey])

    const activeSurvey = displaySurvey || survey

    if (!show || !activeSurvey) return null

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="survey-widget-title"
            className="absolute inset-0 z-50 flex min-h-0 flex-col overflow-hidden bg-background animate-in fade-in duration-200 dark:bg-zinc-950"
        >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b bg-background/95 px-5 py-4">
                <div className="flex min-w-0 items-start gap-3">
                    <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
                        style={{ backgroundColor: brandColor }}
                    >
                        <ClipboardList className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{moduleLabel}</p>
                        <h3 id="survey-widget-title" className="truncate text-base font-semibold leading-6">{activeSurvey.title}</h3>
                        {activeSurvey.description && (
                            <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{activeSurvey.description}</p>
                        )}
                    </div>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label={closeLabel} className="shrink-0">
                    <X className="h-4 w-4" aria-hidden="true" />
                </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden px-5 py-4">
                <SurveyResponseForm
                    survey={activeSurvey}
                    brandColor={brandColor}
                    language={resolvedLanguage}
                    mode="widget"
                    completeInternally={false}
                    showSurveyHeader={false}
                    submitLabel={submitLabel}
                    onSubmit={onSubmit}
                    onSubmitted={onClose}
                />
            </div>
        </div>
    )
}
