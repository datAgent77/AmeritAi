"use client"

import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MissingRequirementAlert } from "@/components/integrations/shared/MissingRequirementAlert"
import { PreflightChecklist } from "@/components/integrations/shared/PreflightChecklist"
import { getMessengerPreflightMessages, type MessengerDMStatusPayload } from "@/lib/integrations/messenger/types"
import { useLanguage } from "@/context/LanguageContext"

export function MessengerPreflightStep(props: {
    status: MessengerDMStatusPayload
    connecting?: boolean
    checking?: boolean
    onConnect: () => void
    onPreflight: () => void
}) {
    const { t, language } = useLanguage()
    const MESSENGER_DM_PREFLIGHT_MESSAGES = getMessengerPreflightMessages(language)
    const preflight = props.status.config.preflightResult

    return (
        <Card className="border-border/70 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="bg-slate-50/50 pb-4 border-b border-border/40">
                <CardTitle className="text-base flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-semibold">1</span>
                    {t('preflightTitle')}
                </CardTitle>
                <CardDescription className="text-xs">
                    {t('msgrPreflightDesc')}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
                <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                        type="button"
                        onClick={props.onConnect}
                        disabled={props.connecting}
                        className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
                    >
                        {props.connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t('loginWithMeta')}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={props.onPreflight}
                        disabled={props.checking}
                        className="w-full sm:w-auto"
                    >
                        {props.checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        {t('checkSystem')}
                    </Button>
                </div>

                {preflight ? (
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                        <div className="bg-muted/50 px-4 py-3 border-b">
                            <h4 className="text-sm font-medium">{t('systemRequirements')}</h4>
                        </div>
                        <div className="p-4">
                            <PreflightChecklist
                                items={[
                                    {
                                        id: "hasFacebookPage",
                                        title: t('preflightFacebookPage'),
                                        ok: preflight.hasFacebookPage,
                                        okMessage: MESSENGER_DM_PREFLIGHT_MESSAGES.hasFacebookPage.ok,
                                        failMessage: MESSENGER_DM_PREFLIGHT_MESSAGES.hasFacebookPage.fail,
                                    },
                                    {
                                        id: "pageIsMessagingEligible",
                                        title: t('preflightMessengerEligibility'),
                                        ok: preflight.pageIsMessagingEligible,
                                        okMessage: MESSENGER_DM_PREFLIGHT_MESSAGES.pageIsMessagingEligible.ok,
                                        failMessage: MESSENGER_DM_PREFLIGHT_MESSAGES.pageIsMessagingEligible.fail,
                                    },
                                    {
                                        id: "tokenPresent",
                                        title: t('preflightConnectionInfo'),
                                        ok: preflight.tokenPresent,
                                        okMessage: MESSENGER_DM_PREFLIGHT_MESSAGES.tokenPresent.ok,
                                        failMessage: MESSENGER_DM_PREFLIGHT_MESSAGES.tokenPresent.fail,
                                    },
                                    {
                                        id: "webhookActive",
                                        title: t('preflightMessageFlow'),
                                        ok: preflight.webhookActive,
                                        okMessage: MESSENGER_DM_PREFLIGHT_MESSAGES.webhookActive.ok,
                                        failMessage: MESSENGER_DM_PREFLIGHT_MESSAGES.webhookActive.fail,
                                    },
                                ]}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
                            <RefreshCw className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-sm font-semibold mb-1">{t('awaitingConnection')}</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            {t('preflightLoginHint')}
                        </p>
                    </div>
                )}

                {preflight?.failureReason ? (
                    <MissingRequirementAlert message={preflight.failureReason} onAction={props.onPreflight} actionLabel={t('rerunCheck')} />
                ) : null}
            </CardContent>
        </Card>
    )
}
