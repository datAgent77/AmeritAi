"use client"

import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useLanguage } from "@/context/LanguageContext"

export function SupportDiagnosticDrawer(props: {
    title: string
    diagnostics?: {
        rawConfig: Record<string, unknown>
        rawLegacyConfig: Record<string, unknown>
        rawIntegration: Record<string, unknown>
        lastWebhookAt: string | null
        recentAuditEvents: Array<{
            id?: string
            eventType?: string
            result?: string
            message?: string | null
            createdAt?: string | null
        }>
    }
}) {
    const { t } = useLanguage()
    if (!props.diagnostics) {
        return null
    }

    return (
        <Drawer direction="right">
            <DrawerTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                    {t('technicalDiagnostics')}
                </Button>
            </DrawerTrigger>
            <DrawerContent className="sm:max-w-xl">
                <DrawerHeader>
                    <DrawerTitle>{props.title}</DrawerTitle>
                    <DrawerDescription>{t('diagnosticsSupportOnly')}</DrawerDescription>
                </DrawerHeader>
                <ScrollArea className="h-[80vh] px-4 pb-6">
                    <div className="space-y-5">
                        <div className="rounded-lg border bg-muted/40 p-4">
                            <p className="text-sm font-medium">{t('lastWebhookTime')}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{props.diagnostics.lastWebhookAt || t('noRecordYet')}</p>
                        </div>
                        <DiagnosticBlock title="Console Kanal Config" value={props.diagnostics.rawConfig} />
                        <DiagnosticBlock title="Legacy Omni Config" value={props.diagnostics.rawLegacyConfig} />
                        <DiagnosticBlock title="Chatbot Integration" value={props.diagnostics.rawIntegration} />
                        <div className="space-y-3">
                            <p className="text-sm font-medium">{t('recentAuditEvents')}</p>
                            <div className="space-y-3">
                                {props.diagnostics.recentAuditEvents.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{t('noAuditRecords')}</div>
                                ) : (
                                    props.diagnostics.recentAuditEvents.map((event) => (
                                        <div key={event.id || `${event.eventType}-${event.createdAt}`} className="rounded-lg border p-3">
                                            <p className="text-sm font-medium">{event.eventType || t('unknownEvent')}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">{event.createdAt || t('noDate')} • {event.result || "unknown"}</p>
                                            {event.message ? <p className="mt-2 text-sm text-muted-foreground">{event.message}</p> : null}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </DrawerContent>
        </Drawer>
    )
}

function DiagnosticBlock({ title, value }: { title: string; value: Record<string, unknown> }) {
    return (
        <div className="space-y-2">
            <p className="text-sm font-medium">{title}</p>
            <Separator />
            <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-50">{JSON.stringify(value, null, 2)}</pre>
        </div>
    )
}
