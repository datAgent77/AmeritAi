"use client"

import { useEffect, useMemo, useState } from "react"
import { Instagram, Loader2, RefreshCw } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ChannelStatusBadge } from "@/components/integrations/shared/ChannelStatusBadge"
import { SupportDiagnosticDrawer } from "@/components/integrations/shared/SupportDiagnosticDrawer"
import { InstagramDMConnectedState } from "@/components/integrations/instagram-dm/InstagramDMConnectedState"
import { InstagramDMPageSelectStep } from "@/components/integrations/instagram-dm/InstagramDMPageSelectStep"
import { InstagramDMPreflightStep } from "@/components/integrations/instagram-dm/InstagramDMPreflightStep"
import { InstagramDMRecoveryBanner } from "@/components/integrations/instagram-dm/InstagramDMRecoveryBanner"
import { InstagramDMVerifyStep } from "@/components/integrations/instagram-dm/InstagramDMVerifyStep"
import type { InstagramDMStatusPayload } from "@/lib/integrations/instagram-dm/types"

export function InstagramDMWizard({ chatbotId }: { chatbotId: string }) {
    const { user, role } = useAuth()
    const { toast } = useToast()
    const [status, setStatus] = useState<InstagramDMStatusPayload | null>(null)
    const [loading, setLoading] = useState(true)
    const [connecting, setConnecting] = useState(false)
    const [checking, setChecking] = useState(false)
    const [saving, setSaving] = useState(false)
    const [sending, setSending] = useState(false)
    const [disconnecting, setDisconnecting] = useState(false)
    const [selectedPageId, setSelectedPageId] = useState("")
    const [recipientId, setRecipientId] = useState("")
    const [message, setMessage] = useState("Merhaba, bu Vion kurulum test mesajıdır.")
    const [customAppId, setCustomAppId] = useState("")
    const [customAppSecret, setCustomAppSecret] = useState("")

    const selectedPage = useMemo(
        () => status?.availablePages.find((page) => page.id === selectedPageId) || null,
        [selectedPageId, status?.availablePages]
    )
    const recoveryChecklist = useMemo(() => {
        const preflight = status?.config.preflightResult
        if (!preflight) return []

        const items: string[] = []

        if (preflight.hasFacebookPage === false) {
            items.push("Instagram hesabınızın bağlı olduğu doğru Facebook Sayfasını oluşturun veya bu hesabın erişebildiği işletme altında görünür hale getirin.")
        }

        if (preflight.instagramLinkedToPage === false) {
            items.push("Instagram hesabını doğru Facebook Sayfasına bağlayın. Hesap başka bir işletmeye bağlıysa sayfa listesi boş kalır ve kurulum ilerlemez.")
        }

        if (preflight.instagramIsProfessional === false) {
            items.push("Instagram hesabını Profesyonel hesaba çevirin. Kişisel hesaplarla mesaj entegrasyonu tamamlanmaz.")
        }

        if (preflight.messageAccessEnabled === false) {
            items.push("Instagram uygulamasında mesaj erişimini açın. Mesaj izinleri kapalıysa bağlantı tamamlanmış görünse bile DM akışı aktif olmaz.")
        }

        if ((preflight.hasFacebookPage === false || preflight.instagramLinkedToPage === false) && preflight.tokenPresent === true) {
            items.push("Yanlış Facebook/Meta hesabıyla giriş yaptıysanız mevcut bağlantıyı sıfırlayıp doğru hesapla yeniden giriş yapın.")
        }

        if (items.length === 0 && preflight.failureReason) {
            items.push(preflight.failureReason)
        }

        return items
    }, [status])

    useEffect(() => {
        if (!status) return
        setSelectedPageId(status.config.pageId || status.availablePages[0]?.id || "")
    }, [status])

    useEffect(() => {
        const listener = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return
            if (event.data?.type !== "vion-instagram-dm-oauth") return

            setConnecting(false)

            if (event.data?.ok && event.data?.status) {
                setStatus(event.data.status as InstagramDMStatusPayload)
                toast({
                    title: "Instagram hesabı bağlandı",
                    description: "Ön kontrolleri tekrar çalıştırarak kuruluma devam edin.",
                })
                return
            }

            toast({
                title: "Instagram bağlantısı tamamlanamadı",
                description: event.data?.error || "Meta girişi tamamlanamadı.",
                variant: "destructive",
            })
        }

        window.addEventListener("message", listener)
        return () => window.removeEventListener("message", listener)
    }, [toast])

    useEffect(() => {
        // fetchStatus uses the current authenticated user/token and is re-created on render.
        void fetchStatus()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatbotId, user])

    const getAuthHeaders = async () => {
        if (!user) {
            throw new Error("Oturum bulunamadı.")
        }
        const token = await user.getIdToken()
        return {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        }
    }

    const fetchStatus = async () => {
        if (!user) return
        setLoading(true)
        try {
            const response = await fetch(`/api/integrations/instagram-dm/status?chatbotId=${chatbotId}`, {
                headers: await getAuthHeaders(),
                cache: "no-store",
            })
            const payload = await response.json()
            if (!response.ok) {
                throw new Error(payload?.error || "Instagram durumu alınamadı.")
            }
            setStatus(payload as InstagramDMStatusPayload)
        } catch (error) {
            toast({
                title: "Instagram durumu alınamadı",
                description: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu.",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const openPopup = (url: string) => {
        const width = 640
        const height = 760
        const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2)
        const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2)
        const popup = window.open(url, "instagram-dm-oauth", `width=${width},height=${height},left=${left},top=${top}`)
        if (!popup) {
            throw new Error("Açılır pencere engellendi. Lütfen tarayıcı iznini açın.")
        }
    }

    const handleConnect = async () => {
        setConnecting(true)
        try {
            const response = await fetch("/api/integrations/instagram-dm/connect", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    chatbotId,
                    returnPath: "/console/chatbot/integration",
                    appId: customAppId.trim() || undefined,
                    appSecret: customAppSecret.trim() || undefined,
                }),
            })
            const payload = await response.json()
            if (!response.ok || !payload?.authUrl) {
                throw new Error(payload?.error || "Instagram bağlantısı başlatılamadı.")
            }
            openPopup(payload.authUrl)
        } catch (error) {
            setConnecting(false)
            toast({
                title: "Instagram bağlantısı başlatılamadı",
                description: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu.",
                variant: "destructive",
            })
        }
    }

    const runPreflight = async () => {
        setChecking(true)
        try {
            const response = await fetch("/api/integrations/instagram-dm/preflight", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({ chatbotId }),
            })
            const payload = await response.json()
            if (!response.ok) {
                throw new Error(payload?.error || "Ön kontrol çalıştırılamadı.")
            }
            setStatus(payload as InstagramDMStatusPayload)
        } catch (error) {
            toast({
                title: "Ön kontrol çalıştırılamadı",
                description: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu.",
                variant: "destructive",
            })
        } finally {
            setChecking(false)
        }
    }

    const handleSaveSelection = async () => {
        if (!selectedPage) {
            return
        }

        setSaving(true)
        try {
            const response = await fetch("/api/integrations/instagram-dm/save-channel", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    chatbotId,
                    pageId: selectedPage.id,
                    pageName: selectedPage.name,
                    instagramAccountId: selectedPage.instagramAccountId,
                    instagramUsername: selectedPage.instagramUsername,
                }),
            })
            const payload = await response.json()
            if (!response.ok) {
                throw new Error(payload?.error || "Sayfa kaydedilemedi.")
            }

            const subscribeResponse = await fetch("/api/integrations/instagram-dm/subscribe", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({ chatbotId }),
            })
            const subscribePayload = await subscribeResponse.json()
            if (!subscribeResponse.ok) {
                throw new Error(subscribePayload?.error || "Bağlantı etkinleştirilemedi.")
            }

            setStatus(subscribePayload as InstagramDMStatusPayload)
            toast({
                title: "Instagram sayfası kaydedildi",
                description: "Bağlantı etkinleştirildi. İsterseniz şimdi test mesajı gönderebilirsiniz.",
            })
        } catch (error) {
            toast({
                title: "Instagram kurulumu tamamlanamadı",
                description: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu.",
                variant: "destructive",
            })
        } finally {
            setSaving(false)
        }
    }

    const handleSendTest = async () => {
        setSending(true)
        try {
            const response = await fetch("/api/integrations/instagram-dm/test-message", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    chatbotId,
                    recipientId,
                    text: message,
                }),
            })
            const rawPayload = await response.text()
            const payload = rawPayload
                ? (() => {
                      try {
                          return JSON.parse(rawPayload)
                      } catch {
                          return null
                      }
                  })()
                : null
            if (!response.ok) {
                throw new Error(payload?.error || rawPayload || "Test mesajı gönderilemedi.")
            }
            toast({
                title: "Test mesajı gönderildi",
                description: "Instagram tarafında mesajın ulaşıp ulaşmadığını kontrol edin.",
            })
            await fetchStatus()
        } catch (error) {
            toast({
                title: "Test mesajı gönderilemedi",
                description: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu.",
                variant: "destructive",
            })
        } finally {
            setSending(false)
        }
    }

    const handleDisconnect = async () => {
        setDisconnecting(true)
        try {
            const response = await fetch("/api/integrations/instagram-dm/disconnect", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({ chatbotId }),
            })
            const payload = await response.json()
            if (!response.ok) {
                throw new Error(payload?.error || "Bağlantı kaldırılamadı.")
            }
            setStatus(payload as InstagramDMStatusPayload)
        } catch (error) {
            toast({
                title: "Bağlantı kaldırılamadı",
                description: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu.",
                variant: "destructive",
            })
        } finally {
            setDisconnecting(false)
        }
    }

    if (loading || !status) {
        return (
            <Card className="border-border/70">
                <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Instagram DM durumu yükleniyor...
                </CardContent>
            </Card>
        )
    }

    const shouldShowRecoveryPanel =
        (status.config.state === "needs_user_action" || status.config.state === "failed") &&
        (recoveryChecklist.length > 0 || Boolean(status.config.accessTokenRef || status.config.pageId || status.config.instagramAccountId))
    const canResetConnection = Boolean(status.config.accessTokenRef || status.config.pageId || status.config.instagramAccountId)

    return (
        <Card className="overflow-hidden border-border/70 bg-white">
            <CardHeader className="border-b bg-gradient-to-r from-fuchsia-50 via-white to-pink-50">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-pink-500 to-orange-400 text-white shadow-sm">
                                <Instagram className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Instagram DM</CardTitle>
                                <CardDescription>Instagram mesajlarınızı ayrı bir kurulum akışıyla bağlayın.</CardDescription>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{status.stateMessage}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <ChannelStatusBadge state={status.config.state} />
                        {(role === "SUPER_ADMIN" || role === "AGENCY_ADMIN") && status.diagnostics ? (
                            <SupportDiagnosticDrawer title="Instagram DM Tanı Bilgisi" diagnostics={status.diagnostics} />
                        ) : null}
                        <Button type="button" variant="outline" size="icon" onClick={fetchStatus}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
                <InstagramDMRecoveryBanner status={status} />
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                    <div className="mb-4">
                        <p className="text-sm font-medium">Meta Uygulama Bilgileri (Zorunlu)</p>
                        <p className="text-xs text-muted-foreground">
                            Bu chatbot için Meta App ID ve Secret zorunludur. Kendi Meta uygulamanızın bilgilerini girin.
                        </p>
                    </div>
                    <div className="grid gap-3">
                        <div className="grid gap-1.5">
                            <label htmlFor="ig-custom-app-id" className="text-xs font-medium text-muted-foreground">
                                Meta App ID
                            </label>
                            <Input
                                id="ig-custom-app-id"
                                value={customAppId}
                                onChange={(event) => setCustomAppId(event.target.value)}
                                placeholder="Örn. 123456789012345"
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <label htmlFor="ig-custom-app-secret" className="text-xs font-medium text-muted-foreground">
                                Meta App Secret
                            </label>
                            <Input
                                id="ig-custom-app-secret"
                                type="password"
                                value={customAppSecret}
                                onChange={(event) => setCustomAppSecret(event.target.value)}
                                placeholder="Örn. xxxxxxxxxxxxxxxxxxxxxxxx"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Bu alanları kaydettiğinizde bir sonraki bağlantılarda aynı chatbot için tekrar kullanılır.
                        </p>
                    </div>
                </div>
                <InstagramDMPreflightStep status={status} connecting={connecting} checking={checking} onConnect={handleConnect} onPreflight={runPreflight} />

                {shouldShowRecoveryPanel ? (
                    <Card className="border-amber-200 bg-amber-50/60 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Kurulum burada beklemesin</CardTitle>
                            <CardDescription>
                                Eksik Meta varlıklarını tamamladıktan sonra aynı ekrandan devam edebilirsiniz. Yanlış hesap bağlandıysa bağlantıyı sıfırlayın.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {recoveryChecklist.length > 0 ? (
                                <div className="space-y-2">
                                    {recoveryChecklist.map((item, index) => (
                                        <div key={`${index}-${item}`} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-amber-950">
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Button type="button" onClick={handleConnect} disabled={connecting}>
                                    {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Meta ile yeniden giriş yap
                                </Button>
                                <Button type="button" variant="outline" onClick={runPreflight} disabled={checking}>
                                    {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                    Kontrolü tekrar çalıştır
                                </Button>
                                {canResetConnection ? (
                                    <Button type="button" variant="outline" onClick={handleDisconnect} disabled={disconnecting}>
                                        {disconnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Bağlantıyı sıfırla
                                    </Button>
                                ) : null}
                            </div>
                        </CardContent>
                    </Card>
                ) : null}

                {status.availablePages.length > 0 ? (
                    <InstagramDMPageSelectStep
                        pages={status.availablePages}
                        selectedPageId={selectedPageId}
                        onSelectPageId={setSelectedPageId}
                        onSave={handleSaveSelection}
                        saving={saving}
                    />
                ) : null}

                {(status.config.pageId || status.config.state === "connected") ? (
                    <InstagramDMVerifyStep
                        recipientId={recipientId}
                        onRecipientIdChange={setRecipientId}
                        message={message}
                        onMessageChange={setMessage}
                        onSend={handleSendTest}
                        sending={sending}
                    />
                ) : null}

                {status.config.state === "connected" ? (
                    <InstagramDMConnectedState
                        status={status}
                        refreshing={checking}
                        disconnecting={disconnecting}
                        onRefresh={runPreflight}
                        onDisconnect={handleDisconnect}
                    />
                ) : null}
            </CardContent>
        </Card>
    )
}
