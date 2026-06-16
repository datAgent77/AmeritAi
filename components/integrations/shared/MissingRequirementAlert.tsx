"use client"

import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"

export function MissingRequirementAlert(props: {
    title?: string
    message: string
    actionLabel?: string
    onAction?: () => void
}) {
    const { t } = useLanguage()
    return (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
            <AlertCircle className="text-amber-700" />
            <AlertTitle>{props.title || t('aStepMissing')}</AlertTitle>
            <AlertDescription className="gap-3 text-amber-800">
                <p>{props.message}</p>
                {props.onAction ? (
                    <Button type="button" variant="outline" size="sm" className="border-amber-200 bg-white text-amber-900" onClick={props.onAction}>
                        {props.actionLabel || t('tryAgain')}
                    </Button>
                ) : null}
            </AlertDescription>
        </Alert>
    )
}
