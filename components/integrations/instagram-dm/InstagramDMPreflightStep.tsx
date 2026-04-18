"use client"

import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MissingRequirementAlert } from "@/components/integrations/shared/MissingRequirementAlert"
import { PreflightChecklist } from "@/components/integrations/shared/PreflightChecklist"
import { INSTAGRAM_DM_PREFLIGHT_MESSAGES, type InstagramDMStatusPayload } from "@/lib/integrations/instagram-dm/types"

export function InstagramDMPreflightStep(props: {
    status: InstagramDMStatusPayload
    connecting?: boolean
    checking?: boolean
    onConnect: () => void
    onPreflight: () => void
}) {
    const preflight = props.status.config.preflightResult

    return (
        <Card className="border-border/70">
            <CardHeader>
                <CardTitle className="text-base">1. Ön kontrol</CardTitle>
                <CardDescription>Önce Instagram hesabınızın mesaj almaya hazır olup olmadığını kontrol edin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="button" onClick={props.onConnect} disabled={props.connecting}>
                        {props.connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Instagram ile bağlan
                    </Button>
                    <Button type="button" variant="outline" onClick={props.onPreflight} disabled={props.checking}>
                        {props.checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Ön kontrolü çalıştır
                    </Button>
                </div>

                {preflight ? (
                    <PreflightChecklist
                        items={[
                            {
                                id: "hasFacebookPage",
                                title: "Facebook Sayfası",
                                ok: preflight.hasFacebookPage,
                                okMessage: INSTAGRAM_DM_PREFLIGHT_MESSAGES.hasFacebookPage.ok,
                                failMessage: INSTAGRAM_DM_PREFLIGHT_MESSAGES.hasFacebookPage.fail,
                            },
                            {
                                id: "instagramLinkedToPage",
                                title: "Instagram bağlantısı",
                                ok: preflight.instagramLinkedToPage,
                                okMessage: INSTAGRAM_DM_PREFLIGHT_MESSAGES.instagramLinkedToPage.ok,
                                failMessage: INSTAGRAM_DM_PREFLIGHT_MESSAGES.instagramLinkedToPage.fail,
                            },
                            {
                                id: "instagramIsProfessional",
                                title: "Profesyonel hesap",
                                ok: preflight.instagramIsProfessional,
                                okMessage: INSTAGRAM_DM_PREFLIGHT_MESSAGES.instagramIsProfessional.ok,
                                failMessage: INSTAGRAM_DM_PREFLIGHT_MESSAGES.instagramIsProfessional.fail,
                            },
                            {
                                id: "messageAccessEnabled",
                                title: "Mesaj erişimi",
                                ok: preflight.messageAccessEnabled,
                                okMessage: INSTAGRAM_DM_PREFLIGHT_MESSAGES.messageAccessEnabled.ok,
                                failMessage: INSTAGRAM_DM_PREFLIGHT_MESSAGES.messageAccessEnabled.fail,
                            },
                            {
                                id: "tokenPresent",
                                title: "Bağlantı bilgisi",
                                ok: preflight.tokenPresent,
                                okMessage: INSTAGRAM_DM_PREFLIGHT_MESSAGES.tokenPresent.ok,
                                failMessage: INSTAGRAM_DM_PREFLIGHT_MESSAGES.tokenPresent.fail,
                            },
                            {
                                id: "webhookActive",
                                title: "Mesaj akışı",
                                ok: preflight.webhookActive,
                                okMessage: INSTAGRAM_DM_PREFLIGHT_MESSAGES.webhookActive.ok,
                                failMessage: INSTAGRAM_DM_PREFLIGHT_MESSAGES.webhookActive.fail,
                            },
                        ]}
                    />
                ) : (
                    <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                        Henüz kontrol çalıştırılmadı. Önce hesabınızı bağlayın, ardından ön kontrolü başlatın.
                    </div>
                )}

                {preflight?.failureReason ? <MissingRequirementAlert message={preflight.failureReason} onAction={props.onPreflight} actionLabel="Kontrolü tekrar çalıştır" /> : null}
            </CardContent>
        </Card>
    )
}
