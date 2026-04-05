"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, BrainCircuit, Database, Loader2, Mic2, Settings2, Sparkles, Wrench } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { useOmniAccount } from "@/context/OmniAccountContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { OmniActionsPanel, OmniChannelPoliciesPanel, OmniKnowledgeGovernancePanel } from "@/components/omni/omni-ai-core-panels"
import { OmniVoiceCallsPanel } from "@/components/omni/omni-voice-calls-panel"
import { OmniStateShell } from "@/components/omni/omni-ui"
import { getOmniChannelLabel } from "@/lib/omni/i18n"
import type { OmniWorkspaceAgentDetail } from "@/lib/omni/types"

interface AgentDetailPayload {
    detail: OmniWorkspaceAgentDetail
    capabilityCatalog: Array<{
        id: string
        title: string
        supportedChannels: string[]
        allowedActions: string[]
    }>
}

const AGENT_TABS = [
    { id: "general", labelKey: "omni.agentTab.general", icon: Sparkles },
    { id: "evaluation", labelKey: "omni.agentTab.evaluation", icon: BrainCircuit },
    { id: "data-collection", labelKey: "omni.agentTab.dataCollection", icon: Database },
    { id: "audio", labelKey: "omni.agentTab.audio", icon: Mic2 },
    { id: "tools", labelKey: "omni.agentTab.tools", icon: Wrench },
    { id: "llms", labelKey: "omni.agentTab.llms", icon: BrainCircuit },
    { id: "knowledge", labelKey: "omni.agentTab.knowledge", icon: Database },
    { id: "advanced", labelKey: "omni.agentTab.advanced", icon: Settings2 },
] as const

