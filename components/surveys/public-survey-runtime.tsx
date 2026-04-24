"use client"

import { useState } from "react"
import { SurveyResponseForm } from "@/components/surveys/survey-response-form"
import type { PublicSurveyDefinition } from "@/lib/surveys/types"

type PublicSurveyRuntimeProps = {
    survey: PublicSurveyDefinition
}

export function PublicSurveyRuntime({ survey }: PublicSurveyRuntimeProps) {
    const [brandColor] = useState("#111827")
    const language = typeof navigator !== "undefined" ? navigator.language : "en"
    const isTurkish = language.toLowerCase().startsWith("tr")

    return (
        <SurveyResponseForm
            survey={survey}
            brandColor={brandColor}
            language={language}
            mode="page"
            onSubmit={async (payload) => {
                const response = await fetch(`/api/public/surveys/${survey.slug}/responses`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        ...payload,
                        source: "publicPage",
                    }),
                })

                if (!response.ok) {
                    const data = await response.json().catch(() => ({}))
                    throw new Error(typeof data?.error === "string" ? data.error : (isTurkish ? "Anket gönderilemedi." : "Survey could not be submitted."))
                }
            }}
        />
    )
}
