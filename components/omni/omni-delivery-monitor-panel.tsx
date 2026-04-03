"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, RefreshCw, RotateCcw, Send } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { useOmniAccount } from "@/context/OmniAccountContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { formatOmniDateTime, getOmniChannelLabel, getOmniEnumLabel } from "@/lib/omni/i18n"
import type { OmniDeliveryAttemptRecord, OmniDeliveryErrorClass, OmniProviderChannel } from "@/lib/omni/types"

interface DeliverySummary {
    total: number
    success: number
    failed: number
    retryEligible: number
    pendingAutoRetries: number
    exhaustedRetries: number
    byChannel: Record<string, number>
}

interface DeliveryPayload {
    attempts: OmniDeliveryAttemptRecord[]
    summary: DeliverySummary
}

function formatErrorLabel(errorClass: OmniDeliveryErrorClass | null | undefined, t: (key: string) => string) {
    return getOmniEnumLabel(t, "errorClass", errorClass || "unknown")
}

export function OmniDeliveryMonitorPanel() {
    const { user } = useAuth()
    const { activeAccountId: chatbotId } = useOmniAccount()
    const { language, t } = useLanguage()
    const { toast } = useToast()
    const [payload, setPayload] = useState<DeliveryPayload | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isRetryingId, setIsRetryingId] = useState<string | null>(null)
    const [filters, setFilters] = useState({
        channel: "all",
        status: "all",
        errorClass: "all",
    })

    const loadAttempts = async () => {
        if (!user) return

        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const params = new URLSearchParams({
                chatbotId: chatbotId || user.uid,
                limit: "60",
            })

            if (filters.channel !== "all") {
                params.set("channel", filters.channel)
            }
            if (filters.status !== "all") {
                params.set("status", filters.status)
            }
            if (filters.errorClass !== "all") {
                params.set("errorClass", filters.errorClass)
            }

            const response = await fetch(`/api/omni/delivery-attempts?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load delivery attempts")
            }

            const data: DeliveryPayload = await response.json()
            setPayload(data)
        } catch (error) {
            console.error("Failed to load delivery attempts", error)
            setPayload(null)
            toast({
                title: t("omni.delivery.toast.loadFailed.title"),
                description: t("omni.delivery.toast.loadFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadAttempts()
    }, [user, filters.channel, filters.status, filters.errorClass])

    const summary = useMemo(
        () =>
            payload?.summary || {
                total: 0,
                success: 0,
                failed: 0,
                retryEligible: 0,
                pendingAutoRetries: 0,
                exhaustedRetries: 0,
                byChannel: {},
            },
        [payload]
    )

    const handleRetry = async (attemptId: string) => {
        if (!user) return

        setIsRetryingId(attemptId)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/delivery-attempts/retry", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chatbotId: chatbotId || user.uid,
                    id: attemptId,
                }),
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.error || "Retry failed")
            }

            toast({
                title: t("omni.delivery.toast.retrySuccess.title"),
                description: `${t("omni.delivery.retry.newAttempt")}: ${data?.delivery?.deliveryAttemptId || t("omni.common.notAvailable")}`,
            })
            await loadAttempts()
        } catch (error) {
            toast({
                title: t("omni.delivery.toast.retryFailed.title"),
                description: error instanceof Error ? error.message : t("omni.delivery.toast.retryFailed.description"),
                variant: "destructive",
            })
            await loadAttempts()
        } finally {
            setIsRetryingId(null)
        }
    }

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
                    Delivery monitor data could not be loaded.
                    
                </CardContent>
            </Card>
        )
    }

    const channelOptions = [
        { value: "all", label: t("omni.delivery.filter.allChannels") },
        { value: "whatsapp", label: getOmniChannelLabel(t, "whatsapp") },
        { value: "instagram", label: getOmniChannelLabel(t, "instagram") },
        { value: "voice", label: getOmniChannelLabel(t, "voice") },
    ]

    const statusOptions = [
        { value: "all", label: t("omni.delivery.filter.allStatuses") },
        { value: "failed", label: getOmniEnumLabel(t, "deliveryStatus", "failed") },
        { value: "success", label: getOmniEnumLabel(t, "deliveryStatus", "success") },
    ]

    const errorOptions = [
        { value: "all", label: t("omni.delivery.filter.allErrorClasses") },
        { value: "config", label: getOmniEnumLabel(t, "errorClass", "config") },
        { value: "auth", label: getOmniEnumLabel(t, "errorClass", "auth") },
        { value: "rate_limit", label: getOmniEnumLabel(t, "errorClass", "rate_limit") },
        { value: "provider", label: getOmniEnumLabel(t, "errorClass", "provider") },
        { value: "network", label: getOmniEnumLabel(t, "errorClass", "network") },
        { value: "unknown", label: getOmniEnumLabel(t, "errorClass", "unknown") },
    ]

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card>
                    <CardHeader>
                        <CardDescription>{t("omni.delivery.metric.total")}</CardDescription>
                        <CardTitle className="text-2xl">{summary.total}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>{t("omni.delivery.metric.success")}</CardDescription>
                        <CardTitle className="text-2xl">{summary.success}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>{t("omni.delivery.metric.failed")}</CardDescription>
                        <CardTitle className="text-2xl">{summary.failed}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>{t("omni.delivery.metric.retryable")}</CardDescription>
                        <CardTitle className="text-2xl">{summary.retryEligible}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>{t("omni.delivery.metric.pendingAutoRetries")}</CardDescription>
                        <CardTitle className="text-2xl">{summary.pendingAutoRetries}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>{t("omni.delivery.metric.exhaustedRetries")}</CardDescription>
                        <CardTitle className="text-2xl">{summary.exhaustedRetries}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t("omni.delivery.filter.title")}</CardTitle>
                    <CardDescription>{t("omni.delivery.filter.description")}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
                    <label className="space-y-2 text-sm">
                        <span className="font-medium">{t("omni.common.channel")}</span>
                        <select
                            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                            value={filters.channel}
                            onChange={(event) => setFilters((current) => ({ ...current, channel: event.target.value }))}
                        >
                            {channelOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </label>
                    <label className="space-y-2 text-sm">
                        <span className="font-medium">{t("omni.common.status")}</span>
                        <select
                            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                            value={filters.status}
                            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                        >
                            {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </label>
                    <label className="space-y-2 text-sm">
                        <span className="font-medium">{t("omni.delivery.filter.errorClass")}</span>
                        <select
                            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                            value={filters.errorClass}
                            onChange={(event) => setFilters((current) => ({ ...current, errorClass: event.target.value }))}
                        >
                            {errorOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </label>
                    <div className="flex items-end">
                        <Button variant="outline" onClick={loadAttempts}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            {t("omni.analytics.action.refresh")}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t("omni.delivery.attempts.title")}</CardTitle>
                    <CardDescription>{t("omni.delivery.attempts.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {payload.attempts.length === 0 ? (
                        <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                            {t("omni.delivery.attempts.empty")}
                        </div>
                    ) : (
                        payload.attempts.map((attempt) => (
                            <div key={attempt.id} className={`rounded-lg border p-4 ${attempt.status === "failed" ? "border-red-200 bg-red-50/40" : "bg-white"}`}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="text-sm font-medium text-foreground">
                                                {getOmniChannelLabel(t, attempt.channel)} via {attempt.provider}
                                            </div>
                                            <Badge variant={attempt.status === "success" ? "outline" : "destructive"}>{getOmniEnumLabel(t, "deliveryStatus", attempt.status)}</Badge>
                                            <Badge variant="outline">{t("omni.delivery.attempts.attemptNumber").replace("{number}", String(attempt.attemptNumber || 1))}</Badge>
                                            <Badge variant="outline">{attempt.source}</Badge>
                                            {attempt.retryMode && attempt.retryMode !== "none" ? (
                                                <Badge variant="outline">
                                                    {attempt.retryMode}:{attempt.retryState || "none"}
                                                </Badge>
                                            ) : null}
                                            {attempt.retryState === "exhausted" ? (
                                                <Badge className="bg-amber-500 text-white hover:bg-amber-500">{t("omni.delivery.attempts.needsReview")}</Badge>
                                            ) : null}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {t("omni.delivery.attempts.destination")}: {attempt.destination || t("omni.common.notAvailable")}
                                        </div>
                                        {attempt.payloadText ? (
                                            <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                                                {attempt.payloadText}
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className="flex flex-col items-end gap-2 text-right">
                                        <div className="text-xs text-muted-foreground">{attempt.createdAt ? formatOmniDateTime(attempt.createdAt, language) : t("omni.common.notAvailable")}</div>
                                        {attempt.retryEligible ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={isRetryingId === attempt.id}
                                                onClick={() => attempt.id && handleRetry(attempt.id)}
                                            >
                                                {isRetryingId === attempt.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                                                {t("omni.common.retry")}
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm text-muted-foreground">
                                    <div>
                                        <div className="font-medium text-foreground">{t("omni.delivery.attempts.providerIds")}</div>
                                        <div>{t("omni.delivery.attempts.messageId")}: {attempt.providerMessageId || t("omni.common.notAvailable")}</div>
                                        <div>{t("omni.delivery.attempts.targetId")}: {attempt.providerTargetId || t("omni.common.notAvailable")}</div>
                                    </div>
                                    <div>
                                        <div className="font-medium text-foreground">{t("omni.delivery.attempts.linkage")}</div>
                                        <div>{t("omni.delivery.attempts.session")}: {attempt.sessionId || t("omni.common.notAvailable")}</div>
                                        <div>{t("omni.delivery.attempts.callback")}: {attempt.callbackId || t("omni.common.notAvailable")}</div>
                                    </div>
                                    <div>
                                        <div className="font-medium text-foreground">{t("omni.delivery.attempts.failureClass")}</div>
                                        <div>{formatErrorLabel(attempt.errorClass, t)}</div>
                                        {attempt.errorMessage ? <div>{attempt.errorMessage}</div> : null}
                                        {attempt.nextRetryAt ? <div>{t("omni.delivery.attempts.nextRetry")}: {formatOmniDateTime(attempt.nextRetryAt, language)}</div> : null}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t("omni.delivery.channelMix.title")}</CardTitle>
                    <CardDescription>{t("omni.delivery.channelMix.description")}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                    {Object.entries(summary.byChannel).length === 0 ? (
                        <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                            {t("omni.delivery.channelMix.empty")}
                        </div>
                    ) : (
                        Object.entries(summary.byChannel).map(([channel, count]) => (
                            <div key={channel} className="rounded-lg border px-4 py-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                    <Send className="h-4 w-4" />
                                    {getOmniChannelLabel(t, channel as OmniProviderChannel)}
                                </div>
                                <div className="mt-2 text-2xl font-semibold">{count}</div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
