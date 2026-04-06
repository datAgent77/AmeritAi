"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Copy, KeyRound, Link2, Loader2, MessageCircle, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { MetaChannelFormSection, MetaChannelSetupChecklist } from "@/components/omni/meta-channel-setup"
import { useAuth } from "@/context/AuthContext"
import { useOmniAccount } from "@/context/OmniAccountContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { formatOmniDateTime, getOmniCapabilityTitle, getOmniEnumLabel } from "@/lib/omni/i18n"
import type { ChannelPolicy, WhatsAppChannelConfig } from "@/lib/omni/types"

interface WhatsAppPayload {
    config: WhatsAppChannelConfig & {
        appSecretRef?: string | null
        accessTokenRef?: string | null
        verifyToken?: string | null
    }
    policy: ChannelPolicy
    capabilities: Array<{ id: string; title: string }>
    health: {
        webhookUrl: string
        webhookStatus: string
        defaultReplyMode?: string | null
        phoneNumberId?: string | null
    }
}

interface AuditLogItem {
    id: string
    eventType: string
    result: "success" | "error" | "denied"
    message?: string | null
    createdAt?: string | null
}

const EMPTY_FORM: WhatsAppChannelConfig = {
    enabled: false,
    businessAccountId: "",
    phoneNumberId: "",
    displayNumber: "",
    appSecretRef: "",
    accessTokenRef: "",
    verifyToken: "",
    templateNamespace: "",
    webhookStatus: "disconnected",
    defaultReplyMode: "assistant",
}

