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
    ArrowRight
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
    platformAppAvailable?: boolean
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
    prerequisites: "Hazırlık",
    token: "Token",
    discovery: "Keşif",
    draft: "Taslak",
    go_live: "Kontrol",
    live: "Canlı",
}

const STATUS_LABELS: Record<MetaSetupState, string> = {
    not_started: "Başlamadı",
    draft: "Eksik Seçim",
    ready_for_live: "Hazır",
    live: "Kuruldu",
    error: "Meta izni eksik",
}

export function MetaChannelsSetupCard({ chatbotId, status = null, onStatusChange }: MetaChannelsSetupCardProps) {
    // Deprecated: console integration page now renders dedicated Instagram DM and WhatsApp Business wizards.
    // Keep this component for backward compatibility with the legacy combined Meta flow.
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
        if (!user) throw new Error("Oturum bulunamadı.")
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
            if (!response.ok || !payload) throw new Error(payload?.error || "Meta durum bilgisi alınamadı.")
            publishStatus(payload as MetaSetupStatusPayload)
        } catch (error) {
            setLastError(error instanceof Error ? error.message : "Meta durum bilgisi alınamadı.")
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
    const platformAppAvailable = Boolean(localStatus?.platformAppAvailable)
    const isPlatformMode = platformAppAvailable && localStatus?.wizard.connectionMode !== "tenant_meta_app"
    const hasStoredTenantAppCredentials =
        Boolean(localStatus?.wizard.appId) && Boolean(localStatus?.wizard.hasStoredAppSecret) && localStatus?.wizard.connectionMode !== "platform_meta_app"
    const hasEnteredTenantAppCredentials = Boolean(appId.trim() && appSecret.trim())
    const canConnect =
        selectedChannels.length > 0 &&
        !isConnecting &&
        !isRefreshing &&
        (isPlatformMode || hasEnteredTenantAppCredentials || hasStoredTenantAppCredentials)
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
        !isPlatformMode &&
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
            if (!isPlatformMode && !hasEnteredTenantAppCredentials && !hasStoredTenantAppCredentials) {
                setLastError("Bu tenant için Meta App ID ve Meta App Secret gerekli.")
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
            if (!response.ok || !payload?.authUrl) throw new Error(payload?.error || "Meta OAuth başlatılamadı.")
            window.location.href = payload.authUrl
        } catch (error) {
            const message = error instanceof Error ? error.message : "Meta OAuth başlatılamadı."
            setLastError(message)
            if (message.includes("Meta platform app ayarlı değil")) {
                setShowAdvanced(true)
            }
            toast({
                title: "Meta bağlantısı başlatılamadı",
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
            if (!response.ok || !payload) throw new Error(payload?.error || "Meta varlıkları keşfedilemedi.")
            publishStatus(payload as MetaSetupStatusPayload)
            setAccessToken("")
            toast({
                title: "Keşif tamamlandı",
                description: "Advanced fallback için Meta varlıkları güncellendi.",
            })
        } catch (error) {
            const message = error instanceof Error ? error.message : "Meta varlıkları keşfedilemedi."
            setLastError(message)
            toast({
                title: "Keşif başarısız",
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
            if (!response.ok || !payload?.status) throw new Error(payload?.error || "Meta taslağı kaydedilemedi.")
            publishStatus(payload.status as MetaSetupStatusPayload)
            setActionResults(extractActionResults(payload.results))
        } catch (error) {
            const message = error instanceof Error ? error.message : "Meta taslağı kaydedilemedi."
            setLastError(message)
            toast({
                title: "Kayıt başarısız",
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
                body: JSON.stringify({ chatbotId, selectedChannels }),
            })
            const payload = await response.json().catch(() => null)
            if (!response.ok || !payload?.status) throw new Error(payload?.error || "Meta kontrolü tamamlanamadı.")
            publishStatus(payload.status as MetaSetupStatusPayload)
            setActionResults(extractActionResults(payload.results))
            toast({
                title: "Kontrol tamamlandı",
                description: "Meta bağlantıları güncellendi.",
            })
        } catch (error) {
            const message = error instanceof Error ? error.message : "Meta kontrolü tamamlanamadı."
            setLastError(message)
            toast({
                title: "Kontrol başarısız",
                description: message,
                variant: "destructive",
            })
        } finally {
            setIsVerifyingLive(false)
        }
    }

    return (
        <Card className="w-full">
            <div className="grid lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border">
                {/* Left Panel - Minimal Summary */}
                <div className="col-span-12 lg:col-span-4 bg-muted/30 p-6 flex flex-col gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex items-center -space-x-2">
                                <div className="h-8 w-8 rounded-full border-2 border-background bg-blue-100 flex items-center justify-center z-30">
                                    <Facebook className="h-4 w-4 text-blue-600" />
                                </div>
                                <div className="h-8 w-8 rounded-full border-2 border-background bg-fuchsia-100 flex items-center justify-center z-20">
                                    <Instagram className="h-4 w-4 text-fuchsia-600" />
                                </div>
                                <div className="h-8 w-8 rounded-full border-2 border-background bg-emerald-100 flex items-center justify-center z-10">
                                    <Smartphone className="h-4 w-4 text-emerald-600" />
                                </div>
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold tracking-tight">Meta Kanalları</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Instagram, Facebook ve WhatsApp Business kanallarınızı tek bir yerden bağlayın ve yönetin.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="text-sm font-medium">Bağlantı Durumu</div>
                        <div className="grid gap-2">
                            {summaryCards.map(({ channel, status }) => (
                                <div 
                                    key={channel} 
                                    className="flex items-center justify-between rounded-lg border bg-background px-3 py-2.5"
                                >
                                    <div className="flex items-center gap-2.5">
                                        {channel === "instagram" ? (
                                            <Instagram className="h-4 w-4 text-fuchsia-500" />
                                        ) : channel === "messenger" ? (
                                            <Facebook className="h-4 w-4 text-blue-500" />
                                        ) : (
                                            <Smartphone className="h-4 w-4 text-emerald-500" />
                                        )}
                                        <span className="text-sm font-medium">{CHANNEL_LABELS[channel]}</span>
                                    </div>
                                    {status.connected ? (
                                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-[10px]">
                                            BAĞLI
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="text-[10px] text-muted-foreground border-0">
                                            BEKLİYOR
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Panel - Setup Flow */}
                <div className="col-span-12 lg:col-span-8 p-6 lg:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <h2 className="text-xl font-semibold tracking-tight">Kurulum Adımları</h2>
                            <p className="text-sm text-muted-foreground">İstediğiniz kanalları seçip Meta hesabınızla giriş yapın.</p>
                        </div>
                        <Button variant="outline" size="sm" className="gap-2" onClick={refreshStatus} disabled={isRefreshing || isConnecting || isDiscovering || isSavingDraft || isVerifyingLive}>
                            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            Durumu Yenile
                        </Button>
                    </div>

                    {/* Error Display */}
                    {lastError && (
                        <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive flex items-start gap-3">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <p>{lastError}</p>
                        </div>
                    )}

                    {/* Persistent Discovery & Channel Errors */}
                    {(() => {
                        const discoveryErrors = (localStatus?.wizard.discovery.errors || {}) as Record<string, string | undefined>;
                        const hasDiscoveryErrors = Object.values(discoveryErrors).some(Boolean);
                        const channelErrors = CHANNEL_ORDER.map(channel => ({
                            channel,
                            error: getChannelStatus(localStatus, channel).lastSetupError
                        })).filter(item => item.error);

                        if (!hasDiscoveryErrors && channelErrors.length === 0 && !actionResults) return null;

                        return (
                            <div className="mb-8 rounded-lg border border-border bg-muted/50 p-4">
                                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                    Detaylı Durum Bilgisi
                                </div>
                                <div className="space-y-2">
                                    {actionResults && CHANNEL_ORDER.filter((channel) => actionResults[channel]).map((channel) => {
                                        const result = actionResults[channel];
                                        if (!result) return null;
                                        return (
                                            <div key={`action-${channel}`} className={cn("rounded-md border px-3 py-2 text-sm", result.ok ? "bg-emerald-50 text-emerald-900 border-emerald-200" : "bg-destructive/10 text-destructive border-destructive/20")}>
                                                <span className="font-semibold">{CHANNEL_LABELS[channel]}:</span> {result.message}
                                            </div>
                                        );
                                    })}
                                    {CHANNEL_ORDER.map(channel => {
                                        const discError = discoveryErrors[channel];
                                        const chanError = getChannelStatus(localStatus, channel).lastSetupError;
                                        const displayError = discError || chanError;
                                        if (!displayError || (actionResults && actionResults[channel])) return null;
                                        return (
                                            <div key={`persistent-${channel}`} className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                                <span className="font-semibold">{CHANNEL_LABELS[channel]}:</span> {displayError}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

                    {/* STEP 1: Channel selection */}
                    <div className="mb-8 space-y-4">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="flex h-6 w-6 items-center justify-center rounded-full p-0">1</Badge>
                            <h4 className="text-sm font-medium">Kanalları Seçin</h4>
                        </div>
                        
                        <div className="grid gap-3 sm:grid-cols-3 pl-8">
                            {CHANNEL_ORDER.map((channel) => {
                                const selected = selectedChannels.includes(channel)
                                const channelStatus = getChannelStatus(localStatus, channel)
                                return (
                                    <label
                                        key={channel}
                                        className={cn(
                                            "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                                            selected
                                                ? "border-primary bg-primary/5"
                                                : "bg-background hover:bg-muted/50"
                                        )}
                                    >
                                        <Checkbox 
                                            checked={selected} 
                                            onCheckedChange={(checked) => toggleChannel(channel, checked === true)} 
                                            className="mt-0.5" 
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    {channel === "instagram" ? (
                                                        <Instagram className="h-4 w-4 text-muted-foreground" />
                                                    ) : channel === "messenger" ? (
                                                        <Facebook className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                    <span className="text-sm font-medium leading-none">{CHANNEL_LABELS[channel]}</span>
                                                </div>
                                                {channelStatus.connected && (
                                                    <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                                                        <CheckCircle2 className="h-3 w-3" /> Aktif
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </label>
                                )
                            })}
                        </div>
                    </div>

                    {/* STEP 2: Connect */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="flex h-6 w-6 items-center justify-center rounded-full p-0">2</Badge>
                            <h4 className="text-sm font-medium">Bağlantıyı Tamamlayın</h4>
                        </div>

                        <div className="pl-8">
                            <Card className="border-border shadow-none">
                                <CardContent className="p-4 sm:p-6 space-y-4">
                                    {isPlatformMode ? (
                                        <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                                            Otomatik kurulum aktif. Meta ile giriş yapmanız yeterlidir.
                                        </div>
                                    ) : (
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="meta-app-id-primary" className="text-xs">Meta App ID</Label>
                                                    {hasStoredTenantAppCredentials && <Badge variant="secondary" className="text-[9px]">Kayıtlı</Badge>}
                                                </div>
                                                <Input
                                                    id="meta-app-id-primary"
                                                    ref={appIdInputRef}
                                                    value={appId}
                                                    onChange={(event) => setAppId(event.target.value)}
                                                    placeholder="123456789012345"
                                                    className="h-9"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="meta-app-secret-primary" className="text-xs">Meta App Secret</Label>
                                                    {hasStoredTenantAppCredentials && <Badge variant="secondary" className="text-[9px]">Kayıtlı</Badge>}
                                                </div>
                                                <Input
                                                    id="meta-app-secret-primary"
                                                    type="password"
                                                    value={appSecret}
                                                    onChange={(event) => setAppSecret(event.target.value)}
                                                    placeholder="App Secret"
                                                    className="h-9"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <Button 
                                        className="w-full sm:w-auto" 
                                        onClick={handleConnect} 
                                        disabled={!canConnect}
                                    >
                                        {isConnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Facebook className="h-4 w-4 mr-2" />}
                                        Meta ile Bağlan
                                    </Button>

                                    {needsTenantAppCredentials && (
                                        <p className="text-xs text-muted-foreground">
                                            Devam etmek için Meta App ID ve App Secret bilgisini girin.
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Connected channel details */}
                    {fullyConnectedCount > 0 && (
                        <div className="mt-8 pt-8 border-t">
                            <h4 className="text-sm font-medium mb-4">Aktif Bağlantılar</h4>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {summaryCards
                                    .filter(({ channel }) => selectedChannels.includes(channel))
                                    .map(({ channel, status }) => (
                                        <Card key={channel} className="shadow-none border-border">
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2 text-sm font-medium">
                                                        {channel === "instagram" ? (
                                                            <Instagram className="h-4 w-4 text-muted-foreground" />
                                                        ) : channel === "messenger" ? (
                                                            <Facebook className="h-4 w-4 text-muted-foreground" />
                                                        ) : (
                                                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                        {CHANNEL_LABELS[channel]}
                                                    </div>
                                                    <Badge variant="outline" className={cn("text-[10px]", getStatusBadgeClass(status.setupStatus))}>
                                                        {STATUS_LABELS[status.setupStatus]}
                                                    </Badge>
                                                </div>
                                                <div className="space-y-1.5 text-xs text-muted-foreground">
                                                    {channel === "whatsapp" ? (
                                                        <div className="flex justify-between">
                                                            <span>No:</span>
                                                            <span className="font-medium text-foreground">{status.displayNumber || status.phoneNumberId || "-"}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-between">
                                                            <span>ID:</span>
                                                            <span className="font-medium text-foreground">{channel === "instagram" ? status.accountId || "-" : status.pageId || "-"}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Advanced Settings */}
                    <div className="mt-8 pt-8 border-t">
                        <details className="group [&_summary::-webkit-details-marker]:hidden">
                            <summary className="flex cursor-pointer items-center justify-between py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4" />
                                    Gelişmiş Ayarlar ve Manuel Kurulum
                                </div>
                                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                            </summary>

                            <div className="mt-4 space-y-6 rounded-lg border bg-muted/30 p-4 sm:p-6">
                                {/* Manual token discovery */}
                                <div>
                                    <h5 className="text-sm font-medium mb-1">Manuel Token ile Keşif</h5>
                                    <p className="text-xs text-muted-foreground mb-4">
                                        OAuth otomatik kurulumunun tamamlayamadığı durumda token ile keşif yapabilir, sayfa ve numara seçimini elle değiştirebilirsiniz.
                                    </p>
                                    
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <div className="flex-1 space-y-1.5">
                                            <Label htmlFor="meta-access-token" className="text-xs">Meta Access Token</Label>
                                            <Input id="meta-access-token" type="password" value={accessToken} onChange={(event) => setAccessToken(event.target.value)} placeholder="EAAB..." className="h-9 bg-background" />
                                        </div>
                                        <Button size="sm" className="sm:self-end h-9" onClick={handleDiscover} disabled={!canDiscover}>
                                            {isDiscovering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                                            Keşfet
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-4">
                                        <div className="text-sm font-medium">Page Seçimi</div>
                                        {pages.length > 0 ? (
                                            <div className="grid gap-2 max-h-[250px] overflow-y-auto pr-1">
                                                {pages.map((page) => (
                                                    <div
                                                        key={page.id}
                                                        onClick={() => {
                                                            if (page.instagramAccount) setInstagramPageId(page.id)
                                                            if (page.messagingEligible !== false) setMessengerPageId(page.id)
                                                        }}
                                                        className="cursor-pointer rounded-md border bg-background p-3 text-left text-sm transition-colors hover:bg-muted"
                                                    >
                                                        <div className="font-medium">{page.name}</div>
                                                        <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                                                            <Badge variant="secondary" className="px-1.5 py-0">IG: {page.instagramAccount?.username || "Yok"}</Badge>
                                                            <Badge variant="secondary" className="px-1.5 py-0">MS: {page.messagingEligible !== false ? "Uygun" : "Uygun Değil"}</Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                                                Page bulunamadı.
                                            </div>
                                        )}

                                        <div className="grid gap-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="instagram-page-id" className="text-xs">Instagram Page ID</Label>
                                                <Input id="instagram-page-id" value={instagramPageId} onChange={(event) => setInstagramPageId(event.target.value)} className="h-8 text-xs bg-background" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="messenger-page-id" className="text-xs">Messenger Page ID</Label>
                                                <Input id="messenger-page-id" value={messengerPageId} onChange={(event) => setMessengerPageId(event.target.value)} className="h-8 text-xs bg-background" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="text-sm font-medium">WhatsApp Seçimi</div>
                                        <div className="grid gap-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="whatsapp-business-id" className="text-xs">Business Account ID</Label>
                                                <Input id="whatsapp-business-id" value={whatsappBusinessAccountId} onChange={(event) => setWhatsappBusinessAccountId(event.target.value)} className="h-8 text-xs bg-background" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="whatsapp-phone-id" className="text-xs">Phone Number ID</Label>
                                                <Input id="whatsapp-phone-id" value={whatsappPhoneNumberId} onChange={(event) => setWhatsappPhoneNumberId(event.target.value)} className="h-8 text-xs bg-background" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="whatsapp-display-number" className="text-xs">Display Number</Label>
                                                <Input id="whatsapp-display-number" value={whatsappDisplayNumber} onChange={(event) => setWhatsappDisplayNumber(event.target.value)} className="h-8 text-xs bg-background" />
                                            </div>
                                        </div>

                                        {selectedWhatsAppPhone && (
                                            <div className="rounded-md border bg-background p-2.5 text-xs text-muted-foreground">
                                                Seçili: <span className="font-medium text-foreground">{selectedWhatsAppPhone.displayNumber || whatsappDisplayNumber}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                    <Button size="sm" onClick={handleSaveDraft} disabled={!canSaveDraft}>
                                        {isSavingDraft ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                        Kaydet & Test Et
                                    </Button>
                                    <Button size="sm" variant="outline" className="bg-background" onClick={handleVerifyLive} disabled={!canVerifyLive}>
                                        {isVerifyingLive ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Rocket className="h-4 w-4 mr-2" />}
                                        Canlı Kontrol
                                    </Button>
                                </div>

                                {/* Tenant App Guide */}
                                {!isPlatformMode && (
                                    <div className="mt-6 border-t pt-4">
                                        <h5 className="text-xs font-medium mb-3 flex items-center gap-2"><BookOpen className="h-3 w-3" /> Kurulum Kılavuzu</h5>
                                        <div className="space-y-3 text-xs text-muted-foreground">
                                            <div>
                                                <strong className="text-foreground">1.</strong> developers.facebook.com&apos;da uygulamanızı oluşturun.{" "}
                                                <a href="https://developers.facebook.com/docs/development/create-an-app" target="_blank" rel="noreferrer" className="text-primary hover:underline">Doküman</a>
                                            </div>
                                            <div>
                                                <strong className="text-foreground">2.</strong> Redirect URI olarak şunu ekleyin:<br/>
                                                <code className="mt-1 block rounded bg-background p-1.5 border">
                                                    {typeof window !== "undefined" ? `${window.location.origin}/api/integrations/meta/callback` : "..."}
                                                </code>
                                            </div>
                                            <div>
                                                <strong className="text-foreground">3.</strong> Gerekli izinler:<br/>
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    {requiredPermissions.map(p => <Badge key={p} variant="secondary" className="px-1 py-0 font-mono text-[9px]">{p}</Badge>)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </details>
                    </div>
                </div>
            </div>
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
    if (status === "live") return "border-emerald-200 bg-emerald-100 text-emerald-700"
    if (status === "ready_for_live") return "border-amber-200 bg-amber-100 text-amber-700"
    if (status === "error") return "border-destructive/20 bg-destructive/10 text-destructive"
    if (status === "draft") return "border-muted-foreground/20 bg-muted text-muted-foreground"
    return "border-border bg-muted text-muted-foreground"
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
