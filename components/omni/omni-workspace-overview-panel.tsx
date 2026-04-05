"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, BarChart3, Clock3, Loader2, RefreshCw, Users } from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { useOmniAccount } from "@/context/OmniAccountContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { formatOmniCopy, formatOmniDateTime, getOmniChannelLabel } from "@/lib/omni/i18n"
import type { OmniOverviewPayload } from "@/lib/omni/types"
import { OmniMetricTile, OmniSectionCard, OmniSectionHeader, OmniStateShell } from "@/components/omni/omni-ui"

function formatDuration(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, "0")}`
}

export function OmniWorkspaceOverviewPanel() {
    const { user } = useAuth()
    const { activeAccount, activeAccountId: chatbotId, canSwitchAccounts, isLoading: accountScopeLoading } = useOmniAccount()
    const { language, t } = useLanguage()
    const { toast } = useToast()
    const [payload, setPayload] = useState<OmniOverviewPayload | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [range, setRange] = useState<"7d" | "30d" | "90d">("30d")
    const [granularity, setGranularity] = useState<"day" | "week">("day")
    const [agentId, setAgentId] = useState<string>("all")

    const load = useCallback(async (nextRange = range, nextGranularity = granularity, nextAgentId = agentId) => {
        if (!user || !chatbotId) {
            setPayload(null)
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const query = new URLSearchParams({
                chatbotId,
                range: nextRange,
                granularity: nextGranularity,
            })
            if (nextAgentId !== "all") {
                query.set("agentId", nextAgentId)
            }

            const response = await fetch(`/api/omni/overview?${query.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load workspace overview")
            }

            const data = await response.json()
            setPayload(data)
        } catch (error) {
            console.error("Failed to load Omni overview", error)
            setPayload(null)
            toast({
                title: t("omni.workspace.toast.loadFailed.title"),
                description: t("omni.workspace.toast.loadFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }, [agentId, chatbotId, granularity, range, t, toast, user])

    useEffect(() => {
        void load()
    }, [load])

    if (accountScopeLoading) {
        return <OmniStateShell title={t("omni.workspace.state.loadingScope.title")} description={t("omni.workspace.state.loadingScope.description")} />
    }

    if (!chatbotId) {
        return (
            <OmniStateShell
                title={t("omni.workspace.state.selectAccount.title")}
                description={t("omni.workspace.state.selectAccount.description")}
                tone="warning"
                action={
                    canSwitchAccounts ? (
                        <Button asChild variant="outline" className="bg-white/80">
                            <Link href="/omni/directory/accounts">{t("omni.accountSwitcher.manageAccounts")}</Link>
                        </Button>
                    ) : null
                }
            />
        )
    }

    const activeAgent =
        payload && payload.scope.activeAgentId
            ? payload.availableAgents.find((agent) => agent.id === payload.scope.activeAgentId) || null
            : null

    if (isLoading) {
        return <OmniStateShell title={t("omni.workspace.state.loading.title")} description={t("omni.workspace.state.loading.description")} />
    }

    if (!payload) {
        return <OmniStateShell title={t("omni.workspace.state.unavailable.title")} description={t("omni.workspace.state.unavailable.description")} tone="warning" />
    }

    return (
        <div className="space-y-6">
            <OmniSectionHeader
                title={t("omni.workspace.header.title")}
                description={t("omni.workspace.header.description")}
                action={
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full bg-white/80">
                            {formatOmniCopy(t("omni.workspace.header.activeCalls"), { count: payload.headline.activeConversations })}
                        </Badge>
                        <Badge variant="outline" className="rounded-full bg-white/80">
                            {activeAccount?.companyName || activeAccount?.email || payload.scope.accountName || payload.scope.chatbotId}
                        </Badge>
                        {activeAgent ? (
                            <Badge className="bg-black text-white hover:bg-black">
                                {formatOmniCopy(t("omni.workspace.header.agent"), { name: activeAgent.name })}
                            </Badge>
                        ) : null}
                        <Button variant="outline" onClick={() => load()} className="bg-white/80">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            {t("omni.common.refresh")}
                        </Button>
                    </div>
                }
            />

            <Card className="sticky top-0 z-10 border-border/70 bg-[#f4f6f8]/95 backdrop-blur">
                <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="space-y-1">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("omni.workspace.filter.view")}</div>
                            <select
                                className="h-10 rounded-lg border border-input bg-white px-3 text-sm"
                                value="workspace"
                                onChange={() => undefined}
                            >
                                <option value="workspace">{t("omni.workspace.filter.workspace")}</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("omni.workspace.filter.dateRange")}</div>
                            <select
                                className="h-10 rounded-lg border border-input bg-white px-3 text-sm"
                                value={range}
                                onChange={(event) => {
                                    const value = event.target.value as "7d" | "30d" | "90d"
                                    setRange(value)
                                    load(value, granularity, agentId)
                                }}
                            >
                                <option value="7d">{t("omni.workspace.filter.range.7d")}</option>
                                <option value="30d">{t("omni.workspace.filter.range.30d")}</option>
                                <option value="90d">{t("omni.workspace.filter.range.90d")}</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("omni.workspace.filter.granularity")}</div>
                            <select
                                className="h-10 rounded-lg border border-input bg-white px-3 text-sm"
                                value={granularity}
                                onChange={(event) => {
                                    const value = event.target.value as "day" | "week"
                                    setGranularity(value)
                                    load(range, value, agentId)
                                }}
                            >
                                <option value="day">{t("omni.workspace.filter.granularity.day")}</option>
                                <option value="week">{t("omni.workspace.filter.granularity.week")}</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("omni.workspace.filter.agent")}</div>
                            <select
                                className="h-10 rounded-lg border border-input bg-white px-3 text-sm"
                                value={agentId}
                                onChange={(event) => {
                                    const value = event.target.value
                                    setAgentId(value)
                                    load(range, granularity, value)
                                }}
                            >
                                <option value="all">{t("omni.workspace.filter.agentAll")}</option>
                                {payload.availableAgents.map((agent) => (
                                    <option key={agent.id} value={agent.id}>
                                        {agent.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {formatOmniCopy(t("omni.common.generatedAt"), { date: formatOmniDateTime(payload.generatedAt, language) })}
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <OmniMetricTile
                    label={t("omni.workspace.metric.conversationCount.label")}
                    value={payload.headline.conversationCount}
                    note={formatOmniCopy(t("omni.workspace.metric.conversationCount.note"), { count: payload.headline.activeConversations })}
                    icon={<Users className="h-4 w-4" />}
                />
                <OmniMetricTile
                    label={t("omni.workspace.metric.averageDuration.label")}
                    value={formatDuration(payload.headline.averageDurationSeconds)}
                    note={t("omni.workspace.metric.averageDuration.note")}
                    icon={<Clock3 className="h-4 w-4" />}
                />
                <OmniMetricTile
                    label={t("omni.workspace.metric.totalCost.label")}
                    value={`$${payload.headline.totalCostUsd.toFixed(2)}`}
                    note={formatOmniCopy(t("omni.workspace.metric.totalCost.note"), {
                        value: `$${payload.headline.averageCostUsd.toFixed(2)}`,
                    })}
                    icon={<BarChart3 className="h-4 w-4" />}
                />
                <OmniMetricTile
                    label={t("omni.workspace.metric.openCallbacks.label")}
                    value={payload.headline.openCallbacks}
                    note={t("omni.workspace.metric.openCallbacks.note")}
                />
                <OmniMetricTile
                    label={t("omni.workspace.metric.openLeads.label")}
                    value={payload.headline.openLeads}
                    note={t("omni.workspace.metric.openLeads.note")}
                />
                <OmniMetricTile
                    label={t("omni.workspace.metric.successRate.label")}
                    value={`${payload.insights.successRate}%`}
                    note={t("omni.workspace.metric.successRate.note")}
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("omni.workspace.timeline.title")}</CardTitle>
                    <CardDescription>{t("omni.workspace.timeline.description")}</CardDescription>
                </CardHeader>
                <CardContent className="h-[320px]">
                    {payload.timeline.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                            {t("omni.workspace.timeline.empty")}
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={payload.timeline}>
                                <defs>
                                    <linearGradient id="omniConversations" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#111111" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#111111" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="conversations" stroke="#111111" fill="url(#omniConversations)" strokeWidth={2} />
                                <Area type="monotone" dataKey="callbacks" stroke="#f59e0b" fillOpacity={0} strokeWidth={2} />
                                <Area type="monotone" dataKey="leads" stroke="#2563eb" fillOpacity={0} strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-3">
                <OmniSectionCard title={t("omni.workspace.channelHealth.title")} description={t("omni.workspace.channelHealth.description")}>
                    <div className="space-y-3">
                        {payload.channelHealth.map((channel) => (
                            <div key={channel.channel} className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="font-medium">{getOmniChannelLabel(t, channel.channel)}</div>
                                    <Badge className={channel.ready ? "bg-emerald-600 text-white hover:bg-emerald-600" : "bg-amber-500 text-white hover:bg-amber-500"}>
                                        {channel.enabled
                                            ? channel.ready
                                                ? t("omni.workspace.channelHealth.status.ready")
                                                : t("omni.workspace.channelHealth.status.blocked")
                                            : t("omni.workspace.channelHealth.status.disabled")}
                                    </Badge>
                                </div>
                                {channel.blockers.length > 0 ? (
                                    <div className="mt-2 text-xs text-muted-foreground">
                                        {channel.blockers.slice(0, 2).join(" · ")}
                                    </div>
                                ) : (
                                    <div className="mt-2 text-xs text-muted-foreground">{t("omni.workspace.channelHealth.noBlockers")}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </OmniSectionCard>

                <OmniSectionCard title={t("omni.workspace.csat.title")} description={t("omni.workspace.csat.description")}>
                    <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center text-muted-foreground">
                        <div className="text-4xl font-semibold">--</div>
                        <div className="text-sm">{t("omni.workspace.csat.placeholder")}</div>
                    </div>
                </OmniSectionCard>

                <OmniSectionCard title={t("omni.workspace.criticalEvents.title")} description={t("omni.workspace.criticalEvents.description")}>
                    <div className="space-y-3">
                        {payload.criticalEvents.length === 0 ? (
                            <div className="rounded-lg border border-dashed px-4 py-5 text-sm text-muted-foreground">
                                {t("omni.workspace.criticalEvents.empty")}
                            </div>
                        ) : (
                            payload.criticalEvents.map((event) => (
                                <div key={event.id || `${event.channel}-${event.createdAt}`} className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="font-medium">{event.eventType}</div>
                                            <div className="mt-1 text-xs text-muted-foreground">
                                                {event.message || t("omni.common.noProviderMessage")}
                                            </div>
                                        </div>
                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                    </div>
                                    <div className="mt-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                                        {getOmniChannelLabel(t, event.channel)} · {event.result} · {event.createdAt ? formatOmniDateTime(event.createdAt, language) : t("omni.common.notAvailable")}
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
