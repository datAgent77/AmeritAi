"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, RefreshCw, Siren, Waves } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { useOmniAccount } from "@/context/OmniAccountContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { formatOmniDateTime, getOmniChannelLabel, getOmniEnumLabel } from "@/lib/omni/i18n"
import { OmniMetricTile, OmniSectionCard, OmniSectionHeader, OmniStateShell } from "@/components/omni/omni-ui"

interface OmniDashboardPayload {
    generatedAt?: string | null
    summary: {
        readinessScore: number
        overallReady: boolean
        attentionRequired: boolean
        enabledChannels: string[]
        readyChannels: string[]
        blockedChannels: string[]
        openCallbacks: number
        overdueCallbacks: number
        dueTodayCallbacks: number
        pendingAppointments: number
        openLeads: number
        manualMergeReview: number
        exhaustedRetries: number
        lastActivityAt?: string | null
    }
    channels: Record<
        "voice" | "whatsapp" | "instagram",
        {
            enabled: boolean
            ready: boolean
            blockers: string[]
            openCallbacks: number
            failedDeliveries: number
            lastAuditAt?: string | null
            lastDeliveryAt?: string | null
        }
    >
    pipeline: {
        callbacks: {
            open: number
            overdue: number
            dueToday: number
        }
        appointments: {
            pending: number
            completed: number
        }
        leads: {
            open: number
            qualified: number
            converted: number
        }
    }
    recentCriticalEvents: Array<{
        id?: string
        channel: string
        eventType: string
        result: string
        message?: string | null
        createdAt?: string | null
    }>
    recentCallbackQueue: Array<{
        id: string
        displayName?: string | null
        sourceChannel: string
        status: string
        resolutionStatus: string
        owner?: string | null
        priority?: string | null
        dueAt?: string | null
    }>
    nextActions: Array<{
        id: string
        href: string
    }>
}

