"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, Loader2, PhoneCall, Plus, Route, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/context/AuthContext"
import { useOmniAccount } from "@/context/OmniAccountContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { formatOmniDateTime, getOmniCapabilityTitle, getOmniEnumLabel } from "@/lib/omni/i18n"
import type { ChannelPolicy, VoiceChannelHealth, VoiceIntegrationConfig, VoiceNumberRecord } from "@/lib/omni/types"
import { OmniMetricTile, OmniSectionCard, OmniStateShell } from "@/components/omni/omni-ui"

interface VoiceChannelPayload {
    numbers: VoiceNumberRecord[]
    integration: VoiceIntegrationConfig
    policy: ChannelPolicy
    capabilities: Array<{ id: string; title: string }>
    health: VoiceChannelHealth
}

interface AuditLogItem {
    id: string
    eventType: string
    result: "success" | "error" | "denied"
    message?: string | null
    createdAt?: string | null
}

const EMPTY_FORM: VoiceNumberRecord = {
    phoneNumber: "",
    carrierProvider: "other",
    carrierLabel: "",
    carrierRouteRef: "",
    routingMode: "twilio_byoc",
    providerNumberId: "",
    twilioNumberSid: "",
    defaultLocale: "tr-TR",
    ttsVoice: "alice",
    ttsProvider: "elevenlabs",
    twilioFallbackVoice: "alice",
    elevenLabsVoiceId: "",
    elevenLabsModelId: "eleven_multilingual_v2",
    byocTrunkSidOverride: "",
    routingStatus: "draft",
    businessHours: "",
    callbackEnabled: true,
    greetingMessage: "",
    fallbackChannel: "voice",
    chatbotId: "",
}