export function OmniAgentDetailPanel({ agentId, tab }: { agentId: string; tab: (typeof AGENT_TABS)[number]["id"] }) {
    const { user } = useAuth()
    const { activeAccountId: chatbotId, canSwitchAccounts, isLoading: accountScopeLoading } = useOmniAccount()
    const { t } = useLanguage()
    const { toast } = useToast()
    const [payload, setPayload] = useState<AgentDetailPayload | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const load = useCallback(async () => {
        if (!user || !chatbotId) {
            setPayload(null)
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/agents/${agentId}?chatbotId=${chatbotId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load agent detail")
            }

            setPayload(await response.json())
        } catch (error) {
            console.error("Failed to load Omni agent detail", error)
            setPayload(null)
            toast({
                title: t("omni.agentDetail.toast.loadFailed.title"),
                description: t("omni.agentDetail.toast.loadFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }, [agentId, chatbotId, t, toast, user])

    useEffect(() => {
        void load()
    }, [load])

    const selectedTab = useMemo(() => AGENT_TABS.find((item) => item.id === tab) || AGENT_TABS[0], [tab])
    const boolLabel = (value: boolean) => (value ? t("omni.common.yes") : t("omni.common.no"))
    const toggleLabel = (value: boolean) => (value ? t("omni.common.on") : t("omni.common.off"))

    if (accountScopeLoading) {
        return <OmniStateShell title={t("omni.agentDetail.state.loadingScope.title")} description={t("omni.agentDetail.state.loadingScope.description")} />
    }

    if (!chatbotId) {
        return (
            <OmniStateShell
                title={t("omni.agentDetail.state.selectAccount.title")}
                description={t("omni.agentDetail.state.selectAccount.description")}
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

    if (isLoading) {
        return <OmniStateShell title={t("omni.agentDetail.state.loading.title")} description={t("omni.agentDetail.state.loading.description")} />
    }

    if (!payload) {
        return <OmniStateShell title={t("omni.agentDetail.state.unavailable.title")} description={t("omni.agentDetail.state.unavailable.description")} tone="warning" />
    }

    const { detail } = payload

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">{t("omni.page.agentDetail.badge")}</Badge>
                        {detail.agent.isPrimary ? <Badge className="bg-black text-white hover:bg-black">{t("omni.agentDetail.badge.primary")}</Badge> : null}
                        {!detail.agent.active ? <Badge variant="outline">{t("omni.agentDetail.badge.inactive")}</Badge> : null}
                    </div>
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight">{detail.agent.name}</h1>
                        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                            {detail.agent.description || t("omni.agentDetail.header.noDescription")}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline">
                        <Link href="/omni/agents">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {t("omni.agentDetail.backToAgents")}
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 border-b pb-4">
                {AGENT_TABS.map((item) => (
                    <Button key={item.id} asChild variant={item.id === selectedTab.id ? "default" : "outline"} size="sm">
                        <Link href={`/omni/agents/${agentId}/${item.id}`}>{t(item.labelKey)}</Link>
                    </Button>
                ))}
            </div>

            {tab === "general" ? (
                <div className="grid gap-4 xl:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("omni.agentDetail.general.profile.title")}</CardTitle>
                            <CardDescription>{t("omni.agentDetail.general.profile.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div>
                                <div className="text-muted-foreground">{t("omni.agentDetail.general.field.prompt")}</div>
                                <div className="mt-1 whitespace-pre-wrap rounded-lg border bg-muted/20 px-3 py-3">
                                    {detail.agent.prompt || t("omni.agentDetail.general.promptEmpty")}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">{t("omni.agentDetail.general.field.assignedChannels")}</div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {detail.agent.channels.length > 0 ? (
                                        detail.agent.channels.map((channel) => (
                                            <Badge key={channel} variant="outline">
                                                {getOmniChannelLabel(t, channel)}
                                            </Badge>
                                        ))
                                    ) : (
                                        <Badge variant="outline">{t("omni.agentDetail.general.noChannels")}</Badge>
                                    )}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">{t("omni.agentDetail.general.field.capabilities")}</div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {detail.agent.capabilityIds.length > 0 ? (
                                        detail.agent.capabilityIds.map((capabilityId) => {
                                            const capability = payload.capabilityCatalog.find((item) => item.id === capabilityId)
                                            return (
                                                <Badge key={capabilityId} variant="outline">
                                                    {capability?.title || capabilityId}
                                                </Badge>
                                            )
                                        })
                                    ) : (
                                        <Badge variant="outline">{t("omni.agentDetail.general.noCapabilities")}</Badge>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t("omni.agentDetail.general.tone.title")}</CardTitle>
                            <CardDescription>{t("omni.agentDetail.general.tone.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {Object.entries(detail.general.toneOverrides).length > 0 ? (
                                Object.entries(detail.general.toneOverrides).map(([channel, value]) => (
                                    <div key={channel} className="rounded-lg border px-4 py-3">
                                        <div className="font-medium capitalize">{getOmniChannelLabel(t, channel)}</div>
                                        <div className="mt-1 text-sm text-muted-foreground">{value || t("omni.common.noOverride")}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-lg border border-dashed px-4 py-5 text-sm text-muted-foreground">
                                    {t("omni.agentDetail.general.tone.empty")}
                                </div>
                            )}

                            <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                                {t("omni.agentDetail.general.phase1Note")}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : null}

            {tab === "evaluation" ? (
                <div className="grid gap-4 xl:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("omni.agentDetail.evaluation.success.title")}</CardTitle>
                            <CardDescription>{t("omni.agentDetail.evaluation.success.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            {detail.evaluation.draft.successCriteria.map((item) => (
                                <div key={item} className="rounded-lg border px-4 py-3">
                                    {item}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("omni.agentDetail.evaluation.failure.title")}</CardTitle>
                            <CardDescription>{t("omni.agentDetail.evaluation.failure.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            {detail.evaluation.draft.failureSignals.map((item) => (
                                <div key={item} className="rounded-lg border px-4 py-3">
                                    {item}
                                </div>
                            ))}
                            <div className="rounded-lg border border-dashed px-4 py-4 text-muted-foreground">
                                {detail.evaluation.draft.reviewerNotes}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : null}

            {tab === "data-collection" ? (
                <div className="grid gap-4 xl:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("omni.agentDetail.dataCollection.schema.title")}</CardTitle>
                            <CardDescription>{t("omni.agentDetail.dataCollection.schema.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {detail.dataCollection.draft.fields.map((field) => (
                                <div key={field.id} className="rounded-lg border px-4 py-3">
                                    <div className="font-medium">{field.label}</div>
                                    <div className="mt-1 text-sm text-muted-foreground">{field.description}</div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("omni.agentDetail.dataCollection.destination.title")}</CardTitle>
                            <CardDescription>{t("omni.agentDetail.dataCollection.destination.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="rounded-lg border px-4 py-3">{detail.dataCollection.draft.destination}</div>
                            <div className="rounded-lg border border-dashed px-4 py-4 text-muted-foreground">
                                {t("omni.agentDetail.dataCollection.phase1Note")}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : null}

            {tab === "audio" ? (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("omni.agentDetail.audio.title")}</CardTitle>
                            <CardDescription>{t("omni.agentDetail.audio.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-lg border px-4 py-3">
                                <div className="text-muted-foreground">{t("omni.agentDetail.audio.field.voiceEnabled")}</div>
                                <div className="mt-1 text-xl font-semibold">{boolLabel(detail.audio.voiceEnabled)}</div>
                            </div>
                            <div className="rounded-lg border px-4 py-3">
                                <div className="text-muted-foreground">{t("omni.agentDetail.audio.field.activeNumbers")}</div>
                                <div className="mt-1 text-xl font-semibold">{detail.audio.activeNumbers}</div>
                            </div>
                            <div className="rounded-lg border px-4 py-3">
                                <div className="text-muted-foreground">{t("omni.agentDetail.audio.field.defaultProvider")}</div>
                                <div className="mt-1 text-xl font-semibold">{detail.audio.defaultProvider || t("omni.common.notAvailable")}</div>
                            </div>
                            <div className="rounded-lg border px-4 py-3">
                                <div className="text-muted-foreground">{t("omni.agentDetail.audio.field.fallbackProvider")}</div>
                                <div className="mt-1 text-xl font-semibold">{detail.audio.fallbackProvider || t("omni.common.notAvailable")}</div>
                            </div>
                        </CardContent>
                    </Card>
                    <OmniVoiceCallsPanel />
                </div>
            ) : null}

            {tab === "tools" ? (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("omni.agentDetail.tools.title")}</CardTitle>
                            <CardDescription>{t("omni.agentDetail.tools.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {detail.tools.enabledActions.length > 0 ? (
                                    detail.tools.enabledActions.map((action) => (
                                        <Badge key={action} variant="outline">
                                            {action}
                                        </Badge>
                                    ))
                                ) : (
                                    <Badge variant="outline">{t("omni.agentDetail.tools.empty")}</Badge>
                                )}
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                {detail.tools.integrationDependencies.map((dependency) => (
                                    <div key={dependency} className="rounded-lg border px-4 py-3 text-sm">
                                        {dependency}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                    <OmniActionsPanel />
                </div>
            ) : null}

            {tab === "llms" ? (
                <div className="grid gap-4 xl:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("omni.agentDetail.llms.routing.title")}</CardTitle>
                            <CardDescription>{t("omni.agentDetail.llms.routing.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="rounded-lg border px-4 py-3 font-medium">{detail.llms.mode}</div>
                            {detail.llms.notes.map((note) => (
                                <div key={note} className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                    {note}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("omni.agentDetail.llms.assignments.title")}</CardTitle>
                            <CardDescription>{t("omni.agentDetail.llms.assignments.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {Object.entries(detail.llms.channelAssignments).map(([channel, value]) => (
                                <div key={channel} className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm">
                                    <span className="font-medium capitalize">{getOmniChannelLabel(t, channel)}</span>
                                    <span className="text-muted-foreground">{value}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            ) : null}

            {tab === "knowledge" ? (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("omni.agentDetail.knowledge.title")}</CardTitle>
                            <CardDescription>{t("omni.agentDetail.knowledge.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-lg border px-4 py-3">
                                <div className="text-muted-foreground">{t("omni.agentDetail.knowledge.field.sharedSource")}</div>
                                <div className="mt-1 text-xl font-semibold">{detail.knowledge.sharedKnowledgeBase ? t("omni.common.enabled") : t("omni.common.disabled")}</div>
                            </div>
                            <div className="rounded-lg border px-4 py-3 md:col-span-3">
                                <div className="text-muted-foreground">{t("omni.agentDetail.knowledge.field.priority")}</div>
                                <div className="mt-1 text-sm">{detail.knowledge.knowledgeGovernance.sourcePriority?.join(" -> ") || "-"}</div>
                            </div>
                        </CardContent>
                    </Card>
                    <OmniKnowledgeGovernancePanel />
                </div>
            ) : null}

            {tab === "advanced" ? (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("omni.agentDetail.advanced.memory.title")}</CardTitle>
                            <CardDescription>{t("omni.agentDetail.advanced.memory.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-lg border px-4 py-3">
                                <div className="text-muted-foreground">{t("omni.agentDetail.advanced.field.enabled")}</div>
                                <div className="mt-1 text-xl font-semibold">{boolLabel(Boolean(detail.advanced.customerMemory.enabled))}</div>
                            </div>
                            <div className="rounded-lg border px-4 py-3">
                                <div className="text-muted-foreground">{t("omni.agentDetail.advanced.field.maxFacts")}</div>
                                <div className="mt-1 text-xl font-semibold">{detail.advanced.customerMemory.maxFacts || 0}</div>
                            </div>
                            <div className="rounded-lg border px-4 py-3">
                                <div className="text-muted-foreground">{t("omni.agentDetail.advanced.field.preferences")}</div>
                                <div className="mt-1 text-xl font-semibold">{toggleLabel(Boolean(detail.advanced.customerMemory.storePreferences))}</div>
                            </div>
                            <div className="rounded-lg border px-4 py-3">
                                <div className="text-muted-foreground">{t("omni.agentDetail.advanced.field.conversationSummary")}</div>
                                <div className="mt-1 text-xl font-semibold">{toggleLabel(Boolean(detail.advanced.customerMemory.storeConversationSummary))}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t("omni.agentDetail.advanced.reserved.title")}</CardTitle>
                            <CardDescription>{t("omni.agentDetail.advanced.reserved.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 md:grid-cols-3">
                            {detail.advanced.futureSlots.map((slot) => (
                                <div key={slot} className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                    {slot}
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <OmniChannelPoliciesPanel />
                </div>
            ) : null}
        </div>
    )
}
