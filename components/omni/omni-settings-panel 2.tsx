"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Copy, ExternalLink, Loader2, Plus, Trash2, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/context/AuthContext"
import { useOmniAccount } from "@/context/OmniAccountContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { formatOmniDateTime, getOmniChannelLabel } from "@/lib/omni/i18n"
import type { OmniOperationsSettings, OmniProvisioningTask, OmniTeamMember } from "@/lib/omni/types"
import { OmniStateShell } from "@/components/omni/omni-ui"

interface ChannelReadiness {
    enabled?: boolean
    ready: boolean
    blockers: string[]
    webhooks: Record<string, string>
    configuredNumbers?: number
    activeNumbers?: number
    webhookStatus?: string
    defaultReplyMode?: string
    phoneNumberId?: string | null
    pageId?: string | null
    verifyTokenConfigured?: boolean
}

interface OmniSettingsPayload {
    baseUrl: string
    publicOrigin: boolean
    environmentHint: string
    operations: OmniOperationsSettings
    provisioning: OmniProvisioningTask[]
    assigneeOptions: OmniTeamMember[]
    channels: {
        voice: ChannelReadiness
        whatsapp: ChannelReadiness
        instagram: ChannelReadiness
        web: ChannelReadiness
    }
    suggestedNextSteps: string[]
}

interface AuditLogItem {
    id: string
    channel: "voice" | "whatsapp" | "instagram" | "web"
    eventType: string
    result: "success" | "error" | "denied"
    source?: string | null
    message?: string | null
    metadata?: Record<string, unknown>
    createdAt?: string | null
}

interface SmokeManifestChannel {
    provider: string
    ready: boolean
    providerConsoleFields: Array<{ label: string; value: string }>
    setupChecklist: string[]
    expectedAuditEvents: string[]
    readinessFacts?: Record<string, unknown>
}

interface OmniSmokeManifestPayload {
    generatedAt?: string | null
    baseUrl: string
    publicOrigin: boolean
    environmentHint: string
    channels: {
        voice: SmokeManifestChannel
        whatsapp: SmokeManifestChannel
        instagram: SmokeManifestChannel
    }
}

interface SmokeReportChannelSummary {
    enabled?: boolean
    ready: boolean
    blockers: string[]
    audit: {
        total: number
        success: number
        error: number
        denied: number
        lastEventAt?: string | null
    }
    delivery: {
        total: number
        success: number
        failed: number
        retryEligible: number
        exhaustedRetries: number
        lastAttemptAt?: string | null
    }
}

interface SmokeReportDeliveryFailure {
    id?: string
    channel: "voice" | "whatsapp" | "instagram" | "telegram"
    source: string
    errorClass?: string | null
    errorMessage?: string | null
    retryEligible?: boolean
    createdAt?: string | null
}

interface OmniSmokeReportPayload {
    generatedAt?: string | null
    baseUrl: string
    publicOrigin: boolean
    overallReady: boolean
    attentionRequired: boolean
    readinessScore: number
    enabledChannels: string[]
    readyChannels: string[]
    blockedChannels: string[]
    lastActivityAt?: string | null
    provisioningSummary: {
        total: number
        todo: number
        inProgress: number
        blocked: number
        done: number
    }
    channels: {
        voice: SmokeReportChannelSummary
        whatsapp: SmokeReportChannelSummary
        instagram: SmokeReportChannelSummary
    }
    auditSummary: {
        total: number
        success: number
        error: number
        denied: number
        recentCriticalEvents: AuditLogItem[]
    }
    deliverySummary: {
        total: number
        success: number
        failed: number
        retryEligible: number
        exhaustedRetries: number
        errorClassCounts: Record<string, number>
        recentFailures: SmokeReportDeliveryFailure[]
    }
}

interface SmokeRunItem {
    id?: string
    channel: "voice" | "whatsapp" | "instagram"
    provider: string
    action: "health_check" | "test_message" | "test_call" | "test_call_status"
    result: "success" | "error" | "blocked"
    source: string
    message?: string | null
    target?: string | null
    createdAt?: string | null
    metadata?: Record<string, unknown>
}

interface OmniSmokeRunsPayload {
    runs: SmokeRunItem[]
    summary: {
        total: number
        success: number
        blocked: number
        error: number
        byChannel: Record<string, number>
        byAction: Record<string, number>
    }
}

interface MigrationReportPayload {
    legacy: {
        companyName?: string | null
        welcomeMessage?: string | null
        customPrompts?: string | null
        whatsapp: {
            present: boolean
            connected: boolean
            phoneNumberId?: string | null
            verifyToken: boolean
        }
    }
    omni: {
        workspaceLabel?: string | null
        brandVoicePrompt?: string | null
        whatsapp: {
            enabled: boolean
            phoneNumberId?: string | null
            verifyToken: boolean
        }
    }
    parity: {
        whatsappConfigSynced: boolean
        brandContextSynced: boolean
        workspaceLabelSynced: boolean
    }
    stats: {
        sessions: {
            total: number
            byChannel: Record<string, number>
        }
        contacts: number
        callbacks: number
    }
    blockers: string[]
    recommendedActions: string[]
}

interface MigrationSnapshotItem {
    id: string
    source: string
    action: string
    applied: string[]
    createdAt?: string | null
    restoredAt?: string | null
    restoreCount?: number
    lastRestoreBy?: string | null
    configSummary: {
        whatsappPhoneNumberId?: string | null
        hasBrandVoicePrompt: boolean
        workspaceLabel?: string | null
    }
}

interface MigrationSnapshotsPayload {
    snapshots: MigrationSnapshotItem[]
    summary: {
        total: number
        restored: number
    }
}

type RolloutStepStatus = "done" | "pending" | "blocked" | "disabled"

interface RolloutStepItem {
    id: string
    label: string
    status: RolloutStepStatus
    description: string
    href?: string | null
}

interface OmniRolloutReadinessPayload {
    generatedAt?: string | null
    baseUrl: string
    publicOrigin: boolean
    overallReady: boolean
    summary: {
        progress: number
        totalSteps: number
        doneSteps: number
        channelsReady: number
        channelsPending: number
        channelsBlocked: number
        channelsDisabled: number
    }
    globalSteps: RolloutStepItem[]
    nextActions: Array<{
        channel: "global" | "web" | "voice" | "whatsapp" | "instagram"
        label: string
        description: string
        href?: string | null
    }>
    channels: Record<
        "web" | "voice" | "whatsapp" | "instagram",
        {
            channel: "web" | "voice" | "whatsapp" | "instagram"
            state: "ready" | "pending" | "blocked" | "disabled"
            latestSmokeAt?: string | null
            steps: RolloutStepItem[]
            summary: {
                total: number
                done: number
                pending: number
                blocked: number
                disabled: number
            }
        }
    >
}

type SettingsTab = "general" | "voice" | "whatsapp" | "instagram"

function normalizeTeamMemberValue(params: { name?: string | null; email?: string | null; fallback?: string | null }) {
    const email = String(params.email || "").trim()
    if (email) return email

    const name = String(params.name || "").trim()
    if (name) return name

    return String(params.fallback || "").trim()
}

function buildEmptyMember(index: number): OmniTeamMember {
    return {
        id: `member-${Date.now()}-${index}`,
        name: "",
        email: "",
        role: "operations",
        active: true,
    }
}

function buildAssigneeOptions(operations: OmniOperationsSettings) {
    const members = Array.isArray(operations.teamMembers) ? operations.teamMembers.filter((member) => member.active !== false) : []
    return members.map((member) => ({
        value: member.id,
        label: member.email ? `${member.name} (${member.email})` : member.name,
    }))
}

function formatDateTime(value: string | null | undefined, language: string, t: (key: string) => string) {
    if (!value) return t("omni.common.notAvailable")
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return formatOmniDateTime(parsed, language as any)
}

function AssigneeSelect({
    id,
    label,
    value,
    options,
    unassignedLabel,
    onChange,
}: {
    id: string
    label: string
    value?: string | null
    options: Array<{ value: string; label: string }>
    unassignedLabel: string
    onChange: (value: string) => void
}) {
    const normalizedOptions = [...options]
    if (value && !normalizedOptions.some((option) => option.value === value)) {
        normalizedOptions.unshift({ value, label: value })
    }

    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <select
                id={id}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={value || ""}
                onChange={(event) => onChange(event.target.value)}
            >
                <option value="">{unassignedLabel}</option>
                {normalizedOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    )
}

function ReadinessBadge({ ready }: { ready: boolean }) {
    const { t } = useLanguage()
    return ready ? (
        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">{t("omni.settings.readiness.ready")}</Badge>
    ) : (
        <Badge variant="destructive">{t("omni.settings.readiness.blocked")}</Badge>
    )
}

function RolloutStatusBadge({ status }: { status: RolloutStepStatus | "ready" | "pending" | "blocked" | "disabled" }) {
    const { t } = useLanguage()

    if (status === "done" || status === "ready") {
        return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">{t("omni.settings.rollout.status.ready")}</Badge>
    }
    if (status === "pending") {
        return <Badge className="bg-amber-500 text-black hover:bg-amber-500">{t("omni.settings.rollout.status.pending")}</Badge>
    }
    if (status === "disabled") {
        return <Badge variant="outline">{t("omni.settings.rollout.status.disabled")}</Badge>
    }
    return <Badge variant="destructive">{t("omni.settings.rollout.status.blocked")}</Badge>
}