export function OmniVoiceCallsPanel() {
    const { user } = useAuth()
    const { activeAccountId: chatbotId } = useOmniAccount()
    const { language, t } = useLanguage()
    const { toast } = useToast()
    const [payload, setPayload] = useState<VoiceChannelPayload | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState("numbers")
    const [isSaving, setIsSaving] = useState(false)
    const [selectedNumberId, setSelectedNumberId] = useState<string | null>(null)
    const [form, setForm] = useState<VoiceNumberRecord>(EMPTY_FORM)
    const [integrationForm, setIntegrationForm] = useState<VoiceIntegrationConfig>({
        enabled: false,
        callControlProvider: "twilio",
        accountSid: "",
        authToken: "",
        defaultByocTrunkSid: "",
        elevenLabsManaged: true,
        elevenLabsApiKeyRef: "",
        ttsProviderDefault: "elevenlabs",
        ttsFallbackProvider: "twilio",
    })
    const [secretHints, setSecretHints] = useState<VoiceIntegrationConfig>({
        enabled: false,
        callControlProvider: "twilio",
        accountSid: "",
        authToken: "",
        defaultByocTrunkSid: "",
        elevenLabsManaged: true,
        elevenLabsApiKeyRef: "",
        ttsProviderDefault: "elevenlabs",
        ttsFallbackProvider: "twilio",
    })
    const [isCheckingHealth, setIsCheckingHealth] = useState(false)
    const [isSendingTestCall, setIsSendingTestCall] = useState(false)
    const [healthCheckResult, setHealthCheckResult] = useState<{
        ok: boolean
        skipped?: boolean
        message?: string | null
        accountName?: string | null
        accountStatus?: string | null
        checkedAt?: string | null
    } | null>(null)
    const [testCallForm, setTestCallForm] = useState({
        to: "",
    })
    const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])

    const loadVoiceConfig = async () => {
        if (!user) return

        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/channels/voice?chatbotId=${chatbotId || user.uid}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load voice configuration")
            }

            const data: VoiceChannelPayload = await response.json()
            setPayload(data)
            setIntegrationForm({
                enabled: data.integration?.enabled === true,
                callControlProvider: "twilio",
                accountSid: "",
                authToken: "",
                defaultByocTrunkSid: "",
                elevenLabsManaged: true,
                elevenLabsApiKeyRef: "",
                ttsProviderDefault: data.integration?.ttsProviderDefault || "elevenlabs",
                ttsFallbackProvider: "twilio",
            })
            setSecretHints({
                enabled: data.integration?.enabled === true,
                callControlProvider: data.integration?.callControlProvider || "twilio",
                accountSid: data.integration?.accountSid || "",
                authToken: data.integration?.authToken || "",
                defaultByocTrunkSid: data.integration?.defaultByocTrunkSid || "",
                elevenLabsManaged: data.integration?.elevenLabsManaged !== false,
                elevenLabsApiKeyRef: data.integration?.elevenLabsApiKeyRef || "",
                ttsProviderDefault: data.integration?.ttsProviderDefault || "twilio",
                ttsFallbackProvider: data.integration?.ttsFallbackProvider || "twilio",
            })

            const selected = data.numbers.find((number) => number.id === selectedNumberId) || data.numbers[0] || null
            if (selected) {
                setSelectedNumberId(selected.id || null)
                setForm({
                    ...selected,
                    chatbotId: chatbotId || user.uid,
                })
            } else {
                setSelectedNumberId(null)
                setForm({ ...EMPTY_FORM, chatbotId: chatbotId || user.uid })
            }
        } catch (error) {
            console.error("Failed to load voice configuration", error)
            setPayload(null)
        } finally {
            setIsLoading(false)
        }
    }

    const loadAuditLogs = async () => {
        if (!user) return

        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/omni/audit-logs?chatbotId=${chatbotId || user.uid}&channel=voice&limit=12`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to load audit logs")
            }

            const data = await response.json()
            setAuditLogs(data.logs || [])
        } catch (error) {
            console.error("Failed to load voice audit logs", error)
        }
    }

    useEffect(() => {
        loadVoiceConfig()
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

    const selectedNumber = useMemo(
        () => payload?.numbers.find((number) => number.id === selectedNumberId) || payload?.numbers[0] || null,
        [payload, selectedNumberId]
    )

    const onboarding = useMemo(() => {
        const publicWebhookReady = payload ? !/localhost|127\.0\.0\.1/i.test(payload.health.inboundWebhook || "") : false
        const hasCarrierNumber = Boolean(selectedNumber?.phoneNumber && selectedNumber?.carrierProvider && selectedNumber?.routingMode)
        const hasCallControl =
            Boolean(payload?.health.callControlConfigured) &&
            (selectedNumber?.routingMode !== "twilio_byoc" || Boolean(selectedNumber?.byocTrunkSidOverride || secretHints.defaultByocTrunkSid))
        const hasRendering = Boolean(payload?.health.renderingConfigured)
        const canRoute = Boolean(selectedNumber?.routingStatus === "active" && payload?.health.activeNumbers && payload?.health.outboundReady)

        const steps = [
            {
                id: "enable",
                complete: payload?.health.enabled === true,
                title: t("omni.voice.onboarding.step.enable.title"),
                description: t("omni.voice.onboarding.step.enable.description"),
                tab: "numbers",
            },
            {
                id: "carrier",
                complete: hasCarrierNumber,
                title: t("omni.voice.onboarding.step.carrier.title"),
                description: t("omni.voice.onboarding.step.carrier.description"),
                tab: "numbers",
            },
            {
                id: "control",
                complete: hasCallControl,
                title: t("omni.voice.onboarding.step.control.title"),
                description: t("omni.voice.onboarding.step.control.description"),
                tab: "numbers",
            },
            {
                id: "rendering",
                complete: hasRendering,
                title: t("omni.voice.onboarding.step.rendering.title"),
                description: t("omni.voice.onboarding.step.rendering.description"),
                tab: "numbers",
            },
            {
                id: "public",
                complete: publicWebhookReady,
                title: t("omni.voice.onboarding.step.public.title"),
                description: t("omni.voice.onboarding.step.public.description"),
                tab: "health",
            },
            {
                id: "test",
                complete: canRoute,
                title: t("omni.voice.onboarding.step.test.title"),
                description: t("omni.voice.onboarding.step.test.description"),
                tab: "health",
            },
        ] as const

        return {
            steps,
            completeCount: steps.filter((step) => step.complete).length,
            nextStep: steps.find((step) => !step.complete) || null,
        }
    }, [payload, secretHints.defaultByocTrunkSid, selectedNumber, t])

    const startNewNumber = () => {
        if (!user) return
        setSelectedNumberId(null)
        setForm({ ...EMPTY_FORM, chatbotId: chatbotId || user.uid })
    }

    const selectNumber = (number: VoiceNumberRecord) => {
        if (!user) return
        setSelectedNumberId(number.id || null)
        setForm({ ...number, chatbotId: chatbotId || user.uid })
    }

    const handleSave = async () => {
        if (!user) return

        setIsSaving(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/channels/voice", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...form,
                    ...integrationForm,
                    chatbotId: chatbotId || user.uid,
                    id: selectedNumberId,
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to save voice number")
            }

            const data = await response.json()
            setSelectedNumberId(data.number?.id || null)
            setSecretHints({
                enabled: data.integration?.enabled === true,
                callControlProvider: data.integration?.callControlProvider || "twilio",
                accountSid: data.integration?.accountSid || secretHints.accountSid || "",
                authToken: data.integration?.authToken || secretHints.authToken || "",
                defaultByocTrunkSid: data.integration?.defaultByocTrunkSid || secretHints.defaultByocTrunkSid || "",
                elevenLabsManaged: data.integration?.elevenLabsManaged !== false,
                elevenLabsApiKeyRef: data.integration?.elevenLabsApiKeyRef || secretHints.elevenLabsApiKeyRef || "",
                ttsProviderDefault: data.integration?.ttsProviderDefault || secretHints.ttsProviderDefault || "twilio",
                ttsFallbackProvider: "twilio",
            })
            setIntegrationForm({
                enabled: data.integration?.enabled === true,
                callControlProvider: "twilio",
                accountSid: "",
                authToken: "",
                defaultByocTrunkSid: "",
                elevenLabsManaged: true,
                elevenLabsApiKeyRef: "",
                ttsProviderDefault: secretHints.ttsProviderDefault || "elevenlabs",
                ttsFallbackProvider: "twilio",
            })
            toast({
                title: t("omni.voice.toast.saved.title"),
                description: t("omni.voice.toast.saved.description"),
            })
            await loadVoiceConfig()
        } catch (error) {
            console.error("Failed to save voice number", error)
            toast({
                title: t("omni.voice.toast.saveFailed.title"),
                description: t("omni.voice.toast.saveFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleHealthCheck = async () => {
        if (!user) return

        setIsCheckingHealth(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/channels/voice/health", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ chatbotId: chatbotId || user.uid }),
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.message || data?.error || "Voice health check failed")
            }

            setHealthCheckResult({
                ok: true,
                skipped: data?.skipped === true,
                message: data?.message || null,
                accountName: data?.accountName || null,
                accountStatus: data?.accountStatus || null,
                checkedAt: data?.checkedAt || null,
            })
            if (data?.skipped) {
                toast({
                    title: t("omni.common.disabled"),
                    description: data?.message || t("omni.voice.toast.healthPassed.description"),
                })
            } else {
                toast({
                    title: t("omni.voice.toast.healthPassed.title"),
                    description: t("omni.voice.toast.healthPassed.description"),
                })
            }
            await loadAuditLogs()
        } catch (error) {
            const message = error instanceof Error ? error.message : t("omni.voice.toast.healthFailed.description")
            setHealthCheckResult({
                ok: false,
                message,
                checkedAt: new Date().toISOString(),
            })
            toast({
                title: t("omni.voice.toast.healthFailed.title"),
                description: message,
                variant: "destructive",
            })
            await loadAuditLogs()
        } finally {
            setIsCheckingHealth(false)
        }
    }

    const handleTestCall = async () => {
        if (!user || !selectedNumberId || !testCallForm.to.trim()) return

        setIsSendingTestCall(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/omni/channels/voice/test-call", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chatbotId: chatbotId || user.uid,
                    voiceNumberId: selectedNumberId,
                    to: testCallForm.to,
                }),
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.error || "Failed to start test call")
            }

            toast({
                title: t("omni.voice.toast.testCallStarted.title"),
                description: `${t("omni.voice.test.callSid")}: ${data?.call?.sid || t("omni.common.notAvailable")}`,
            })
            await loadAuditLogs()
        } catch (error) {
            toast({
                title: t("omni.voice.toast.testCallFailed.title"),
                description: error instanceof Error ? error.message : t("omni.voice.toast.testCallFailed.description"),
                variant: "destructive",
            })
            await loadAuditLogs()
        } finally {
            setIsSendingTestCall(false)
        }
    }

    if (isLoading) {
        return <OmniStateShell title={t("omni.common.loading")} description={t("omni.voice.settings.description")} />
    }

    if (!payload) {
        return <OmniStateShell title={t("omni.voice.empty")} description={t("omni.voice.toast.saveFailed.description")} tone="warning" />
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
                {capabilityTitles.map((capability) => (
                    <Badge key={capability.id} variant="outline">
                        {capability.title}
                    </Badge>
                ))}
            </div>

            <OmniSectionCard
                title={t("omni.voice.onboarding.title")}
                description={t("omni.voice.onboarding.description")}
                action={
                    onboarding.nextStep ? (
                        <Button variant="outline" size="sm" className="rounded-lg bg-white/80" onClick={() => setActiveTab(onboarding.nextStep?.tab || "numbers")}>
                            {t("omni.voice.onboarding.nextAction")}
                        </Button>
                    ) : (
                        <Badge variant="outline">{t("omni.voice.onboarding.complete")}</Badge>
                    )
                }
            >
                <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <OmniMetricTile
                            label={t("omni.voice.onboarding.metric.progress")}
                            value={`${onboarding.completeCount}/${onboarding.steps.length}`}
                            note={t("omni.voice.onboarding.metric.progressNote")}
                        />
                        <OmniMetricTile
                            label={t("omni.voice.onboarding.metric.activeNumbers")}
                            value={payload.health.activeNumbers}
                            note={t("omni.voice.onboarding.metric.activeNumbersNote")}
                        />
                        <OmniMetricTile
                            label={t("omni.voice.onboarding.metric.routing")}
                            value={payload.health.outboundReady ? t("omni.voice.health.outboundReadyYes") : t("omni.voice.health.outboundReadyNo")}
                            note={t("omni.voice.onboarding.metric.routingNote")}
                        />
                    </div>
                    <div className="grid gap-3 xl:grid-cols-2">
                        {onboarding.steps.map((step, index) => (
                            <div key={step.id} className={`rounded-lg border px-4 py-4 ${step.complete ? "border-emerald-200 bg-emerald-50/70" : "border-amber-200 bg-amber-50/70"}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="text-sm font-medium">
                                            {index + 1}. {step.title}
                                        </div>
                                        <div className="text-sm text-muted-foreground">{step.description}</div>
                                    </div>
                                    <Badge variant={step.complete ? "outline" : "secondary"}>{step.complete ? t("omni.voice.onboarding.done") : t("omni.voice.onboarding.pending")}</Badge>
                                </div>
                                {!step.complete ? (
                                    <div className="mt-3">
                                        <Button variant="outline" size="sm" className="rounded-lg bg-white/80" onClick={() => setActiveTab(step.tab)}>
                                            {t("omni.voice.onboarding.openTab")}
                                        </Button>
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </div>
            </OmniSectionCard>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
                <TabsList className="grid w-full grid-cols-2 rounded-[12px] bg-zinc-200/80 p-1 md:w-auto md:grid-cols-4">
                    <TabsTrigger value="numbers" className="rounded-[8px]">{t("omni.voice.tab.numbers")}</TabsTrigger>
                    <TabsTrigger value="flow" className="rounded-[8px]">{t("omni.voice.tab.flow")}</TabsTrigger>
                    <TabsTrigger value="policies" className="rounded-[8px]">{t("omni.voice.tab.policies")}</TabsTrigger>
                    <TabsTrigger value="health" className="rounded-[8px]">{t("omni.voice.tab.health")}</TabsTrigger>
                </TabsList>

                <TabsContent value="numbers" className="space-y-4">
                    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                        <OmniSectionCard
                            title={t("omni.voice.numbers.title")}
                            description={t("omni.voice.numbers.description")}
                            action={
                                <Button variant="outline" size="sm" className="rounded-lg bg-white/80" onClick={startNewNumber}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t("omni.voice.numbers.new")}
                                </Button>
                            }
                        >
                            <div className="space-y-3">
                                {payload.numbers.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                                        {t("omni.voice.numbers.empty")}
                                    </div>
                                ) : (
                                    payload.numbers.map((number) => {
                                        const isActive = selectedNumberId === number.id
                                        return (
                                            <button
                                                key={number.id}
                                                type="button"
                                                onClick={() => selectNumber(number)}
                                                className={`w-full rounded-[12px] border p-4 text-left transition ${isActive ? "border-primary/20 bg-primary text-primary-foreground shadow-[0_14px_30px_rgba(37,99,235,0.22)]" : "border-border/70 bg-white/80 hover:bg-muted/30"}`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="font-medium">{number.phoneNumber}</p>
                                                        <p className={`text-sm ${isActive ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{number.defaultLocale || t("omni.voice.numbers.defaultLocalePending")}</p>
                                                    </div>
                                                    <Badge variant={isActive ? "secondary" : "outline"}>{getOmniEnumLabel(t, "routingStatus", number.routingStatus)}</Badge>
                                                </div>
                                                <div className={`mt-3 text-xs ${isActive ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                                                    {getOmniEnumLabel(t, "carrierProvider", number.carrierProvider || "other")} • {getOmniEnumLabel(t, "routingMode", number.routingMode || "twilio_direct")} • {getOmniEnumLabel(t, "ttsProvider", number.ttsProvider || "twilio")}
                                                </div>
                                            </button>
                                        )
                                    })
                                )}
                            </div>
                        </OmniSectionCard>

                        <OmniSectionCard
                            title={t("omni.voice.settings.title")}
                            description={t("omni.voice.settings.description")}
                        >
                            <div className="space-y-6">
                                <div className="flex items-center justify-between rounded-[12px] border border-border/70 bg-muted/20 p-4">
                                    <div>
                                        <p className="text-sm font-medium">{t("omni.common.enabled")}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {t("omni.voice.disable.description")}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={integrationForm.enabled === true}
                                        onCheckedChange={(checked) => setIntegrationForm((current) => ({ ...current, enabled: checked }))}
                                    />
                                </div>

                                <div className="rounded-[12px] border border-border/70 bg-white/70 p-4">
                                    <div className="mb-4">
                                        <h3 className="text-sm font-semibold">{t("omni.voice.section.carrier.title")}</h3>
                                        <p className="text-sm text-muted-foreground">{t("omni.voice.section.carrier.description")}</p>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="voice-carrier-provider">{t("omni.voice.field.carrierProvider")}</Label>
                                            <select
                                                id="voice-carrier-provider"
                                                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                                value={form.carrierProvider || "other"}
                                                onChange={(e) => setForm((current) => ({ ...current, carrierProvider: e.target.value as VoiceNumberRecord["carrierProvider"] }))}
                                            >
                                                <option value="verimor">{getOmniEnumLabel(t, "carrierProvider", "verimor")}</option>
                                                <option value="turk_telekom">{getOmniEnumLabel(t, "carrierProvider", "turk_telekom")}</option>
                                                <option value="vodafone_business">{getOmniEnumLabel(t, "carrierProvider", "vodafone_business")}</option>
                                                <option value="other">{getOmniEnumLabel(t, "carrierProvider", "other")}</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="voice-phone-number">{t("omni.voice.field.phoneNumber")}</Label>
                                            <Input id="voice-phone-number" value={form.phoneNumber || ""} onChange={(e) => setForm((current) => ({ ...current, phoneNumber: e.target.value }))} placeholder="+90..." className="rounded-lg" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="voice-carrier-label">{t("omni.voice.field.carrierLabel")}</Label>
                                            <Input id="voice-carrier-label" value={form.carrierLabel || ""} onChange={(e) => setForm((current) => ({ ...current, carrierLabel: e.target.value }))} placeholder={t("omni.voice.placeholder.carrierLabel")} className="rounded-lg" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="voice-routing-mode">{t("omni.voice.field.routingMode")}</Label>
                                            <select
                                                id="voice-routing-mode"
                                                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                                value={form.routingMode || "twilio_byoc"}
                                                onChange={(e) => setForm((current) => ({ ...current, routingMode: e.target.value as VoiceNumberRecord["routingMode"] }))}
                                            >
                                                <option value="twilio_direct">{getOmniEnumLabel(t, "routingMode", "twilio_direct")}</option>
                                                <option value="twilio_byoc">{getOmniEnumLabel(t, "routingMode", "twilio_byoc")}</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="voice-provider-number">{t("omni.voice.field.providerNumberId")}</Label>
                                            <Input
                                                id="voice-provider-number"
                                                value={form.providerNumberId || form.twilioNumberSid || ""}
                                                onChange={(e) =>
                                                    setForm((current) => ({ ...current, providerNumberId: e.target.value, twilioNumberSid: e.target.value }))
                                                }
                                                placeholder={t("omni.voice.placeholder.providerNumberId")}
                                                className="rounded-lg"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="voice-carrier-route">{t("omni.voice.field.carrierRouteRef")}</Label>
                                            <Input id="voice-carrier-route" value={form.carrierRouteRef || ""} onChange={(e) => setForm((current) => ({ ...current, carrierRouteRef: e.target.value }))} placeholder={t("omni.voice.placeholder.carrierRouteRef")} className="rounded-lg" />
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-[12px] border border-border/70 bg-white/70 p-4">
                                    <div className="mb-4">
                                        <h3 className="text-sm font-semibold">{t("omni.voice.section.callControl.title")}</h3>
                                        <p className="text-sm text-muted-foreground">{t("omni.voice.section.callControl.description")}</p>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="voice-account-sid">{t("omni.voice.field.accountSid")}</Label>
                                            <Input
                                                id="voice-account-sid"
                                                placeholder={secretHints.accountSid || t("omni.voice.placeholder.accountSid")}
                                                value={integrationForm.accountSid || ""}
                                                onChange={(e) => setIntegrationForm((current) => ({ ...current, accountSid: e.target.value }))}
                                                className="rounded-lg"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="voice-auth-token">{t("omni.voice.field.authToken")}</Label>
                                            <Input
                                                id="voice-auth-token"
                                                type="password"
                                                placeholder={secretHints.authToken || t("omni.voice.placeholder.authToken")}
                                                value={integrationForm.authToken || ""}
                                                onChange={(e) => setIntegrationForm((current) => ({ ...current, authToken: e.target.value }))}
                                                className="rounded-lg"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="voice-default-byoc">{t("omni.voice.field.defaultByocTrunkSid")}</Label>
                                            <Input
                                                id="voice-default-byoc"
                                                placeholder={secretHints.defaultByocTrunkSid || t("omni.voice.placeholder.defaultByocTrunkSid")}
                                                value={integrationForm.defaultByocTrunkSid || ""}
                                                onChange={(e) => setIntegrationForm((current) => ({ ...current, defaultByocTrunkSid: e.target.value }))}
                                                className="rounded-lg"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="voice-locale">{t("omni.voice.field.defaultLocale")}</Label>
                                            <Input id="voice-locale" value={form.defaultLocale || "tr-TR"} onChange={(e) => setForm((current) => ({ ...current, defaultLocale: e.target.value }))} className="rounded-lg" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="voice-routing-status">{t("omni.voice.field.routingStatus")}</Label>
                                            <select
                                                id="voice-routing-status"
                                                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                                value={form.routingStatus || "draft"}
                                                onChange={(e) => setForm((current) => ({ ...current, routingStatus: e.target.value as VoiceNumberRecord["routingStatus"] }))}
                                            >
                                                <option value="draft">{getOmniEnumLabel(t, "routingStatus", "draft")}</option>
                                                <option value="active">{getOmniEnumLabel(t, "routingStatus", "active")}</option>
                                                <option value="paused">{getOmniEnumLabel(t, "routingStatus", "paused")}</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="voice-fallback-channel">{t("omni.voice.field.fallbackChannel")}</Label>
                                            <select
                                                id="voice-fallback-channel"
                                                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                                value={form.fallbackChannel || "voice"}
                                                onChange={(e) => setForm((current) => ({ ...current, fallbackChannel: e.target.value as VoiceNumberRecord["fallbackChannel"] }))}
                                            >
                                                <option value="voice">{getOmniEnumLabel(t, "fallbackChannel", "voice")}</option>
                                                <option value="whatsapp">{getOmniEnumLabel(t, "fallbackChannel", "whatsapp")}</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-[12px] border border-border/70 bg-white/70 p-4">
                                    <div className="mb-4">
                                        <h3 className="text-sm font-semibold">{t("omni.voice.section.rendering.title")}</h3>
                                        <p className="text-sm text-muted-foreground">{t("omni.voice.section.rendering.description")}</p>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="voice-tts-provider">{t("omni.voice.field.ttsProvider")}</Label>
                                            <select
                                                id="voice-tts-provider"
                                                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                                value={form.ttsProvider || integrationForm.ttsProviderDefault || "elevenlabs"}
                                                onChange={(e) => setForm((current) => ({ ...current, ttsProvider: e.target.value as VoiceNumberRecord["ttsProvider"] }))}
                                            >
                                                <option value="twilio">{getOmniEnumLabel(t, "ttsProvider", "twilio")}</option>
                                                <option value="elevenlabs">{getOmniEnumLabel(t, "ttsProvider", "elevenlabs")}</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="voice-fallback-voice">{t("omni.voice.field.twilioFallbackVoice")}</Label>
                                            <Input id="voice-fallback-voice" value={form.twilioFallbackVoice || form.ttsVoice || "alice"} onChange={(e) => setForm((current) => ({ ...current, twilioFallbackVoice: e.target.value, ttsVoice: e.target.value }))} className="rounded-lg" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="voice-eleven-voice">{t("omni.voice.field.elevenLabsVoiceId")}</Label>
                                            <Input id="voice-eleven-voice" value={form.elevenLabsVoiceId || ""} onChange={(e) => setForm((current) => ({ ...current, elevenLabsVoiceId: e.target.value }))} placeholder={t("omni.voice.placeholder.elevenLabsVoiceId")} className="rounded-lg" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="voice-eleven-model">{t("omni.voice.field.elevenLabsModelId")}</Label>
                                            <Input id="voice-eleven-model" value={form.elevenLabsModelId || ""} onChange={(e) => setForm((current) => ({ ...current, elevenLabsModelId: e.target.value }))} placeholder={t("omni.voice.placeholder.elevenLabsModelId")} className="rounded-lg" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="voice-byoc-override">{t("omni.voice.field.byocTrunkSidOverride")}</Label>
                                            <Input id="voice-byoc-override" value={form.byocTrunkSidOverride || ""} onChange={(e) => setForm((current) => ({ ...current, byocTrunkSidOverride: e.target.value }))} placeholder={t("omni.voice.placeholder.byocTrunkSidOverride")} className="rounded-lg" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="voice-default-tts-provider">{t("omni.voice.field.ttsProviderDefault")}</Label>
                                            <select
                                                id="voice-default-tts-provider"
                                                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                                value={integrationForm.ttsProviderDefault || "elevenlabs"}
                                                onChange={(e) => setIntegrationForm((current) => ({ ...current, ttsProviderDefault: e.target.value as VoiceIntegrationConfig["ttsProviderDefault"] }))}
                                            >
                                                <option value="twilio">{getOmniEnumLabel(t, "ttsProvider", "twilio")}</option>
                                                <option value="elevenlabs">{getOmniEnumLabel(t, "ttsProvider", "elevenlabs")}</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="voice-business-hours">{t("omni.voice.field.businessHours")}</Label>
                                        <Input id="voice-business-hours" value={form.businessHours || ""} onChange={(e) => setForm((current) => ({ ...current, businessHours: e.target.value }))} placeholder={t("omni.voice.placeholder.businessHours")} className="rounded-lg" />
                                    </div>
                                    <div className="flex items-center justify-between rounded-[12px] border border-border/70 bg-muted/20 p-4">
                                        <div>
                                            <p className="text-sm font-medium">{t("omni.voice.callbackEnabled.title")}</p>
                                            <p className="text-sm text-muted-foreground">{t("omni.voice.callbackEnabled.description")}</p>
                                        </div>
                                        <Switch checked={form.callbackEnabled !== false} onCheckedChange={(checked) => setForm((current) => ({ ...current, callbackEnabled: checked }))} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="voice-greeting-message">{t("omni.voice.field.greetingMessage")}</Label>
                                    <Textarea id="voice-greeting-message" rows={4} value={form.greetingMessage || ""} onChange={(e) => setForm((current) => ({ ...current, greetingMessage: e.target.value }))} placeholder={t("omni.voice.placeholder.greetingMessage")} className="rounded-lg" />
                                </div>

                                <div className="flex justify-end gap-3">
                                    <Button variant="outline" className="rounded-lg bg-white/80" onClick={handleHealthCheck} disabled={isCheckingHealth || !payload.health.enabled}>
                                        {isCheckingHealth ? <Loader2 className="h-4 w-4 animate-spin" /> : t("omni.voice.action.healthCheck")}
                                    </Button>
                                    <Button onClick={handleSave} disabled={isSaving} className="min-w-32 rounded-lg">
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("omni.voice.action.save")}
                                    </Button>
                                </div>
                            </div>
                        </OmniSectionCard>
                    </div>
                </TabsContent>

                <TabsContent value="flow" className="space-y-4">
                    <OmniSectionCard title={t("omni.voice.flow.title")} description={t("omni.voice.flow.description")} action={<Route className="h-4 w-4 text-muted-foreground" />}>
                        <div className="space-y-3 text-sm text-muted-foreground">
                            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">{t("omni.voice.flow.step1")}</div>
                            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">{t("omni.voice.flow.step2")}</div>
                            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">{t("omni.voice.flow.step3")}</div>
                            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">{t("omni.voice.flow.step4")}</div>
                        </div>
                    </OmniSectionCard>
                </TabsContent>

                <TabsContent value="policies" className="space-y-4">
                    <Card className="rounded-lg border-border/70 bg-card/95 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <ShieldCheck className="h-4 w-4" />
                                {t("omni.voice.policy.title")}
                            </CardTitle>
                            <CardDescription>{payload.policy.responseStyle}</CardDescription>
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
                            <div className="flex items-center justify-between gap-3">
                                <span>{t("omni.voice.policy.repeatCriticalFields")}</span>
                                <span>{payload.policy.repeatCriticalFields ? t("omni.voice.policy.required") : t("omni.voice.policy.optional")}</span>
                            </div>
                            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">{t("omni.voice.policy.formatting")}: {payload.policy.safeFormatting.join(", ")}</div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="health" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
                        <Card className="rounded-lg border-border/70 bg-card/95">
                            <CardHeader>
                                <CardTitle className="text-base">{t("omni.common.enabled")}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">
                                {payload.health.enabled ? t("omni.common.enabled") : t("omni.common.disabled")}
                            </CardContent>
                        </Card>
                        <Card className="rounded-lg border-border/70 bg-card/95">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Activity className="h-4 w-4" />
                                    {t("omni.voice.health.activeNumbers")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-2xl font-semibold">{payload.health.activeNumbers}</CardContent>
                        </Card>
                        <Card className="rounded-lg border-border/70 bg-card/95">
                            <CardHeader>
                                <CardTitle className="text-base">{t("omni.voice.health.inboundWebhook")}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground break-all">{payload.health.inboundWebhook}</CardContent>
                        </Card>
                        <Card className="rounded-lg border-border/70 bg-card/95">
                            <CardHeader>
                                <CardTitle className="text-base">{t("omni.voice.health.turnWebhook")}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground break-all">{payload.health.turnWebhook}</CardContent>
                        </Card>
                        <Card className="rounded-lg border-border/70 bg-card/95">
                            <CardHeader>
                                <CardTitle className="text-base">{t("omni.voice.health.statusWebhook")}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground break-all">{payload.health.statusWebhook}</CardContent>
                        </Card>
                        <Card className="rounded-lg border-border/70 bg-card/95">
                            <CardHeader>
                                <CardTitle className="text-base">{t("omni.voice.health.outboundReady")}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">
                                {payload.health.outboundReady ? t("omni.voice.health.outboundReadyYes") : t("omni.voice.health.outboundReadyNo")}
                            </CardContent>
                        </Card>
                        <Card className="rounded-lg border-border/70 bg-card/95">
                            <CardHeader>
                                <CardTitle className="text-base">{t("omni.voice.health.carrierConfigured")}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">
                                {payload.health.carrierConfigured ? t("omni.voice.health.readyYes") : t("omni.voice.health.readyNo")}
                            </CardContent>
                        </Card>
                        <Card className="rounded-lg border-border/70 bg-card/95">
                            <CardHeader>
                                <CardTitle className="text-base">{t("omni.voice.health.callControlConfigured")}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">
                                {payload.health.callControlConfigured ? t("omni.voice.health.readyYes") : t("omni.voice.health.readyNo")}
                            </CardContent>
                        </Card>
                        <Card className="rounded-lg border-border/70 bg-card/95">
                            <CardHeader>
                                <CardTitle className="text-base">{t("omni.voice.health.renderingConfigured")}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground">
                                {payload.health.renderingConfigured ? t("omni.voice.health.readyYes") : t("omni.voice.health.readyNo")}
                            </CardContent>
                        </Card>
                    </div>
                    {healthCheckResult ? (
                        <Card className="rounded-lg border-border/70 bg-card/95 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
                            <CardHeader>
                                <CardTitle className="text-base">{t("omni.voice.health.lastCheckTitle")}</CardTitle>
                                <CardDescription>{healthCheckResult.checkedAt ? formatOmniDateTime(healthCheckResult.checkedAt, language) : t("omni.voice.health.noTimestamp")}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center justify-between gap-3">
                                    <span>{t("omni.common.status")}</span>
                                    <Badge variant={healthCheckResult.skipped ? "secondary" : healthCheckResult.ok ? "outline" : "destructive"}>
                                        {healthCheckResult.skipped ? t("omni.common.disabled") : healthCheckResult.ok ? t("omni.voice.health.healthy") : t("omni.voice.health.failed")}
                                    </Badge>
                                </div>
                                {healthCheckResult.accountName ? <div>{t("omni.voice.health.account")}: {healthCheckResult.accountName}</div> : null}
                                {healthCheckResult.accountStatus ? <div>{t("omni.voice.health.accountStatus")}: {healthCheckResult.accountStatus}</div> : null}
                                {healthCheckResult.message ? <div>{healthCheckResult.message}</div> : null}
                            </CardContent>
                        </Card>
                    ) : null}
                    <Card className="rounded-lg border-border/70 bg-card/95 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
                        <CardHeader>
                            <CardTitle className="text-base">{t("omni.voice.test.title")}</CardTitle>
                            <CardDescription>{t("omni.voice.test.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2">
                                <Label htmlFor="voice-test-to">{t("omni.voice.test.destinationPhone")}</Label>
                                <Input id="voice-test-to" placeholder="+90..." value={testCallForm.to} onChange={(e) => setTestCallForm({ to: e.target.value })} />
                            </div>
                            <Button onClick={handleTestCall} disabled={isSendingTestCall || !payload.health.enabled || !selectedNumberId || !testCallForm.to.trim()}>
                                {isSendingTestCall ? <Loader2 className="h-4 w-4 animate-spin" /> : t("omni.voice.action.startTestCall")}
                            </Button>
                        </CardContent>
                    </Card>
                    <Card className="rounded-lg border-border/70 bg-card/95 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)]">
                        <CardHeader>
                            <CardTitle className="text-base">{t("omni.voice.audit.title")}</CardTitle>
                            <CardDescription>{t("omni.voice.audit.description")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {auditLogs.length === 0 ? (
                                <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                    {t("omni.voice.audit.empty")}
                                </div>
                            ) : (
                                auditLogs.map((log) => (
                                    <div key={log.id} className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="text-sm font-medium text-foreground">{log.eventType}</div>
                                            <Badge variant={log.result === "success" ? "outline" : "destructive"}>{getOmniEnumLabel(t, "result", log.result)}</Badge>
                                        </div>
                                        <div className="mt-1 text-sm text-muted-foreground">{log.message || t("omni.voice.audit.noMessage")}</div>
                                        <div className="mt-2 text-xs text-muted-foreground">{log.createdAt ? formatOmniDateTime(log.createdAt, language) : t("omni.common.notAvailable")}</div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
