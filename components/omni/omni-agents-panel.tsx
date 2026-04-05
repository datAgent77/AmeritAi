"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { ArrowRight, Bot, Loader2, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/context/AuthContext"
import { useOmniAccount } from "@/context/OmniAccountContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { formatOmniCopy, formatOmniDateTime, getOmniChannelLabel } from "@/lib/omni/i18n"
import type { OmniWorkspaceAgentSummary } from "@/lib/omni/types"
import { OmniStateShell } from "@/components/omni/omni-ui"

interface AgentsPayload {
    agents: OmniWorkspaceAgentSummary[]
    primaryAgentId?: string | null
}

export function OmniAgentsPanel() {
    const { user } = useAuth()
    const { activeAccountId: chatbotId, canSwitchAccounts, isLoading: accountScopeLoading } = useOmniAccount()
    const { language, t } = useLanguage()
    const { toast } = useToast()
    const [payload, setPayload] = useState<AgentsPayload | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [query, setQuery] = useState("")

    const load = useCallback(async () => {
        if (!user || !chatbotId) {
            setPayload(null)
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/agents?chatbotId=${chatbotId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load agents")
            }

            setPayload(await response.json())
        } catch (error) {
            console.error("Failed to load Omni agents", error)
            setPayload(null)
            toast({
                title: t("omni.agents.toast.loadFailed.title"),
                description: t("omni.agents.toast.loadFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }, [chatbotId, t, toast, user])

    useEffect(() => {
        void load()
    }, [load])

    if (accountScopeLoading) {
        return <OmniStateShell title={t("omni.agents.state.loadingScope.title")} description={t("omni.agents.state.loadingScope.description")} />
    }

    if (!chatbotId) {
        return (
            <OmniStateShell
                title={t("omni.agents.state.selectAccount.title")}
                description={t("omni.agents.state.selectAccount.description")}
                tone="warning"
                action={
                    canSwitchAccounts ? (
                        <Button asChild variant="outline">
                            <Link href="/omni/directory/accounts">{t("omni.accountSwitcher.manageAccounts")}</Link>
                        </Button>
                    ) : null
                }
            />
        )
    }

    const normalizedQuery = query.trim().toLowerCase()
    const agents = (payload?.agents || []).filter((agent) => {
        if (!normalizedQuery) {
            return true
        }

        return [agent.name, agent.description || "", agent.channels.join(" "), agent.capabilityIds.join(" ")]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)
    })

    if (isLoading) {
        return <OmniStateShell title={t("omni.agents.state.loading.title")} description={t("omni.agents.state.loading.description")} />
    }

    if (!payload) {
        return <OmniStateShell title={t("omni.agents.state.unavailable.title")} description={t("omni.agents.state.unavailable.description")} tone="warning" />
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative max-w-md flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("omni.agents.searchPlaceholder")} className="pl-9" />
                </div>
                <div className="text-sm text-muted-foreground">
                    {formatOmniCopy(agents.length === 1 ? t("omni.agents.count.one") : t("omni.agents.count.other"), { count: agents.length })}
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {agents.map((agent) => (
                    <Card key={agent.id} className="border-border/70 bg-white">
                        <CardHeader>
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                                        {agent.isPrimary ? <Badge className="bg-black text-white hover:bg-black">{t("omni.agents.badge.primary")}</Badge> : null}
                                        {!agent.active ? <Badge variant="outline">{t("omni.agents.badge.inactive")}</Badge> : null}
                                    </div>
                                    <CardDescription>{agent.description || t("omni.agents.card.noDescription")}</CardDescription>
                                </div>
                                <div className="rounded-xl bg-black/5 p-2">
                                    <Bot className="h-5 w-5" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {agent.channels.length > 0 ? (
                                    agent.channels.map((channel) => (
                                        <Badge key={channel} variant="outline">
                                            {getOmniChannelLabel(t, channel)}
                                        </Badge>
                                    ))
                                ) : (
                                    <Badge variant="outline">{t("omni.agents.card.noChannels")}</Badge>
                                )}
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
                                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("omni.agents.card.conversationVolume")}</div>
                                    <div className="mt-1 text-2xl font-semibold">{agent.conversationVolume}</div>
                                </div>
                                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
                                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t("omni.agents.card.outcomeRate")}</div>
                                    <div className="mt-1 text-2xl font-semibold">{agent.outcomeRate}%</div>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-lg border border-border/60 px-3 py-3 text-sm">
                                    <div className="text-muted-foreground">{t("omni.agents.card.callbacks")}</div>
                                    <div className="mt-1 font-semibold">{agent.openCallbacks}</div>
                                </div>
                                <div className="rounded-lg border border-border/60 px-3 py-3 text-sm">
                                    <div className="text-muted-foreground">{t("omni.agents.card.leads")}</div>
                                    <div className="mt-1 font-semibold">{agent.openLeads}</div>
                                </div>
                                <div className="rounded-lg border border-border/60 px-3 py-3 text-sm">
                                    <div className="text-muted-foreground">{t("omni.agents.card.appointments")}</div>
                                    <div className="mt-1 font-semibold">{agent.pendingAppointments}</div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{t("omni.agents.card.lastActivity")}</span>
                                <span>{agent.lastActivityAt ? formatOmniDateTime(agent.lastActivityAt, language) : t("omni.common.notAvailable")}</span>
                            </div>

                            <Button asChild className="w-full">
                                <Link href={`/omni/agents/${agent.id}/general`}>
                                    {t("omni.agents.card.open")}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
