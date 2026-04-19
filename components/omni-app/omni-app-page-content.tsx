"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
    Activity,
    ArrowUpRight,
    CheckCircle2,
    ExternalLink,
    Loader2,
    TriangleAlert,
    Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { useOmniAccount } from "@/context/OmniAccountContext"
import { resolveOmniAppPage } from "@/lib/omni-app/navigation"
import type {
    OmniAppAgentBranch,
    OmniAppAgentSummary,
    OmniAppAgentVersion,
    OmniAppConversationSummary,
    OmniAppExperiment,
    OmniAppPageDefinition,
    OmniAppTestRun,
    OmniAppTrafficDeployment,
    OmniAppUserSummary,
    OmniAppWorkspaceSummary,
} from "@/lib/omni-app/types"
import { OmniActionsPanel, OmniKnowledgeGovernancePanel } from "@/components/omni/omni-ai-core-panels"
import { OmniAgentDetailPanel } from "@/components/omni/omni-agent-detail-panel"
import { OmniAgentsPanel } from "@/components/omni/omni-agents-panel"
import { OmniAnalyticsPanel } from "@/components/omni/omni-analytics-panel"
import { OmniChannelsOverviewPanel } from "@/components/omni/omni-channels-overview-panel"
import { OmniContactsPanel } from "@/components/omni/omni-contacts-panel"
import { OmniDeliveryMonitorPanel } from "@/components/omni/omni-delivery-monitor-panel"
import { OmniInstagramPanel } from "@/components/omni/omni-instagram-panel"
import { OmniSettingsPanel } from "@/components/omni/omni-settings-panel"
import { OmniTestsPanel } from "@/components/omni/omni-tests-panel"
import { OmniUnifiedInboxPanel } from "@/components/omni/omni-unified-inbox-panel"
import { OmniVoiceCallsPanel } from "@/components/omni/omni-voice-calls-panel"
import { OmniWhatsAppPanel } from "@/components/omni/omni-whatsapp-panel"
import { OmniWebWidgetPanel } from "@/components/omni/omni-web-widget-panel"
import { OmniWorkspaceOverviewPanel } from "@/components/omni/omni-workspace-overview-panel"

interface OverviewResponse {
    workspace: OmniAppWorkspaceSummary
    highlights: Array<{ label: string; value: string | number; note: string }>
    channels: Array<{ channel: string; enabled: boolean; ready: boolean; blockers: string[] }>
    experiments: {
        running: number
        candidateTrafficPercent: number
    }
}

interface AgentsResponse {
    summary: {
        total: number
        live: number
        candidateBranches: number
        avgOutcomeRate: number
    }
    items: OmniAppAgentSummary[]
}

interface UsersResponse {
    summary: {
        total: number
        reviewCount: number
        openLeads: number
        openAppointments: number
    }
    items: OmniAppUserSummary[]
}

interface ConversationsResponse {
    summary: {
        total: number
        activeChannels: number
        pendingCallbacks: number
        unresolved: number
    }
    items: OmniAppConversationSummary[]
}

interface TestingResponse {
    readinessScore: number
    overallReady: boolean
    attentionRequired: boolean
    summary: {
        success: number
        blocked: number
        error: number
    }
    runs: OmniAppTestRun[]
}

interface ExperimentsResponse {
    summary: {
        running: number
        drafts: number
        candidateTraffic: number
    }
    items: OmniAppExperiment[]
}

interface VersioningResponse {
    summary: {
        live: number
        candidate: number
        drafts: number
    }
    branches: OmniAppAgentBranch[]
    versions: OmniAppAgentVersion[]
    deployments: OmniAppTrafficDeployment[]
}

interface AnalyticsResponse {
    summary: {
        conversations: number
        contacts: number
        callbacksOpen: number
        deliveryFailures: number
        channelsReady: number
    }
    dispositions: Array<{ label: string; value: number }>
}

