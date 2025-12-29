"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Mic, Save, Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"

export default function VoiceSettingsPage() {
    const { user } = useAuth()
    const { t } = useLanguage()
    const { toast } = useToast()
    const router = useRouter()

    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [apiKey, setApiKey] = useState("")
    const [voiceId, setVoiceId] = useState("")
    const [isActive, setIsActive] = useState(false)
    const [provider, setProvider] = useState<"klassifier" | "elevenlabs">("klassifier")

    useEffect(() => {
        const fetchSettings = async () => {
            if (!user) return
            setIsLoading(true)
            try {
                const response = await fetch(`/api/console/settings?chatbotId=${user.uid}`);
                if (!response.ok) throw new Error("Failed to fetch settings");
                const data = await response.json();

                setApiKey(data.elevenLabsApiKey || "")
                setVoiceId(data.elevenLabsVoiceId || "")
                setIsActive(data.enableVoiceAssistant || false)
                setProvider(data.voiceProvider || "klassifier")
            } catch (error) {
                console.error("Error fetching settings:", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchSettings()
    }, [user])

    const handleSave = async () => {
        if (!user) return
        const token = await user.getIdToken();
        try {
            const response = await fetch("/api/console/settings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    chatbotId: user.uid,
                    userSettings: {
                        elevenLabsApiKey: apiKey,
                        elevenLabsVoiceId: voiceId,
                        enableVoiceAssistant: isActive,
                        voiceProvider: provider
                    },
                    chatbotSettings: {
                        enableVoiceAssistant: isActive,
                        voiceProvider: provider
                    }
                })
            });

            if (!response.ok) throw new Error("Failed to save settings");

            toast({
                title: t('settingsSaved') || "Ayarlar Kaydedildi",
                description: t('settingsSavedDesc') || "Sesli asistan ayarlarınız güncellendi."
            })
        } catch (error) {
            console.error("Error saving settings:", error)
            toast({
                title: t('error') || "Error", // Use translated generic error if key missing
                description: "Failed to save settings.",
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 animate-in fade-in duration-500">
            <div className="flex items-center space-x-2 mb-6">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('back') || "Geri"}
                </Button>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t('voiceAssistant') || "Sesli Asistan"}</h2>
                    <p className="text-muted-foreground">
                        {t('voiceAssistantSettingsDesc') || "ElevenLabs API anahtarınızı ve ses ID'nizi yapılandırın."}
                    </p>
                </div>
            </div>

            <div className="grid gap-6 max-w-2xl">
                <Card>
                    <CardHeader>
                        <CardTitle>Genel Ayarlar</CardTitle>
                        <CardDescription>
                            Sesli asistanın temel durumunu ve tercih edilen motoru belirleyin.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Modül Durumu</Label>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={isActive}
                                    onCheckedChange={setIsActive}
                                />
                                <span className={isActive ? "text-green-600 font-medium" : "text-gray-500"}>
                                    {isActive ? (t('active') || "Aktif") : (t('inactive') || "Pasif")}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label>Ses Sağlayıcısı (Provider)</Label>
                            <Tabs value={provider} onValueChange={(v: any) => setProvider(v)} className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="klassifier">Klassifier</TabsTrigger>
                                    <TabsTrigger value="elevenlabs">ElevenLabs</TabsTrigger>
                                </TabsList>

                                <TabsContent value="klassifier" className="space-y-4 pt-4">
                                    <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
                                        <p className="text-sm text-indigo-700 dark:text-indigo-300">
                                            <strong>Klassifier:</strong> Düşük gecikmeli ve yüksek performanslı ses servisimizdir. Türkçe için optimize edilmiştir.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Varsayılan Ses</Label>
                                        <Input disabled value="Derya (Türkçe)" />
                                    </div>
                                </TabsContent>

                                <TabsContent value="elevenlabs" className="space-y-4 pt-4">
                                    <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900">
                                        <p className="text-sm text-orange-700 dark:text-orange-300">
                                            <strong>ElevenLabs:</strong> Dünyanın en gelişmiş yapay zeka ses teknolojisidir. Kendi ses ID&apos;lerinizi kullanabilirsiniz.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="apiKey">API Key (xi-api-key)</Label>
                                        <Input
                                            id="apiKey"
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            placeholder="sk_..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="voiceId">Voice ID</Label>
                                        <Input
                                            id="voiceId"
                                            value={voiceId}
                                            onChange={(e) => setVoiceId(e.target.value)}
                                            placeholder="21m00Tcm4TlvDq8ikWAM"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Varsayılan Rachel: 21m00Tcm4TlvDq8ikWAM
                                        </p>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>

                        <div className="pt-4 border-t">
                            <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('saveChanges') || "Değişiklikleri Kaydet"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