function WebhookList({
    title,
    items,
    onCopy,
}: {
    title: string
    items: Record<string, string>
    onCopy: (value: string) => void
}) {
    const { t } = useLanguage()
    if (Object.keys(items).length === 0) {
        return null
    }
    return (
        <div className="space-y-3">
            <div className="text-sm font-medium text-foreground">{title}</div>
            {Object.entries(items).map(([label, value]) => (
                <div key={label} className="space-y-2">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
                    <div className="flex gap-2">
                        <Input value={value} readOnly />
                        <Button type="button" variant="outline" size="icon" onClick={() => onCopy(value)}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    )
}

function ChannelCard({
    title,
    description,
    readiness,
    onCopy,
    meta,
}: {
    title: string
    description: string
    readiness: ChannelReadiness
    onCopy: (value: string) => void
    meta?: React.ReactNode
}) {
    const { t } = useLanguage()
    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle className="text-lg">{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                    {readiness.enabled === false ? <Badge variant="outline">{t("omni.common.disabled")}</Badge> : <ReadinessBadge ready={readiness.ready} />}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {meta}
                <WebhookList title={t("omni.settings.channel.webhooks")} items={readiness.webhooks} onCopy={onCopy} />
                <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground">{t("omni.settings.channel.blockers")}</div>
                    {readiness.blockers.length === 0 ? (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            <CheckCircle2 className="h-4 w-4" />
                            {t("omni.settings.channel.readyDescription")}
                        </div>
                    ) : (
                        readiness.blockers.map((blocker) => (
                            <div key={blocker} className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{blocker}</span>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

function SettingsSectionHeader({
    badge,
    title,
    description,
}: {
    badge: string
    title: string
    description: string
}) {
    return (
        <div className="rounded-[14px] border border-border/70 bg-muted/20 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <Badge variant="outline">{badge}</Badge>
                    <div className="text-lg font-semibold text-foreground">{title}</div>
                    <div className="text-sm text-muted-foreground">{description}</div>
                </div>
            </div>
        </div>
    )
}

function SmokeReportCard({
    smokeReport,
    onRefresh,
    onCopy,
    language,
}: {
    smokeReport: OmniSmokeReportPayload | null
    onRefresh: () => void
    onCopy: (value: string) => void
    language: string
}) {
    const { t } = useLanguage()

    return (
        <Card className="rounded-lg border-border/70 bg-card/95 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
            <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-lg">Smoke Report</CardTitle>
                        <CardDescription>
                            Readiness, kritik provider event&apos;leri ve delivery failure ozeti tek yerde.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {smokeReport ? <ReadinessBadge ready={smokeReport.overallReady} /> : null}
                        {smokeReport?.attentionRequired ? <Badge className="bg-amber-500 text-white hover:bg-amber-500">Attention</Badge> : null}
                        <Button variant="outline" onClick={onRefresh}>
                            Refresh Report
                        </Button>
                        {smokeReport ? (
                            <Button variant="outline" onClick={() => onCopy(JSON.stringify(smokeReport, null, 2))}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy JSON
                            </Button>
                        ) : null}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {!smokeReport ? (
                    <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">Smoke report okunamadi.</div>
                ) : (
                    <>
                        <div className="grid gap-4 md:grid-cols-4">
                            <div className="rounded-lg border p-4">
                                <div className="text-xs uppercase tracking-wide text-muted-foreground">Readiness Score</div>
                                <div className="mt-2 text-2xl font-semibold text-foreground">%{smokeReport.readinessScore}</div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                    Ready channels: {smokeReport.readyChannels.length} / {smokeReport.enabledChannels.length}
                                </div>
                            </div>
                            <div className="rounded-lg border p-4">
                                <div className="text-xs uppercase tracking-wide text-muted-foreground">Critical Audit Events</div>
                                <div className="mt-2 text-2xl font-semibold text-foreground">{smokeReport.auditSummary.error + smokeReport.auditSummary.denied}</div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                    error: {smokeReport.auditSummary.error} • denied: {smokeReport.auditSummary.denied}
                                </div>
                            </div>
                            <div className="rounded-lg border p-4">
                                <div className="text-xs uppercase tracking-wide text-muted-foreground">Delivery Failures</div>
                                <div className="mt-2 text-2xl font-semibold text-foreground">{smokeReport.deliverySummary.failed}</div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                    retry eligible: {smokeReport.deliverySummary.retryEligible} • exhausted: {smokeReport.deliverySummary.exhaustedRetries}
                                </div>
                            </div>
                            <div className="rounded-lg border p-4">
                                <div className="text-xs uppercase tracking-wide text-muted-foreground">Provisioning</div>
                                <div className="mt-2 text-2xl font-semibold text-foreground">
                                    {smokeReport.provisioningSummary.done}/{smokeReport.provisioningSummary.total}
                                </div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                    blocked: {smokeReport.provisioningSummary.blocked} • todo: {smokeReport.provisioningSummary.todo}
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 xl:grid-cols-2">
                            <div className="space-y-3 rounded-lg border p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-medium text-foreground">Recent Critical Events</div>
                                    {smokeReport.lastActivityAt ? <Badge variant="outline">{formatDateTime(smokeReport.lastActivityAt, language, t)}</Badge> : null}
                                </div>
                                {smokeReport.auditSummary.recentCriticalEvents.length === 0 ? (
                                    <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                        Son pencerede kritik audit event yok.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {smokeReport.auditSummary.recentCriticalEvents.map((event) => (
                                            <div key={event.id} className="rounded-lg border px-4 py-3">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-sm font-medium text-foreground">{event.eventType}</div>
                                                        <div className="mt-1 text-sm text-muted-foreground">{event.message || "No message"}</div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Badge variant="outline">{event.channel}</Badge>
                                                        <Badge
                                                            className={
                                                                event.result === "denied"
                                                                    ? "bg-amber-500 text-white hover:bg-amber-500"
                                                                    : "bg-red-600 text-white hover:bg-red-600"
                                                            }
                                                        >
                                                            {event.result}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 rounded-lg border p-4">
                                <div className="text-sm font-medium text-foreground">Recent Delivery Failures</div>
                                {smokeReport.deliverySummary.recentFailures.length === 0 ? (
                                    <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                        Son pencerede delivery failure yok.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {smokeReport.deliverySummary.recentFailures.map((attempt) => (
                                            <div key={attempt.id || `${attempt.channel}-${attempt.createdAt}`} className="rounded-lg border px-4 py-3">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-sm font-medium text-foreground">{attempt.source}</div>
                                                        <div className="mt-1 text-sm text-muted-foreground">{attempt.errorMessage || "Unknown delivery error"}</div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Badge variant="outline">{attempt.channel}</Badge>
                                                        {attempt.errorClass ? <Badge variant="outline">{attempt.errorClass}</Badge> : null}
                                                        {attempt.retryEligible ? <Badge className="bg-amber-500 text-white hover:bg-amber-500">retry</Badge> : null}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}

export function OmniSettingsPanel() {
    const { user } = useAuth()
    const { activeAccountId: chatbotId } = useOmniAccount()
    const { language, t } = useLanguage()
    const { toast } = useToast()
    const [payload, setPayload] = useState<OmniSettingsPayload | null>(null)
    const [operations, setOperations] = useState<OmniOperationsSettings>({
        workspaceLabel: "",
        defaultAssignee: "",
        callbackAssignee: "",
        appointmentAssignee: "",
        leadAssignee: "",
        escalationEmail: "",
        escalationPhone: "",
        callbackSlaHours: 4,
        reviewMode: "assistant",
        notes: "",
        teamMembers: [],
    })
    const [provisioning, setProvisioning] = useState<OmniProvisioningTask[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [smokeManifest, setSmokeManifest] = useState<OmniSmokeManifestPayload | null>(null)
    const [smokeReport, setSmokeReport] = useState<OmniSmokeReportPayload | null>(null)
    const [smokeRuns, setSmokeRuns] = useState<OmniSmokeRunsPayload | null>(null)
    const [rolloutReadiness, setRolloutReadiness] = useState<OmniRolloutReadinessPayload | null>(null)
    const [migrationReport, setMigrationReport] = useState<MigrationReportPayload | null>(null)
    const [migrationSnapshots, setMigrationSnapshots] = useState<MigrationSnapshotsPayload | null>(null)
    const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>("general")
    const [inspectorChannel, setInspectorChannel] = useState<"voice" | "whatsapp" | "instagram">("voice")
    const [inspectorEventPrefix, setInspectorEventPrefix] = useState("voice.")
    const [inspectorResult, setInspectorResult] = useState<"all" | "success" | "error" | "denied">("all")
    const [inspectorLogs, setInspectorLogs] = useState<AuditLogItem[]>([])
    const [isInspectorLoading, setIsInspectorLoading] = useState(false)
    const [isMigrationSyncing, setIsMigrationSyncing] = useState<string | null>(null)
    const [isMigrationRestoring, setIsMigrationRestoring] = useState<string | null>(null)

    const load = async () => {
        if (!user) return

        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/settings?chatbotId=${chatbotId || user.uid}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load Omni settings")
            }

            const data = await response.json()
            setPayload(data)
            setOperations(data.operations || {})
            setProvisioning(data.provisioning || [])
        } catch (error) {
            console.error("Failed to load Omni settings", error)
            setPayload(null)
            toast({
                title: t("omni.settings.toast.loadFailed.title"),
                description: t("omni.settings.toast.loadFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const loadSmokeManifest = async () => {
        if (!user) return

        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/smoke-manifest?chatbotId=${chatbotId || user.uid}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load smoke manifest")
            }

            const data = await response.json()
            setSmokeManifest(data)
        } catch (error) {
            console.error("Failed to load smoke manifest", error)
            setSmokeManifest(null)
        }
    }

    const loadSmokeReport = async () => {
        if (!user) return

        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/smoke-report?chatbotId=${chatbotId || user.uid}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load smoke report")
            }

            const data = await response.json()
            setSmokeReport(data)
        } catch (error) {
            console.error("Failed to load smoke report", error)
            setSmokeReport(null)
        }
    }

    const loadSmokeRuns = async () => {
        if (!user) return

        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/smoke-runs?chatbotId=${chatbotId || user.uid}&limit=18`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load smoke runs")
            }

            const data = await response.json()
            setSmokeRuns(data)
        } catch (error) {
            console.error("Failed to load smoke runs", error)
            setSmokeRuns(null)
        }
    }

    const loadRolloutReadiness = async () => {
        if (!user) return

        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/rollout-readiness?chatbotId=${chatbotId || user.uid}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load rollout readiness")
            }

            const data = await response.json()
            setRolloutReadiness(data)
        } catch (error) {
            console.error("Failed to load rollout readiness", error)
            setRolloutReadiness(null)
        }
    }

    const loadMigrationReport = async () => {
        if (!user) return

        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/migration-report?chatbotId=${chatbotId || user.uid}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load migration report")
            }

            const data = await response.json()
            setMigrationReport(data)
        } catch (error) {
            console.error("Failed to load migration report", error)
            setMigrationReport(null)
        }
    }

    const loadMigrationSnapshots = async () => {
        if (!user) return

        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/migration-snapshots?chatbotId=${chatbotId || user.uid}&limit=8`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load migration snapshots")
            }

            const data = await response.json()
            setMigrationSnapshots(data)
        } catch (error) {
            console.error("Failed to load migration snapshots", error)
            setMigrationSnapshots(null)
        }
    }

    const handleMigrationSync = async (action: string) => {
        if (!user) return

        setIsMigrationSyncing(action)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/migration-sync", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chatbotId: chatbotId || user.uid,
                    action,
                }),
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.error || "Migration sync failed")
            }

            toast({
                title: t("omni.settings.migration.toast.syncCompleted.title"),
                description: data?.snapshotId ? `${(data?.applied || []).join(", ") || action} • snapshot ${data.snapshotId}` : (data?.applied || []).join(", ") || action,
            })
            loadMigrationReport()
            loadMigrationSnapshots()
            load()
        } catch (error) {
            toast({
                title: t("omni.settings.migration.toast.syncFailed.title"),
                description: error instanceof Error ? error.message : t("omni.settings.migration.toast.syncFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsMigrationSyncing(null)
        }
    }

    const handleMigrationRestore = async (snapshotId: string) => {
        if (!user) return

        setIsMigrationRestoring(snapshotId)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/migration-restore", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chatbotId: chatbotId || user.uid,
                    snapshotId,
                }),
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.error || "Migration restore failed")
            }

            toast({
                title: t("omni.settings.migration.toast.restoreCompleted.title"),
                description: t("omni.settings.migration.toast.restoreCompleted.description").replace("{id}", snapshotId),
            })
            loadMigrationReport()
            loadMigrationSnapshots()
            load()
        } catch (error) {
            toast({
                title: t("omni.settings.migration.toast.restoreFailed.title"),
                description: error instanceof Error ? error.message : t("omni.settings.migration.toast.restoreFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsMigrationRestoring(null)
        }
    }

    useEffect(() => {
        load()
        loadSmokeManifest()
        loadSmokeReport()
        loadSmokeRuns()
        loadRolloutReadiness()
        loadMigrationReport()
        loadMigrationSnapshots()
    }, [user, chatbotId])

    const loadInspectorLogs = async (params?: {
        channel?: "voice" | "whatsapp" | "instagram"
        eventPrefix?: string
        result?: "all" | "success" | "error" | "denied"
    }) => {
        if (!user) return

        const nextChannel = params?.channel || inspectorChannel
        const nextPrefix = params?.eventPrefix ?? inspectorEventPrefix
        const nextResult = params?.result || inspectorResult

        setIsInspectorLoading(true)
        try {
            const token = await user.getIdToken()
            const query = new URLSearchParams({
                chatbotId: chatbotId || user.uid,
                channel: nextChannel,
                limit: "20",
            })
            if (nextPrefix) {
                query.set("eventPrefix", nextPrefix)
            }
            if (nextResult !== "all") {
                query.set("result", nextResult)
            }

            const response = await fetch(`/api/omni/audit-logs?${query.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load smoke test logs")
            }

            const data = await response.json()
            setInspectorLogs(data.logs || [])
        } catch (error) {
            console.error("Failed to load smoke test logs", error)
            setInspectorLogs([])
        } finally {
            setIsInspectorLoading(false)
        }
    }

    const handleCopy = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value)
            toast({
                title: t("omni.settings.toast.copied.title"),
                description: t("omni.settings.toast.copied.description"),
            })
        } catch {
            toast({
                title: t("omni.settings.toast.copyFailed.title"),
                description: t("omni.settings.toast.copyFailed.description"),
                variant: "destructive",
            })
        }
    }

    useEffect(() => {
        loadInspectorLogs()
    }, [user, inspectorChannel, inspectorEventPrefix, inspectorResult])

    const handleSaveOperations = async () => {
        if (!user) return

        setIsSaving(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/settings", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chatbotId: chatbotId || user.uid,
                    operations,
                    provisioning,
                }),
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.error || "Failed to save operations settings")
            }

            setOperations(data.operations || operations)
            setProvisioning(data.provisioning || provisioning)
            setPayload((current) =>
                current
                    ? {
                          ...current,
                          operations: data.operations || operations,
                          provisioning: data.provisioning || provisioning,
                          assigneeOptions: data.operations?.teamMembers || operations.teamMembers || [],
                      }
                    : current
            )
            loadSmokeReport()
            toast({
                title: t("omni.settings.toast.saved.title"),
                description: t("omni.settings.toast.saved.description"),
            })
        } catch (error) {
            toast({
                title: t("omni.settings.toast.saveFailed.title"),
                description: error instanceof Error ? error.message : t("omni.settings.toast.saveFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const assigneeOptions = buildAssigneeOptions(operations)
    const selectedSmokeChannel = smokeManifest?.channels?.[inspectorChannel] || null
    const selectedSmokeReportChannel = smokeReport?.channels?.[inspectorChannel] || null
    const selectedSmokeRuns = (smokeRuns?.runs || []).filter((run) => run.channel === inspectorChannel)
    const inspectorPrefixOptions = {
        voice: ["voice.", "voice.webhook_", "voice.test_call", "voice.health_check", "voice.callback_execute"],
        whatsapp: ["whatsapp.", "whatsapp.webhook_", "whatsapp.auto_reply", "whatsapp.test_message", "whatsapp.health_check", "whatsapp.delivery_retry"],
        instagram: ["instagram.", "instagram.webhook_", "instagram.auto_reply", "instagram.test_message", "instagram.health_check", "instagram.delivery_retry"],
    } as const
    const channelTitles = {
        voice: "Voice Calls",
        whatsapp: "WhatsApp",
        instagram: "Instagram DM",
    } as const
    const channelDescriptions = {
        voice: "Twilio webhook and test-call readiness.",
        whatsapp: "Meta WhatsApp webhook and auto-reply readiness.",
        instagram: "Meta Instagram DM webhook and auto-reply readiness.",
    } as const

    const handleSettingsTabChange = (value: string) => {
        const nextTab = value as SettingsTab
        setActiveSettingsTab(nextTab)
        if (nextTab === "voice" || nextTab === "whatsapp" || nextTab === "instagram") {
            setInspectorChannel(nextTab)
            setInspectorEventPrefix(inspectorPrefixOptions[nextTab][0])
        }
    }

    const smokeRunbook = {
        voice: [
            t("omni.settings.runbook.voice.step1"),
            t("omni.settings.runbook.voice.step2"),
            t("omni.settings.runbook.voice.step3"),
            t("omni.settings.runbook.voice.step4"),
        ],
        whatsapp: [
            t("omni.settings.runbook.whatsapp.step1"),
            t("omni.settings.runbook.whatsapp.step2"),
            t("omni.settings.runbook.whatsapp.step3"),
            t("omni.settings.runbook.whatsapp.step4"),
        ],
        instagram: [
            t("omni.settings.runbook.instagram.step1"),
            t("omni.settings.runbook.instagram.step2"),
            t("omni.settings.runbook.instagram.step3"),
            t("omni.settings.runbook.instagram.step4"),
        ],
    } as const

    const addTeamMember = () => {
        setOperations((current) => ({
            ...current,
            teamMembers: [...(current.teamMembers || []), buildEmptyMember((current.teamMembers || []).length + 1)],
        }))
    }

    const updateTeamMember = (index: number, patch: Partial<OmniTeamMember>) => {
        setOperations((current) => ({
            ...current,
            teamMembers: (current.teamMembers || []).map((member, memberIndex) =>
                memberIndex === index
                    ? (() => {
                          const nextMember = {
                              ...member,
                              ...patch,
                          }

                          return {
                              ...nextMember,
                              id:
                                  normalizeTeamMemberValue({
                                      name: nextMember.name,
                                      email: nextMember.email,
                                      fallback: nextMember.id,
                                  }) || member.id,
                          }
                      })()
                    : member
            ),
        }))
    }

    const removeTeamMember = (index: number) => {
        setOperations((current) => ({
            ...current,
            teamMembers: (current.teamMembers || []).filter((_, memberIndex) => memberIndex !== index),
        }))
    }

    const updateProvisioningTask = (taskId: string, patch: Partial<OmniProvisioningTask>) => {
        setProvisioning((current) =>
            current.map((task) =>
                task.id === taskId
                    ? {
                          ...task,
                          ...patch,
                          updatedAt: new Date().toISOString(),
                      }
                    : task
            )
        )
    }

    const renderChannelMeta = (channel: "voice" | "whatsapp" | "instagram") => {
        const safePayload = payload!
        if (channel === "voice") {
            return (
                <div className="grid gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between gap-3">
                        <span>Configured numbers</span>
                        <Badge variant="outline">{safePayload.channels.voice.configuredNumbers || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <span>Active numbers</span>
                        <Badge variant="outline">{safePayload.channels.voice.activeNumbers || 0}</Badge>
                    </div>
                </div>
            )
        }

        if (channel === "whatsapp") {
            return (
                <div className="grid gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between gap-3">
                        <span>Webhook status</span>
                        <Badge variant="outline">{safePayload.channels.whatsapp.webhookStatus || "unknown"}</Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <span>Reply mode</span>
                        <Badge variant="outline">{safePayload.channels.whatsapp.defaultReplyMode || "assistant"}</Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <span>Verify token</span>
                        <Badge variant="outline">{safePayload.channels.whatsapp.verifyTokenConfigured ? "configured" : "missing"}</Badge>
                    </div>
                </div>
            )
        }

        return (
            <div className="grid gap-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between gap-3">
                    <span>Webhook status</span>
                    <Badge variant="outline">{safePayload.channels.instagram.webhookStatus || "unknown"}</Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                    <span>Reply mode</span>
                    <Badge variant="outline">{safePayload.channels.instagram.defaultReplyMode || "assistant"}</Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                    <span>Verify token</span>
                    <Badge variant="outline">{safePayload.channels.instagram.verifyTokenConfigured ? "configured" : "missing"}</Badge>
                </div>
            </div>
        )
    }

    if (isLoading) {
        return <OmniStateShell title={t("omni.common.loading")} description={t("omni.settings.readiness.title")} />
    }

    if (!payload) {
        return <OmniStateShell title="Settings metadata could not be loaded." description={t("omni.settings.readiness.title")} tone="warning" />
    }

    return (
        <Tabs value={activeSettingsTab} onValueChange={handleSettingsTabChange} className="space-y-6">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-[12px] bg-zinc-200/80 p-1 md:grid-cols-4">
                <TabsTrigger value="general">{t("omni.settings.section.general.title")}</TabsTrigger>
                <TabsTrigger value="voice">{channelTitles.voice}</TabsTrigger>
                <TabsTrigger value="whatsapp">{channelTitles.whatsapp}</TabsTrigger>
                <TabsTrigger value="instagram">{channelTitles.instagram}</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
            <Card className="rounded-lg border-border/70 bg-card/95 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg">{t("omni.settings.readiness.title")}</CardTitle>
                            <CardDescription>{payload.environmentHint}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <ReadinessBadge ready={payload.publicOrigin} />
                            <Button
                                variant="outline"
                                onClick={() => {
                                    load()
                                    loadSmokeManifest()
                                    loadSmokeReport()
                                    loadSmokeRuns()
                                    loadRolloutReadiness()
                                    loadMigrationReport()
                                    loadMigrationSnapshots()
                                }}
                            >
                                {t("omni.common.actions")}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <div className="text-sm font-medium text-foreground">{t("omni.settings.readiness.baseUrl")}</div>
                        <div className="flex gap-2">
                            <Input value={payload.baseUrl} readOnly />
                            <Button type="button" variant="outline" size="icon" onClick={() => handleCopy(payload.baseUrl)}>
                                <Copy className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="outline" size="icon" asChild>
                                <a href={payload.baseUrl} target="_blank" rel="noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="text-sm font-medium text-foreground">{t("omni.settings.readiness.nextSteps")}</div>
                        <div className="space-y-2">
                            {payload.suggestedNextSteps.map((step) => (
                                <div key={step} className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                                    {step}
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-lg border-border/70 bg-card/95 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg">{t("omni.settings.rollout.title")}</CardTitle>
                            <CardDescription>{t("omni.settings.rollout.description")}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {rolloutReadiness ? (
                                <RolloutStatusBadge
                                    status={
                                        rolloutReadiness.overallReady
                                            ? "ready"
                                            : rolloutReadiness.summary.channelsBlocked > 0 || !rolloutReadiness.publicOrigin
                                              ? "blocked"
                                              : "pending"
                                    }
                                />
                            ) : null}
                            <Button variant="outline" onClick={loadRolloutReadiness}>
                                {t("omni.settings.rollout.refresh")}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!rolloutReadiness ? (
                        <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                            {t("omni.settings.rollout.empty")}
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-4 md:grid-cols-4">
                                <div className="rounded-lg border p-4">
                                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("omni.settings.rollout.metric.progress")}</div>
                                    <div className="mt-2 text-2xl font-semibold text-foreground">%{rolloutReadiness.summary.progress}</div>
                                    <div className="mt-1 text-sm text-muted-foreground">
                                        {rolloutReadiness.summary.doneSteps}/{rolloutReadiness.summary.totalSteps} {t("omni.settings.rollout.metric.steps")}
                                    </div>
                                </div>
                                <div className="rounded-lg border p-4">
                                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("omni.settings.rollout.metric.readyChannels")}</div>
                                    <div className="mt-2 text-2xl font-semibold text-foreground">{rolloutReadiness.summary.channelsReady}</div>
                                    <div className="mt-1 text-sm text-muted-foreground">
                                        {t("omni.settings.rollout.metric.pendingChannels")}: {rolloutReadiness.summary.channelsPending}
                                    </div>
                                </div>
                                <div className="rounded-lg border p-4">
                                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("omni.settings.rollout.metric.blockedChannels")}</div>
                                    <div className="mt-2 text-2xl font-semibold text-foreground">{rolloutReadiness.summary.channelsBlocked}</div>
                                    <div className="mt-1 text-sm text-muted-foreground">
                                        {t("omni.settings.rollout.metric.disabledChannels")}: {rolloutReadiness.summary.channelsDisabled}
                                    </div>
                                </div>
                                <div className="rounded-lg border p-4">
                                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("omni.settings.rollout.metric.publicUrl")}</div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <RolloutStatusBadge status={rolloutReadiness.publicOrigin ? "ready" : "blocked"} />
                                    </div>
                                    <div className="mt-1 text-sm text-muted-foreground">
                                        {rolloutReadiness.baseUrl}
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 xl:grid-cols-2">
                                <div className="space-y-3 rounded-lg border p-4">
                                    <div className="text-sm font-medium text-foreground">{t("omni.settings.rollout.nextActions")}</div>
                                    {rolloutReadiness.nextActions.length === 0 ? (
                                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                                            {t("omni.settings.rollout.allReady")}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {rolloutReadiness.nextActions.slice(0, 5).map((action) => (
                                                <div key={`${action.channel}-${action.label}`} className="rounded-lg border px-4 py-3">
                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                        <div className="space-y-1">
                                                            <div className="text-sm font-medium text-foreground">{action.label}</div>
                                                            <div className="text-sm text-muted-foreground">{action.description}</div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline">{action.channel}</Badge>
                                                            {action.href ? (
                                                                <Button variant="outline" size="sm" asChild>
                                                                    <a href={action.href}>{t("omni.settings.rollout.open")}</a>
                                                                </Button>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3 rounded-lg border p-4">
                                    <div className="text-sm font-medium text-foreground">{t("omni.settings.rollout.globalSteps")}</div>
                                    <div className="space-y-3">
                                        {rolloutReadiness.globalSteps.map((step) => (
                                            <div key={step.id} className="rounded-lg border px-4 py-3">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <div className="text-sm font-medium text-foreground">{step.label}</div>
                                                        <div className="text-sm text-muted-foreground">{step.description}</div>
                                                    </div>
                                                    <RolloutStatusBadge status={step.status} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 xl:grid-cols-2">
                                {(Object.entries(rolloutReadiness.channels) as Array<[keyof OmniRolloutReadinessPayload["channels"], OmniRolloutReadinessPayload["channels"][keyof OmniRolloutReadinessPayload["channels"]]]>).map(
                                    ([channel, state]) => (
                                        <div key={channel} className="rounded-lg border p-4 space-y-3">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <div className="text-sm font-medium text-foreground">{getOmniChannelLabel(t, channel)}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {state.summary.done}/{state.summary.total} {t("omni.settings.rollout.metric.steps")}
                                                        {state.latestSmokeAt
                                                            ? ` • ${t("omni.settings.rollout.lastSmoke")}: ${formatDateTime(state.latestSmokeAt, language, t)}`
                                                            : ` • ${t("omni.settings.rollout.noSmoke")}`}
                                                    </div>
                                                </div>
                                                <RolloutStatusBadge status={state.state} />
                                            </div>
                                            <div className="space-y-2">
                                                {state.steps.map((step) => (
                                                    <div key={`${channel}-${step.id}`} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3">
                                                        <div className="space-y-1">
                                                            <div className="text-sm font-medium text-foreground">{step.label}</div>
                                                            <div className="text-sm text-muted-foreground">{step.description}</div>
                                                        </div>
                                                        <RolloutStatusBadge status={step.status} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Card className="rounded-lg border-border/70 bg-card/95 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg">{t("omni.settings.migration.title")}</CardTitle>
                            <CardDescription>
                                {t("omni.settings.migration.description")}
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => {
                                loadMigrationReport()
                                loadMigrationSnapshots()
                            }}
                        >
                            {t("omni.settings.migration.action.refresh")}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!migrationReport ? (
                        <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                            {t("omni.settings.migration.empty")}
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="rounded-lg border p-4">
                                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("omni.settings.migration.metric.whatsappParity")}</div>
                                    <div className="mt-2 text-lg font-semibold text-foreground">
                                        {migrationReport.parity.whatsappConfigSynced ? t("omni.settings.migration.synced") : t("omni.settings.migration.pending")}
                                    </div>
                                </div>
                                <div className="rounded-lg border p-4">
                                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("omni.settings.migration.metric.brandContext")}</div>
                                    <div className="mt-2 text-lg font-semibold text-foreground">
                                        {migrationReport.parity.brandContextSynced ? t("omni.settings.migration.synced") : t("omni.settings.migration.pending")}
                                    </div>
                                </div>
                                <div className="rounded-lg border p-4">
                                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("omni.settings.migration.metric.workspaceLabel")}</div>
                                    <div className="mt-2 text-lg font-semibold text-foreground">
                                        {migrationReport.parity.workspaceLabelSynced ? t("omni.settings.migration.synced") : t("omni.settings.migration.pending")}
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 xl:grid-cols-2">
                                <div className="space-y-3 rounded-lg border p-4">
                                    <div className="text-sm font-medium text-foreground">{t("omni.settings.channel.blockers")}</div>
                                    {migrationReport.blockers.length === 0 ? (
                                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                                            {t("omni.settings.migration.noBlockers")}
                                        </div>
                                    ) : (
                                        migrationReport.blockers.map((blocker) => (
                                            <div key={blocker} className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                                                {blocker}
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="space-y-3 rounded-lg border p-4">
                                    <div className="text-sm font-medium text-foreground">{t("omni.settings.migration.syncActions")}</div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button variant="outline" disabled={isMigrationSyncing !== null} onClick={() => handleMigrationSync("sync_legacy_whatsapp")}>
                                            {isMigrationSyncing === "sync_legacy_whatsapp" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            {t("omni.settings.migration.action.syncWhatsapp")}
                                        </Button>
                                        <Button variant="outline" disabled={isMigrationSyncing !== null} onClick={() => handleMigrationSync("sync_brand_context")}>
                                            {isMigrationSyncing === "sync_brand_context" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            {t("omni.settings.migration.action.syncBrand")}
                                        </Button>
                                        <Button disabled={isMigrationSyncing !== null} onClick={() => handleMigrationSync("run_all")}>
                                            {isMigrationSyncing === "run_all" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            {t("omni.settings.migration.action.runAll")}
                                        </Button>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {t("omni.settings.migration.stats")
                                            .replace("{company}", migrationReport.legacy.companyName || t("omni.common.notAvailable"))
                                            .replace("{sessions}", String(migrationReport.stats.sessions.total))
                                            .replace("{contacts}", String(migrationReport.stats.contacts))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 rounded-lg border p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-medium text-foreground">Recent Snapshots</div>
                                        <div className="text-sm text-muted-foreground">
                                            Sync oncesi config snapshot’lari. Gerekirse tek tikla rollback yap.
                                        </div>
                                    </div>
                                    {migrationSnapshots ? (
                                        <Badge variant="outline">
                                            {migrationSnapshots.summary.total} snapshot • {migrationSnapshots.summary.restored} restored
                                        </Badge>
                                    ) : null}
                                </div>

                                {!migrationSnapshots || migrationSnapshots.snapshots.length === 0 ? (
                                    <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                        Snapshot bulunamadi. Bir migration sync calistiginda burada gorunecek.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {migrationSnapshots.snapshots.map((snapshot) => (
                                            <div key={snapshot.id} className="rounded-lg border p-4">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="space-y-2">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Badge variant="outline">{snapshot.action}</Badge>
                                                            {snapshot.restoredAt ? <Badge className="bg-amber-500 text-white hover:bg-amber-500">Restored</Badge> : null}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {t("omni.settings.migration.snapshot.created")
                                                                .replace("{date}", formatDateTime(snapshot.createdAt, language, t))
                                                                .replace("{source}", snapshot.source)}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            Applied: {snapshot.applied.length > 0 ? snapshot.applied.join(", ") : "none"}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            WhatsApp: {snapshot.configSummary.whatsappPhoneNumberId || "n/a"} • Brand prompt: {snapshot.configSummary.hasBrandVoicePrompt ? "yes" : "no"} • Workspace: {snapshot.configSummary.workspaceLabel || "n/a"}
                                                        </div>
                                                        {snapshot.restoredAt ? (
                                                            <div className="text-sm text-muted-foreground">
                                                                {t("omni.settings.migration.snapshot.restored")
                                                                    .replace("{date}", formatDateTime(snapshot.restoredAt, language, t))
                                                                    .replace("{count}", String(snapshot.restoreCount || 0))}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        disabled={isMigrationSyncing !== null || isMigrationRestoring !== null}
                                                        onClick={() => handleMigrationRestore(snapshot.id)}
                                                    >
                                                        {isMigrationRestoring === snapshot.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                        Restore Snapshot
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Operations Ownership</CardTitle>
                    <CardDescription>
                        {t("omni.settings.operations.description")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="workspace-label">{t("omni.settings.operations.field.workspaceLabel")}</Label>
                            <Input
                                id="workspace-label"
                                value={operations.workspaceLabel || ""}
                                onChange={(event) => setOperations((current) => ({ ...current, workspaceLabel: event.target.value }))}
                                placeholder={t("omni.settings.operations.field.workspaceLabelPlaceholder")}
                            />
                        </div>
                        <AssigneeSelect
                            id="default-assignee"
                            label={t("omni.settings.operations.field.defaultAssignee")}
                            value={operations.defaultAssignee || ""}
                            options={assigneeOptions}
                            unassignedLabel={t("omni.settings.operations.unassigned")}
                            onChange={(value) => setOperations((current) => ({ ...current, defaultAssignee: value }))}
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <AssigneeSelect
                            id="callback-assignee"
                            label={t("omni.settings.operations.field.callbackAssignee")}
                            value={operations.callbackAssignee || ""}
                            options={assigneeOptions}
                            unassignedLabel={t("omni.settings.operations.unassigned")}
                            onChange={(value) => setOperations((current) => ({ ...current, callbackAssignee: value }))}
                        />
                        <AssigneeSelect
                            id="appointment-assignee"
                            label={t("omni.settings.operations.field.appointmentAssignee")}
                            value={operations.appointmentAssignee || ""}
                            options={assigneeOptions}
                            unassignedLabel={t("omni.settings.operations.unassigned")}
                            onChange={(value) => setOperations((current) => ({ ...current, appointmentAssignee: value }))}
                        />
                        <AssigneeSelect
                            id="lead-assignee"
                            label={t("omni.settings.operations.field.leadAssignee")}
                            value={operations.leadAssignee || ""}
                            options={assigneeOptions}
                            unassignedLabel={t("omni.settings.operations.unassigned")}
                            onChange={(value) => setOperations((current) => ({ ...current, leadAssignee: value }))}
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="escalation-email">{t("omni.settings.operations.field.escalationEmail")}</Label>
                            <Input
                                id="escalation-email"
                                value={operations.escalationEmail || ""}
                                onChange={(event) => setOperations((current) => ({ ...current, escalationEmail: event.target.value }))}
                                placeholder={t("omni.settings.operations.field.escalationEmailPlaceholder")}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="escalation-phone">{t("omni.settings.operations.field.escalationPhone")}</Label>
                            <Input
                                id="escalation-phone"
                                value={operations.escalationPhone || ""}
                                onChange={(event) => setOperations((current) => ({ ...current, escalationPhone: event.target.value }))}
                                placeholder={t("omni.settings.operations.field.escalationPhonePlaceholder")}
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="callback-sla">Callback SLA (hours)</Label>
                            <Input
                                id="callback-sla"
                                type="number"
                                min="1"
                                max="168"
                                value={operations.callbackSlaHours || 4}
                                onChange={(event) =>
                                    setOperations((current) => ({
                                        ...current,
                                        callbackSlaHours: Number(event.target.value) || 4,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="review-mode">Review Mode</Label>
                            <select
                                id="review-mode"
                                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                value={operations.reviewMode || "assistant"}
                                onChange={(event) =>
                                    setOperations((current) => ({
                                        ...current,
                                        reviewMode: event.target.value === "human_review" ? "human_review" : "assistant",
                                    }))
                                }
                            >
                                <option value="assistant">Assistant-first</option>
                                <option value="human_review">Human review</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="operations-notes">Operations Notes</Label>
                        <Textarea
                            id="operations-notes"
                            rows={5}
                            value={operations.notes || ""}
                            onChange={(event) => setOperations((current) => ({ ...current, notes: event.target.value }))}
                            placeholder="Escalation paths, team ownership, manual review rules..."
                        />
                    </div>

                    <div className="space-y-4 rounded-lg border p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-sm font-medium text-foreground">Team Roster</div>
                                <div className="text-sm text-muted-foreground">
                                    Owners shown in callback, lead, and appointment queues come from this list.
                                </div>
                            </div>
                            <Button type="button" variant="outline" onClick={addTeamMember}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Member
                            </Button>
                        </div>
                        {(operations.teamMembers || []).length === 0 ? (
                            <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                No team members yet. Add at least one owner to assign callback, lead, and appointment work.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {(operations.teamMembers || []).map((member, index) => (
                                    <div key={member.id || index} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1.2fr_1.4fr_0.8fr_0.7fr_auto]">
                                        <Input
                                            placeholder="Name"
                                            value={member.name || ""}
                                            onChange={(event) => updateTeamMember(index, { name: event.target.value })}
                                        />
                                        <Input
                                            placeholder="email@company.com"
                                            value={member.email || ""}
                                            onChange={(event) =>
                                                updateTeamMember(index, {
                                                    email: event.target.value,
                                                })
                                            }
                                        />
                                        <select
                                            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                            value={member.role || "operations"}
                                            onChange={(event) =>
                                                updateTeamMember(index, {
                                                    role: event.target.value as OmniTeamMember["role"],
                                                })
                                            }
                                        >
                                            <option value="operations">Operations</option>
                                            <option value="sales">Sales</option>
                                            <option value="support">Support</option>
                                            <option value="manager">Manager</option>
                                        </select>
                                        <select
                                            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                            value={member.active === false ? "inactive" : "active"}
                                            onChange={(event) =>
                                                updateTeamMember(index, {
                                                    active: event.target.value === "active",
                                                })
                                            }
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                        <Button type="button" variant="outline" size="icon" onClick={() => removeTeamMember(index)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 rounded-lg border p-4">
                        <div>
                            <div className="text-sm font-medium text-foreground">Provisioning Checklist</div>
                            <div className="text-sm text-muted-foreground">
                                Track who owns provider setup before public webhook smoke tests.
                            </div>
                        </div>
                        <div className="space-y-3">
                            {provisioning.map((task) => (
                                <div key={task.id} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[0.9fr_1.4fr_1fr_1fr]">
                                    <div className="space-y-1">
                                        <div className="text-xs uppercase tracking-wide text-muted-foreground">{task.channel}</div>
                                        <div className="text-sm font-medium text-foreground">{task.label}</div>
                                    </div>
                                    <select
                                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                        value={task.status}
                                        onChange={(event) =>
                                            updateProvisioningTask(task.id, {
                                                status: event.target.value as OmniProvisioningTask["status"],
                                            })
                                        }
                                    >
                                        <option value="todo">Todo</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="blocked">Blocked</option>
                                        <option value="done">Done</option>
                                    </select>
                                    <select
                                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                        value={task.owner || ""}
                                        onChange={(event) => updateProvisioningTask(task.id, { owner: event.target.value })}
                                    >
                                        <option value="">Unassigned</option>
                                        {assigneeOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <Input
                                        placeholder="Notes / blocker"
                                        value={task.notes || ""}
                                        onChange={(event) => updateProvisioningTask(task.id, { notes: event.target.value })}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleSaveOperations} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save Operations Settings
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
                <ChannelCard
                    title="Web Widget"
                    description="Public widget runtime and embed availability."
                    readiness={payload.channels.web}
                    onCopy={handleCopy}
                    meta={
                        <div className="grid gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center justify-between gap-3">
                                <span>Public runtime</span>
                                <Badge variant="outline">{payload.channels.web.enabled === false ? "disabled" : "enabled"}</Badge>
                            </div>
                        </div>
                    }
                />

                <ChannelCard
                    title="Voice Calls"
                    description="Twilio webhook and test-call readiness."
                    readiness={payload.channels.voice}
                    onCopy={handleCopy}
                    meta={
                        <div className="grid gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center justify-between gap-3">
                                <span>Configured numbers</span>
                                <Badge variant="outline">{payload.channels.voice.configuredNumbers || 0}</Badge>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span>Active numbers</span>
                                <Badge variant="outline">{payload.channels.voice.activeNumbers || 0}</Badge>
                            </div>
                        </div>
                    }
                />

                <ChannelCard
                    title="WhatsApp"
                    description="Meta WhatsApp webhook and auto-reply readiness."
                    readiness={payload.channels.whatsapp}
                    onCopy={handleCopy}
                    meta={
                        <div className="grid gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center justify-between gap-3">
                                <span>Webhook status</span>
                                <Badge variant="outline">{payload.channels.whatsapp.webhookStatus || "unknown"}</Badge>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span>Reply mode</span>
                                <Badge variant="outline">{payload.channels.whatsapp.defaultReplyMode || "assistant"}</Badge>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span>Verify token</span>
                                <Badge variant="outline">
                                    {payload.channels.whatsapp.verifyTokenConfigured ? "configured" : "missing"}
                                </Badge>
                            </div>
                        </div>
                    }
                />

                <ChannelCard
                    title="Instagram DM"
                    description="Meta Instagram DM webhook and auto-reply readiness."
                    readiness={payload.channels.instagram}
                    onCopy={handleCopy}
                    meta={
                        <div className="grid gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center justify-between gap-3">
                                <span>Webhook status</span>
                                <Badge variant="outline">{payload.channels.instagram.webhookStatus || "unknown"}</Badge>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span>Reply mode</span>
                                <Badge variant="outline">{payload.channels.instagram.defaultReplyMode || "assistant"}</Badge>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span>Verify token</span>
                                <Badge variant="outline">
                                    {payload.channels.instagram.verifyTokenConfigured ? "configured" : "missing"}
                                </Badge>
                            </div>
                        </div>
                    }
                />
            </div>

            <SmokeReportCard smokeReport={smokeReport} onRefresh={loadSmokeReport} onCopy={handleCopy} language={language} />
            </TabsContent>

            <TabsContent value="voice" className="space-y-6">
                <ChannelCard
                    title={channelTitles.voice}
                    description={channelDescriptions.voice}
                    readiness={payload.channels.voice}
                    onCopy={handleCopy}
                    meta={renderChannelMeta("voice")}
                />

                <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Smoke Test Runbook</CardTitle>
                            <CardDescription>Provider tarafinda voice kurulumu ve smoke sirasini buradan takip et.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                {smokeRunbook.voice.map((step, index) => (
                                    <div key={`voice-${index}`} className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                                        {index + 1}. {step}
                                    </div>
                                ))}
                            </div>
                            {selectedSmokeReportChannel ? (
                                <div className="grid gap-3 md:grid-cols-3">
                                    <div className="rounded-lg border px-4 py-3 text-sm">
                                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Audit</div>
                                        <div className="mt-1 font-medium text-foreground">{selectedSmokeReportChannel.audit.total} event</div>
                                        <div className="mt-1 text-muted-foreground">error: {selectedSmokeReportChannel.audit.error} • denied: {selectedSmokeReportChannel.audit.denied}</div>
                                    </div>
                                    <div className="rounded-lg border px-4 py-3 text-sm">
                                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Delivery</div>
                                        <div className="mt-1 font-medium text-foreground">{selectedSmokeReportChannel.delivery.failed} failure</div>
                                        <div className="mt-1 text-muted-foreground">
                                            retry: {selectedSmokeReportChannel.delivery.retryEligible} • exhausted: {selectedSmokeReportChannel.delivery.exhaustedRetries}
                                        </div>
                                    </div>
                                    <div className="rounded-lg border px-4 py-3 text-sm">
                                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Blockers</div>
                                        <div className="mt-1 font-medium text-foreground">{selectedSmokeReportChannel.blockers.length}</div>
                                        <div className="mt-1 text-muted-foreground">{selectedSmokeReportChannel.ready ? "Channel ready" : "Aksiyon gerekli"}</div>
                                    </div>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-lg">Provider Event Inspector</CardTitle>
                                    <CardDescription>Voice event&apos;lerini ve signature/replay sonucunu tek yerden gor.</CardDescription>
                                </div>
                                <Button variant="outline" onClick={() => loadInspectorLogs({ channel: "voice" })}>
                                    Refresh Events
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="inspector-event-prefix-voice">Event Group</Label>
                                    <select
                                        id="inspector-event-prefix-voice"
                                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                        value={inspectorEventPrefix}
                                        onChange={(event) => setInspectorEventPrefix(event.target.value)}
                                    >
                                        {inspectorPrefixOptions.voice.map((prefix) => (
                                            <option key={prefix} value={prefix}>
                                                {prefix}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="inspector-result-voice">Result</Label>
                                    <select
                                        id="inspector-result-voice"
                                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                        value={inspectorResult}
                                        onChange={(event) => setInspectorResult(event.target.value as typeof inspectorResult)}
                                    >
                                        <option value="all">all</option>
                                        <option value="success">success</option>
                                        <option value="error">error</option>
                                        <option value="denied">denied</option>
                                    </select>
                                </div>
                            </div>

                            {isInspectorLoading ? (
                                <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading provider events...
                                </div>
                            ) : inspectorLogs.length === 0 ? (
                                <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                    Bu filtrelerle voice event bulunamadi.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {inspectorLogs.map((log) => (
                                        <div key={log.id} className="rounded-lg border p-4">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium text-foreground">{log.eventType}</p>
                                                    <p className="text-sm text-muted-foreground">{log.message || "No message"}</p>
                                                    <p className="text-xs text-muted-foreground">{log.source || "unknown source"}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant="outline">{log.channel}</Badge>
                                                    <Badge
                                                        className={
                                                            log.result === "success"
                                                                ? "bg-emerald-600 text-white hover:bg-emerald-600"
                                                                : log.result === "denied"
                                                                  ? "bg-amber-500 text-white hover:bg-amber-500"
                                                                  : "bg-red-600 text-white hover:bg-red-600"
                                                        }
                                                    >
                                                        {log.result}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-lg">Recent Smoke Runs</CardTitle>
                                <CardDescription>Voice health check ve test call sonucunu takip et.</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                    {selectedSmokeRuns.filter((run) => run.result === "success").length} success / {selectedSmokeRuns.filter((run) => run.result === "blocked").length} blocked / {selectedSmokeRuns.filter((run) => run.result === "error").length} error
                                </Badge>
                                <Button variant="outline" onClick={loadSmokeRuns}>
                                    Refresh Runs
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!smokeRuns ? (
                            <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">Smoke run history okunamadi.</div>
                        ) : selectedSmokeRuns.length === 0 ? (
                            <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">Voice icin kayitli smoke run yok.</div>
                        ) : (
                            <div className="space-y-3">
                                {selectedSmokeRuns.slice(0, 8).map((run) => (
                                    <div key={run.id || `${run.channel}-${run.action}-${run.createdAt}`} className="rounded-lg border p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <div className="text-sm font-medium text-foreground">{run.action}</div>
                                                <div className="text-sm text-muted-foreground">{run.message || "No message"}</div>
                                                <div className="text-xs text-muted-foreground">{run.source}</div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Badge variant="outline">{run.provider}</Badge>
                                                <Badge
                                                    className={
                                                        run.result === "success"
                                                            ? "bg-emerald-600 text-white hover:bg-emerald-600"
                                                            : run.result === "blocked"
                                                              ? "bg-amber-500 text-black hover:bg-amber-500"
                                                              : "bg-red-600 text-white hover:bg-red-600"
                                                    }
                                                >
                                                    {run.result}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-lg">Provider Console Mapping</CardTitle>
                                <CardDescription>{smokeManifest?.environmentHint || "Public smoke test icin provider tarafina girilecek alanlar."}</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedSmokeChannel ? <ReadinessBadge ready={selectedSmokeChannel.ready} /> : null}
                                <Button variant="outline" onClick={loadSmokeManifest}>
                                    Refresh Manifest
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {selectedSmokeChannel ? (
                            <>
                                <div className="rounded-lg border bg-muted/20 px-4 py-3">
                                    <div className="text-sm font-medium text-foreground">{selectedSmokeChannel.provider}</div>
                                    <div className="mt-1 text-sm text-muted-foreground">
                                        Channel: voice {smokeManifest?.generatedAt ? `• updated ${new Date(smokeManifest.generatedAt).toLocaleString("tr-TR")}` : ""}
                                    </div>
                                </div>
                                <div className="grid gap-4 xl:grid-cols-2">
                                    <div className="space-y-3">
                                        <div className="text-sm font-medium text-foreground">Provider Fields</div>
                                        {selectedSmokeChannel.providerConsoleFields.map((field) => (
                                            <div key={field.label} className="space-y-2">
                                                <div className="text-xs uppercase tracking-wide text-muted-foreground">{field.label}</div>
                                                <div className="flex gap-2">
                                                    <Input value={field.value} readOnly />
                                                    <Button type="button" variant="outline" size="icon" onClick={() => handleCopy(field.value)}>
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="space-y-3">
                                        <div className="text-sm font-medium text-foreground">Expected Audit Events</div>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedSmokeChannel.expectedAuditEvents.map((eventType) => (
                                                <Badge key={eventType} variant="outline">
                                                    {eventType}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">Smoke manifest okunamadi.</div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="whatsapp" className="space-y-6">
                <ChannelCard
                    title={channelTitles.whatsapp}
                    description={channelDescriptions.whatsapp}
                    readiness={payload.channels.whatsapp}
                    onCopy={handleCopy}
                    meta={renderChannelMeta("whatsapp")}
                />

                <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Smoke Test Runbook</CardTitle>
                            <CardDescription>WhatsApp provider kurulumu ve smoke sirasini buradan takip et.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                {smokeRunbook.whatsapp.map((step, index) => (
                                    <div key={`whatsapp-${index}`} className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                                        {index + 1}. {step}
                                    </div>
                                ))}
                            </div>
                            {selectedSmokeReportChannel ? (
                                <div className="grid gap-3 md:grid-cols-3">
                                    <div className="rounded-lg border px-4 py-3 text-sm">
                                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Audit</div>
                                        <div className="mt-1 font-medium text-foreground">{selectedSmokeReportChannel.audit.total} event</div>
                                        <div className="mt-1 text-muted-foreground">error: {selectedSmokeReportChannel.audit.error} • denied: {selectedSmokeReportChannel.audit.denied}</div>
                                    </div>
                                    <div className="rounded-lg border px-4 py-3 text-sm">
                                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Delivery</div>
                                        <div className="mt-1 font-medium text-foreground">{selectedSmokeReportChannel.delivery.failed} failure</div>
                                        <div className="mt-1 text-muted-foreground">
                                            retry: {selectedSmokeReportChannel.delivery.retryEligible} • exhausted: {selectedSmokeReportChannel.delivery.exhaustedRetries}
                                        </div>
                                    </div>
                                    <div className="rounded-lg border px-4 py-3 text-sm">
                                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Blockers</div>
                                        <div className="mt-1 font-medium text-foreground">{selectedSmokeReportChannel.blockers.length}</div>
                                        <div className="mt-1 text-muted-foreground">{selectedSmokeReportChannel.ready ? "Channel ready" : "Aksiyon gerekli"}</div>
                                    </div>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-lg">Provider Event Inspector</CardTitle>
                                    <CardDescription>WhatsApp event&apos;lerini ve signature sonucunu tek yerden gor.</CardDescription>
                                </div>
                                <Button variant="outline" onClick={() => loadInspectorLogs({ channel: "whatsapp" })}>
                                    Refresh Events
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="inspector-event-prefix-whatsapp">Event Group</Label>
                                    <select
                                        id="inspector-event-prefix-whatsapp"
                                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                        value={inspectorEventPrefix}
                                        onChange={(event) => setInspectorEventPrefix(event.target.value)}
                                    >
                                        {inspectorPrefixOptions.whatsapp.map((prefix) => (
                                            <option key={prefix} value={prefix}>
                                                {prefix}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="inspector-result-whatsapp">Result</Label>
                                    <select
                                        id="inspector-result-whatsapp"
                                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                        value={inspectorResult}
                                        onChange={(event) => setInspectorResult(event.target.value as typeof inspectorResult)}
                                    >
                                        <option value="all">all</option>
                                        <option value="success">success</option>
                                        <option value="error">error</option>
                                        <option value="denied">denied</option>
                                    </select>
                                </div>
                            </div>
                            {isInspectorLoading ? (
                                <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading provider events...
                                </div>
                            ) : inspectorLogs.length === 0 ? (
                                <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">Bu filtrelerle WhatsApp event bulunamadi.</div>
                            ) : (
                                <div className="space-y-3">
                                    {inspectorLogs.map((log) => (
                                        <div key={log.id} className="rounded-lg border p-4">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium text-foreground">{log.eventType}</p>
                                                    <p className="text-sm text-muted-foreground">{log.message || "No message"}</p>
                                                    <p className="text-xs text-muted-foreground">{log.source || "unknown source"}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant="outline">{log.channel}</Badge>
                                                    <Badge
                                                        className={
                                                            log.result === "success"
                                                                ? "bg-emerald-600 text-white hover:bg-emerald-600"
                                                                : log.result === "denied"
                                                                  ? "bg-amber-500 text-white hover:bg-amber-500"
                                                                  : "bg-red-600 text-white hover:bg-red-600"
                                                        }
                                                    >
                                                        {log.result}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-lg">Recent Smoke Runs</CardTitle>
                                <CardDescription>WhatsApp health check ve test message sonucunu takip et.</CardDescription>
                            </div>
                            <Button variant="outline" onClick={loadSmokeRuns}>
                                Refresh Runs
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!smokeRuns ? (
                            <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">Smoke run history okunamadi.</div>
                        ) : selectedSmokeRuns.length === 0 ? (
                            <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">WhatsApp icin kayitli smoke run yok.</div>
                        ) : (
                            <div className="space-y-3">
                                {selectedSmokeRuns.slice(0, 8).map((run) => (
                                    <div key={run.id || `${run.channel}-${run.action}-${run.createdAt}`} className="rounded-lg border p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <div className="text-sm font-medium text-foreground">{run.action}</div>
                                                <div className="text-sm text-muted-foreground">{run.message || "No message"}</div>
                                                <div className="text-xs text-muted-foreground">{run.source}</div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Badge variant="outline">{run.provider}</Badge>
                                                <Badge
                                                    className={
                                                        run.result === "success"
                                                            ? "bg-emerald-600 text-white hover:bg-emerald-600"
                                                            : run.result === "blocked"
                                                              ? "bg-amber-500 text-black hover:bg-amber-500"
                                                              : "bg-red-600 text-white hover:bg-red-600"
                                                    }
                                                >
                                                    {run.result}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-lg">Provider Console Mapping</CardTitle>
                                <CardDescription>{smokeManifest?.environmentHint || "Public smoke test icin provider tarafina girilecek alanlar."}</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedSmokeChannel ? <ReadinessBadge ready={selectedSmokeChannel.ready} /> : null}
                                <Button variant="outline" onClick={loadSmokeManifest}>
                                    Refresh Manifest
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {selectedSmokeChannel ? (
                            <div className="grid gap-4 xl:grid-cols-2">
                                <div className="space-y-3">
                                    <div className="text-sm font-medium text-foreground">Provider Fields</div>
                                    {selectedSmokeChannel.providerConsoleFields.map((field) => (
                                        <div key={field.label} className="space-y-2">
                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">{field.label}</div>
                                            <div className="flex gap-2">
                                                <Input value={field.value} readOnly />
                                                <Button type="button" variant="outline" size="icon" onClick={() => handleCopy(field.value)}>
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-3">
                                    <div className="text-sm font-medium text-foreground">Expected Audit Events</div>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedSmokeChannel.expectedAuditEvents.map((eventType) => (
                                            <Badge key={eventType} variant="outline">
                                                {eventType}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">Smoke manifest okunamadi.</div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="instagram" className="space-y-6">
                <ChannelCard
                    title={channelTitles.instagram}
                    description={channelDescriptions.instagram}
                    readiness={payload.channels.instagram}
                    onCopy={handleCopy}
                    meta={renderChannelMeta("instagram")}
                />

                <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Smoke Test Runbook</CardTitle>
                            <CardDescription>Instagram provider kurulumu ve smoke sirasini buradan takip et.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                {smokeRunbook.instagram.map((step, index) => (
                                    <div key={`instagram-${index}`} className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                                        {index + 1}. {step}
                                    </div>
                                ))}
                            </div>
                            {selectedSmokeReportChannel ? (
                                <div className="grid gap-3 md:grid-cols-3">
                                    <div className="rounded-lg border px-4 py-3 text-sm">
                                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Audit</div>
                                        <div className="mt-1 font-medium text-foreground">{selectedSmokeReportChannel.audit.total} event</div>
                                        <div className="mt-1 text-muted-foreground">error: {selectedSmokeReportChannel.audit.error} • denied: {selectedSmokeReportChannel.audit.denied}</div>
                                    </div>
                                    <div className="rounded-lg border px-4 py-3 text-sm">
                                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Delivery</div>
                                        <div className="mt-1 font-medium text-foreground">{selectedSmokeReportChannel.delivery.failed} failure</div>
                                        <div className="mt-1 text-muted-foreground">
                                            retry: {selectedSmokeReportChannel.delivery.retryEligible} • exhausted: {selectedSmokeReportChannel.delivery.exhaustedRetries}
                                        </div>
                                    </div>
                                    <div className="rounded-lg border px-4 py-3 text-sm">
                                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Blockers</div>
                                        <div className="mt-1 font-medium text-foreground">{selectedSmokeReportChannel.blockers.length}</div>
                                        <div className="mt-1 text-muted-foreground">{selectedSmokeReportChannel.ready ? "Channel ready" : "Aksiyon gerekli"}</div>
                                    </div>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-lg">Provider Event Inspector</CardTitle>
                                    <CardDescription>Instagram event&apos;lerini ve signature sonucunu tek yerden gor.</CardDescription>
                                </div>
                                <Button variant="outline" onClick={() => loadInspectorLogs({ channel: "instagram" })}>
                                    Refresh Events
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="inspector-event-prefix-instagram">Event Group</Label>
                                    <select
                                        id="inspector-event-prefix-instagram"
                                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                        value={inspectorEventPrefix}
                                        onChange={(event) => setInspectorEventPrefix(event.target.value)}
                                    >
                                        {inspectorPrefixOptions.instagram.map((prefix) => (
                                            <option key={prefix} value={prefix}>
                                                {prefix}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="inspector-result-instagram">Result</Label>
                                    <select
                                        id="inspector-result-instagram"
                                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                        value={inspectorResult}
                                        onChange={(event) => setInspectorResult(event.target.value as typeof inspectorResult)}
                                    >
                                        <option value="all">all</option>
                                        <option value="success">success</option>
                                        <option value="error">error</option>
                                        <option value="denied">denied</option>
                                    </select>
                                </div>
                            </div>
                            {isInspectorLoading ? (
                                <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading provider events...
                                </div>
                            ) : inspectorLogs.length === 0 ? (
                                <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">Bu filtrelerle Instagram event bulunamadi.</div>
                            ) : (
                                <div className="space-y-3">
                                    {inspectorLogs.map((log) => (
                                        <div key={log.id} className="rounded-lg border p-4">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium text-foreground">{log.eventType}</p>
                                                    <p className="text-sm text-muted-foreground">{log.message || "No message"}</p>
                                                    <p className="text-xs text-muted-foreground">{log.source || "unknown source"}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant="outline">{log.channel}</Badge>
                                                    <Badge
                                                        className={
                                                            log.result === "success"
                                                                ? "bg-emerald-600 text-white hover:bg-emerald-600"
                                                                : log.result === "denied"
                                                                  ? "bg-amber-500 text-white hover:bg-amber-500"
                                                                  : "bg-red-600 text-white hover:bg-red-600"
                                                        }
                                                    >
                                                        {log.result}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-lg">Recent Smoke Runs</CardTitle>
                                <CardDescription>Instagram health check ve test message sonucunu takip et.</CardDescription>
                            </div>
                            <Button variant="outline" onClick={loadSmokeRuns}>
                                Refresh Runs
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!smokeRuns ? (
                            <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">Smoke run history okunamadi.</div>
                        ) : selectedSmokeRuns.length === 0 ? (
                            <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">Instagram icin kayitli smoke run yok.</div>
                        ) : (
                            <div className="space-y-3">
                                {selectedSmokeRuns.slice(0, 8).map((run) => (
                                    <div key={run.id || `${run.channel}-${run.action}-${run.createdAt}`} className="rounded-lg border p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <div className="text-sm font-medium text-foreground">{run.action}</div>
                                                <div className="text-sm text-muted-foreground">{run.message || "No message"}</div>
                                                <div className="text-xs text-muted-foreground">{run.source}</div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Badge variant="outline">{run.provider}</Badge>
                                                <Badge
                                                    className={
                                                        run.result === "success"
                                                            ? "bg-emerald-600 text-white hover:bg-emerald-600"
                                                            : run.result === "blocked"
                                                              ? "bg-amber-500 text-black hover:bg-amber-500"
                                                              : "bg-red-600 text-white hover:bg-red-600"
                                                    }
                                                >
                                                    {run.result}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-lg">Provider Console Mapping</CardTitle>
                                <CardDescription>{smokeManifest?.environmentHint || "Public smoke test icin provider tarafina girilecek alanlar."}</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedSmokeChannel ? <ReadinessBadge ready={selectedSmokeChannel.ready} /> : null}
                                <Button variant="outline" onClick={loadSmokeManifest}>
                                    Refresh Manifest
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {selectedSmokeChannel ? (
                            <div className="grid gap-4 xl:grid-cols-2">
                                <div className="space-y-3">
                                    <div className="text-sm font-medium text-foreground">Provider Fields</div>
                                    {selectedSmokeChannel.providerConsoleFields.map((field) => (
                                        <div key={field.label} className="space-y-2">
                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">{field.label}</div>
                                            <div className="flex gap-2">
                                                <Input value={field.value} readOnly />
                                                <Button type="button" variant="outline" size="icon" onClick={() => handleCopy(field.value)}>
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-3">
                                    <div className="text-sm font-medium text-foreground">Expected Audit Events</div>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedSmokeChannel.expectedAuditEvents.map((eventType) => (
                                            <Badge key={eventType} variant="outline">
                                                {eventType}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">Smoke manifest okunamadi.</div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    )
}
