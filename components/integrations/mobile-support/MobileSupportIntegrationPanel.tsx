"use client"

import { useEffect, useState } from "react"
import { Check, Copy, Loader2, RotateCcw, Save, Send } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { MobileAppEnvironment, MobileAppIntegrationMode, TicketWebhookAuthType } from "@/lib/integrations/mobile-support"

type MobileConfig = {
    enabled: boolean
    mode: MobileAppIntegrationMode
    environment: MobileAppEnvironment
    allowedAppIds: string[]
    clientTokenPreview?: string | null
    clientTokenCreatedAt?: string | null
}

type TicketConfig = {
    enabled: boolean
    url: string
    authType: TicketWebhookAuthType
    authHeaderName: string
    authToken?: string
    hasAuthToken?: boolean
    connected?: boolean
    lastTestAt?: string | null
    lastTestStatus?: number | null
    lastTestError?: string | null
}

const DEFAULT_MOBILE_CONFIG: MobileConfig = {
    enabled: false,
    mode: "api_first",
    environment: "sandbox",
    allowedAppIds: [],
}

const DEFAULT_TICKET_CONFIG: TicketConfig = {
    enabled: false,
    url: "",
    authType: "none",
    authHeaderName: "Authorization",
    authToken: "",
}

export function MobileSupportIntegrationPanel({ chatbotId, mode }: { chatbotId: string; mode: "mobile" | "ticket" }) {
    const { user } = useAuth()
    const { language } = useLanguage()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const [copied, setCopied] = useState<string | null>(null)
    const [generatedToken, setGeneratedToken] = useState("")
    const [mobileConfig, setMobileConfig] = useState<MobileConfig>(DEFAULT_MOBILE_CONFIG)
    const [ticketConfig, setTicketConfig] = useState<TicketConfig>(DEFAULT_TICKET_CONFIG)
    const [samplePayload, setSamplePayload] = useState<any>(null)
    const [hostedSessionPayload, setHostedSessionPayload] = useState<any>(null)
    const [hostedChatUrlTemplate, setHostedChatUrlTemplate] = useState("")
    const [sessionEndpointPath, setSessionEndpointPath] = useState("/api/mobile-assistant/session")

    const isTr = language === "tr"

    async function getAuthHeaders() {
        if (!user) throw new Error("Unauthorized")
        const token = await user.getIdToken()
        return {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        }
    }

    async function load() {
        if (!user) return
        setIsLoading(true)
        try {
            const endpoint = mode === "mobile"
                ? `/api/integrations/mobile-app/settings?chatbotId=${chatbotId}`
                : `/api/integrations/ticket-webhook/settings?chatbotId=${chatbotId}`
            const response = await fetch(endpoint, { headers: await getAuthHeaders(), cache: "no-store" })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || "Failed to load integration settings")

            if (mode === "mobile") {
                setMobileConfig({
                    ...DEFAULT_MOBILE_CONFIG,
                    ...data.config,
                })
            } else {
                setTicketConfig({
                    ...DEFAULT_TICKET_CONFIG,
                    ...data.config,
                    authToken: data.config?.hasAuthToken ? "••••••••" : "",
                })
            }
            setSamplePayload(data.samplePayload || null)
            setHostedSessionPayload(data.hostedSessionPayload || null)
            setHostedChatUrlTemplate(data.hostedChatUrlTemplate || "")
            setSessionEndpointPath(data.sessionEndpoint || "/api/mobile-assistant/session")
        } catch (error: any) {
            toast({
                title: isTr ? "Ayarlar yüklenemedi" : "Settings could not be loaded",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatbotId, mode, user])

    async function copyToClipboard(value: string, key: string) {
        await navigator.clipboard.writeText(value)
        setCopied(key)
        setTimeout(() => setCopied(null), 1800)
    }

    async function saveMobile(generateToken = false) {
        setIsSaving(true)
        setGeneratedToken("")
        try {
            const response = await fetch("/api/integrations/mobile-app/settings", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    chatbotId,
                    ...mobileConfig,
                    generateToken,
                }),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || "Failed to save")
            setMobileConfig(data.config)
            setSamplePayload(data.samplePayload || samplePayload)
            setHostedSessionPayload(data.hostedSessionPayload || hostedSessionPayload)
            setHostedChatUrlTemplate(data.hostedChatUrlTemplate || hostedChatUrlTemplate)
            setSessionEndpointPath(data.sessionEndpoint || sessionEndpointPath)
            if (data.clientToken) setGeneratedToken(data.clientToken)
            toast({ title: isTr ? "Kaydedildi" : "Saved", description: isTr ? "Mobile App / API ayarları güncellendi." : "Mobile App / API settings updated." })
        } catch (error: any) {
            toast({ title: isTr ? "Kaydedilemedi" : "Save failed", description: error.message, variant: "destructive" })
        } finally {
            setIsSaving(false)
        }
    }

    async function saveTicket() {
        setIsSaving(true)
        try {
            const response = await fetch("/api/integrations/ticket-webhook/settings", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    chatbotId,
                    ...ticketConfig,
                }),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || "Failed to save")
            setTicketConfig({
                ...DEFAULT_TICKET_CONFIG,
                ...data.config,
                authToken: data.config?.hasAuthToken ? "••••••••" : "",
            })
            toast({ title: isTr ? "Kaydedildi" : "Saved", description: isTr ? "Ticket Webhook ayarları güncellendi." : "Ticket Webhook settings updated." })
        } catch (error: any) {
            toast({ title: isTr ? "Kaydedilemedi" : "Save failed", description: error.message, variant: "destructive" })
        } finally {
            setIsSaving(false)
        }
    }

    async function testTicketWebhook() {
        setIsTesting(true)
        try {
            const response = await fetch("/api/integrations/ticket-webhook/test", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({ chatbotId }),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.result?.error || data.error || "Webhook test failed")
            setTicketConfig({
                ...DEFAULT_TICKET_CONFIG,
                ...data.config,
                authToken: data.config?.hasAuthToken ? "••••••••" : "",
            })
            toast({ title: isTr ? "Test başarılı" : "Test successful", description: isTr ? "Müşteri sistemine örnek ticket gönderildi." : "A sample ticket was sent to the customer system." })
        } catch (error: any) {
            toast({ title: isTr ? "Test başarısız" : "Test failed", description: error.message, variant: "destructive" })
        } finally {
            setIsTesting(false)
        }
    }

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isTr ? "Ayarlar yükleniyor..." : "Loading settings..."}
                </CardContent>
            </Card>
        )
    }

    if (mode === "mobile") {
        const origin = typeof window !== "undefined" ? window.location.origin : ""
        const endpoint = `${origin}/api/mobile-assistant/chat`
        const sessionEndpoint = `${origin}${sessionEndpointPath}`
        const hostedChatUrl = hostedChatUrlTemplate
            ? `${origin}${hostedChatUrlTemplate}`
            : `${origin}/chatbot-view?id=${chatbotId}&source=mobile_app&mobileSession=<mobileSession>`
        const allowedAppIdsText = mobileConfig.allowedAppIds.join("\n")
        const iosSnippet = `let url = URL(string: hostedChatUrl)!
let webView = WKWebView(frame: .zero)
webView.load(URLRequest(url: url))`
        const androidSnippet = `val webView = findViewById<WebView>(R.id.vionWebView)
webView.settings.javaScriptEnabled = true
webView.loadUrl(hostedChatUrl)`

        return (
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <CardTitle>{isTr ? "Mobile App / API" : "Mobile App / API"}</CardTitle>
                                <CardDescription>{isTr ? "API-first veya dengeli WebView yöntemiyle mobil uygulamanıza Vion destek asistanını bağlayın." : "Connect the Vion support assistant to your mobile app with API-first or the balanced WebView method."}</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">{isTr ? "Aktif" : "Active"}</span>
                                <Switch
                                    checked={mobileConfig.enabled}
                                    onCheckedChange={(checked) => setMobileConfig((current) => ({ ...current, enabled: checked }))}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-2">
                            <Label>{isTr ? "Uygulama modu" : "Integration mode"}</Label>
                            <Select
                                value={mobileConfig.mode}
                                onValueChange={(value) => setMobileConfig((current) => ({ ...current, mode: value as MobileAppIntegrationMode }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="api_first">API-first</SelectItem>
                                    <SelectItem value="hosted_chat">WebView / Hosted Chat (Dengeli)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">
                                {mobileConfig.mode === "hosted_chat"
                                    ? (isTr ? "Dengeli yöntem: mobil uygulama kısa ömürlü session üretir, Vion sohbet ekranı WebView içinde açılır." : "Balanced method: the mobile app creates a short-lived session, then opens the Vion chat screen in a WebView.")
                                    : (isTr ? "Native chat arayüzü sizde kalır, mesajlar doğrudan Vion API'ına gönderilir." : "Your native chat UI stays in the app and messages are sent directly to the Vion API.")}
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{isTr ? "Ortam" : "Environment"}</Label>
                                <Select
                                    value={mobileConfig.environment}
                                    onValueChange={(value) => setMobileConfig((current) => ({ ...current, environment: value as MobileAppEnvironment }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sandbox">Sandbox</SelectItem>
                                        <SelectItem value="production">Production</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>chatbotId</Label>
                                <Input value={chatbotId} readOnly className="font-mono" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{isTr ? "Allowed bundle/package id" : "Allowed bundle/package ids"}</Label>
                            <Textarea
                                value={allowedAppIdsText}
                                onChange={(event) => setMobileConfig((current) => ({
                                    ...current,
                                    allowedAppIds: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean),
                                }))}
                                placeholder="com.customer.shop.ios&#10;com.customer.shop.android"
                                rows={3}
                            />
                        </div>

                        <div className="rounded-md border bg-muted/40 p-3 text-sm">
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <span className="font-medium">{mobileConfig.mode === "hosted_chat" ? "Session endpoint" : "Endpoint"}</span>
                                <Button size="sm" variant="outline" onClick={() => copyToClipboard(mobileConfig.mode === "hosted_chat" ? sessionEndpoint : endpoint, "endpoint")}>
                                    {copied === "endpoint" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                                    {isTr ? "Kopyala" : "Copy"}
                                </Button>
                            </div>
                            <code className="break-all text-xs">{mobileConfig.mode === "hosted_chat" ? sessionEndpoint : endpoint}</code>
                        </div>

                        {mobileConfig.mode === "hosted_chat" && (
                            <div className="rounded-md border bg-muted/40 p-3 text-sm">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <span className="font-medium">Hosted chat URL</span>
                                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(hostedChatUrl, "hosted-url")}>
                                        {copied === "hosted-url" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                                        {isTr ? "Kopyala" : "Copy"}
                                    </Button>
                                </div>
                                <code className="break-all text-xs">{hostedChatUrl}</code>
                            </div>
                        )}

                        {mobileConfig.mode === "hosted_chat" && (
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-md border p-4">
                                    <h3 className="mb-2 text-sm font-semibold">{isTr ? "Vion tarafında" : "Vion side"}</h3>
                                    <ul className="space-y-2 text-sm text-muted-foreground">
                                        <li>{isTr ? "Mobile App / API aktif edilir ve client token üretilir." : "Enable Mobile App / API and generate a client token."}</li>
                                        <li>{isTr ? "Gerekirse bundle/package id kısıtı girilir." : "Optionally restrict allowed bundle/package ids."}</li>
                                        <li>{isTr ? "Bilgi tabanı, ürün kataloğu, dinamik context ve handoff modülleri aynı şekilde çalışır." : "Knowledge base, product catalog, dynamic context, and handoff modules continue to work."}</li>
                                        <li>{isTr ? "Ticket açılacaksa Ticket Webhook da aktif edilir." : "Enable Ticket Webhook when unresolved cases should create tickets."}</li>
                                    </ul>
                                </div>
                                <div className="rounded-md border p-4">
                                    <h3 className="mb-2 text-sm font-semibold">{isTr ? "Mobil / müşteri tarafında" : "Mobile/customer side"}</h3>
                                    <ul className="space-y-2 text-sm text-muted-foreground">
                                        <li>{isTr ? "Mobil app veya backend session endpoint'ine müşteri ve sipariş context'i gönderir." : "The mobile app or backend sends customer and order context to the session endpoint."}</li>
                                        <li>{isTr ? "Dönen hostedChatUrl native WebView içinde açılır." : "Open the returned hostedChatUrl in a native WebView."}</li>
                                        <li>{isTr ? "Client token URL'e konmaz; mobileSession kısa ömürlüdür." : "Do not put the client token in the URL; mobileSession is short-lived."}</li>
                                        <li>{isTr ? "Ticket Webhook kullanılıyorsa müşteri sistemi externalTicketId döner." : "If Ticket Webhook is used, the customer system returns externalTicketId."}</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        <div className="rounded-md border bg-muted/40 p-3 text-sm">
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <span className="font-medium">{isTr ? "Client token" : "Client token"}</span>
                                <Badge variant={mobileConfig.clientTokenPreview ? "secondary" : "outline"}>
                                    {mobileConfig.clientTokenPreview || (isTr ? "Henüz üretilmedi" : "Not generated")}
                                </Badge>
                            </div>
                            {generatedToken && (
                                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-950">
                                    <p className="mb-2 text-xs font-medium">{isTr ? "Bu token yalnızca bir kez gösterilir." : "This token is shown only once."}</p>
                                    <div className="flex gap-2">
                                        <Input value={generatedToken} readOnly className="font-mono text-xs" />
                                        <Button size="icon" variant="outline" onClick={() => copyToClipboard(generatedToken, "token")}>
                                            {copied === "token" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                        <Button variant="outline" onClick={() => saveMobile(true)} disabled={isSaving}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            {isTr ? "Token üret" : "Generate token"}
                        </Button>
                        <Button onClick={() => saveMobile(false)} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {isTr ? "Kaydet" : "Save"}
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{mobileConfig.mode === "hosted_chat" ? (isTr ? "Örnek session payload" : "Sample session payload") : (isTr ? "Örnek request payload" : "Sample request payload")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="max-h-96 overflow-auto rounded-md bg-zinc-950 p-4 text-xs text-zinc-50">
                            {JSON.stringify(mobileConfig.mode === "hosted_chat" ? hostedSessionPayload : samplePayload, null, 2)}
                        </pre>
                    </CardContent>
                </Card>

                {mobileConfig.mode === "hosted_chat" && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{isTr ? "WebView örnekleri" : "WebView examples"}</CardTitle>
                            <CardDescription>{isTr ? "Mobil uygulama session endpoint'inden hostedChatUrl aldıktan sonra bu URL'i açar." : "After receiving hostedChatUrl from the session endpoint, the mobile app opens that URL."}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>iOS</Label>
                                <pre className="overflow-auto rounded-md bg-zinc-950 p-4 text-xs text-zinc-50">{iosSnippet}</pre>
                            </div>
                            <div className="space-y-2">
                                <Label>Android</Label>
                                <pre className="overflow-auto rounded-md bg-zinc-950 p-4 text-xs text-zinc-50">{androidSnippet}</pre>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <CardTitle>{isTr ? "Ticket Webhook" : "Ticket Webhook"}</CardTitle>
                            <CardDescription>{isTr ? "Çözülemeyen mobil destek konuşmalarını müşterinin ticket sistemine gönderin." : "Send unresolved mobile support conversations to the customer's ticket system."}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{isTr ? "Aktif" : "Active"}</span>
                            <Switch
                                checked={ticketConfig.enabled}
                                onCheckedChange={(checked) => setTicketConfig((current) => ({ ...current, enabled: checked }))}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="space-y-2">
                        <Label>Webhook URL</Label>
                        <Input
                            value={ticketConfig.url}
                            onChange={(event) => setTicketConfig((current) => ({ ...current, url: event.target.value }))}
                            placeholder="https://customer.example.com/api/vion/tickets"
                        />
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>{isTr ? "Auth tipi" : "Auth type"}</Label>
                            <Select
                                value={ticketConfig.authType}
                                onValueChange={(value) => setTicketConfig((current) => ({
                                    ...current,
                                    authType: value as TicketWebhookAuthType,
                                    authHeaderName: value === "api_key" ? "X-API-Key" : "Authorization",
                                }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="bearer">Bearer</SelectItem>
                                    <SelectItem value="api_key">API Key</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{isTr ? "Header adı" : "Header name"}</Label>
                            <Input
                                value={ticketConfig.authHeaderName}
                                disabled={ticketConfig.authType === "none" || ticketConfig.authType === "bearer"}
                                onChange={(event) => setTicketConfig((current) => ({ ...current, authHeaderName: event.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{isTr ? "Token / API key" : "Token / API key"}</Label>
                            <Input
                                type="password"
                                value={ticketConfig.authToken || ""}
                                disabled={ticketConfig.authType === "none"}
                                onChange={(event) => setTicketConfig((current) => ({ ...current, authToken: event.target.value }))}
                                placeholder={ticketConfig.hasAuthToken ? "••••••••" : ""}
                            />
                        </div>
                    </div>
                    <div className="rounded-md border bg-muted/40 p-3 text-sm">
                        <div className="mb-2 flex items-center gap-2">
                            <Badge variant={ticketConfig.connected ? "secondary" : "outline"}>
                                {ticketConfig.connected ? (isTr ? "Test edildi" : "Tested") : (isTr ? "Test bekliyor" : "Needs test")}
                            </Badge>
                            {ticketConfig.lastTestStatus ? <span className="text-muted-foreground">HTTP {ticketConfig.lastTestStatus}</span> : null}
                        </div>
                        {ticketConfig.lastTestError && <p className="text-xs text-destructive">{ticketConfig.lastTestError}</p>}
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <Button variant="outline" onClick={testTicketWebhook} disabled={isTesting || !ticketConfig.enabled || !ticketConfig.url}>
                        {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        {isTr ? "Test ticket gönder" : "Send test ticket"}
                    </Button>
                    <Button onClick={saveTicket} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {isTr ? "Kaydet" : "Save"}
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{isTr ? "Minimum webhook payload" : "Minimum webhook payload"}</CardTitle>
                </CardHeader>
                <CardContent>
                    <pre className="max-h-96 overflow-auto rounded-md bg-zinc-950 p-4 text-xs text-zinc-50">
                        {JSON.stringify(samplePayload, null, 2)}
                    </pre>
                </CardContent>
            </Card>
        </div>
    )
}
