"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, BarChart3, Loader2, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { useOmniAccount } from "@/context/OmniAccountContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { formatOmniDateTime, getOmniChannelLabel, getOmniEnumLabel } from "@/lib/omni/i18n"

interface AnalyticsMetricMap {
    [key: string]: number
}

interface AnalyticsPayload {
    range: {
        days: number
        start: string
        end: string
    }
    overview: {
        sessions: number
        contacts: number
        callbacksOpen: number
        callbacksResolved: number
        auditFailures: number
        deliverySuccess: number
        deliveryFailures: number
        retryableDeliveries: number
        exhaustedDeliveries: number
        autoReplySuccess: number
        autoReplyFailure: number
        signatureDenied: number
        channelsEnabled: number
        channelsReady: number
        channelsBlocked: number
        channelsDisabled: number
    }
    channelStatus: Record<
        "web" | "whatsapp" | "instagram" | "voice",
        {
            enabled: boolean
            state: "ready" | "blocked" | "disabled"
            blockers: string[]
            lastActivityAt?: string | null
        }
    >
    channelBreakdown: {
        sessions: AnalyticsMetricMap
        callbacks: AnalyticsMetricMap
        contacts: AnalyticsMetricMap
        audits: AnalyticsMetricMap
        deliveries: AnalyticsMetricMap
    }
    contactQuality: {
        mergedContacts: number
        manualMergeReview: number
    }
    dispositions: Array<{ label: string; value: number }>
    auditSummary: {
        success: number
        failure: number
        byEvent: Array<{ label: string; value: number }>
        recentFailures: Array<{
            id: string
            channel: string
            eventType: string
            result: string
            message?: string | null
            createdAt?: string | null
        }>
    }
    timeline: Array<{
        day: string
        sessions: number
    }>
}

const RANGE_OPTIONS = [7, 30, 90]
const CHANNELS = ["web", "whatsapp", "instagram", "voice"]

function getChannelStateLabel(t: (key: string) => string, state: "ready" | "blocked" | "disabled") {
    if (state === "ready") return t("omni.dashboard.channel.healthy")
    if (state === "blocked") return t("omni.dashboard.channel.blocked")
    return t("omni.common.disabled")
}

function MetricCard({ title, value, note }: { title: string; value: string | number; note: string }) {
    return (
        <Card>
            <CardHeader>
                <CardDescription>{title}</CardDescription>
                <CardTitle className="text-2xl">{value}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{note}</CardContent>
        </Card>
    )
}