interface SettingsResponse {
    workspaceLabel: string
    readiness: {
        readyChannels: number
        enabledChannels: number
        attentionRequired: boolean
    }
    consoleLinks: Array<{ label: string; href: string; description: string }>
    checklist: string[]
}

function SectionShell({
    page,
    children,
    badges,
    actions,
}: {
    page: OmniAppPageDefinition
    children: React.ReactNode
    badges?: React.ReactNode
    actions?: React.ReactNode
}) {
    return (
        <div className="space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,rgba(14,165,233,0.12),rgba(10,21,39,0.88))] p-6 md:p-8">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-3xl">
                        <div className="text-[11px] uppercase tracking-[0.24em] text-sky-200">{page.eyebrow}</div>
                        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">{page.title}</h1>
                        <p className="mt-4 text-sm leading-7 text-slate-200 md:text-base">{page.description}</p>
                        {badges ? <div className="mt-5 flex flex-wrap gap-2">{badges}</div> : null}
                    </div>
                    {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
                </div>
            </div>
            {children}
        </div>
    )
}

function MetricCard({ label, value, note }: { label: string; value: string | number; note: string }) {
    return (
        <Card className="border-white/10 bg-white/[0.03] text-white">
            <CardHeader className="pb-3">
                <CardDescription className="text-slate-400">{label}</CardDescription>
                <CardTitle className="text-3xl font-semibold">{value}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-slate-300">{note}</CardContent>
        </Card>
    )
}

function SurfaceCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
    return (
        <Card className="border-white/10 bg-[#091425] text-white">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                {description ? <CardDescription className="text-slate-400">{description}</CardDescription> : null}
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    )
}

function LoadingSurface() {
    return (
        <div className="flex h-[240px] items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.03] text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
        </div>
    )
}

function EmptyMetricState({ label }: { label: string }) {
    return (
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-6 text-sm text-slate-300">
            {label}
        </div>
    )
}

function boolTone(value: boolean) {
    return value ? "bg-emerald-400/15 text-emerald-100 border-emerald-400/20" : "bg-amber-400/12 text-amber-100 border-amber-400/20"
}

function useOmniAppQuery<T>(segment: string | null) {
    const { user } = useAuth()
    const { activeAccountId } = useOmniAccount()
    const chatbotId = activeAccountId || user?.uid || null
    const [data, setData] = useState<T | null>(null)
    const [isLoading, setIsLoading] = useState(Boolean(segment))
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        if (!segment || !user || !chatbotId) {
            setData(null)
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni-app/${segment}?chatbotId=${encodeURIComponent(chatbotId)}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                const payload = await response.json().catch(() => null)
                throw new Error(payload?.error || "Failed to load")
            }

            setData((await response.json()) as T)
        } catch (requestError: any) {
            setError(requestError?.message || "Failed to load")
            setData(null)
        } finally {
            setIsLoading(false)
        }
    }, [chatbotId, segment, user])

    useEffect(() => {
        void load()
    }, [load])

    return {
        chatbotId,
        data,
        isLoading,
        error,
        refresh: load,
    }
}