export function OmniDashboardPanel() {
    const { user } = useAuth()
    const { activeAccountId: chatbotId } = useOmniAccount()
    const { language, t } = useLanguage()
    const { toast } = useToast()
    const [payload, setPayload] = useState<OmniDashboardPayload | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const load = async () => {
        if (!user) return

        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/dashboard?chatbotId=${chatbotId || user.uid}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load dashboard")
            }

            const data = await response.json()
            setPayload(data)
        } catch (error) {
            console.error("Failed to load Omni dashboard", error)
            setPayload(null)
            toast({
                title: t("omni.dashboard.toast.loadFailed.title"),
                description: t("omni.dashboard.toast.loadFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [user])

    const readinessLabel = useMemo(() => {
        if (!payload) return "0%"
        return `${payload.summary.readinessScore}%`
    }, [payload])

    if (isLoading) {
        return <OmniStateShell title={t("omni.common.loading")} description={t("omni.dashboard.refresh")} />
    }

    if (!payload) {
        return <OmniStateShell title={t("omni.dashboard.empty")} description={t("omni.dashboard.toast.loadFailed.description")} tone="warning" />
    }

    return (
        <div className="space-y-6">
            <OmniSectionHeader
                title={t("omni.page.dashboard.title")}
                description={t("omni.dashboard.nextActions.description")}
                action={
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge className={payload.summary.overallReady ? "bg-emerald-600 text-white hover:bg-emerald-600" : "bg-amber-500 text-white hover:bg-amber-500"}>
                            {payload.summary.overallReady ? t("omni.dashboard.status.ready") : t("omni.dashboard.status.actionRequired")}
                        </Badge>
                        <Badge variant="outline" className="rounded-full bg-white/80">
                            {t("omni.dashboard.lastActivity")}{" "}
                            {payload.summary.lastActivityAt
                                ? formatOmniDateTime(payload.summary.lastActivityAt, language)
                                : t("omni.dashboard.noActivity")}
                        </Badge>
                        <Button variant="outline" onClick={load} className="bg-white/80">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            {t("omni.dashboard.refresh")}
                        </Button>
                    </div>
                }
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <OmniMetricTile
                    label={t("omni.dashboard.metric.readiness.title")}
                    value={readinessLabel}
                    note={`${payload.summary.readyChannels.length}/${payload.summary.enabledChannels.length} ${t("omni.dashboard.metric.readiness.note")}`}
                    tone={payload.summary.overallReady ? "default" : "warning"}
                    icon={<CheckCircle2 className="h-4 w-4" />}
                />
                <OmniMetricTile
                    label={t("omni.dashboard.metric.callbacks.title")}
                    value={payload.summary.openCallbacks}
                    note={`${payload.summary.overdueCallbacks} ${t("omni.dashboard.metric.callbacks.overdue")} • ${payload.summary.dueTodayCallbacks} ${t("omni.dashboard.metric.callbacks.dueToday")}`}
                    tone={payload.summary.overdueCallbacks > 0 ? "danger" : payload.summary.dueTodayCallbacks > 0 ? "warning" : "default"}
                    icon={<Siren className="h-4 w-4" />}
                />
                <OmniMetricTile
                    label={t("omni.dashboard.metric.pipeline.title")}
                    value={payload.summary.pendingAppointments + payload.summary.openLeads}
                    note={`${payload.summary.pendingAppointments} ${t("omni.dashboard.metric.pipeline.appointments")} • ${payload.summary.openLeads} ${t("omni.dashboard.metric.pipeline.leads")}`}
                    icon={<Waves className="h-4 w-4" />}
                />
                <OmniMetricTile
                    label={t("omni.dashboard.metric.risk.title")}
                    value={payload.summary.manualMergeReview + payload.summary.exhaustedRetries}
                    note={`${payload.summary.manualMergeReview} ${t("omni.dashboard.metric.risk.merge")} • ${payload.summary.exhaustedRetries} ${t("omni.dashboard.metric.risk.retries")}`}
                    tone={payload.summary.manualMergeReview + payload.summary.exhaustedRetries > 0 ? "warning" : "default"}
                    icon={<AlertTriangle className="h-4 w-4" />}
                />
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
                {(["voice", "whatsapp", "instagram"] as const).map((channel) => {
                    const channelData = payload.channels[channel]
                    const channelHref =
                        channel === "voice"
                            ? "/omni/channels/voice-calls"
                            : channel === "whatsapp"
                            ? "/omni/channels/whatsapp"
                            : "/omni/channels/instagram-dm"
                    return (
                        <OmniSectionCard
                            key={channel}
                            title={getOmniChannelLabel(t, channel)}
                            description={
                                !channelData.enabled
                                    ? t("omni.common.disabled")
                                    : channelData.ready
                                      ? t("omni.dashboard.channel.readyNote")
                                      : `${channelData.blockers.length} ${t("omni.dashboard.channel.blockerNote")}`
                            }
                            action={
                                <Badge className={channelData.enabled ? (channelData.ready ? "bg-emerald-600 text-white hover:bg-emerald-600" : "bg-amber-500 text-white hover:bg-amber-500") : "bg-slate-200 text-slate-700 hover:bg-slate-200"}>
                                        {channelData.enabled
                                            ? channelData.ready
                                                ? t("omni.dashboard.channel.healthy")
                                                : t("omni.dashboard.channel.blocked")
                                            : t("omni.common.disabled")}
                                </Badge>
                            }
                        >
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                                    <span className="text-muted-foreground">{t("omni.dashboard.channel.openCallbacks")}</span>
                                    <Badge variant="outline">{channelData.openCallbacks}</Badge>
                                </div>
                                <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                                    <span className="text-muted-foreground">{t("omni.dashboard.channel.failedDeliveries")}</span>
                                    <Badge variant="outline">{channelData.failedDeliveries}</Badge>
                                </div>
                                <div className="rounded-lg border border-border/60 bg-white/60 px-4 py-3 text-muted-foreground">
                                    <div>{t("omni.dashboard.channel.lastAudit")}: {channelData.lastAuditAt ? formatOmniDateTime(channelData.lastAuditAt, language) : t("omni.dashboard.noActivity")}</div>
                                    <div>{t("omni.dashboard.channel.lastDelivery")}: {channelData.lastDeliveryAt ? formatOmniDateTime(channelData.lastDeliveryAt, language) : t("omni.dashboard.noActivity")}</div>
                                </div>
                                {!channelData.ready && channelData.blockers.length > 0 ? (
                                    <div className="space-y-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/70 px-4 py-3 text-muted-foreground">
                                        {channelData.blockers.slice(0, 3).map((blocker) => (
                                            <div key={blocker}>{blocker}</div>
                                        ))}
                                    </div>
                                ) : null}
                                <Button asChild variant="outline" size="sm" className="w-full rounded-lg bg-white/80">
                                    <Link href={channelHref}>
                                        {t("omni.dashboard.nextActions.open")}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        </OmniSectionCard>
                    )
                })}
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
                <OmniSectionCard className="xl:col-span-1" title={t("omni.dashboard.nextActions.title")} description={t("omni.dashboard.nextActions.description")}>
                    <div className="space-y-3">
                        {payload.nextActions.map((action) => (
                            <div key={action.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                                <div className="text-sm leading-6">{t(`omni.dashboard.nextAction.${action.id}`)}</div>
                                <Button asChild size="sm" variant="outline" className="rounded-lg bg-white/80">
                                    <Link href={action.href}>
                                        {t("omni.dashboard.nextActions.open")}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        ))}
                    </div>
                </OmniSectionCard>

                <OmniSectionCard className="xl:col-span-1" title={t("omni.dashboard.pipeline.title")} description={t("omni.dashboard.pipeline.description")}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                            <span className="text-muted-foreground">{t("omni.dashboard.pipeline.callbacks")}</span>
                            <Badge variant="outline">
                                {payload.pipeline.callbacks.open} / {payload.pipeline.callbacks.overdue}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                            <span className="text-muted-foreground">{t("omni.dashboard.pipeline.appointments")}</span>
                            <Badge variant="outline">
                                {payload.pipeline.appointments.pending} / {payload.pipeline.appointments.completed}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                            <span className="text-muted-foreground">{t("omni.dashboard.pipeline.leads")}</span>
                            <Badge variant="outline">
                                {payload.pipeline.leads.open} / {payload.pipeline.leads.converted}
                            </Badge>
                        </div>
                    </div>
                </OmniSectionCard>

                <OmniSectionCard className="xl:col-span-1" title={t("omni.dashboard.alerts.title")} description={t("omni.dashboard.alerts.description")}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Siren className="h-4 w-4" />
                                {t("omni.dashboard.alerts.criticalEvents")}
                            </div>
                            <Badge variant={payload.recentCriticalEvents.length > 0 ? "destructive" : "outline"}>
                                {payload.recentCriticalEvents.length}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Waves className="h-4 w-4" />
                                {t("omni.dashboard.alerts.exhaustedRetries")}
                            </div>
                            <Badge variant={payload.summary.exhaustedRetries > 0 ? "destructive" : "outline"}>
                                {payload.summary.exhaustedRetries}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <AlertTriangle className="h-4 w-4" />
                                {t("omni.dashboard.alerts.mergeReview")}
                            </div>
                            <Badge variant={payload.summary.manualMergeReview > 0 ? "destructive" : "outline"}>
                                {payload.summary.manualMergeReview}
                            </Badge>
                        </div>
                    </div>
                </OmniSectionCard>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                <OmniSectionCard title={t("omni.dashboard.criticalEvents.title")} description={t("omni.dashboard.criticalEvents.description")}>
                    <div className="space-y-3">
                        {payload.recentCriticalEvents.length === 0 ? (
                            <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                                {t("omni.dashboard.criticalEvents.empty")}
                            </div>
                        ) : (
                            payload.recentCriticalEvents.map((event) => (
                                <div key={event.id || `${event.channel}-${event.eventType}`} className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline">{getOmniChannelLabel(t, event.channel)}</Badge>
                                        <Badge variant={event.result === "denied" ? "destructive" : "secondary"}>
                                            {getOmniEnumLabel(t, "result", event.result)}
                                        </Badge>
                                    </div>
                                    <div className="mt-2 font-medium">{event.eventType}</div>
                                    {event.message ? <div className="mt-1 text-muted-foreground">{event.message}</div> : null}
                                    <div className="mt-2 text-xs text-muted-foreground">
                                        {event.createdAt ? formatOmniDateTime(event.createdAt, language) : t("omni.dashboard.noActivity")}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </OmniSectionCard>

                <OmniSectionCard title={t("omni.dashboard.callbackQueue.title")} description={t("omni.dashboard.callbackQueue.description")}>
                    <div className="space-y-3">
                        {payload.recentCallbackQueue.length === 0 ? (
                            <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                                {t("omni.dashboard.callbackQueue.empty")}
                            </div>
                        ) : (
                            payload.recentCallbackQueue.map((item) => (
                                <div key={item.id} className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="font-medium">{item.displayName || t("omni.dashboard.callbackQueue.unknownContact")}</div>
                                        <Badge variant="outline">{getOmniEnumLabel(t, "priority", item.priority || "normal")}</Badge>
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-muted-foreground">
                                        <Badge variant="secondary">{getOmniChannelLabel(t, item.sourceChannel)}</Badge>
                                        <Badge variant="outline">{getOmniEnumLabel(t, "callbackStatus", item.status)}</Badge>
                                        <Badge variant="outline">{getOmniEnumLabel(t, "callbackResolution", item.resolutionStatus)}</Badge>
                                    </div>
                                    <div className="mt-2 text-muted-foreground">
                                        {t("omni.dashboard.callbackQueue.owner")}: {item.owner || t("omni.dashboard.callbackQueue.unassigned")}
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                        {t("omni.dashboard.callbackQueue.dueAt")}:{" "}
                                        {item.dueAt ? formatOmniDateTime(item.dueAt, language) : t("omni.dashboard.callbackQueue.noDueAt")}
                                    </div>
                                    <div className="mt-3">
                                        <Button asChild variant="outline" size="sm" className="rounded-lg bg-white/80">
                                            <Link href={`/omni/operations/callback-queue?callbackId=${encodeURIComponent(item.id)}`}>
                                                {t("omni.dashboard.nextActions.open")}
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </OmniSectionCard>
            </div>
        </div>
    )
}
