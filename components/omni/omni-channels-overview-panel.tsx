"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, ArrowRight, CheckCircle2, Globe, Instagram, MessageCircle, PhoneCall, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { useOmniAccount } from "@/context/OmniAccountContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { formatOmniDateTime } from "@/lib/omni/i18n"
import { OmniMetricTile, OmniSectionCard, OmniSectionHeader, OmniStateShell } from "@/components/omni/omni-ui"

type ChannelKey = "web" | "whatsapp" | "instagram" | "voice"

interface WebWidgetPayload {
    config: {
        enabled: boolean
    }
}

interface WhatsAppPayload {
    config: {
        enabled: boolean
        phoneNumberId?: string | null
        accessTokenRef?: string | null
        appSecretRef?: string | null
        verifyToken?: string | null
        webhookStatus?: "connected" | "pending" | "disconnected"
        displayNumber?: string | null
    }
    health: {
        webhookStatus?: string | null
        phoneNumberId?: string | null
    }
}

interface InstagramPayload {
    config: {
        enabled: boolean
        accountId?: string | null
        pageId?: string | null
        accessTokenRef?: string | null
        appSecretRef?: string | null
        verifyToken?: string | null
        webhookStatus?: "connected" | "pending" | "disconnected"
    }
    health: {
        webhookStatus?: string | null
        pageId?: string | null
    }
}

interface VoicePayload {
    numbers: Array<{
        id?: string
        routingStatus?: "draft" | "active" | "paused"
        routingMode?: "twilio_direct" | "twilio_byoc"
        carrierProvider?: string | null
        ttsProvider?: string | null
    }>
    integration: {
        enabled?: boolean
        accountSid?: string | null
        defaultByocTrunkSid?: string | null
        ttsProviderDefault?: string | null
    }
    health: {
        enabled?: boolean
        activeNumbers: number
        outboundReady: boolean
        carrierConfigured?: boolean
        callControlConfigured?: boolean
        renderingConfigured?: boolean
        defaultRoutingMode?: string | null
    }
}

interface AuditLogItem {
    id?: string
    channel?: string | null
    eventType: string
    result: "success" | "error" | "denied" | "blocked"
    message?: string | null
    createdAt?: string | null
}

interface ChannelOverviewItem {
    key: ChannelKey
    label: string
    href: string
    icon: typeof Globe
    enabled: boolean
    ready: boolean
    completeness: {
        current: number
        total: number
    }
    blockerCount: number
    blockers: string[]
    lastActivityAt?: string | null
    details: string[]
}

