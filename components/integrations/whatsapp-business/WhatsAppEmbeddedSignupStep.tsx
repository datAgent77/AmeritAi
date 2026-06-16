"use client"

import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/context/LanguageContext"

export function WhatsAppEmbeddedSignupStep(props: {
    connecting?: boolean
    onConnect: () => void
}) {
    const { t } = useLanguage()
    return (
        <Card className="border-border/70">
            <CardHeader>
                <CardTitle className="text-base">{t('completeMetaWindow')}</CardTitle>
                <CardDescription>
                    {t('embeddedSignupHint')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button type="button" onClick={props.onConnect} disabled={props.connecting}>
                    {props.connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t('openMetaWindow')}
                </Button>
            </CardContent>
        </Card>
    )
}
