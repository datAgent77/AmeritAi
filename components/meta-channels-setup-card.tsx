"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
    AlertCircle,
    BookOpen,
    CheckCircle2,
    ChevronDown,
    ExternalLink,
    Facebook,
    Instagram,
    Loader2,
    MessageCircle,
    RefreshCw,
    Rocket,
    ShieldCheck,
    Smartphone,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

type MetaChannelKey = "instagram" | "messenger" | "whatsapp"
type MetaWizardStage = "prerequisites" | "token" | "discovery" | "draft" | "go_live" | "live"
type MetaSetupState = "not_started" | "draft" | "ready_for_live" | "live" | "error"
type MetaConnectionMode = "tenant_meta_app" | "platform_meta_app"

interface MetaDiscoveryPage {
    id: string
    name: string
    messagingEligible?: boolean
    instagramAccount: {
        id: string
        username: string | null
        name: string | null
    } | null
}

interface MetaWhatsAppDiscoveryPhone {
    id: string
    displayNumber: string | null
    verifiedName: string | null
}

interface MetaWhatsAppDiscoveryBusiness {
    id: string
    name: string
    phoneNumbers: MetaWhatsAppDiscoveryPhone[]
}

interface MetaChannelStatusPayload {
    enabled: boolean
    connected: boolean
    setupStatus: MetaSetupState
    setupStage: MetaWizardStage
    connectionMode: MetaConnectionMode
    webhookStatus: "connected" | "pending" | "disconnected"
    webhookUrl: string
    verifyToken: string | null
    lastHealthCheckAt: string | null
    lastSetupError: string | null
    readyForLive: boolean
    pageId?: string | null
    accountId?: string | null
    appId?: string | null
    businessAccountId?: string | null
    phoneNumberId?: string | null
    displayNumber?: string | null
}

interface MetaSetupStatusPayload {
    wizard: {
        stage: MetaWizardStage
        selectedChannels: MetaChannelKey[]
        hasStoredAccessToken: boolean
        hasStoredAppSecret: boolean
        appId: string | null
        connectionMode: MetaConnectionMode
        discovery: {
            pages: MetaDiscoveryPage[]
            whatsappBusinesses: MetaWhatsAppDiscoveryBusiness[]
            errors: Record<MetaChannelKey, string | null>
            discoveredAt: string | null
        }
    }
    channels: {
        instagram: MetaChannelStatusPayload
        messenger: MetaChannelStatusPayload
        whatsapp: MetaChannelStatusPayload
    }
}

interface MetaActionResult {
    ok: boolean
    message: string
    status: number
}

interface MetaChannelsSetupCardProps {
    chatbotId: string
    status?: MetaSetupStatusPayload | null
    onStatusChange?: (nextStatus: MetaSetupStatusPayload) => void
}

const CHANNEL_ORDER: MetaChannelKey[] = ["instagram", "messenger", "whatsapp"]

const CHANNEL_LABELS: Record<MetaChannelKey, string> = {
    instagram: "Instagram DM",
    messenger: "Facebook Messenger",
    whatsapp: "WhatsApp Business",
}

const STAGE_LABELS: Record<MetaWizardStage, string> = {
    prerequisites: "Hazirlik",
    token: "Token",
    discovery: "Kesif",
    draft: "Taslak",
    go_live: "Kontrol",
    live: "Canli",
}

const STATUS_LABELS: Record<MetaSetupState, string> = {
    not_started: "Baslamadi",
    draft: "Eksik Secim",
    ready_for_live: "Hazir",
    live: "Kuruldu",
    error: "Meta izni eksik",
}

