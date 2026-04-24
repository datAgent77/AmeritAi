"use client"

import { useEffect } from "react"
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

function isTurkish(language?: string) {
    return String(language || "").toLowerCase().startsWith("tr")
}

export function SurveyWidgetOverlay({ show, survey, brandColor = "#111827", language, onClose, onSubmit }: SurveyWidgetOverlayProps) {
    const tr = isTurkish(language)
    const moduleLabel = tr ? "Anket" : "Survey"
    const closeLabel = tr ? "Anketi kapat" : "Close survey"
    const submitLabel = tr ? "Anketi Gönder" : "Submit Survey"

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

    if (!show || !survey) return null

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/95 p-6 backdrop-blur-sm animate-in fade-in duration-300 dark:bg-zinc-950/98">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="survey-widget-title"
                className="flex max-h-full w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-border/70 bg-background shadow-2xl"
            >
                <div className="flex items-start justify-between gap-3 border-b bg-muted/20 px-5 py-4">
                    <div className="flex min-w-0 items-start gap-3">
                        <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
                            style={{ backgroundColor: brandColor }}
                        >
                            <ClipboardList className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{moduleLabel}</p>
                            <h3 id="survey-widget-title" className="truncate text-base font-semibold leading-6">{survey.title}</h3>
                            {survey.description && (
                                <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{survey.description}</p>
                            )}
                        </div>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label={closeLabel} className="shrink-0">
                        <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    <SurveyResponseForm
                        survey={survey}
                        brandColor={brandColor}
                        language={language}
                        mode="widget"
                        completeInternally={false}
                        showSurveyHeader={false}
                        submitLabel={submitLabel}
                        onSubmit={onSubmit}
                        onSubmitted={onClose}
                    />
                </div>
            </div>
        </div>
    )
}
