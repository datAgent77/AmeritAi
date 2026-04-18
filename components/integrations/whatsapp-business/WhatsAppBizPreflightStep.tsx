"use client"

import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MissingRequirementAlert } from "@/components/integrations/shared/MissingRequirementAlert"
import { PreflightChecklist } from "@/components/integrations/shared/PreflightChecklist"
import { WHATSAPP_PREFLIGHT_MESSAGES, type WhatsAppBizStatusPayload } from "@/lib/integrations/whatsapp-business/types"

export function WhatsAppBizPreflightStep(props: {
    status: WhatsAppBizStatusPayload
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
                <CardDescription>Önce WhatsApp Business hesabınızın mesaj almaya hazır olup olmadığını kontrol edin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="button" onClick={props.onConnect} disabled={props.connecting}>
                        {props.connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        WhatsApp Business ile bağlan
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
                                id: "embeddedSignupCompleted",
                                title: "Kurulum tamamlandı",
                                ok: preflight.embeddedSignupCompleted,
                                okMessage: WHATSAPP_PREFLIGHT_MESSAGES.embeddedSignupCompleted.ok,
                                failMessage: WHATSAPP_PREFLIGHT_MESSAGES.embeddedSignupCompleted.fail,
                            },
                            {
                                id: "wabaPresent",
                                title: "İşletme hesabı",
                                ok: preflight.wabaPresent,
                                okMessage: WHATSAPP_PREFLIGHT_MESSAGES.wabaPresent.ok,
                                failMessage: WHATSAPP_PREFLIGHT_MESSAGES.wabaPresent.fail,
                            },
                            {
                                id: "phoneNumberVerified",
                                title: "Telefon numarası",
                                ok: preflight.phoneNumberVerified,
                                okMessage: WHATSAPP_PREFLIGHT_MESSAGES.phoneNumberVerified.ok,
                                failMessage: WHATSAPP_PREFLIGHT_MESSAGES.phoneNumberVerified.fail,
                            },
                            {
                                id: "tokenPresent",
                                title: "Bağlantı bilgisi",
                                ok: preflight.tokenPresent,
                                okMessage: WHATSAPP_PREFLIGHT_MESSAGES.tokenPresent.ok,
                                failMessage: WHATSAPP_PREFLIGHT_MESSAGES.tokenPresent.fail,
                            },
                            {
                                id: "webhookActive",
                                title: "Mesaj akışı",
                                ok: preflight.webhookActive,
                                okMessage: WHATSAPP_PREFLIGHT_MESSAGES.webhookActive.ok,
                                failMessage: WHATSAPP_PREFLIGHT_MESSAGES.webhookActive.fail,
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