function OverviewSurface({ page }: { page: OmniAppPageDefinition }) {
    const { data, isLoading } = useOmniAppQuery<OverviewResponse>("overview")

    return (
        <SectionShell
            page={page}
            badges={
                <>
                    <Badge className="border border-white/10 bg-white/10 text-white hover:bg-white/10">ElevenLabs-style overview</Badge>
                    <Badge variant="outline" className="border-white/12 bg-white/5 text-slate-100">
                        Separate from Console
                    </Badge>
                </>
            }
            actions={
                <Button asChild className="rounded-full bg-white text-black hover:bg-slate-200">
                    <Link href="/omni/app/agents">
                        Open agents
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            }
        >
            {isLoading || !data ? (
                <LoadingSurface />
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {data.highlights.map((item) => (
                            <MetricCard key={item.label} label={item.label} value={item.value} note={item.note} />
                        ))}
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                        <SurfaceCard title="Channel posture" description="Enabled surfaces and readiness blockers.">
                            <div className="space-y-3">
                                {data.channels.map((channel) => (
                                    <div key={channel.channel} className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="text-sm font-medium capitalize text-white">{channel.channel}</div>
                                            <span className={`rounded-full border px-3 py-1 text-xs ${boolTone(channel.enabled && channel.ready)}`}>
                                                {channel.enabled ? (channel.ready ? "Ready" : "Blocked") : "Disabled"}
                                            </span>
                                        </div>
                                        {channel.blockers.length > 0 ? <div className="mt-2 text-sm text-slate-400">{channel.blockers[0]}</div> : null}
                                    </div>
                                ))}
                            </div>
                        </SurfaceCard>

                        <SurfaceCard title="Release signal" description="Candidate traffic and experiment activity across the workspace.">
                            <div className="grid gap-4 md:grid-cols-2">
                                <MetricCard label="Running experiments" value={data.experiments.running} note="Live comparisons between control and candidate behavior." />
                                <MetricCard
                                    label="Candidate traffic"
                                    value={`${data.experiments.candidateTrafficPercent}%`}
                                    note="Traffic currently routed to non-live branches."
                                />
                            </div>
                        </SurfaceCard>
                    </div>

                    <OmniWorkspaceOverviewPanel />
                </>
            )}
        </SectionShell>
    )
}