export function OmniWhatsAppPanel() {
    const { user } = useAuth()
    const { activeAccountId: chatbotId } = useOmniAccount()
    const { language, t } = useLanguage()
    const { toast } = useToast()
    const [payload, setPayload] = useState<WhatsAppPayload | null>(null)
    const [form, setForm] = useState<WhatsAppChannelConfig>(EMPTY_FORM)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isCheckingHealth, setIsCheckingHealth] = useState(false)
    const [isSendingTest, setIsSendingTest] = useState(false)
    const [testForm, setTestForm] = useState({
        to: "",
        text: "Vion AI Omni-Channel test message",
    })
    const [healthCheckResult, setHealthCheckResult] = useState<{
        ok: boolean
        skipped?: boolean
        message?: string | null
        displayPhoneNumber?: string | null
        verifiedName?: string | null
        checkedAt?: string | null
    } | null>(null)
    const [secretHints, setSecretHints] = useState({
        appSecretRef: "",
        accessTokenRef: "",
        verifyToken: "",
    })
    const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])

    const loadConfig = async () => {
        if (!user) return

        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/channels/whatsapp?chatbotId=${chatbotId || user.uid}`, {
                headers: { Authorization: `Bearer ${token}` },
            })

            if (!response.ok) {
                throw new Error("Failed to load WhatsApp configuration")
            }

            const data: WhatsAppPayload = await response.json()
            setPayload(data)
            setForm({
                enabled: data.config.enabled,
                businessAccountId: data.config.businessAccountId || "",
                phoneNumberId: data.config.phoneNumberId || "",
                displayNumber: data.config.displayNumber || "",
                appSecretRef: "",
                accessTokenRef: "",
                verifyToken: "",
                templateNamespace: data.config.templateNamespace || "",
                webhookStatus: data.config.webhookStatus || "disconnected",
                defaultReplyMode: data.config.defaultReplyMode || "assistant",
            })
            setSecretHints({
                appSecretRef: data.config.appSecretRef || "",
                accessTokenRef: data.config.accessTokenRef || "",
                verifyToken: data.config.verifyToken || "",
            })
        } catch (error) {
            console.error("Failed to load WhatsApp configuration", error)
            setPayload(null)
            toast({
                title: t("omni.whatsapp.toast.loadFailed.title"),
                description: t("omni.whatsapp.toast.loadFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const loadAuditLogs = async () => {
        if (!user) return

        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/audit-logs?chatbotId=${chatbotId || user.uid}&channel=whatsapp&limit=12`, {
                headers: { Authorization: `Bearer ${token}` },
            })

            if (!response.ok) {
                throw new Error("Failed to load audit logs")
            }

            const data = await response.json()
            setAuditLogs(data.logs || [])
        } catch (error) {
            console.error("Failed to load WhatsApp audit logs", error)
        }
    }

    useEffect(() => {
        loadConfig()
        loadAuditLogs()
    }, [user])

    const capabilityTitles = useMemo(
        () =>
            payload?.capabilities.map((capability) => ({
                id: capability.id,
                title: getOmniCapabilityTitle(t, capability.id, capability.title),
            })) || [],
        [payload, t]
    )

    const hasBusinessIdentifiers = Boolean(form.businessAccountId?.trim() && form.phoneNumberId?.trim() && form.displayNumber?.trim())
    const hasStoredSecrets = Boolean(
        (form.appSecretRef && form.appSecretRef.trim()) ||
        (form.accessTokenRef && form.accessTokenRef.trim()) ||
        (form.verifyToken && form.verifyToken.trim()) ||
        secretHints.appSecretRef ||
        secretHints.accessTokenRef ||
        secretHints.verifyToken
    )
    const effectiveWebhookStatus = form.webhookStatus || payload?.health.webhookStatus || "disconnected"
    const webhookReady = effectiveWebhookStatus === "connected"
    const hasVerificationSignal = Boolean(
        healthCheckResult?.ok ||
        auditLogs.some((log) => log.eventType.includes("whatsapp.test_message") || log.eventType.includes("whatsapp.webhook"))
    )
    const setupSteps = [
        {
            id: "enabled",
            title: t("omni.channelSetup.step.enable.title"),
            description: t("omni.channelSetup.step.enable.description"),
            complete: form.enabled,
            icon: CheckCircle2,
        },
        {
            id: "identifiers",
            title: t("omni.channelSetup.whatsapp.step.identifiers.title"),
            description: t("omni.channelSetup.whatsapp.step.identifiers.description"),
            complete: hasBusinessIdentifiers,
            icon: Link2,
        },
        {
            id: "secrets",
            title: t("omni.channelSetup.step.secrets.title"),
            description: t("omni.channelSetup.step.secrets.description"),
            complete: hasStoredSecrets,
            icon: KeyRound,
        },
        {
            id: "webhook",
            title: t("omni.channelSetup.step.webhook.title"),
            description: t("omni.channelSetup.step.webhook.description"),
            complete: webhookReady,
            icon: ShieldCheck,
        },
        {
            id: "verify",
            title: t("omni.channelSetup.step.verify.title"),
            description: t("omni.channelSetup.step.verify.description"),
            complete: hasVerificationSignal,
            icon: MessageCircle,
        },
    ]

    const handleCopyWebhook = async () => {
        if (!payload) return
        try {
            await navigator.clipboard.writeText(payload.health.webhookUrl)
            toast({
                title: t("omni.channelSetup.toast.copied.title"),
                description: t("omni.channelSetup.toast.copied.description"),
            })
        } catch (error) {
            console.error("Failed to copy WhatsApp webhook URL", error)
            toast({
                title: t("omni.channelSetup.toast.copyFailed.title"),
                description: t("omni.channelSetup.toast.copyFailed.description"),
                variant: "destructive",
            })
        }
    }

    const handleSave = async () => {
        if (!user) return

        setIsSaving(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/channels/whatsapp", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chatbotId: chatbotId || user.uid,
                    ...form,
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to save WhatsApp configuration")
            }

            const data = await response.json()
            setSecretHints({
                appSecretRef: data.config?.appSecretRef || secretHints.appSecretRef,
                accessTokenRef: data.config?.accessTokenRef || secretHints.accessTokenRef,
                verifyToken: data.config?.verifyToken || secretHints.verifyToken,
            })
            setForm((current) => ({
                ...current,
                appSecretRef: "",
                accessTokenRef: "",
                verifyToken: "",
                webhookStatus: data.config?.webhookStatus || current.webhookStatus,
            }))
            toast({
                title: t("omni.whatsapp.toast.saved.title"),
                description: t("omni.whatsapp.toast.saved.description"),
            })
            await loadConfig()
            await loadAuditLogs()
        } catch (error) {
            console.error("Failed to save WhatsApp configuration", error)
            toast({
                title: t("omni.whatsapp.toast.saveFailed.title"),
                description: t("omni.whatsapp.toast.saveFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleSendTestMessage = async () => {
        if (!user) return

        setIsSendingTest(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/channels/whatsapp/test-message", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chatbotId: chatbotId || user.uid,
                    to: testForm.to,
                    text: testForm.text,
                }),
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.error || "Failed to send WhatsApp test message")
            }

            toast({
                title: t("omni.whatsapp.toast.testSent.title"),
                description: `${t("omni.whatsapp.test.messageId")}: ${data?.messageId || t("omni.common.notAvailable")}`,
            })
            await loadAuditLogs()
        } catch (error) {
            toast({
                title: t("omni.whatsapp.toast.testFailed.title"),
                description: error instanceof Error ? error.message : t("omni.whatsapp.toast.testFailed.description"),
                variant: "destructive",
            })
            await loadAuditLogs()
        } finally {
            setIsSendingTest(false)
        }
    }

    const handleHealthCheck = async () => {
        if (!user) return

        setIsCheckingHealth(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/channels/whatsapp/health", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ chatbotId: chatbotId || user.uid }),
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.message || data?.error || "WhatsApp health check failed")
            }

            setHealthCheckResult({
                ok: true,
                skipped: data?.skipped === true,
                message: data?.message || null,
                displayPhoneNumber: data?.displayPhoneNumber || null,
                verifiedName: data?.verifiedName || null,
                checkedAt: data?.checkedAt || null,
            })
            if (data?.skipped) {
                toast({
                    title: t("omni.common.disabled"),
                    description: data?.message || t("omni.whatsapp.toast.healthPassed.description"),
                })
            } else {
                toast({
                    title: t("omni.whatsapp.toast.healthPassed.title"),
                    description: t("omni.whatsapp.toast.healthPassed.description"),
                })
            }
            await loadAuditLogs()
        } catch (error) {
            const message = error instanceof Error ? error.message : t("omni.whatsapp.toast.healthFailed.description")
            setHealthCheckResult({
                ok: false,
                message,
                checkedAt: new Date().toISOString(),
            })
            toast({
                title: t("omni.whatsapp.toast.healthFailed.title"),
                description: message,
                variant: "destructive",
            })
            await loadAuditLogs()
        } finally {
            setIsCheckingHealth(false)
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
                    {t("omni.whatsapp.empty")}
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
                {capabilityTitles.map((capability) => (
                    <Badge key={capability.id} className="bg-black text-white hover:bg-black">
                        {capability.title}
                    </Badge>
                ))}
            </div>

            <MetaChannelSetupChecklist
                title={t("omni.channelSetup.progress.title")}
                description={t("omni.channelSetup.progress.description")}
                steps={setupSteps}
                completeLabel={t("omni.channelSetup.status.complete")}
                pendingLabel={t("omni.channelSetup.status.pending")}
            />

            <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <MessageCircle className="h-4 w-4" />
                            {t("omni.whatsapp.connection.title")}
                        </CardTitle>
                        <CardDescription>
                            {t("omni.whatsapp.connection.description")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                                <p className="text-sm font-medium">{t("omni.whatsapp.enabled.title")}</p>
                                <p className="text-sm text-muted-foreground">{t("omni.whatsapp.enabled.description")}</p>
                            </div>
                            <Switch
                                checked={form.enabled}
                                onCheckedChange={(checked) => setForm((current) => ({ ...current, enabled: checked }))}
                            />
                        </div>

                        <Separator />

                        <MetaChannelFormSection
                            title={t("omni.channelSetup.section.identifiers.title")}
                            description={t("omni.channelSetup.section.identifiers.description")}
                        >
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="wa-business-account-id">{t("omni.whatsapp.field.businessAccountId")}</Label>
                                    <Input id="wa-business-account-id" value={form.businessAccountId || ""} onChange={(e) => setForm((current) => ({ ...current, businessAccountId: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="wa-phone-number-id">{t("omni.whatsapp.field.phoneNumberId")}</Label>
                                    <Input id="wa-phone-number-id" value={form.phoneNumberId || ""} onChange={(e) => setForm((current) => ({ ...current, phoneNumberId: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="wa-display-number">{t("omni.whatsapp.field.displayNumber")}</Label>
                                    <Input id="wa-display-number" value={form.displayNumber || ""} onChange={(e) => setForm((current) => ({ ...current, displayNumber: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="wa-template-namespace">{t("omni.whatsapp.field.templateNamespace")}</Label>
                                    <Input id="wa-template-namespace" value={form.templateNamespace || ""} onChange={(e) => setForm((current) => ({ ...current, templateNamespace: e.target.value }))} />
                                </div>
                            </div>
                        </MetaChannelFormSection>

                        <Separator />

                        <MetaChannelFormSection
                            title={t("omni.channelSetup.section.secrets.title")}
                            description={t("omni.channelSetup.section.secrets.description")}
                        >
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="wa-app-secret">{t("omni.whatsapp.field.appSecret")}</Label>
                                    <Input id="wa-app-secret" type="password" placeholder={secretHints.appSecretRef || t("omni.whatsapp.placeholder.appSecret")} value={form.appSecretRef || ""} onChange={(e) => setForm((current) => ({ ...current, appSecretRef: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="wa-access-token">{t("omni.whatsapp.field.accessToken")}</Label>
                                    <Input id="wa-access-token" type="password" placeholder={secretHints.accessTokenRef || t("omni.whatsapp.placeholder.accessToken")} value={form.accessTokenRef || ""} onChange={(e) => setForm((current) => ({ ...current, accessTokenRef: e.target.value }))} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="wa-verify-token">{t("omni.whatsapp.field.verifyToken")}</Label>
                                    <Input id="wa-verify-token" type="password" placeholder={secretHints.verifyToken || t("omni.whatsapp.placeholder.verifyToken")} value={form.verifyToken || ""} onChange={(e) => setForm((current) => ({ ...current, verifyToken: e.target.value }))} />
                                </div>
                            </div>
                        </MetaChannelFormSection>

                        <Separator />

                        <MetaChannelFormSection
                            title={t("omni.channelSetup.section.runtime.title")}
                            description={t("omni.channelSetup.section.runtime.description")}
                        >
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="wa-webhook-status">{t("omni.whatsapp.field.webhookStatus")}</Label>
                                    <select
                                        id="wa-webhook-status"
                                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                        value={form.webhookStatus || "disconnected"}
                                        onChange={(e) => setForm((current) => ({ ...current, webhookStatus: e.target.value as WhatsAppChannelConfig["webhookStatus"] }))}
                                    >
                                        <option value="disconnected">{getOmniEnumLabel(t, "webhookStatus", "disconnected")}</option>
                                        <option value="pending">{getOmniEnumLabel(t, "webhookStatus", "pending")}</option>
                                        <option value="connected">{getOmniEnumLabel(t, "webhookStatus", "connected")}</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="wa-reply-mode">{t("omni.whatsapp.field.replyMode")}</Label>
                                    <select
                                        id="wa-reply-mode"
                                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                        value={form.defaultReplyMode || "assistant"}
                                        onChange={(e) => setForm((current) => ({ ...current, defaultReplyMode: e.target.value as WhatsAppChannelConfig["defaultReplyMode"] }))}
                                    >
                                        <option value="assistant">{getOmniEnumLabel(t, "replyMode", "assistant")}</option>
                                        <option value="human_review">{getOmniEnumLabel(t, "replyMode", "human_review")}</option>
                                    </select>
                                </div>
                            </div>
                        </MetaChannelFormSection>

                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={handleHealthCheck} disabled={isCheckingHealth}>
                                {isCheckingHealth ? <Loader2 className="h-4 w-4 animate-spin" /> : t("omni.whatsapp.action.healthCheck")}
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving} className="min-w-32">
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("omni.whatsapp.action.save")}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between gap-3 text-base">
                                <span>{t("omni.channelSetup.section.webhook.title")}</span>
                                <Button type="button" variant="outline" size="icon" onClick={handleCopyWebhook}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </CardTitle>
                            <CardDescription>{t("omni.channelSetup.section.webhook.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">{t("omni.common.webhook")}</span>
                                <Badge variant={webhookReady ? "outline" : "secondary"}>{getOmniEnumLabel(t, "webhookStatus", effectiveWebhookStatus)}</Badge>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">{t("omni.common.replyMode")}</span>
                                <Badge variant="outline">{getOmniEnumLabel(t, "replyMode", payload.health.defaultReplyMode || "assistant")}</Badge>
                            </div>
                            <div className="rounded-lg bg-muted/40 p-3 break-all text-muted-foreground">{payload.health.webhookUrl}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t("omni.common.health")}</CardTitle>
                            <CardDescription>{payload.policy.responseStyle}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">{t("omni.common.status")}</span>
                                <Badge variant={form.enabled ? "outline" : "secondary"}>
                                    {form.enabled ? t("omni.channelSetup.status.complete") : t("omni.common.disabled")}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">{t("omni.common.target")}</span>
                                <span className="text-right text-foreground">{form.displayNumber || t("omni.common.notAvailable")}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">{t("omni.common.result")}</span>
                                <Badge variant={hasVerificationSignal ? "outline" : "secondary"}>
                                    {hasVerificationSignal ? t("omni.channelSetup.status.complete") : t("omni.channelSetup.status.pending")}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t("omni.common.policy")}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-muted-foreground">
                            <div className="flex items-center justify-between gap-3">
                                <span>{t("omni.common.verbosity")}</span>
                                <Badge variant="outline">{getOmniEnumLabel(t, "verbosity", payload.policy.maxVerbosity)}</Badge>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span>{t("omni.common.handoff")}</span>
                                <Badge variant="outline">{getOmniEnumLabel(t, "handoff", payload.policy.handoffMode)}</Badge>
                            </div>
                            <div className="rounded-lg bg-muted/40 p-3">{t("omni.whatsapp.policy.formatting")}: {payload.policy.safeFormatting.join(", ")}</div>
                        </CardContent>
                    </Card>
                    {healthCheckResult ? (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t("omni.whatsapp.health.lastCheckTitle")}</CardTitle>
                                <CardDescription>{healthCheckResult.checkedAt ? formatOmniDateTime(healthCheckResult.checkedAt, language) : t("omni.whatsapp.health.noTimestamp")}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center justify-between gap-3">
                                    <span>{t("omni.common.status")}</span>
                                    <Badge variant={healthCheckResult.skipped ? "secondary" : healthCheckResult.ok ? "outline" : "destructive"}>
                                        {healthCheckResult.skipped ? t("omni.common.disabled") : healthCheckResult.ok ? t("omni.whatsapp.health.healthy") : t("omni.whatsapp.health.failed")}
                                    </Badge>
                                </div>
                                {healthCheckResult.displayPhoneNumber ? <div>{t("omni.whatsapp.health.displayNumber")}: {healthCheckResult.displayPhoneNumber}</div> : null}
                                {healthCheckResult.verifiedName ? <div>{t("omni.whatsapp.health.verifiedName")}: {healthCheckResult.verifiedName}</div> : null}
                                {healthCheckResult.message ? <div>{healthCheckResult.message}</div> : null}
                            </CardContent>
                        </Card>
                    ) : null}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t("omni.whatsapp.test.title")}</CardTitle>
                            <CardDescription>{t("omni.whatsapp.test.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2">
                                <Label htmlFor="wa-test-to">{t("omni.whatsapp.test.recipientPhone")}</Label>
                                <Input id="wa-test-to" placeholder="+90..." value={testForm.to} onChange={(e) => setTestForm((current) => ({ ...current, to: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="wa-test-text">{t("omni.common.message")}</Label>
                                <Input id="wa-test-text" value={testForm.text} onChange={(e) => setTestForm((current) => ({ ...current, text: e.target.value }))} />
                            </div>
                            <Button onClick={handleSendTestMessage} disabled={isSendingTest || !testForm.to.trim()}>
                                {isSendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : t("omni.whatsapp.action.sendTest")}
                            </Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t("omni.channelSetup.runbook.title")}</CardTitle>
                            <CardDescription>{t("omni.channelSetup.runbook.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {[1, 2, 3, 4].map((step) => (
                                <div key={step} className="flex gap-3 rounded-lg border border-border/70 px-4 py-3 text-sm text-muted-foreground">
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                                        {step}
                                    </div>
                                    <p>{t(`omni.settings.runbook.whatsapp.step${step}`)}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t("omni.whatsapp.audit.title")}</CardTitle>
                            <CardDescription>{t("omni.whatsapp.audit.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {auditLogs.length === 0 ? (
                                <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                    {t("omni.whatsapp.audit.empty")}
                                </div>
                            ) : (
                                auditLogs.map((log) => (
                                    <div key={log.id} className="rounded-lg border px-4 py-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="text-sm font-medium text-foreground">{log.eventType}</div>
                                            <Badge variant={log.result === "success" ? "outline" : "destructive"}>{getOmniEnumLabel(t, "result", log.result)}</Badge>
                                        </div>
                                        <div className="mt-1 text-sm text-muted-foreground">{log.message || t("omni.whatsapp.audit.noMessage")}</div>
                                        <div className="mt-2 text-xs text-muted-foreground">{log.createdAt ? formatOmniDateTime(log.createdAt, language) : t("omni.common.notAvailable")}</div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
