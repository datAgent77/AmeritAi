"use client"

import { useEffect, useMemo, useState } from "react"
import { Instagram, Loader2, RefreshCw } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

    const selectedPage = useMemo(
        () => status?.availablePages.find((page) => page.id === selectedPageId) || null,
        [selectedPageId, status?.availablePages]
    )

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
            const payload = await response.json()
            if (!response.ok) {
                throw new Error(payload?.error || "Test mesajı gönderilemedi.")
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
                <InstagramDMPreflightStep status={status} connecting={connecting} checking={checking} onConnect={handleConnect} onPreflight={runPreflight} />

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
