"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, MessageCircleMore, RefreshCw } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ChannelStatusBadge } from "@/components/integrations/shared/ChannelStatusBadge"
import { SupportDiagnosticDrawer } from "@/components/integrations/shared/SupportDiagnosticDrawer"
import { WhatsAppBizConnectedState } from "@/components/integrations/whatsapp-business/WhatsAppBizConnectedState"
import { WhatsAppBizNumberSelectStep } from "@/components/integrations/whatsapp-business/WhatsAppBizNumberSelectStep"
import { WhatsAppBizPreflightStep } from "@/components/integrations/whatsapp-business/WhatsAppBizPreflightStep"
import { WhatsAppBizRecoveryBanner } from "@/components/integrations/whatsapp-business/WhatsAppBizRecoveryBanner"
import { WhatsAppBizVerifyStep } from "@/components/integrations/whatsapp-business/WhatsAppBizVerifyStep"
import { WhatsAppEmbeddedSignupStep } from "@/components/integrations/whatsapp-business/WhatsAppEmbeddedSignupStep"
import type { WhatsAppBizStatusPayload } from "@/lib/integrations/whatsapp-business/types"

export function WhatsAppBizWizard({ chatbotId }: { chatbotId: string }) {
    const { user, role } = useAuth()
    const { t } = useLanguage()
    const { toast } = useToast()
    const [status, setStatus] = useState<WhatsAppBizStatusPayload | null>(null)
    const [loading, setLoading] = useState(true)
    const [connecting, setConnecting] = useState(false)
    const [checking, setChecking] = useState(false)
    const [saving, setSaving] = useState(false)
    const [sending, setSending] = useState(false)
    const [disconnecting, setDisconnecting] = useState(false)
    const [selectedBusinessId, setSelectedBusinessId] = useState("")
    const [selectedPhoneId, setSelectedPhoneId] = useState("")
    const [testPhone, setTestPhone] = useState("")
    const [message, setMessage] = useState(t('testMessagePlaceholder'))
    const [customAppId, setCustomAppId] = useState("")
    const [customAppSecret, setCustomAppSecret] = useState("")

    const selectedBusiness = useMemo(
        () => status?.availableBusinesses.find((business) => business.id === selectedBusinessId) || null,
        [selectedBusinessId, status?.availableBusinesses]
    )

    useEffect(() => {
        if (!status) return
        const defaultBusiness = status.config.wabaId || status.availableBusinesses[0]?.id || ""
        const business = status.availableBusinesses.find((item) => item.id === defaultBusiness) || status.availableBusinesses[0] || null
        setSelectedBusinessId(defaultBusiness)
        setSelectedPhoneId(status.config.phoneNumberId || business?.phoneNumbers[0]?.id || "")
    }, [status])

    useEffect(() => {
        const listener = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return
            if (event.data?.type !== "vion-whatsapp-business-oauth") return

            setConnecting(false)

            if (event.data?.ok && event.data?.status) {
                setStatus(event.data.status as WhatsAppBizStatusPayload)
                toast({
                    title: t('waConnectedTitle'),
                    description: t('waContinueSetup'),
                })
                return
            }

            toast({
                title: t('waConnectFailedTitle'),
                description: event.data?.error || t('metaLoginFailed'),
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
            throw new Error(t('sessionNotFound'))
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
            const response = await fetch(`/api/integrations/whatsapp-business/status?chatbotId=${chatbotId}`, {
                headers: await getAuthHeaders(),
                cache: "no-store",
            })
            const payload = await response.json()
            if (!response.ok) {
                throw new Error(payload?.error || t('waStatusFailedMsg'))
            }
            setStatus(payload as WhatsAppBizStatusPayload)
        } catch (error) {
            toast({
                title: t('waStatusFailedTitle'),
                description: error instanceof Error ? error.message : t('unexpectedError'),
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
        const popup = window.open(url, "whatsapp-business-oauth", `width=${width},height=${height},left=${left},top=${top}`)
        if (!popup) {
            throw new Error(t('popupBlocked'))
        }
    }

    const handleConnect = async () => {
        setConnecting(true)
        try {
            const response = await fetch("/api/integrations/whatsapp-business/embedded-signup", {
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
                throw new Error(payload?.error || t('waConnectStartFailedMsg'))
            }
            openPopup(payload.authUrl)
        } catch (error) {
            setConnecting(false)
            toast({
                title: t('waConnectStartFailedTitle'),
                description: error instanceof Error ? error.message : t('unexpectedError'),
                variant: "destructive",
            })
        }
    }

    const runPreflight = async () => {
        setChecking(true)
        try {
            const response = await fetch("/api/integrations/whatsapp-business/preflight", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({ chatbotId }),
            })
            const payload = await response.json()
            if (!response.ok) {
                throw new Error(payload?.error || t('preflightRunFailedMsg'))
            }
            setStatus(payload as WhatsAppBizStatusPayload)
        } catch (error) {
            toast({
                title: t('preflightRunFailedTitle'),
                description: error instanceof Error ? error.message : t('unexpectedError'),
                variant: "destructive",
            })
        } finally {
            setChecking(false)
        }
    }

    const handleSaveSelection = async () => {
        if (!selectedBusinessId || !selectedPhoneId) {
            return
        }

        const selectedPhone = selectedBusiness?.phoneNumbers.find((item) => item.id === selectedPhoneId) || null
        setSaving(true)
        try {
            const response = await fetch("/api/integrations/whatsapp-business/save-channel", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    chatbotId,
                    wabaId: selectedBusinessId,
                    phoneNumberId: selectedPhoneId,
                    displayNumber: selectedPhone?.displayNumber || null,
                }),
            })
            const payload = await response.json()
            if (!response.ok) {
                throw new Error(payload?.error || "Numara kaydedilemedi.")
            }

            const subscribeResponse = await fetch("/api/integrations/whatsapp-business/subscribe", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({ chatbotId }),
            })
            const subscribePayload = await subscribeResponse.json()
            if (!subscribeResponse.ok) {
                throw new Error(subscribePayload?.error || t('connectionActivateFailed'))
            }

            setStatus(subscribePayload as WhatsAppBizStatusPayload)
            toast({
                title: t('waNumberSavedTitle'),
                description: t('waNumberSavedDesc'),
            })
        } catch (error) {
            toast({
                title: t('waSetupFailedTitle'),
                description: error instanceof Error ? error.message : t('unexpectedError'),
                variant: "destructive",
            })
        } finally {
            setSaving(false)
        }
    }

    const handleSendTest = async () => {
        setSending(true)
        try {
            const response = await fetch("/api/integrations/whatsapp-business/test-message", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    chatbotId,
                    to: testPhone,
                    text: message,
                }),
            })
            const payload = await response.json()
            if (!response.ok) {
                throw new Error(payload?.error || t('testMsgSendFailedMsg'))
            }
            toast({
                title: t('testMsgSentTitle'),
                description: t('testMsgSentDesc'),
            })
            await fetchStatus()
        } catch (error) {
            toast({
                title: t('testMsgSendFailedTitle'),
                description: error instanceof Error ? error.message : t('unexpectedError'),
                variant: "destructive",
            })
        } finally {
            setSending(false)
        }
    }

    const handleDisconnect = async () => {
        setDisconnecting(true)
        try {
            const response = await fetch("/api/integrations/whatsapp-business/disconnect", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({ chatbotId }),
            })
            const payload = await response.json()
            if (!response.ok) {
                throw new Error(payload?.error || t('removeConnFailedMsg'))
            }
            setStatus(payload as WhatsAppBizStatusPayload)
        } catch (error) {
            toast({
                title: t('removeConnFailedTitle'),
                description: error instanceof Error ? error.message : t('unexpectedError'),
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
                    {t('waStatusLoading')}
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="overflow-hidden border-border/70 bg-white py-0">
            <CardHeader className="border-b bg-gradient-to-r from-emerald-50 via-white to-lime-50">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm">
                                <MessageCircleMore className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">WhatsApp Business</CardTitle>
                                <CardDescription>{t('waWizardSubtitle')}</CardDescription>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground pl-[57px]">{status.stateMessage}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <ChannelStatusBadge state={status.config.state} />
                        {(role === "SUPER_ADMIN" || role === "AGENCY_ADMIN") && status.diagnostics ? (
                            <SupportDiagnosticDrawer title={t('waDiagnosticsTitle')} diagnostics={status.diagnostics} />
                        ) : null}
                        <Button type="button" variant="outline" size="icon" onClick={fetchStatus}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
                <WhatsAppBizRecoveryBanner status={status} />
                {!status.platformAppAvailable ? (
                    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                        <div className="mb-4">
                            <p className="text-sm font-medium">{t('metaAppInfoRequired')}</p>
                            <p className="text-xs text-muted-foreground">
                                {t('metaAppRequired')}
                            </p>
                        </div>
                        <div className="grid gap-3">
                            <div className="grid gap-1.5">
                                <label htmlFor="wa-custom-app-id" className="text-xs font-medium text-muted-foreground">
                                    Meta App ID
                                </label>
                                <Input
                                    id="wa-custom-app-id"
                                    value={customAppId}
                                    onChange={(event) => setCustomAppId(event.target.value)}
                                    placeholder={t('appIdPlaceholder')}
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <label htmlFor="wa-custom-app-secret" className="text-xs font-medium text-muted-foreground">
                                    Meta App Secret
                                </label>
                                <Input
                                    id="wa-custom-app-secret"
                                    type="password"
                                    value={customAppSecret}
                                    onChange={(event) => setCustomAppSecret(event.target.value)}
                                    placeholder={t('appSecretPlaceholder')}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t('appCredsSavedHint')}
                            </p>
                        </div>
                    </div>
                ) : null}
                <WhatsAppBizPreflightStep status={status} connecting={connecting} checking={checking} onConnect={handleConnect} onPreflight={runPreflight} />

                <WhatsAppEmbeddedSignupStep connecting={connecting} onConnect={handleConnect} />

                {status.availableBusinesses.length > 0 ? (
                    <WhatsAppBizNumberSelectStep
                        businesses={status.availableBusinesses}
                        selectedBusinessId={selectedBusinessId}
                        selectedPhoneNumberId={selectedPhoneId}
                        onSelectBusinessId={setSelectedBusinessId}
                        onSelectPhoneNumberId={setSelectedPhoneId}
                        onSave={handleSaveSelection}
                        saving={saving}
                    />
                ) : null}

                {(status.config.phoneNumberId || status.config.state === "connected") ? (
                    <WhatsAppBizVerifyStep
                        phone={testPhone}
                        onPhoneChange={setTestPhone}
                        message={message}
                        onMessageChange={setMessage}
                        onSend={handleSendTest}
                        sending={sending}
                    />
                ) : null}

                {status.config.state === "connected" ? (
                    <WhatsAppBizConnectedState
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