export function MetaChannelsSetupCard({ chatbotId, status = null, onStatusChange }: MetaChannelsSetupCardProps) {
    const { toast } = useToast()
    const { user } = useAuth()
    const appIdInputRef = useRef<HTMLInputElement | null>(null)
    const [localStatus, setLocalStatus] = useState<MetaSetupStatusPayload | null>(status)
    const [selectedChannels, setSelectedChannels] = useState<MetaChannelKey[]>(["instagram", "messenger", "whatsapp"])
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [accessToken, setAccessToken] = useState("")
    const [appSecret, setAppSecret] = useState("")
    const [appId, setAppId] = useState("")
    const [instagramPageId, setInstagramPageId] = useState("")
    const [messengerPageId, setMessengerPageId] = useState("")
    const [whatsappBusinessAccountId, setWhatsappBusinessAccountId] = useState("")
    const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState("")
    const [whatsappDisplayNumber, setWhatsappDisplayNumber] = useState("")
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const [isDiscovering, setIsDiscovering] = useState(false)
    const [isSavingDraft, setIsSavingDraft] = useState(false)
    const [isVerifyingLive, setIsVerifyingLive] = useState(false)
    const [lastError, setLastError] = useState<string | null>(null)
    const [actionResults, setActionResults] = useState<Partial<Record<MetaChannelKey, MetaActionResult>> | null>(null)

    useEffect(() => {
        setLocalStatus(status)
    }, [status])

    const publishStatus = (nextStatus: MetaSetupStatusPayload) => {
        setLocalStatus(nextStatus)
        onStatusChange?.(nextStatus)
    }

    useEffect(() => {
        if (!localStatus) return
        const nextChannels: MetaChannelKey[] = localStatus.wizard.selectedChannels?.length
            ? [...localStatus.wizard.selectedChannels]
            : ["instagram", "messenger", "whatsapp"]
        const pages = localStatus.wizard.discovery.pages || []
        const whatsappBusinesses = localStatus.wizard.discovery.whatsappBusinesses || []
        const currentBusiness =
            whatsappBusinesses.find((item) => item.id === localStatus.channels.whatsapp.businessAccountId) ||
            whatsappBusinesses.find((item) => item.phoneNumbers.length > 0) ||
            whatsappBusinesses[0] ||
            null
        const currentPhone =
            currentBusiness?.phoneNumbers.find((item) => item.id === localStatus.channels.whatsapp.phoneNumberId) ||
            currentBusiness?.phoneNumbers[0] ||
            null

        setSelectedChannels(nextChannels)
        setAppId(localStatus.wizard.appId || "")
        setInstagramPageId(localStatus.channels.instagram.pageId || pages.find((page) => page.instagramAccount)?.id || "")
        setMessengerPageId(localStatus.channels.messenger.pageId || pages.find((page) => page.messagingEligible !== false)?.id || "")
        setWhatsappBusinessAccountId(localStatus.channels.whatsapp.businessAccountId || currentBusiness?.id || "")
        setWhatsappPhoneNumberId(localStatus.channels.whatsapp.phoneNumberId || currentPhone?.id || "")
        setWhatsappDisplayNumber(localStatus.channels.whatsapp.displayNumber || currentPhone?.displayNumber || "")
    }, [localStatus])

    const getAuthHeaders = async () => {
        if (!user) throw new Error("Oturum bulunamadi.")
        const token = await user.getIdToken()
        return {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        }
    }

    const refreshStatus = async () => {
        setIsRefreshing(true)
        setLastError(null)
        try {
            const response = await fetch(`/api/integrations/meta/setup-status?chatbotId=${chatbotId}`, {
                headers: await getAuthHeaders(),
                cache: "no-store",
            })
            const payload = await response.json().catch(() => null)
            if (!response.ok || !payload) throw new Error(payload?.error || "Meta durum bilgisi alinamadi.")
            publishStatus(payload as MetaSetupStatusPayload)
        } catch (error) {
            setLastError(error instanceof Error ? error.message : "Meta durum bilgisi alinamadi.")
        } finally {
            setIsRefreshing(false)
        }
    }

    useEffect(() => {
        if (localStatus || !user) return
        void refreshStatus()
    }, [localStatus, user])

    const pages = localStatus?.wizard.discovery.pages || []
    const whatsappBusinesses = localStatus?.wizard.discovery.whatsappBusinesses || []
    const selectedWhatsAppBusiness = whatsappBusinesses.find((item) => item.id === whatsappBusinessAccountId) || null
    const selectedWhatsAppPhone = selectedWhatsAppBusiness?.phoneNumbers.find((item) => item.id === whatsappPhoneNumberId) || null
    const selectedChannelStatuses = selectedChannels.map((channel) => getChannelStatus(localStatus, channel))
    const fullyConnectedCount = selectedChannelStatuses.filter((channel) => channel.connected).length
    const hasStoredTenantAppCredentials =
        Boolean(localStatus?.wizard.appId) && Boolean(localStatus?.wizard.hasStoredAppSecret) && localStatus?.wizard.connectionMode !== "platform_meta_app"
    const hasEnteredTenantAppCredentials = Boolean(appId.trim() && appSecret.trim())
    const canConnect = selectedChannels.length > 0 && !isConnecting && !isRefreshing && (hasEnteredTenantAppCredentials || hasStoredTenantAppCredentials)
    const canDiscover = selectedChannels.length > 0 && accessToken.trim() && !isDiscovering && !isSavingDraft && !isVerifyingLive
    const canSaveDraft =
        selectedChannels.length > 0 &&
        (!selectedChannels.includes("instagram") || Boolean(instagramPageId)) &&
        (!selectedChannels.includes("messenger") || Boolean(messengerPageId || instagramPageId)) &&
        (!selectedChannels.includes("whatsapp") || (Boolean(whatsappBusinessAccountId) && Boolean(whatsappPhoneNumberId))) &&
        !isSavingDraft &&
        !isDiscovering &&
        !isVerifyingLive
    const canVerifyLive = selectedChannels.length > 0 && !isVerifyingLive && !isSavingDraft && !isDiscovering
    const needsTenantAppCredentials =
        !hasEnteredTenantAppCredentials &&
        !hasStoredTenantAppCredentials

    useEffect(() => {
        if (!lastError || !needsTenantAppCredentials) return
        appIdInputRef.current?.focus()
    }, [lastError, needsTenantAppCredentials])

    const summaryCards = useMemo(
        () =>
            CHANNEL_ORDER.map((channel) => ({
                channel,
                status: getChannelStatus(localStatus, channel),
            })),
        [localStatus]
    )
    const requiredPermissions = useMemo(() => {
        const permissions = new Set<string>(["business_management", "pages_show_list"])
        if (selectedChannels.includes("instagram")) {
            permissions.add("pages_manage_metadata")
            permissions.add("pages_messaging")
            permissions.add("instagram_business_basic")
            permissions.add("instagram_business_manage_messages")
        }
        if (selectedChannels.includes("messenger")) {
            permissions.add("pages_manage_metadata")
            permissions.add("pages_messaging")
        }
        if (selectedChannels.includes("whatsapp")) {
            permissions.add("whatsapp_business_management")
            permissions.add("whatsapp_business_messaging")
        }
        return Array.from(permissions)
    }, [selectedChannels])

    const toggleChannel = (channel: MetaChannelKey, checked: boolean) => {
        setSelectedChannels((current) => {
            const next = checked ? Array.from(new Set([...current, channel])) : current.filter((item) => item !== channel)
            return next.length > 0 ? next : current
        })
        setActionResults(null)
        setLastError(null)
    }

    const handleConnect = async () => {
        if (!canConnect) return
        setIsConnecting(true)
        setLastError(null)
        try {
            if (!hasEnteredTenantAppCredentials && !hasStoredTenantAppCredentials) {
                setLastError("Bu tenant icin Meta App ID ve Meta App Secret gerekli.")
                appIdInputRef.current?.focus()
                setIsConnecting(false)
                return
            }
            const response = await fetch("/api/integrations/meta/connect", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    chatbotId,
                    selectedChannels,
                    appId: appId.trim() || undefined,
                    appSecret: appSecret.trim() || undefined,
                    returnPath: `${window.location.pathname}${window.location.search}`,
                }),
            })
            const payload = await response.json().catch(() => null)
            if (!response.ok || !payload?.authUrl) throw new Error(payload?.error || "Meta OAuth baslatilamadi.")
            window.location.href = payload.authUrl
        } catch (error) {
            const message = error instanceof Error ? error.message : "Meta OAuth baslatilamadi."
            setLastError(message)
            if (message.includes("Meta platform app ayarli degil")) {
                setShowAdvanced(true)
            }
            toast({
                title: "Meta baglantisi baslatilamadi",
                description: message,
                variant: "destructive",
            })
            setIsConnecting(false)
        }
    }

    const handleDiscover = async () => {
        if (!canDiscover) return
        setIsDiscovering(true)
        setLastError(null)
        setActionResults(null)
        try {
            const response = await fetch("/api/integrations/meta/discover", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    chatbotId,
                    accessToken: accessToken.trim(),
                    appSecret: appSecret.trim() || undefined,
                    appId: appId.trim() || undefined,
                    selectedChannels,
                }),
            })
            const payload = await response.json().catch(() => null)
            if (!response.ok || !payload) throw new Error(payload?.error || "Meta varliklari kesfedilemedi.")
            publishStatus(payload as MetaSetupStatusPayload)
            setAccessToken("")
            toast({
                title: "Kesif tamamlandi",
                description: "Advanced fallback icin Meta varliklari guncellendi.",
            })
        } catch (error) {
            const message = error instanceof Error ? error.message : "Meta varliklari kesfedilemedi."
            setLastError(message)
            toast({
                title: "Kesif basarisiz",
                description: message,
                variant: "destructive",
            })
        } finally {
            setIsDiscovering(false)
        }
    }

    const handleSaveDraft = async () => {
        if (!canSaveDraft) return
        setIsSavingDraft(true)
        setLastError(null)
        setActionResults(null)
        try {
            const response = await fetch("/api/integrations/meta/save-draft", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    chatbotId,
                    selectedChannels,
                    instagramPageId: selectedChannels.includes("instagram") ? instagramPageId : undefined,
                    messengerPageId: selectedChannels.includes("messenger") ? messengerPageId || instagramPageId : undefined,
                    whatsappBusinessAccountId: selectedChannels.includes("whatsapp") ? whatsappBusinessAccountId : undefined,
                    whatsappPhoneNumberId: selectedChannels.includes("whatsapp") ? whatsappPhoneNumberId : undefined,
                    whatsappDisplayNumber: selectedChannels.includes("whatsapp") ? whatsappDisplayNumber : undefined,
                }),
            })
            const payload = await response.json().catch(() => null)
            if (!response.ok || !payload?.status) throw new Error(payload?.error || "Meta taslagi kaydedilemedi.")
            publishStatus(payload.status as MetaSetupStatusPayload)
            setActionResults(extractActionResults(payload.results))
        } catch (error) {
            const message = error instanceof Error ? error.message : "Meta taslagi kaydedilemedi."
            setLastError(message)
            toast({
                title: "Taslak kaydedilemedi",
                description: message,
                variant: "destructive",
            })
        } finally {
            setIsSavingDraft(false)
        }
    }

    const handleVerifyLive = async () => {
        if (!canVerifyLive) return
        setIsVerifyingLive(true)
        setLastError(null)
        setActionResults(null)
        try {
            const response = await fetch("/api/integrations/meta/verify-live", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    chatbotId,
                    selectedChannels,
                    confirmReady: true,
                    appSecret: appSecret.trim() || undefined,
                    appId: appId.trim() || undefined,
                }),
            })
            const payload = await response.json().catch(() => null)
            if (!response.ok || !payload?.status) throw new Error(payload?.error || "Meta canli kontrolu basarisiz.")
            publishStatus(payload.status as MetaSetupStatusPayload)
            setActionResults(extractActionResults(payload.results))
            setAppSecret("")
        } catch (error) {
            const message = error instanceof Error ? error.message : "Meta canli kontrolu basarisiz."
            setLastError(message)
            toast({
                title: "Canli kontrol basarisiz",
                description: message,
                variant: "destructive",
            })
        } finally {
            setIsVerifyingLive(false)
        }
    }

    return (
        <Card className="overflow-hidden border-0 bg-white/60 shadow-xl ring-1 ring-slate-200/60 backdrop-blur-xl dark:bg-slate-950/60 dark:ring-slate-800/60">
            <CardContent className="p-0">
                <div className="grid lg:grid-cols-5 xl:grid-cols-6">
                    <div className="relative overflow-hidden bg-gradient-to-br from-[#1666c5] via-[#6c37db] to-[#0c8f61] p-8 text-white lg:col-span-2">
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#1877F2]">
                                    <Facebook className="h-5 w-5" />
                                </div>
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 text-white">
                                    <Instagram className="h-5 w-5" />
                                </div>
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#25D366] text-white">
                                    <Smartphone className="h-5 w-5" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h2 className="text-3xl font-bold tracking-tight">Meta ile baglan, kalanini sistem kursun.</h2>
                                <p className="text-sm text-white/85">
                                    Instagram, Messenger ve WhatsApp icin tek OAuth akisi kullanilir. Sistem varliklari kesfeder, uygun hesaplari secer ve calisan kisimlari otomatik kurar.
                                </p>
                            </div>

                            <div className="rounded-2xl bg-black/20 p-5 backdrop-blur-sm">
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/75">Kurulum Asamasi</span>
                                    <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/15">
                                        {localStatus ? STAGE_LABELS[localStatus.wizard.stage] : "Yukleniyor"}
                                    </Badge>
                                </div>
                                <div className="space-y-3">
                                    {summaryCards.map(({ channel, status }) => (
                                        <div key={channel} className="rounded-xl border border-white/10 bg-black/15 p-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-sm font-medium">{CHANNEL_LABELS[channel]}</span>
                                                <Badge className={getStatusBadgeClass(status.setupStatus)}>{STATUS_LABELS[status.setupStatus]}</Badge>
                                            </div>
                                            <div className="mt-2 text-xs text-white/80">
                                                {status.connected ? "Kurulum tamamlandi" : status.lastSetupError || status.webhookStatus}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 p-8 lg:col-span-3 xl:col-span-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                                <div className="mb-2 flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-slate-500" />
                                    <Badge variant="outline">
                                        {localStatus ? `${STAGE_LABELS[localStatus.wizard.stage]} • Tenant App` : "Tenant App"}
                                    </Badge>
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Meta kurulumunu hizlandir</h3>
                                <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                                    Her tenant kendi Meta uygulama bilgileriyle baglanir. Sistem OAuth sonrasi hesaplari kesfeder, uygun Page ve WABA secimini otomatik yapar.
                                </p>
                            </div>

                            <Button variant="outline" className="gap-2" onClick={refreshStatus} disabled={isRefreshing || isConnecting || isDiscovering || isSavingDraft || isVerifyingLive}>
                                {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                Durumu Yenile
                            </Button>
                        </div>

                        {lastError ? (
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{lastError}</span>
                                </div>
                            </div>
                        ) : null}

                        {actionResults ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                                <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Son islem sonucu</div>
                                <div className="space-y-2">
                                    {CHANNEL_ORDER.filter((channel) => actionResults[channel]).map((channel) => {
                                        const result = actionResults[channel]
                                        if (!result) return null
                                        return (
                                            <div
                                                key={channel}
                                                className={cn(
                                                    "rounded-xl border px-3 py-2 text-sm",
                                                    result.ok
                                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200"
                                                        : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200"
                                                )}
                                            >
                                                <span className="font-medium">{CHANNEL_LABELS[channel]}:</span> {result.message}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ) : null}

                        <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 dark:border-slate-800 dark:bg-slate-900/50">
                            <div className="mb-5">
                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">1. Kurulacak kanallari secin</div>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Sistem secili kanallar icin ilk uygun Page/WABA varliklarini otomatik secmeye calisir.
                                </p>
                            </div>

                            <div className="grid gap-3 md:grid-cols-3">
                                {CHANNEL_ORDER.map((channel) => {
                                    const selected = selectedChannels.includes(channel)
                                    const channelStatus = getChannelStatus(localStatus, channel)
                                    return (
                                        <label
                                            key={channel}
                                            className={cn(
                                                "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors",
                                                selected
                                                    ? "border-slate-900 bg-white dark:border-slate-100 dark:bg-slate-950"
                                                    : "border-slate-200 bg-white/70 hover:bg-white dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-950"
                                            )}
                                        >
                                            <Checkbox checked={selected} onCheckedChange={(checked) => toggleChannel(channel, checked === true)} className="mt-0.5" />
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-medium text-slate-900 dark:text-slate-100">{CHANNEL_LABELS[channel]}</span>
                                                    <Badge className={getStatusBadgeClass(channelStatus.setupStatus)}>{STATUS_LABELS[channelStatus.setupStatus]}</Badge>
                                                </div>
                                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                    {channel === "instagram"
                                                        ? "Bagli Instagram Business hesabi olan Page"
                                                        : channel === "messenger"
                                                          ? "Messenger acik Facebook Page"
                                                          : "Numarasi olan ilk WABA"}
                                                </div>
                                            </div>
                                        </label>
                                    )
                                })}
                            </div>

                            <div className="mt-6">
                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">2. Bu tenantin Meta uygulama bilgilerini girin</div>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Bu bilgiler tenant bazlidir. Her tenant kendi Meta App ID ve App Secret bilgisiyle baglanir.
                                </p>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="meta-app-id-primary">Meta App ID</Label>
                                        {hasStoredTenantAppCredentials ? (
                                            <Badge variant="outline" className="text-[10px]">
                                                Kayitli
                                            </Badge>
                                        ) : null}
                                    </div>
                                    <Input
                                        id="meta-app-id-primary"
                                        ref={appIdInputRef}
                                        value={appId}
                                        onChange={(event) => setAppId(event.target.value)}
                                        placeholder={hasStoredTenantAppCredentials ? "Kayitli App ID" : "123456789012345"}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="meta-app-secret-primary">Meta App Secret</Label>
                                        {hasStoredTenantAppCredentials ? (
                                            <Badge variant="outline" className="text-[10px]">
                                                Kayitli
                                            </Badge>
                                        ) : null}
                                    </div>
                                    <Input
                                        id="meta-app-secret-primary"
                                        type="password"
                                        value={appSecret}
                                        onChange={(event) => setAppSecret(event.target.value)}
                                        placeholder={hasStoredTenantAppCredentials ? "Kayitli App Secret korunuyor" : "App Secret"}
                                    />
                                </div>
                            </div>

                            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-200">
                                <div className="font-medium">Bu tenant app&apos;inde gerekli Meta izinleri hazir olmali.</div>
                                <div className="mt-1">
                                    {selectedChannels.includes("instagram")
                                        ? "Instagram icin app dashboard tarafinda Instagram Business izinleri aktif olmali: instagram_business_basic ve instagram_business_manage_messages."
                                        : "Messenger ve WhatsApp secimi icin app dashboard izinleri yeterli olmali."}
                                </div>
                                <div className="mt-1">
                                    {selectedChannels.includes("messenger")
                                        ? "Messenger icin Page izinleri gerekir: pages_show_list, pages_manage_metadata ve pages_messaging."
                                        : "Messenger secili degilse bu izinler istenmez."}
                                </div>
                                {selectedChannels.includes("whatsapp") ? (
                                    <div className="mt-1">WhatsApp icin whatsapp_business_management ve whatsapp_business_messaging izinleri gerekir.</div>
                                ) : null}
                            </div>

                            <details className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        <BookOpen className="h-4 w-4 text-slate-500" />
                                        Meta izin kurulum kilavuzu
                                    </div>
                                    <ChevronDown className="h-4 w-4 text-slate-500" />
                                </summary>

                                <div className="mt-4 space-y-4 text-sm text-slate-600 dark:text-slate-300">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                                        <div className="font-medium text-slate-900 dark:text-slate-100">1. Meta app temel ayarlarini tamamlayin</div>
                                        <div className="mt-1">`developers.facebook.com` icinde bu tenant icin kullandiginiz app&apos;i acin. App type olarak business kullanimina uygun bir app secin, `App ID` ve `App Secret` bilgisini buradan alin.</div>
                                        <div className="mt-2">
                                            <a
                                                href="https://developers.facebook.com/docs/development/create-an-app"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-sky-700 underline underline-offset-4 dark:text-sky-300"
                                            >
                                                Meta app olusturma dokumani
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                                        <div className="font-medium text-slate-900 dark:text-slate-100">2. Facebook Login redirect URI ekleyin</div>
                                        <div className="mt-1">
                                            Meta App Dashboard <code>Facebook Login &gt; Settings</code> altinda <code>Valid OAuth Redirect URIs</code> alanina su adresi eklenmeli:
                                        </div>
                                        <div className="mt-2 rounded-lg bg-slate-900 px-3 py-2 font-mono text-xs text-slate-50">
                                            {typeof window !== "undefined"
                                                ? `${window.location.origin}/api/integrations/meta/callback`
                                                : "https://your-domain.com/api/integrations/meta/callback"}
                                        </div>
                                        <div className="mt-1">Local ve production ayri domain ise ikisini de ayni listeye ekleyin.</div>
                                        <div className="mt-2">
                                            <a
                                                href="https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-sky-700 underline underline-offset-4 dark:text-sky-300"
                                            >
                                                Facebook Login OAuth kilavuzu
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                                        <div className="font-medium text-slate-900 dark:text-slate-100">3. Secili kanallar icin izinleri acin</div>
                                        <div className="mt-1">
                                            <code>App Review &gt; Permissions and Features</code> ekraninda en az su izinler hazir olmali:
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {requiredPermissions.map((permission) => (
                                                <Badge key={permission} variant="outline" className="font-mono text-[11px]">
                                                    {permission}
                                                </Badge>
                                            ))}
                                        </div>
                                        <div className="mt-2">App development mode&apos;daysa OAuth ile giris yapacak kullaniciyi `Roles` altindan admin, developer veya tester olarak ekleyin.</div>
                                        <div className="mt-2">
                                            <a
                                                href="https://developers.facebook.com/docs/facebook-login/permissions"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-sky-700 underline underline-offset-4 dark:text-sky-300"
                                            >
                                                Facebook Login permission referansi
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                                        <div className="font-medium text-slate-900 dark:text-slate-100">4. Kanal baglantilarini Meta tarafinda hazir tutun</div>
                                        <div className="mt-1">Instagram icin Professional Instagram hesabinin bir Facebook Page&apos;e bagli olmasi gerekir. Messenger icin ayni Page&apos;de mesajlasma acik olmali. WhatsApp icin app icinde `WhatsApp` product eklenmis ve bu tenant&apos;a ait WABA/telefon numarasi hazir olmalidir.</div>
                                        <div className="mt-2 flex flex-wrap gap-3">
                                            <a
                                                href="https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-sky-700 underline underline-offset-4 dark:text-sky-300"
                                            >
                                                Instagram API with Facebook Login
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                            <a
                                                href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-sky-700 underline underline-offset-4 dark:text-sky-300"
                                            >
                                                WhatsApp Cloud API get started
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
                                        Bu ekranda `Invalid Scopes` hatasi alirsaniz sorun genelde kodda degil, tenant&apos;in Meta app dashboard&apos;unda secili izinlerin henuz aktif olmamasidir.
                                    </div>
                                </div>
                            </details>

                            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                <Button className="gap-2" onClick={handleConnect} disabled={!canConnect}>
                                    {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Facebook className="h-4 w-4" />}
                                    Meta ile Baglan
                                </Button>
                                <Button variant="outline" className="gap-2" onClick={() => setShowAdvanced((current) => !current)}>
                                    <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvanced ? "rotate-180" : "")} />
                                    Advanced
                                </Button>
                            </div>

                            {needsTenantAppCredentials ? (
                                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
                                    Devam etmek icin bu tenanta ait Meta App ID ve Meta App Secret bilgisini girin. WhatsApp numarasi, Facebook Page ve Instagram hesabi OAuth sonrasinda otomatik kesfedilecektir.
                                </div>
                            ) : null}
                        </div>

                        <div className="grid gap-4 lg:grid-cols-3">
                            {summaryCards
                                .filter(({ channel }) => selectedChannels.includes(channel))
                                .map(({ channel, status }) => (
                                    <div key={channel} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                {channel === "instagram" ? (
                                                    <Instagram className="h-4 w-4 text-pink-500" />
                                                ) : channel === "messenger" ? (
                                                    <Facebook className="h-4 w-4 text-blue-500" />
                                                ) : (
                                                    <Smartphone className="h-4 w-4 text-emerald-500" />
                                                )}
                                                <span className="font-medium text-slate-900 dark:text-slate-100">{CHANNEL_LABELS[channel]}</span>
                                            </div>
                                            <Badge className={getStatusBadgeClass(status.setupStatus)}>{STATUS_LABELS[status.setupStatus]}</Badge>
                                        </div>
                                        <div className="mt-3 space-y-1 text-sm text-slate-500 dark:text-slate-400">
                                            {channel === "whatsapp" ? (
                                                <>
                                                    <div>WABA: {status.businessAccountId || "-"}</div>
                                                    <div>Numara: {status.displayNumber || status.phoneNumberId || "-"}</div>
                                                </>
                                            ) : (
                                                <>
                                                    <div>Page: {status.pageId || "-"}</div>
                                                    <div>{channel === "instagram" ? "IG Account" : "Webhook"}: {channel === "instagram" ? status.accountId || "-" : status.webhookStatus}</div>
                                                </>
                                            )}
                                            <div>{status.connected ? "Kurulum tamamlandi" : status.lastSetupError || "Sistem secimini bekliyor"}</div>
                                        </div>
                                    </div>
                                ))}
                        </div>

                        {showAdvanced ? (
                            <div className="rounded-3xl border border-slate-200 p-6 dark:border-slate-800">
                                <div className="mb-5">
                                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Advanced fallback</div>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        OAuth otomatik kurulumunun tamamlayamadigi durumda token ile kesif yapabilir, sayfa ve numara secimini elle degistirebilirsiniz.
                                    </p>
                                </div>

                                <div className="mt-4 space-y-2">
                                    <Label htmlFor="meta-access-token">Meta Access Token</Label>
                                    <Input id="meta-access-token" type="password" value={accessToken} onChange={(event) => setAccessToken(event.target.value)} placeholder="EAAB..." />
                                </div>

                                <div className="mt-5">
                                    <Button className="gap-2" onClick={handleDiscover} disabled={!canDiscover}>
                                        {isDiscovering ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                                        Varliklari Kesfet
                                    </Button>
                                </div>

                                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                                    <div className="space-y-4">
                                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Page secimi</div>
                                        {pages.length > 0 ? (
                                            <div className="grid gap-3">
                                                {pages.map((page) => (
                                                    <button
                                                        key={page.id}
                                                        type="button"
                                                        onClick={() => {
                                                            if (page.instagramAccount) setInstagramPageId(page.id)
                                                            if (page.messagingEligible !== false) setMessengerPageId(page.id)
                                                        }}
                                                        className="rounded-2xl border border-slate-200 p-4 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/70"
                                                    >
                                                        <div className="font-medium text-slate-900 dark:text-slate-100">{page.name}</div>
                                                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                                            {page.instagramAccount?.username ? `@${page.instagramAccount.username}` : "Instagram bagli degil"} • {page.messagingEligible !== false ? "Messenger uygun" : "Messenger uygun degil"}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                                Henuz Meta Page kesfi yok.
                                            </div>
                                        )}

                                        <div className="grid gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="instagram-page-id">Instagram Page ID</Label>
                                                <Input id="instagram-page-id" value={instagramPageId} onChange={(event) => setInstagramPageId(event.target.value)} placeholder="page-id" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="messenger-page-id">Messenger Page ID</Label>
                                                <Input id="messenger-page-id" value={messengerPageId} onChange={(event) => setMessengerPageId(event.target.value)} placeholder="page-id" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">WhatsApp secimi</div>
                                        <div className="grid gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="whatsapp-business-id">Business Account ID</Label>
                                                <Input id="whatsapp-business-id" value={whatsappBusinessAccountId} onChange={(event) => setWhatsappBusinessAccountId(event.target.value)} placeholder="waba-id" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="whatsapp-phone-id">Phone Number ID</Label>
                                                <Input id="whatsapp-phone-id" value={whatsappPhoneNumberId} onChange={(event) => setWhatsappPhoneNumberId(event.target.value)} placeholder="phone-id" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="whatsapp-display-number">Display Number</Label>
                                                <Input id="whatsapp-display-number" value={whatsappDisplayNumber} onChange={(event) => setWhatsappDisplayNumber(event.target.value)} placeholder="+90 555 123 45 67" />
                                            </div>
                                        </div>

                                        {selectedWhatsAppPhone ? (
                                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
                                                Secili numara: {selectedWhatsAppPhone.displayNumber || whatsappDisplayNumber || "-"}
                                                {selectedWhatsAppPhone.verifiedName ? ` • ${selectedWhatsAppPhone.verifiedName}` : ""}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                    <Button className="gap-2" onClick={handleSaveDraft} disabled={!canSaveDraft}>
                                        {isSavingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                        Secimi Kaydet ve Test Et
                                    </Button>
                                    <Button variant="outline" className="gap-2" onClick={handleVerifyLive} disabled={!canVerifyLive}>
                                        {isVerifyingLive ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                                        Canli Kontrolu Calistir
                                    </Button>
                                </div>
                            </div>
                        ) : null}

                        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                            <div className="font-medium text-slate-900 dark:text-slate-100">Hazirlik ozeti</div>
                            <div className="mt-2 space-y-1">
                                <div>Secili kanal sayisi: {selectedChannels.length}</div>
                                <div>Kesfedilen Page sayisi: {pages.length}</div>
                                <div>Kesfedilen WABA sayisi: {whatsappBusinesses.length}</div>
                                <div>Kurulan kanal: {fullyConnectedCount}/{selectedChannels.length}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function getChannelStatus(status: MetaSetupStatusPayload | null, channel: MetaChannelKey): MetaChannelStatusPayload {
    const base: MetaChannelStatusPayload = {
        enabled: false,
        connected: false,
        setupStatus: "not_started",
        setupStage: "prerequisites",
        connectionMode: "tenant_meta_app",
        webhookStatus: "disconnected",
        webhookUrl: "",
        verifyToken: null,
        lastHealthCheckAt: null,
        lastSetupError: null,
        readyForLive: false,
        pageId: null,
        accountId: null,
        appId: null,
        businessAccountId: null,
        phoneNumberId: null,
        displayNumber: null,
    }

    if (!status) return base
    return channel === "instagram"
        ? status.channels.instagram || base
        : channel === "messenger"
          ? status.channels.messenger || base
          : status.channels.whatsapp || base
}

function getStatusBadgeClass(status: MetaSetupState) {
    if (status === "live") return "border-transparent bg-emerald-600 text-white hover:bg-emerald-600"
    if (status === "ready_for_live") return "border-transparent bg-amber-500 text-white hover:bg-amber-500"
    if (status === "error") return "border-transparent bg-rose-600 text-white hover:bg-rose-600"
    if (status === "draft") return "border-transparent bg-slate-800 text-white hover:bg-slate-800"
    return "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
}

function extractActionResults(value: unknown): Partial<Record<MetaChannelKey, MetaActionResult>> {
    if (!value || typeof value !== "object") return {}
    const results: Partial<Record<MetaChannelKey, MetaActionResult>> = {}
    for (const channel of CHANNEL_ORDER) {
        const candidate = (value as Record<string, unknown>)[channel]
        if (!candidate || typeof candidate !== "object") continue
        results[channel] = {
            ok: (candidate as { ok?: unknown }).ok === true,
            message: typeof (candidate as { message?: unknown }).message === "string" ? (candidate as { message: string }).message : "",
            status: typeof (candidate as { status?: unknown }).status === "number" ? (candidate as { status: number }).status : 0,
        }
    }
    return results
}
