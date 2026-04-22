"use client"

import { useEffect, useMemo, useState } from "react"
import { MessageCircle, Loader2, RefreshCw } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ChannelStatusBadge } from "@/components/integrations/shared/ChannelStatusBadge"
import { SupportDiagnosticDrawer } from "@/components/integrations/shared/SupportDiagnosticDrawer"
import { MessengerConnectedState } from "@/components/integrations/messenger/MessengerConnectedState"
import { MessengerPageSelectStep } from "@/components/integrations/messenger/MessengerPageSelectStep"
import { MessengerPreflightStep } from "@/components/integrations/messenger/MessengerPreflightStep"
import { MessengerRecoveryBanner } from "@/components/integrations/messenger/MessengerRecoveryBanner"
import { MessengerVerifyStep } from "@/components/integrations/messenger/MessengerVerifyStep"
import type { MessengerDMStatusPayload } from "@/lib/integrations/messenger/types"

export function MessengerWizard({ chatbotId }: { chatbotId: string }) {
    const { user, role } = useAuth()
    const { toast } = useToast()
    const [status, setStatus] = useState<MessengerDMStatusPayload | null>(null)
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
            items.push("Hesabınıza bağlı bir Facebook Sayfası oluşturun veya mevcut sayfanızı bu hesaba bağlayın.")
        }

        if (preflight.pageIsMessagingEligible === false) {
            items.push("Facebook Sayfanızın Messenger mesajlaşmasına uygun olduğundan emin olun. Sayfa kategorisini kontrol edin.")
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
            if (event.data?.type !== "vion-messenger-dm-oauth") return

            setConnecting(false)

            if (event.data?.ok && event.data?.status) {
                setStatus(event.data.status as MessengerDMStatusPayload)
                toast({
                    title: "Facebook hesabı bağlandı",
                    description: "Ön kontrolleri tekrar çalıştırarak kuruluma devam edin.",
                })
                return
            }

            toast({
                title: "Messenger bağlantısı tamamlanamadı",
                description: event.data?.error || "Meta girişi tamamlanamadı.",
                variant: "destructive",
            })
        }

        window.addEventListener("message", listener)
        return () => window.removeEventListener("message", listener)
    }, [toast])

    useEffect(() => {
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
            const response = await fetch(`/api/integrations/messenger/status?chatbotId=${chatbotId}`, {
                headers: await getAuthHeaders(),
                cache: "no-store",
            })
            const payload = await response.json()
            if (!response.ok) {
                throw new Error(payload?.error || "Messenger durumu alınamadı.")
            }
            setStatus(payload as MessengerDMStatusPayload)
        } catch (error) {
            toast({
                title: "Messenger durumu alınamadı",
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
        const popup = window.open(url, "messenger-dm-oauth", `width=${width},height=${height},left=${left},top=${top}`)
        if (!popup) {
            throw new Error("Açılır pencere engellendi. Lütfen tarayıcı iznini açın.")
        }
    }

    const handleConnect = async () => {
        setConnecting(true)
        try {
            const response = await fetch("/api/integrations/messenger/connect", {
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
                throw new Error(payload?.error || "Messenger bağlantısı başlatılamadı.")
            }
            openPopup(payload.authUrl)
        } catch (error) {
            setConnecting(false)
            toast({
                title: "Messenger bağlantısı başlatılamadı",
                description: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu.",
                variant: "destructive",
            })
        }
    }

    const runPreflight = async () => {
        setChecking(true)
        try {
            const response = await fetch("/api/integrations/messenger/preflight", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({ chatbotId }),
            })
            const payload = await response.json()
            if (!response.ok) {
                throw new Error(payload?.error || "Ön kontrol çalıştırılamadı.")
            }
            setStatus(payload as MessengerDMStatusPayload)
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
        if (!selectedPage) return

        setSaving(true)
        try {
            const response = await fetch("/api/integrations/messenger/save-channel", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    chatbotId,
                    pageId: selectedPage.id,
                    pageName: selectedPage.name,
                }),
            })
            const payload = await response.json()
            if (!response.ok) {
                throw new Error(payload?.error || "Sayfa kaydedilemedi.")
            }

            const subscribeResponse = await fetch("/api/integrations/messenger/subscribe", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({ chatbotId }),
            })
            const subscribePayload = await subscribeResponse.json()
            if (!subscribeResponse.ok) {
                throw new Error(subscribePayload?.error || "Bağlantı etkinleştirilemedi.")
            }

            setStatus(subscribePayload as MessengerDMStatusPayload)
            toast({
                title: "Facebook sayfası kaydedildi",
                description: "Bağlantı etkinleştirildi. İsterseniz şimdi test mesajı gönderebilirsiniz.",
            })
        } catch (error) {
            toast({
                title: "Messenger kurulumu tamamlanamadı",
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
            const response = await fetch("/api/integrations/messenger/test-message", {
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
                description: "Messenger tarafında mesajın ulaşıp ulaşmadığını kontrol edin.",
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
            const response = await fetch("/api/integrations/messenger/disconnect", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({ chatbotId }),
            })
            const payload = await response.json()
            if (!response.ok) {
                throw new Error(payload?.error || "Bağlantı kaldırılamadı.")
            }
            setStatus(payload as MessengerDMStatusPayload)
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
                    Messenger durumu yükleniyor...
                </CardContent>
            </Card>
        )
    }

    const shouldShowRecoveryPanel =
        (status.config.state === "needs_user_action" || status.config.state === "failed") &&
        (recoveryChecklist.length > 0 || Boolean(status.config.accessTokenRef || status.config.pageId))
    const canResetConnection = Boolean(status.config.accessTokenRef || status.config.pageId)
    const messengerOAuthRedirectUri =
        typeof window !== "undefined" ? `${window.location.origin}/api/integrations/messenger/callback` : "/api/integrations/messenger/callback"

    return (
        <Card className="overflow-hidden border-border/70 bg-white">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 via-white to-indigo-50">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
                                <MessageCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Facebook Messenger</CardTitle>
                                <CardDescription>Messenger mesajlarınızı ayrı bir kurulum akışıyla bağlayın.</CardDescription>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{status.stateMessage}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <ChannelStatusBadge state={status.config.state} />
                        {(role === "SUPER_ADMIN" || role === "AGENCY_ADMIN") && status.diagnostics ? (
                            <SupportDiagnosticDrawer title="Messenger DM Tanı Bilgisi" diagnostics={status.diagnostics} />
                        ) : null}
                        <Button type="button" variant="outline" size="icon" onClick={fetchStatus}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
                <MessengerRecoveryBanner status={status} />
                {!status.platformAppAvailable ? (
                    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                        <div className="mb-4">
                            <p className="text-sm font-medium">Meta Uygulama Bilgileri (Zorunlu)</p>
                            <p className="text-xs text-muted-foreground">
                                Bu chatbot için Meta App ID ve Secret zorunludur. Kendi Meta uygulamanızın bilgilerini girin.
                            </p>
                        </div>
                        <div className="grid gap-3">
                            <div className="grid gap-1.5">
                                <label htmlFor="msn-custom-app-id" className="text-xs font-medium text-muted-foreground">
                                    Meta App ID
                                </label>
                                <Input
                                    id="msn-custom-app-id"
                                    value={customAppId}
                                    onChange={(event) => setCustomAppId(event.target.value)}
                                    placeholder="Örn. 123456789012345"
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <label htmlFor="msn-custom-app-secret" className="text-xs font-medium text-muted-foreground">
                                    Meta App Secret
                                </label>
                                <Input
                                    id="msn-custom-app-secret"
                                    type="password"
                                    value={customAppSecret}
                                    onChange={(event) => setCustomAppSecret(event.target.value)}
                                    placeholder="Örn. xxxxxxxxxxxxxxxxxxxxxxxx"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Bu alanları kaydettiğinizde bir sonraki bağlantılarda aynı chatbot için tekrar kullanılır.
                            </p>
                            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-950">
                                <p className="font-medium">OAuth yönlendirme notu</p>
                                <p className="mt-1 text-amber-900">
                                    Kendi Meta App bilginizi kullanıyorsanız `Facebook Login &gt; Settings &gt; Valid OAuth Redirect URIs`
                                    alanına aşağıdaki adresi birebir ekleyin. Messenger kurulumu bu özel callback adresini kullanır;
                                    `/api/integrations/meta/callback` bu akış için geçerli değildir.
                                </p>
                                <code className="mt-2 block rounded border border-amber-200 bg-white px-2 py-1.5 font-mono text-[11px] text-amber-950">
                                    {messengerOAuthRedirectUri}
                                </code>
                            </div>
                        </div>
                    </div>
                ) : null}
                <MessengerPreflightStep status={status} connecting={connecting} checking={checking} onConnect={handleConnect} onPreflight={runPreflight} />

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
                    <MessengerPageSelectStep
                        pages={status.availablePages}
                        selectedPageId={selectedPageId}
                        onSelectPageId={setSelectedPageId}
                        onSave={handleSaveSelection}
                        saving={saving}
                    />
                ) : null}

                {status.config.pageId || status.config.state === "connected" ? (
                    <MessengerVerifyStep
                        recipientId={recipientId}
                        onRecipientIdChange={setRecipientId}
                        message={message}
                        onMessageChange={setMessage}
                        onSend={handleSendTest}
                        sending={sending}
                    />
                ) : null}

                {status.config.state === "connected" ? (
                    <MessengerConnectedState
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
