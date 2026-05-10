"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Check, Loader2, QrCode, RefreshCw } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { EvolutionApiStatusPayload } from "@/lib/integrations/evolution-api/types"

export function EvolutionApiIntegrationPanel({ chatbotId }: { chatbotId: string }) {
    const { user } = useAuth()
    const { toast } = useToast()
    const [status, setStatus] = useState<EvolutionApiStatusPayload | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [qrLoading, setQrLoading] = useState(false)
    const [testing, setTesting] = useState(false)
    const [baseUrl, setBaseUrl] = useState("")
    const [apiKey, setApiKey] = useState("")
    const [instanceName, setInstanceName] = useState("")
    const [phoneNumber, setPhoneNumber] = useState("")
    const [createInstance, setCreateInstance] = useState(true)
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [testPhone, setTestPhone] = useState("")
    const [testMessage, setTestMessage] = useState("Merhaba, bu Vion Evolution API test mesajıdır.")

    const getAuthHeaders = async () => {
        if (!user) throw new Error("Oturum bulunamadı.")
        const token = await user.getIdToken()
        return {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        }
    }

    const loadStatus = async () => {
        if (!user) return
        setLoading(true)
        try {
            const response = await fetch(`/api/integrations/evolution-api/status?chatbotId=${chatbotId}`, {
                headers: await getAuthHeaders(),
                cache: "no-store",
            })
            const payload = await response.json()
            if (!response.ok) throw new Error(payload?.error || "Evolution API durumu alınamadı.")
            setStatus(payload)
            setBaseUrl(payload.config.baseUrl || "")
            setInstanceName(payload.config.instanceName || "")
            setPhoneNumber(payload.config.phoneNumber || "")
        } catch (error) {
            toast({
                title: "Evolution API durumu alınamadı",
                description: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu.",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void loadStatus()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatbotId, user])

    const handleConnect = async () => {
        setSaving(true)
        try {
            const response = await fetch("/api/integrations/evolution-api/connect", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                    chatbotId,
                    baseUrl,
                    apiKey,
                    instanceName,
                    phoneNumber: phoneNumber || undefined,
                    createInstance,
                }),
            })
            const payload = await response.json()
            if (!response.ok) throw new Error(payload?.error || "Evolution API bağlantısı kaydedilemedi.")
            toast({
                title: "Evolution API bağlantısı kaydedildi",
                description: createInstance ? "Instance oluşturuldu ve webhook ayarlandı." : "Mevcut instance için webhook ayarlandı.",
            })
            setApiKey("")
            await loadStatus()
        } catch (error) {
            toast({
                title: "Evolution API bağlantısı kaydedilemedi",
                description: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu.",
                variant: "destructive",
            })
        } finally {
            setSaving(false)
        }
    }

    const handleQr = async () => {
        setQrLoading(true)
        try {
            const response = await fetch("/api/integrations/evolution-api/qr", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({ chatbotId }),
            })
            const payload = await response.json()
            if (!response.ok) throw new Error(payload?.error || "QR kod alınamadı.")
            setQrCode(payload.qrCode || null)
        } catch (error) {
            toast({
                title: "QR kod alınamadı",
                description: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu.",
                variant: "destructive",
            })
        } finally {
            setQrLoading(false)
        }
    }

    const handleTest = async () => {
        setTesting(true)
        try {
            const response = await fetch("/api/integrations/evolution-api/test-message", {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({ chatbotId, to: testPhone, text: testMessage }),
            })
            const payload = await response.json()
            if (!response.ok) throw new Error(payload?.error || "Test mesajı gönderilemedi.")
            toast({ title: "Test mesajı gönderildi", description: "Mesaj Evolution API üzerinden iletildi." })
            await loadStatus()
        } catch (error) {
            toast({
                title: "Test mesajı gönderilemedi",
                description: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu.",
                variant: "destructive",
            })
        } finally {
            setTesting(false)
        }
    }

    const qrImageSrc = qrCode?.startsWith("data:image") ? qrCode : qrCode ? `data:image/png;base64,${qrCode}` : null
    const connected = status?.config.connectionState === "open"

    if (loading) {
        return (
            <Card>
                <CardContent className="flex min-h-40 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        Evolution API Hızlı WhatsApp Bağlantısı
                        {connected ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                                <Check className="h-3 w-3" />
                                Bağlı
                            </span>
                        ) : null}
                    </CardTitle>
                    <CardDescription>
                        WhatsApp Business uygulamasını telefonda kullanmaya devam ederken Vion paneline QR tabanlı mesaj akışı bağlayın.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        <div className="flex gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <p>
                                Bu yöntem resmi Meta Cloud API değildir. Düşük hacimli hızlı bağlantı için kullanın; toplu pazarlama ve agresif otomasyon için resmi Meta connector tercih edilmeli.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Evolution API Base URL</Label>
                            <Input placeholder="https://evolution.example.com" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>API Key</Label>
                            <Input
                                type="password"
                                placeholder={status?.config.apiKeyConfigured ? "Kayıtlı API key korunacak" : "GLOBAL_API_KEY"}
                                value={apiKey}
                                onChange={(event) => setApiKey(event.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Instance Name</Label>
                            <Input placeholder="vion-tenant-whatsapp" value={instanceName} onChange={(event) => setInstanceName(event.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Telefon Numarası</Label>
                            <Input placeholder="905xxxxxxxxx" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} />
                        </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={createInstance}
                            onChange={(event) => setCreateInstance(event.target.checked)}
                            className="h-4 w-4 rounded border-input"
                        />
                        Instance yoksa Evolution üzerinde oluştur ve webhook ayarla
                    </label>

                    {status?.config.webhookUrl ? (
                        <div className="rounded-md bg-muted p-3 text-xs">
                            <p className="mb-1 font-medium">Webhook URL</p>
                            <code className="break-all">{status.config.webhookUrl}</code>
                        </div>
                    ) : null}

                    {status?.blockers?.length ? (
                        <div className="rounded-md border p-3 text-sm text-muted-foreground">
                            {status.blockers.map((blocker) => (
                                <p key={blocker}>- {blocker}</p>
                            ))}
                        </div>
                    ) : null}
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2">
                    <Button onClick={handleConnect} disabled={saving || !baseUrl || !instanceName || (!apiKey && !status?.config.apiKeyConfigured)}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Kaydet ve Webhook Ayarla
                    </Button>
                    <Button variant="outline" onClick={loadStatus}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Durumu Yenile
                    </Button>
                </CardFooter>
            </Card>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <QrCode className="h-4 w-4" />
                            QR Bağlantısı
                        </CardTitle>
                        <CardDescription>WhatsApp Business uygulamasından bağlı cihaz olarak okutun.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {qrImageSrc ? (
                            <div className="flex justify-center rounded-md border bg-white p-4">
                                <img src={qrImageSrc} alt="Evolution API QR" className="h-56 w-56 object-contain" />
                            </div>
                        ) : (
                            <div className="flex h-56 items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
                                QR kod henüz alınmadı.
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" className="w-full" onClick={handleQr} disabled={qrLoading || !status?.ready}>
                            {qrLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            QR Kod Al
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Test Mesajı</CardTitle>
                        <CardDescription>Bağlantı açıldıktan sonra Evolution API üzerinden test mesajı gönderin.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Input placeholder="905xxxxxxxxx" value={testPhone} onChange={(event) => setTestPhone(event.target.value)} />
                        <Input value={testMessage} onChange={(event) => setTestMessage(event.target.value)} />
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={handleTest} disabled={testing || !testPhone || !status?.ready}>
                            {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Test Mesajı Gönder
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