function AgentsSurface({ page }: { page: OmniAppPageDefinition }) {
    const { data, isLoading } = useOmniAppQuery<AgentsResponse>("agents")

    return (
        <SectionShell page={page}>
            {isLoading || !data ? (
                <LoadingSurface />
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <MetricCard label="Total agents" value={data.summary.total} note="Distinct agent profiles in the workspace." />
                        <MetricCard label="Live agents" value={data.summary.live} note="Agents currently serving live traffic." />
                        <MetricCard label="Candidate branches" value={data.summary.candidateBranches} note="Branches under validation or staged rollout." />
                        <MetricCard label="Avg. outcome rate" value={`${data.summary.avgOutcomeRate}%`} note="Mean success outcome across active agents." />
                    </div>

                    <SurfaceCard title="Agent release snapshot" description="A quick view of branch and version posture before diving into detail tabs.">
                        <div className="grid gap-3 xl:grid-cols-3">
                            {data.items.slice(0, 3).map((agent) => (
                                <div key={agent.id} className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="font-medium text-white">{agent.name}</div>
                                        <Badge variant="outline" className="border-white/12 bg-white/5 text-slate-100">
                                            {agent.branchLabel}
                                        </Badge>
                                    </div>
                                    <div className="mt-2 text-sm text-slate-400">{agent.versionLabel}</div>
                                    <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
                                        <span>{agent.conversationVolume} conv.</span>
                                        <span>{agent.outcomeRate}% success</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SurfaceCard>
                    <OmniAgentsPanel />
                </>
            )}
        </SectionShell>
    )
}

function UsersSurface({ page }: { page: OmniAppPageDefinition }) {
    const { data, isLoading } = useOmniAppQuery<UsersResponse>("users")

    return (
        <SectionShell page={page}>
            {isLoading || !data ? (
                <LoadingSurface />
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <MetricCard label="Users" value={data.summary.total} note="Merged user identities recognized across channels." />
                        <MetricCard label="Needs review" value={data.summary.reviewCount} note="Contacts flagged for merge or manual follow-up review." />
                        <MetricCard label="Open leads" value={data.summary.openLeads} note="Lead outcomes attached to user identity records." />
                        <MetricCard label="Appointments" value={data.summary.openAppointments} note="Appointment records currently attached to users." />
                    </div>

                    <SurfaceCard title="Recent user signals" description="Top cross-channel identities surfaced before the full contact graph.">
                        <div className="space-y-3">
                            {data.items.slice(0, 5).map((item) => (
                                <div key={item.id} className="flex flex-col gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <div className="font-medium text-white">{item.displayName || item.primaryIdentity || item.id}</div>
                                        <div className="mt-1 text-sm text-slate-400">{item.primaryIdentity || "No primary identity captured yet."}</div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        <Badge variant="outline" className="border-white/12 bg-white/5 text-slate-100">
                                            {item.linkedChannels.join(", ") || "web"}
                                        </Badge>
                                        <Badge variant="outline" className="border-white/12 bg-white/5 text-slate-100">
                                            {item.leadCount} leads
                                        </Badge>
                                        <Badge variant="outline" className="border-white/12 bg-white/5 text-slate-100">
                                            {item.appointmentCount} appts
                                        </Badge>
                                        {item.requiresReview ? <Badge className="bg-amber-400/15 text-amber-100 hover:bg-amber-400/15">Review</Badge> : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SurfaceCard>
                    <OmniContactsPanel />
                </>
            )}
        </SectionShell>
    )
}

function ConversationsSurface({ page }: { page: OmniAppPageDefinition }) {
    const { data, isLoading } = useOmniAppQuery<ConversationsResponse>("conversations")

    return (
        <SectionShell page={page}>
            {isLoading || !data ? (
                <LoadingSurface />
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <MetricCard label="Conversations" value={data.summary.total} note="Recent sessions across the active Omni workspace." />
                        <MetricCard label="Active channels" value={data.summary.activeChannels} note="Channels with recent session activity." />
                        <MetricCard label="Pending callbacks" value={data.summary.pendingCallbacks} note="Callback requests still awaiting resolution." />
                        <MetricCard label="Unresolved sessions" value={data.summary.unresolved} note="Sessions without a resolved disposition yet." />
                    </div>

                    <SurfaceCard title="Recent sessions" description="A lightweight monitor stack before dropping into the full inbox.">
                        <div className="space-y-3">
                            {data.items.slice(0, 6).map((item) => (
                                <div key={item.id} className="flex flex-col gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <div className="font-medium text-white">{item.displayName || item.id}</div>
                                        <div className="mt-1 text-sm text-slate-400">
                                            {item.channel} · {item.messageCount} messages · {item.lastDisposition || "awaiting disposition"}
                                        </div>
                                    </div>
                                    <div className="text-sm text-slate-300">{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "No activity yet"}</div>
                                </div>
                            ))}
                        </div>
                    </SurfaceCard>

                    <OmniUnifiedInboxPanel />
                </>
            )}
        </SectionShell>
    )
}

function TestingSurface({ page }: { page: OmniAppPageDefinition }) {
    const { data, isLoading } = useOmniAppQuery<TestingResponse>("testing")

    return (
        <SectionShell page={page}>
            {isLoading || !data ? (
                <LoadingSurface />
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <MetricCard label="Readiness" value={`${data.readinessScore}%`} note="Overall Omni workspace deployment readiness." />
                        <MetricCard label="Passed runs" value={data.summary.success} note="Smoke runs completed successfully." />
                        <MetricCard label="Blocked runs" value={data.summary.blocked} note="Runs blocked by missing configuration or entitlement." />
                        <MetricCard label="Failed runs" value={data.summary.error} note="Runs that returned provider or workflow errors." />
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                        <SurfaceCard title="Posture" description="Signal before opening the detailed testing surface.">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white">
                                    <span>Overall ready</span>
                                    <Badge className={boolTone(data.overallReady)}>{data.overallReady ? "Yes" : "No"}</Badge>
                                </div>
                                <div className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white">
                                    <span>Attention required</span>
                                    <Badge className={boolTone(!data.attentionRequired)}>{data.attentionRequired ? "Action needed" : "Healthy"}</Badge>
                                </div>
                            </div>
                        </SurfaceCard>
                        <SurfaceCard title="Recent runs" description="Latest smoke checks flowing into the testing surface.">
                            <div className="space-y-3">
                                {data.runs.slice(0, 5).map((run) => (
                                    <div key={run.id} className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="text-sm font-medium text-white">
                                                {run.channel} / {run.action}
                                            </div>
                                            <Badge className={run.result === "success" ? "bg-emerald-400/15 text-emerald-100 hover:bg-emerald-400/15" : "bg-amber-400/15 text-amber-100 hover:bg-amber-400/15"}>
                                                {run.result}
                                            </Badge>
                                        </div>
                                        {run.message ? <div className="mt-2 text-sm text-slate-400">{run.message}</div> : null}
                                    </div>
                                ))}
                            </div>
                        </SurfaceCard>
                    </div>

                    <OmniTestsPanel />
                </>
            )}
        </SectionShell>
    )
}

function ExperimentsSurface({ page }: { page: OmniAppPageDefinition }) {
    const { data, isLoading } = useOmniAppQuery<ExperimentsResponse>("experiments")

    return (
        <SectionShell page={page}>
            {isLoading || !data ? (
                <LoadingSurface />
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-3">
                        <MetricCard label="Running" value={data.summary.running} note="Active experiments currently splitting traffic." />
                        <MetricCard label="Drafts" value={data.summary.drafts} note="Experiment plans waiting on activation." />
                        <MetricCard label="Candidate traffic" value={`${data.summary.candidateTraffic}%`} note="Traffic currently routed to candidate behavior." />
                    </div>
                    <div className="grid gap-4 xl:grid-cols-2">
                        {data.items.map((item) => (
                            <SurfaceCard key={item.id} title={item.name} description={`${item.controlLabel} vs ${item.candidateLabel}`}>
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge className="bg-white/10 text-white hover:bg-white/10">{item.status}</Badge>
                                        <Badge variant="outline" className="border-white/12 bg-white/5 text-slate-100">
                                            {item.trafficSplit}
                                        </Badge>
                                        <Badge variant="outline" className="border-white/12 bg-white/5 text-slate-100">
                                            {item.successDelta}
                                        </Badge>
                                    </div>
                                    <div className="text-sm leading-7 text-slate-300">
                                        Compare live performance deltas while keeping the workspace closer to a release console than an admin form.
                                    </div>
                                </div>
                            </SurfaceCard>
                        ))}
                    </div>
                </>
            )}
        </SectionShell>
    )
}

function VersioningSurface({ page }: { page: OmniAppPageDefinition }) {
    const { data, isLoading } = useOmniAppQuery<VersioningResponse>("versioning")

    return (
        <SectionShell page={page}>
            {isLoading || !data ? (
                <LoadingSurface />
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-3">
                        <MetricCard label="Live branches" value={data.summary.live} note="Currently serving live traffic." />
                        <MetricCard label="Candidate branches" value={data.summary.candidate} note="Receiving limited traffic for validation." />
                        <MetricCard label="Draft branches" value={data.summary.drafts} note="Prepared but not yet deployed to users." />
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                        <SurfaceCard title="Traffic deployments" description="Live traffic allocation across release branches.">
                            <div className="space-y-3">
                                {data.deployments.map((deployment) => (
                                    <div key={deployment.id} className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="font-medium text-white">{deployment.label}</div>
                                            <Badge className="bg-white/10 text-white hover:bg-white/10">{deployment.status}</Badge>
                                        </div>
                                        <div className="mt-2 text-sm text-slate-400">{deployment.trafficPercent}% of traffic</div>
                                    </div>
                                ))}
                            </div>
                        </SurfaceCard>

                        <SurfaceCard title="Version snapshots" description="Immutable versions grouped under branch state.">
                            <div className="space-y-3">
                                {data.versions.map((version) => (
                                    <div key={version.id} className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="font-medium text-white">{version.label}</div>
                                            <Badge variant="outline" className="border-white/12 bg-white/5 text-slate-100">
                                                {version.state}
                                            </Badge>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {version.notes.map((note) => (
                                                <Badge key={note} variant="outline" className="border-white/12 bg-white/5 text-slate-100">
                                                    {note}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </SurfaceCard>
                    </div>
                </>
            )}
        </SectionShell>
    )
}

function AnalyticsSurface({ page }: { page: OmniAppPageDefinition }) {
    const { data, isLoading } = useOmniAppQuery<AnalyticsResponse>("analytics")

    return (
        <SectionShell page={page}>
            {isLoading || !data ? (
                <LoadingSurface />
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        <MetricCard label="Conversations" value={data.summary.conversations} note="Recent sessions in the selected date window." />
                        <MetricCard label="Contacts" value={data.summary.contacts} note="Merged contacts included in analytics coverage." />
                        <MetricCard label="Callbacks open" value={data.summary.callbacksOpen} note="Open callback workload visible to operators." />
                        <MetricCard label="Delivery failures" value={data.summary.deliveryFailures} note="Failed delivery attempts across providers." />
                        <MetricCard label="Channels ready" value={data.summary.channelsReady} note="Ready surfaces out of the enabled channel set." />
                    </div>

                    <SurfaceCard title="Disposition highlights" description="High-signal breakdown before opening the full analytics surface.">
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {data.dispositions.map((item) => (
                                <div key={item.label} className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
                                    <div className="text-sm text-slate-400">{item.label}</div>
                                    <div className="mt-2 text-2xl font-semibold text-white">{item.value}</div>
                                </div>
                            ))}
                        </div>
                    </SurfaceCard>

                    <OmniAnalyticsPanel />
                </>
            )}
        </SectionShell>
    )
}

function SettingsSurface({ page }: { page: OmniAppPageDefinition }) {
    const { data, isLoading } = useOmniAppQuery<SettingsResponse>("settings")

    return (
        <SectionShell page={page}>
            {isLoading || !data ? (
                <LoadingSurface />
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-3">
                        <MetricCard label="Workspace label" value={data.workspaceLabel || "Omni workspace"} note="Workspace identity shown across the product shell." />
                        <MetricCard
                            label="Ready channels"
                            value={`${data.readiness.readyChannels}/${data.readiness.enabledChannels}`}
                            note="Ready surfaces compared with enabled channel count."
                        />
                        <MetricCard label="Attention required" value={data.readiness.attentionRequired ? "Yes" : "No"} note="Whether the workspace still has settings blockers." />
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                        <SurfaceCard title="Console bridges" description="Administrative surfaces intentionally kept out of Omni.">
                            <div className="space-y-3">
                                {data.consoleLinks.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:bg-white/[0.06]"
                                    >
                                        <div>
                                            <div className="font-medium text-white">{item.label}</div>
                                            <div className="mt-1 text-sm text-slate-400">{item.description}</div>
                                        </div>
                                        <ExternalLink className="h-4 w-4 text-slate-400" />
                                    </Link>
                                ))}
                            </div>
                        </SurfaceCard>
                        <SurfaceCard title="Operator checklist" description="Suggested next moves before expanding rollout.">
                            <div className="space-y-3">
                                {data.checklist.map((item) => (
                                    <div key={item} className="flex items-start gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-slate-300">
                                        <CheckCircle2 className="mt-1 h-4 w-4 text-emerald-300" />
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </SurfaceCard>
                    </div>

                    <OmniSettingsPanel />
                </>
            )}
        </SectionShell>
    )
}

function BridgeSurface({ page }: { page: OmniAppPageDefinition }) {
    return (
        <SectionShell
            page={page}
            badges={
                <Badge variant="outline" className="border-white/12 bg-white/5 text-slate-100">
                    Console remains canonical
                </Badge>
            }
            actions={
                page.consoleHref ? (
                    <Button asChild className="rounded-full bg-white text-black hover:bg-slate-200">
                        <Link href={page.consoleHref}>
                            Open in Console
                            <ExternalLink className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                ) : null
            }
        >
            <SurfaceCard title="Ownership boundary" description="This page intentionally stays out of Omni to keep Console behavior untouched.">
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-5 text-sm leading-7 text-slate-300">
                        <Users className="mb-3 h-5 w-5 text-sky-200" />
                        Partner, tenant, and site administration remain in the original Console surface.
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-5 text-sm leading-7 text-slate-300">
                        <TriangleAlert className="mb-3 h-5 w-5 text-amber-200" />
                        Omni links back to Console instead of duplicating or mutating admin ownership.
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-5 text-sm leading-7 text-slate-300">
                        <Activity className="mb-3 h-5 w-5 text-emerald-200" />
                        This keeps the new Omni app surface product-first and isolates Console from regression risk.
                    </div>
                </div>
            </SurfaceCard>
        </SectionShell>
    )
}

function SimpleSurface({
    page,
    children,
    badges,
}: {
    page: OmniAppPageDefinition
    children: React.ReactNode
    badges?: React.ReactNode
}) {
    return <SectionShell page={page} badges={badges}>{children}</SectionShell>
}

export function OmniAppPageContent({ path }: { path: string }) {
    const page = useMemo(() => resolveOmniAppPage(path), [path])

    if (!page) {
        return <EmptyMetricState label="Unknown Omni page." />
    }

    switch (page.view) {
        case "overview":
            return <OverviewSurface page={page} />
        case "agents":
            return <AgentsSurface page={page} />
        case "agent-detail":
            return (
                <SimpleSurface page={page}>
                    <OmniAgentDetailPanel agentId={page.context?.agentId || ""} tab={(page.context?.tab as any) || "general"} />
                </SimpleSurface>
            )
        case "knowledge":
            return (
                <SimpleSurface page={page} badges={<Badge className="bg-white/10 text-white hover:bg-white/10">Shared knowledge</Badge>}>
                    <OmniKnowledgeGovernancePanel />
                </SimpleSurface>
            )
        case "tools":
            return (
                <SimpleSurface page={page} badges={<Badge className="bg-white/10 text-white hover:bg-white/10">Tool calls and actions</Badge>}>
                    <OmniActionsPanel />
                </SimpleSurface>
            )
        case "channels":
            return (
                <SimpleSurface page={page}>
                    <OmniChannelsOverviewPanel />
                </SimpleSurface>
            )
        case "channel-web-widget":
            return (
                <SimpleSurface page={page}>
                    <OmniWebWidgetPanel />
                </SimpleSurface>
            )
        case "channel-whatsapp":
            return (
                <SimpleSurface page={page}>
                    <OmniWhatsAppPanel />
                </SimpleSurface>
            )
        case "channel-instagram":
            return (
                <SimpleSurface page={page}>
                    <OmniInstagramPanel />
                </SimpleSurface>
            )
        case "channel-voice":
            return (
                <SimpleSurface page={page}>
                    <OmniVoiceCallsPanel />
                </SimpleSurface>
            )
        case "channel-delivery":
            return (
                <SimpleSurface page={page}>
                    <OmniDeliveryMonitorPanel />
                </SimpleSurface>
            )
        case "conversations":
            return <ConversationsSurface page={page} />
        case "users":
            return <UsersSurface page={page} />
        case "testing":
            return <TestingSurface page={page} />
        case "experiments":
            return <ExperimentsSurface page={page} />
        case "versioning":
            return <VersioningSurface page={page} />
        case "analytics":
            return <AnalyticsSurface page={page} />
        case "settings":
            return <SettingsSurface page={page} />
        case "console-bridge":
            return <BridgeSurface page={page} />
        default:
            return <EmptyMetricState label="This Omni view is not implemented yet." />
    }
}
