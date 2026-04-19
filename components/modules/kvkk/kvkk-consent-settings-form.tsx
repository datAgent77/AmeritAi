"use client"

import { useEffect, useState } from "react"
import { Loader2, Save, ShieldCheck } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

interface KvkkConsentSettingsFormProps {
    targetUserId: string
}

export function KvkkConsentSettingsForm({ targetUserId }: KvkkConsentSettingsFormProps) {
    const { user, role } = useAuth()
    const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'AGENCY_ADMIN';
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [enabled, setEnabled] = useState(true)
    const [customText, setCustomText] = useState("")
    const [rejectionContactText, setRejectionContactText] = useState("")
    const [defaultText, setDefaultText] = useState("")
    const [publishedVersionId, setPublishedVersionId] = useState<string | null>(null)

    useEffect(() => {
        const load = async () => {
            if (!user?.uid) return
            setIsLoading(true)
            try {
                const token = await user.getIdToken()
                const [settingsResponse, contractsResponse] = await Promise.all([
                    fetch(`/api/console/settings?chatbotId=${targetUserId}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch("/api/contracts/current", {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ])

                const settingsData = settingsResponse.ok ? await settingsResponse.json() : {}
                const contractsData = contractsResponse.ok ? await contractsResponse.json() : {}

                setEnabled(settingsData.enableKvkkConsent !== false)
                setCustomText(
                    typeof settingsData.kvkkConsentSettings?.customText === "string" ? settingsData.kvkkConsentSettings.customText 
                    : (typeof settingsData.kvkkCustomText === "string" ? settingsData.kvkkCustomText : "")
                )
                setRejectionContactText(
                    typeof settingsData.kvkkConsentSettings?.rejectionContactText === "string" ? settingsData.kvkkConsentSettings.rejectionContactText 
                    : (typeof settingsData.kvkkRejectionContactText === "string" ? settingsData.kvkkRejectionContactText 
                    : (typeof settingsData.rejectionContactText === "string" ? settingsData.rejectionContactText : ""))
                )
                setDefaultText(typeof contractsData?.published?.kvkkDefault?.text === "string" ? contractsData.published.kvkkDefault.text : "")
                setPublishedVersionId(typeof contractsData?.published?.kvkkDefault?.versionId === "string" ? contractsData.published.kvkkDefault.versionId : null)
            } catch (error) {
                console.error("Failed to load KVKK settings:", error)
                toast({
                    title: "Hata",
                    description: "KVKK ayarlari yuklenemedi.",
                    variant: "destructive",
                })
            } finally {
                setIsLoading(false)
            }
        }

        load()
    }, [targetUserId, toast, user])

    const saveSettings = async () => {
        if (!user?.uid) return
        setIsSaving(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch("/api/console/settings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    chatbotId: targetUserId,
                    userSettings: {
                        enableKvkkConsent: enabled,
                        kvkkConsentSettings: {
                            customText: customText || null,
                            rejectionContactText: rejectionContactText || null,
                        },
                        // Fallback fields for old implementations reading flat values
                        kvkkCustomText: customText || null,
                        kvkkRejectionContactText: rejectionContactText || null,
                        rejectionContactText: rejectionContactText || null,
                    },
                    chatbotSettings: {
                        enableKvkkConsent: enabled,
                        kvkkConsentSettings: {
                            customText: customText || null,
                            rejectionContactText: rejectionContactText || null,
                        },
                        // Fallback fields for old implementations reading flat values
                        kvkkCustomText: customText || null,
                        kvkkRejectionContactText: rejectionContactText || null,
                        rejectionContactText: rejectionContactText || null,
                    },
                }),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || "Save failed")
            }

            toast({
                title: "Kaydedildi",
                description: "KVKK modulu ayarlari guncellendi.",
            })
        } catch (error: any) {
            console.error("Failed to save KVKK settings:", error)
            toast({
                title: "Hata",
                description: error.message || "KVKK ayarlari kaydedilemedi.",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">KVKK Kabul</h1>
                </div>
                <p className="max-w-3xl text-sm text-muted-foreground">
                    Ziyaretci sohbet baslamadan once KVKK metnini kabul eder. Tenant ozel metin girilmezse super admin tarafinda yayinlanan varsayilan metin kullanilir.
                </p>
            </div>

            {isSuperAdmin && (
                <Card>
                    <CardHeader>
                        <CardTitle>Modul durumu</CardTitle>
                        <CardDescription>Bu ayar tum paketlerde kullanilabilir.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-4">
                        <div>
                            <Label htmlFor="kvkk-enabled" className="text-base font-medium">KVKK kabul modalini aktif et</Label>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Aktif oldugunda ziyaretci kabul etmeden mesaj gonderemez.
                            </p>
                        </div>
                        <Switch id="kvkk-enabled" checked={enabled} onCheckedChange={setEnabled} />
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-center gap-3">
                        <CardTitle>Tenant metni</CardTitle>
                        {publishedVersionId ? <Badge variant="outline">Varsayilan surum: {publishedVersionId}</Badge> : null}
                    </div>
                    <CardDescription>
                        Bu alan bos birakilirsa yayindaki global KVKK metni kullanilir.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="kvkk-rejection-contact-text">Reddedilme Durumu İletişim Metni</Label>
                        <Textarea
                            id="kvkk-rejection-contact-text"
                            value={rejectionContactText}
                            onChange={(event) => setRejectionContactText(event.target.value)}
                            placeholder="Kullanıcı KVKK metnini reddettiğinde ekranda görünecek alternatif iletişim metni (ör: Hizmeti kullanabilmek için onaylamalısınız. İletişim: info@firma.com)"
                            className="min-h-[100px]"
                        />
                        <p className="text-xs text-muted-foreground">Kullanıcı onay metnini reddettiğinde, sohbeti kullanamayacağı için bu iletişim bilgileri gösterilecektir.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="kvkk-custom-text">Tenant ozel metni</Label>
                        <Textarea
                            id="kvkk-custom-text"
                            value={customText}
                            onChange={(event) => setCustomText(event.target.value)}
                            placeholder="Tenant ozel KVKK metnini buraya girin"
                            className="min-h-[220px]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Global varsayilan metin</Label>
                        <div className="rounded-xl border bg-muted/30 p-4">
                            <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-muted-foreground">
                                {defaultText || "Henuz yayinlanmis bir varsayilan KVKK metni yok."}
                            </pre>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={saveSettings} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Kaydet
                </Button>
            </div>
        </div>
    )
}
