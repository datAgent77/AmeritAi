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
        <Card className="border-border/70 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="bg-slate-50/50 pb-4 border-b border-border/40">
                <CardTitle className="text-base flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-semibold">1</span>
                    Ön Kontrol & Bağlantı
                </CardTitle>
                <CardDescription className="text-xs">
                    Instagram hesabınızın mesaj almaya hazır olup olmadığını kontrol edin ve yetkilendirmeyi başlatın.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
                <div className="flex flex-col gap-3 sm:flex-row">
                    <Button 
                        type="button" 
                        onClick={props.onConnect} 
                        disabled={props.connecting}
                        className="w-full sm:w-auto bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white shadow-sm"
                    >
                        {props.connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Meta ile Giriş Yap
                    </Button>
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={props.onPreflight} 
                        disabled={props.checking}
                        className="w-full sm:w-auto"
                    >
                        {props.checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Sistemi Kontrol Et
                    </Button>
                </div>

                {preflight ? (
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                        <div className="bg-muted/50 px-4 py-3 border-b">
                            <h4 className="text-sm font-medium">Sistem Gereksinimleri</h4>
                        </div>
                        <div className="p-4">
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
                        </div>
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
                            <RefreshCw className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-sm font-semibold mb-1">Bağlantı Bekleniyor</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            Meta ile giriş yaparak uygulamanızı yetkilendirin. Ardından sistemi kontrol edebilirsiniz.
                        </p>
                    </div>
                )}

                {preflight?.failureReason ? <MissingRequirementAlert message={preflight.failureReason} onAction={props.onPreflight} actionLabel="Kontrolü tekrar çalıştır" /> : null}
            </CardContent>
        </Card>
    )
}