export function OmniChannelsOverviewPanel() {
    const { user } = useAuth()
    const { activeAccountId: chatbotId } = useOmniAccount()
    const { language, t } = useLanguage()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(true)
    const [web, setWeb] = useState<WebWidgetPayload | null>(null)
    const [whatsapp, setWhatsApp] = useState<WhatsAppPayload | null>(null)
    const [instagram, setInstagram] = useState<InstagramPayload | null>(null)
    const [voice, setVoice] = useState<VoicePayload | null>(null)
    const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])

    const load = async () => {
        if (!user || !chatbotId) return

        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const headers = { Authorization: `Bearer ${token}` }
            const [webResponse, whatsappResponse, instagramResponse, voiceResponse, auditResponse] = await Promise.all([
                fetch(`/api/omni/channels/web-widget?chatbotId=${chatbotId}`, { headers }),
                fetch(`/api/omni/channels/whatsapp?chatbotId=${chatbotId}`, { headers }),
                fetch(`/api/omni/channels/instagram?chatbotId=${chatbotId}`, { headers }),
                fetch(`/api/omni/channels/voice?chatbotId=${chatbotId}`, { headers }),
                fetch(`/api/omni/audit-logs?chatbotId=${chatbotId}&limit=40`, { headers }),
            ])

            if (!webResponse.ok || !whatsappResponse.ok || !instagramResponse.ok || !voiceResponse.ok || !auditResponse.ok) {
                throw new Error("Failed to load channel overview")
            }

            const [webData, whatsappData, instagramData, voiceData, auditData] = await Promise.all([
                webResponse.json(),
                whatsappResponse.json(),
                instagramResponse.json(),
                voiceResponse.json(),
                auditResponse.json(),
            ])

            setWeb(webData)
            setWhatsApp(whatsappData)
            setInstagram(instagramData)
            setVoice(voiceData)
            setAuditLogs(Array.isArray(auditData?.logs) ? auditData.logs : [])
        } catch (error) {
            console.error("Failed to load Omni channels overview", error)
            setWeb(null)
            setWhatsApp(null)
            setInstagram(null)
            setVoice(null)
            setAuditLogs([])
            toast({
                title: t("omni.channelsOverview.toast.loadFailed.title"),
                description: t("omni.channelsOverview.toast.loadFailed.description"),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [user, chatbotId])

    const channels = useMemo<ChannelOverviewItem[]>(() => {
        const lastActivityFor = (channel: ChannelKey) => auditLogs.find((log) => log.channel === channel)?.createdAt || null

        const webEnabled = web?.config?.enabled !== false
        const whatsappRequired = [
            Boolean(whatsapp?.config?.phoneNumberId),
            Boolean(whatsapp?.config?.accessTokenRef),
            Boolean(whatsapp?.config?.appSecretRef),
            Boolean(whatsapp?.config?.verifyToken),
        ]
        const instagramRequired = [
            Boolean(instagram?.config?.accountId),
            Boolean(instagram?.config?.pageId),
            Boolean(instagram?.config?.accessTokenRef),
            Boolean(instagram?.config?.appSecretRef),
            Boolean(instagram?.config?.verifyToken),
        ]
        const voiceRequired = [
            Boolean(voice?.health?.carrierConfigured),
            Boolean(voice?.health?.callControlConfigured),
            Boolean(voice?.health?.renderingConfigured),
        ]

        return [
            {
                key: "web",
                label: t("omni.nav.webWidget"),
                href: "/omni/channels/web-widget",
                icon: Globe,
                enabled: webEnabled,
                ready: webEnabled,
                completeness: { current: 1, total: 1 },
                blockerCount: 0,
                blockers: [],
                lastActivityAt: lastActivityFor("web"),
                details: [webEnabled ? t("omni.channelsOverview.detail.publicRuntimeOn") : t("omni.channelsOverview.detail.publicRuntimeOff")],
            },
            {
                key: "whatsapp",
                label: t("omni.nav.whatsapp"),
                href: "/omni/channels/whatsapp",
                icon: MessageCircle,
                enabled: whatsapp?.config?.enabled === true,
                ready:
                    whatsapp?.config?.enabled === true &&
                    whatsappRequired.every(Boolean) &&
                    whatsapp?.health?.webhookStatus === "connected",
                completeness: {
                    current: whatsappRequired.filter(Boolean).length,
                    total: whatsappRequired.length,
                },
                blockerCount: [
                    whatsapp?.config?.enabled === true && !whatsapp?.config?.phoneNumberId ? "phoneNumberId" : null,
                    whatsapp?.config?.enabled === true && !whatsapp?.config?.accessTokenRef ? "accessToken" : null,
                    whatsapp?.config?.enabled === true && !whatsapp?.config?.appSecretRef ? "appSecret" : null,
                    whatsapp?.config?.enabled === true && !whatsapp?.config?.verifyToken ? "verifyToken" : null,
                    whatsapp?.config?.enabled === true && whatsapp?.health?.webhookStatus !== "connected" ? "webhookStatus" : null,
                ].filter(Boolean).length,
                blockers: [
                    whatsapp?.config?.enabled ? null : t("omni.channelsOverview.blocker.channelDisabled"),
                    whatsapp?.config?.enabled === true && !whatsapp?.config?.phoneNumberId ? "phoneNumberId" : null,
                    whatsapp?.config?.enabled === true && !whatsapp?.config?.accessTokenRef ? "access token" : null,
                    whatsapp?.config?.enabled === true && !whatsapp?.config?.appSecretRef ? "app secret" : null,
                    whatsapp?.config?.enabled === true && !whatsapp?.config?.verifyToken ? "verify token" : null,
                    whatsapp?.config?.enabled === true && whatsapp?.health?.webhookStatus !== "connected" ? `webhook: ${whatsapp?.health?.webhookStatus || "disconnected"}` : null,
                ].filter((value): value is string => Boolean(value)),
                lastActivityAt: lastActivityFor("whatsapp"),
                details: [
                    whatsapp?.config?.displayNumber || t("omni.common.notAvailable"),
                    `webhook: ${whatsapp?.health?.webhookStatus || "disconnected"}`,
                ],
            },
            {
                key: "instagram",
                label: t("omni.nav.instagramDm"),
                href: "/omni/channels/instagram-dm",
                icon: Instagram,
                enabled: instagram?.config?.enabled === true,
                ready:
                    instagram?.config?.enabled === true &&
                    instagramRequired.every(Boolean) &&
                    instagram?.health?.webhookStatus === "connected",
                completeness: {
                    current: instagramRequired.filter(Boolean).length,
                    total: instagramRequired.length,
                },
                blockerCount: [
                    instagram?.config?.enabled === true && !instagram?.config?.accountId ? "accountId" : null,
                    instagram?.config?.enabled === true && !instagram?.config?.pageId ? "pageId" : null,
                    instagram?.config?.enabled === true && !instagram?.config?.accessTokenRef ? "accessToken" : null,
                    instagram?.config?.enabled === true && !instagram?.config?.appSecretRef ? "appSecret" : null,
                    instagram?.config?.enabled === true && !instagram?.config?.verifyToken ? "verifyToken" : null,
                    instagram?.config?.enabled === true && instagram?.health?.webhookStatus !== "connected" ? "webhookStatus" : null,
                ].filter(Boolean).length,
                blockers: [
                    instagram?.config?.enabled ? null : t("omni.channelsOverview.blocker.channelDisabled"),
                    instagram?.config?.enabled === true && !instagram?.config?.accountId ? "accountId" : null,
                    instagram?.config?.enabled === true && !instagram?.config?.pageId ? "pageId" : null,
                    instagram?.config?.enabled === true && !instagram?.config?.accessTokenRef ? "access token" : null,
                    instagram?.config?.enabled === true && !instagram?.config?.appSecretRef ? "app secret" : null,
                    instagram?.config?.enabled === true && !instagram?.config?.verifyToken ? "verify token" : null,
                    instagram?.config?.enabled === true && instagram?.health?.webhookStatus !== "connected" ? `webhook: ${instagram?.health?.webhookStatus || "disconnected"}` : null,
                ].filter((value): value is string => Boolean(value)),
                lastActivityAt: lastActivityFor("instagram"),
                details: [
                    instagram?.config?.pageId || t("omni.common.notAvailable"),
                    `webhook: ${instagram?.health?.webhookStatus || "disconnected"}`,
                ],
            },
            {
                key: "voice",
                label: t("omni.nav.voiceCalls"),
                href: "/omni/channels/voice-calls",
                icon: PhoneCall,
                enabled: voice?.health?.enabled === true,
                ready:
                    voice?.health?.enabled === true &&
                    voiceRequired.every(Boolean) &&
                    Number(voice?.health?.activeNumbers || 0) > 0 &&
                    Boolean(voice?.health?.outboundReady),
                completeness: {
                    current: voiceRequired.filter(Boolean).length,
                    total: voiceRequired.length,
                },
                blockerCount: [
                    voice?.health?.enabled === true && !voice?.health?.carrierConfigured ? "carrier" : null,
                    voice?.health?.enabled === true && !voice?.health?.callControlConfigured ? "callControl" : null,
                    voice?.health?.enabled === true && !voice?.health?.renderingConfigured ? "rendering" : null,
                    voice?.health?.enabled === true && Number(voice?.health?.activeNumbers || 0) === 0 ? "activeNumbers" : null,
                ].filter(Boolean).length,
                blockers: [
                    voice?.health?.enabled ? null : t("omni.channelsOverview.blocker.channelDisabled"),
                    voice?.health?.enabled === true && !voice?.health?.carrierConfigured ? t("omni.channelsOverview.blocker.voiceCarrier") : null,
                    voice?.health?.enabled === true && !voice?.health?.callControlConfigured ? t("omni.channelsOverview.blocker.voiceControl") : null,
                    voice?.health?.enabled === true && !voice?.health?.renderingConfigured ? t("omni.channelsOverview.blocker.voiceRendering") : null,
                    voice?.health?.enabled === true && Number(voice?.health?.activeNumbers || 0) === 0 ? t("omni.channelsOverview.blocker.voiceNumbers") : null,
                ].filter((value): value is string => Boolean(value)),
                lastActivityAt: lastActivityFor("voice"),
                details: [
                    `${t("omni.channelsOverview.detail.activeNumbers")}: ${voice?.health?.activeNumbers || 0}`,
                    `${t("omni.channelsOverview.detail.routing")}: ${voice?.health?.defaultRoutingMode || t("omni.common.notAvailable")}`,
                    `${t("omni.channelsOverview.detail.rendering")}: ${voice?.integration?.ttsProviderDefault || t("omni.common.notAvailable")}`,
                ],
            },
        ]
    }, [auditLogs, instagram, t, voice, web, whatsapp])

    const summary = useMemo(() => {
        const enabled = channels.filter((channel) => channel.enabled).length
        const ready = channels.filter((channel) => channel.enabled && channel.ready).length
        const blocked = channels.filter((channel) => channel.enabled && !channel.ready).length
        const disabled = channels.filter((channel) => !channel.enabled).length
        return { enabled, ready, blocked, disabled }
    }, [channels])

    const recentEvents = useMemo(
        () =>
            auditLogs
                .filter((log) => ["web", "whatsapp", "instagram", "voice"].includes(log.channel || ""))
                .slice(0, 8),
        [auditLogs]
    )

    if (isLoading) {
        return <OmniStateShell title={t("omni.common.loading")} description={t("omni.channelsOverview.loading")} />
    }

    if (!web || !whatsapp || !instagram || !voice) {
        return <OmniStateShell title={t("omni.channelsOverview.empty")} description={t("omni.channelsOverview.toast.loadFailed.description")} tone="warning" />
    }

    return (
        <div className="space-y-6">
            <OmniSectionHeader
                title={t("omni.page.channels.title")}
                description={t("omni.page.channels.description")}
                action={
                    <Button variant="outline" onClick={load}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t("omni.channelsOverview.refresh")}
                    </Button>
                }
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <OmniMetricTile label={t("omni.channelsOverview.metric.enabled")} value={summary.enabled} note={t("omni.channelsOverview.metric.enabledNote")} />
                <OmniMetricTile
                    label={t("omni.channelsOverview.metric.ready")}
                    value={summary.ready}
                    note={t("omni.channelsOverview.metric.readyNote")}
                    action={summary.ready > 0 ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}
                />
                <OmniMetricTile
                    label={t("omni.channelsOverview.metric.blocked")}
                    value={summary.blocked}
                    note={t("omni.channelsOverview.metric.blockedNote")}
                    action={summary.blocked > 0 ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : null}
                />
                <OmniMetricTile label={t("omni.channelsOverview.metric.disabled")} value={summary.disabled} note={t("omni.channelsOverview.metric.disabledNote")} />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                {channels.map((channel) => {
                    const Icon = channel.icon
                    const statusClass = !channel.enabled
                        ? "bg-slate-200 text-slate-700 hover:bg-slate-200"
                        : channel.ready
                          ? "bg-emerald-600 text-white hover:bg-emerald-600"
                          : "bg-amber-500 text-white hover:bg-amber-500"

                    return (
                        <OmniSectionCard
                            key={channel.key}
                            title={channel.label}
                            description={
                                !channel.enabled
                                    ? t("omni.channelsOverview.disabledNote")
                                    : channel.ready
                                      ? t("omni.channelsOverview.readyNote")
                                      : t("omni.channelsOverview.blockedNote")
                            }
                            action={<Badge className={statusClass}>{!channel.enabled ? t("omni.common.disabled") : channel.ready ? t("omni.dashboard.channel.healthy") : t("omni.dashboard.channel.blocked")}</Badge>}
                        >
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
                                        <Icon className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-medium">
                                            {t("omni.channelsOverview.configComplete")}: {channel.completeness.current}/{channel.completeness.total}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {t("omni.channelsOverview.lastActivity")}:{" "}
                                            {channel.lastActivityAt ? formatOmniDateTime(channel.lastActivityAt, language) : t("omni.channelsOverview.noActivity")}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm text-muted-foreground">
                                    {channel.details.map((detail) => (
                                        <div key={detail} className="rounded-lg border border-dashed px-3 py-2">
                                            {detail}
                                        </div>
                                    ))}
                                </div>

                                {channel.enabled && channel.blockers.length > 0 ? (
                                    <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
                                        <div className="font-medium">
                                            {t("omni.channelsOverview.blockers")} ({channel.blockerCount})
                                        </div>
                                        {channel.blockers.slice(0, 4).map((blocker) => (
                                            <div key={blocker}>• {blocker}</div>
                                        ))}
                                    </div>
                                ) : null}

                                <Button asChild variant="outline" className="w-full">
                                    <Link href={channel.href}>
                                        {t("omni.channelsOverview.open")}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        </OmniSectionCard>
                    )
                })}
            </div>

            <OmniSectionCard title={t("omni.channelsOverview.section.recent")} description={t("omni.channelsOverview.section.recentDescription")}>
                {recentEvents.length === 0 ? (
                    <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">{t("omni.channelsOverview.emptyEvents")}</div>
                ) : (
                    <div className="space-y-3">
                        {recentEvents.map((event) => (
                            <div key={event.id || `${event.channel}-${event.eventType}-${event.createdAt}`} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border px-4 py-3">
                                <div className="space-y-1">
                                    <div className="text-sm font-medium">{event.eventType}</div>
                                    <div className="text-sm text-muted-foreground">{event.message || t("omni.common.notAvailable")}</div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant="outline">{event.channel || t("omni.common.notAvailable")}</Badge>
                                    <Badge variant="outline">{event.result}</Badge>
                                    <span>{event.createdAt ? formatOmniDateTime(event.createdAt, language) : t("omni.channelsOverview.noActivity")}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </OmniSectionCard>
        </div>
    )
}