function BreakdownTable({
    title,
    description,
    values,
    renderChannel,
}: {
    title: string
    description: string
    values: AnalyticsMetricMap
    renderChannel: (channel: string) => string
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {CHANNELS.map((channel) => (
                    <div key={channel} className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm">
                        <div className="capitalize text-muted-foreground">{renderChannel(channel)}</div>
                        <Badge variant="outline">{values[channel] || 0}</Badge>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

function TimelineChart({ values, title, description }: { values: Array<{ day: string; sessions: number }>; title: string; description: string }) {
    const maxValue = Math.max(...values.map((item) => item.sessions), 1)

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex h-56 items-end gap-2">
                    {values.map((item) => (
                        <div key={item.day} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                            <div
                                className="w-full rounded-t-md bg-black/80"
                                style={{
                                    height: `${Math.max(8, (item.sessions / maxValue) * 180)}px`,
                                }}
                                title={`${item.day}: ${item.sessions}`}
                            />
                            <div className="line-clamp-1 text-center text-[10px] text-muted-foreground">
                                {item.day.slice(5)}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

export function OmniAnalyticsPanel() {
    const { user } = useAuth()
    const { activeAccountId: chatbotId } = useOmniAccount()
    const { language, t } = useLanguage()
    const { toast } = useToast()
    const [rangeDays, setRangeDays] = useState(30)
    const [payload, setPayload] = useState<AnalyticsPayload | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const load = async (days = rangeDays) => {
        if (!user) return

        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/analytics?chatbotId=${chatbotId || user.uid}&days=${days}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load analytics")
            }

            const data = await response.json()
            setPayload(data)
        } catch (error) {
            console.error("Failed to load Omni analytics", error)
            setPayload(null)
            toast({
                title: t("omni.analytics.toast.loadFailed.title"),
                description: t("omni.analytics.toast.loadFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        load(rangeDays)
    }, [user, rangeDays])

    const autoReplyRate = useMemo(() => {
        if (!payload) return "0%"
        const total = payload.overview.autoReplySuccess + payload.overview.autoReplyFailure
        if (total === 0) return "0%"
        return `${Math.round((payload.overview.autoReplySuccess / total) * 100)}%`
    }, [payload])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center rounded-lg border bg-white p-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!payload) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-16 text-center text-sm text-muted-foreground">
                    {t("omni.analytics.empty")}
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                    {RANGE_OPTIONS.map((option) => (
                        <Button
                            key={option}
                            variant={rangeDays === option ? "default" : "outline"}
                            onClick={() => setRangeDays(option)}
                        >
                            {t("omni.analytics.range.lastDays").replace("{days}", String(option))}
                        </Button>
                    ))}
                </div>
                <Button variant="outline" onClick={() => load(rangeDays)}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t("omni.analytics.action.refresh")}
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard title={t("omni.analytics.metric.sessions.title")} value={payload.overview.sessions} note={t("omni.analytics.metric.sessions.note")} />
                <MetricCard title={t("omni.analytics.metric.contacts.title")} value={payload.overview.contacts} note={t("omni.analytics.metric.contacts.note")} />
                <MetricCard title={t("omni.analytics.metric.callbacksOpen.title")} value={payload.overview.callbacksOpen} note={t("omni.analytics.metric.callbacksOpen.note")} />
                <MetricCard title={t("omni.analytics.metric.callbacksResolved.title")} value={payload.overview.callbacksResolved} note={t("omni.analytics.metric.callbacksResolved.note")} />
                <MetricCard title={t("omni.analytics.metric.autoReplySuccess.title")} value={payload.overview.autoReplySuccess} note={t("omni.analytics.metric.autoReplySuccess.note").replace("{rate}", autoReplyRate)} />
                <MetricCard title={t("omni.analytics.metric.deliverySuccess.title")} value={payload.overview.deliverySuccess} note={t("omni.analytics.metric.deliverySuccess.note")} />
                <MetricCard
                    title={t("omni.analytics.metric.deliveryFailures.title")}
                    value={payload.overview.deliveryFailures}
                    note={t("omni.analytics.metric.deliveryFailures.note").replace("{retryable}", String(payload.overview.retryableDeliveries)).replace("{exhausted}", String(payload.overview.exhaustedDeliveries))}
                />
                <MetricCard title={t("omni.analytics.metric.auditFailures.title")} value={payload.overview.auditFailures} note={t("omni.analytics.metric.auditFailures.note")} />
                <MetricCard title={t("omni.analytics.metric.signatureDenied.title")} value={payload.overview.signatureDenied} note={t("omni.analytics.metric.signatureDenied.note")} />
                <MetricCard title={t("omni.analytics.metric.manualMergeReview.title")} value={payload.contactQuality.manualMergeReview} note={t("omni.analytics.metric.manualMergeReview.note")} />
                <MetricCard title={t("omni.analytics.metric.channelsEnabled.title")} value={payload.overview.channelsEnabled} note={t("omni.analytics.metric.channelsEnabled.note")} />
                <MetricCard title={t("omni.analytics.metric.channelsReady.title")} value={payload.overview.channelsReady} note={t("omni.analytics.metric.channelsReady.note")} />
                <MetricCard title={t("omni.analytics.metric.channelsBlocked.title")} value={payload.overview.channelsBlocked} note={t("omni.analytics.metric.channelsBlocked.note")} />
                <MetricCard title={t("omni.analytics.metric.channelsDisabled.title")} value={payload.overview.channelsDisabled} note={t("omni.analytics.metric.channelsDisabled.note")} />
            </div>

            <TimelineChart values={payload.timeline} title={t("omni.analytics.timeline.title")} description={t("omni.analytics.timeline.description")} />

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{t("omni.analytics.channelStatus.title")}</CardTitle>
                    <CardDescription>{t("omni.analytics.channelStatus.description")}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 xl:grid-cols-2">
                    {CHANNELS.map((channel) => {
                        const status = payload.channelStatus[channel as keyof typeof payload.channelStatus]
                        const badgeVariant = status.state === "ready" ? "outline" : status.state === "blocked" ? "destructive" : "secondary"

                        return (
                            <div key={channel} className="rounded-lg border px-4 py-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-medium">{getOmniChannelLabel(t, channel)}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {t("omni.analytics.channelStatus.lastActivity")}:{" "}
                                            {status.lastActivityAt ? formatOmniDateTime(status.lastActivityAt, language) : t("omni.analytics.channelStatus.noActivity")}
                                        </div>
                                    </div>
                                    <Badge variant={badgeVariant}>{getChannelStateLabel(t, status.state)}</Badge>
                                </div>
                                {status.state === "blocked" && status.blockers.length > 0 ? (
                                    <div className="mt-3 space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900">
                                        <div className="font-medium">{t("omni.analytics.channelStatus.blockers")}</div>
                                        {status.blockers.slice(0, 4).map((blocker) => (
                                            <div key={blocker}>• {blocker}</div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-3 text-xs text-muted-foreground">
                                        {status.state === "disabled" ? t("omni.analytics.channelStatus.disabledNote") : t("omni.analytics.channelStatus.readyNote")}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
                <BreakdownTable
                    title={t("omni.analytics.breakdown.sessions.title")}
                    description={t("omni.analytics.breakdown.sessions.description")}
                    values={payload.channelBreakdown.sessions}
                    renderChannel={(channel) => getOmniChannelLabel(t, channel)}
                />
                <BreakdownTable
                    title={t("omni.analytics.breakdown.callbacks.title")}
                    description={t("omni.analytics.breakdown.callbacks.description")}
                    values={payload.channelBreakdown.callbacks}
                    renderChannel={(channel) => getOmniChannelLabel(t, channel)}
                />
                <BreakdownTable
                    title={t("omni.analytics.breakdown.contacts.title")}
                    description={t("omni.analytics.breakdown.contacts.description")}
                    values={payload.channelBreakdown.contacts}
                    renderChannel={(channel) => getOmniChannelLabel(t, channel)}
                />
                <BreakdownTable
                    title={t("omni.analytics.breakdown.audits.title")}
                    description={t("omni.analytics.breakdown.audits.description")}
                    values={payload.channelBreakdown.audits}
                    renderChannel={(channel) => getOmniChannelLabel(t, channel)}
                />
                <BreakdownTable
                    title={t("omni.analytics.breakdown.deliveries.title")}
                    description={t("omni.analytics.breakdown.deliveries.description")}
                    values={payload.channelBreakdown.deliveries}
                    renderChannel={(channel) => getOmniChannelLabel(t, channel)}
                />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <BarChart3 className="h-4 w-4" />
                            {t("omni.analytics.dispositions.title")}
                        </CardTitle>
                        <CardDescription>{t("omni.analytics.dispositions.description")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {payload.dispositions.length === 0 ? (
                            <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                {t("omni.analytics.dispositions.empty")}
                            </div>
                        ) : (
                            payload.dispositions.slice(0, 8).map((item) => (
                                <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm">
                                    <div className="text-muted-foreground">{item.label}</div>
                                    <Badge variant="outline">{item.value}</Badge>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">{t("omni.analytics.auditSummary.title")}</CardTitle>
                        <CardDescription>{t("omni.analytics.auditSummary.description")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {payload.auditSummary.byEvent.length === 0 ? (
                            <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                {t("omni.analytics.auditSummary.empty")}
                            </div>
                        ) : (
                            payload.auditSummary.byEvent.slice(0, 8).map((item) => (
                                <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm">
                                    <div className="truncate text-muted-foreground">{item.label}</div>
                                    <Badge variant="outline">{item.value}</Badge>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                            <AlertTriangle className="h-4 w-4" />
                            {t("omni.analytics.failures.title")}
                        </CardTitle>
                    <CardDescription>{t("omni.analytics.failures.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {payload.auditSummary.recentFailures.length === 0 ? (
                        <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                            {t("omni.analytics.failures.empty")}
                        </div>
                    ) : (
                        payload.auditSummary.recentFailures.map((failure) => (
                            <div key={failure.id} className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="text-sm font-medium text-foreground">
                                        {failure.eventType}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{getOmniChannelLabel(t, failure.channel)}</Badge>
                                        <Badge variant="destructive">{getOmniEnumLabel(t, "result", failure.result)}</Badge>
                                    </div>
                                </div>
                                <div className="mt-2 text-sm text-muted-foreground">{failure.message || t("omni.analytics.failures.noMessage")}</div>
                                <div className="mt-2 text-xs text-muted-foreground">{failure.createdAt ? formatOmniDateTime(failure.createdAt, language) : t("omni.common.notAvailable")}</div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
