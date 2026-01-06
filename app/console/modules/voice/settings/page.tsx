"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Loader2, Zap, Cloud, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useSearchParams } from "next/navigation"

export default function VoiceSettingsPage() {
    const { user } = useAuth()
    const { t } = useLanguage()
    const { t } = useLanguage()
    const { toast } = useToast()
    const searchParams = useSearchParams()

    // Support Impersonation
    const targetUserId = searchParams.get('userId')
    const effectiveUserId = targetUserId || user?.uid

    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // ElevenLabs Fields
    const [apiKey, setApiKey] = useState("")
    const [voiceId, setVoiceId] = useState("")

    // Independent Enable States
    const [enableKlassifier, setEnableKlassifier] = useState(true)
    const [enableElevenLabs, setEnableElevenLabs] = useState(false)

    useEffect(() => {
        const fetchSettings = async () => {
            if (!effectiveUserId) return
            setIsLoading(true)
            try {
                const response = await fetch(`/api/console/settings?chatbotId=${effectiveUserId}`);
                if (!response.ok) throw new Error("Failed to fetch settings");
                const data = await response.json();

                setApiKey(data.elevenLabsApiKey || "")
                setVoiceId(data.elevenLabsVoiceId || "")

                // Initialize independent states based on saved data
                // If new fields don't exist yet, infer from legacy 'voiceProvider' and 'enableVoiceAssistant'
                if (data.enableKlassifier !== undefined) {
                    setEnableKlassifier(data.enableKlassifier)
                } else {
                    // Fallback: If provider is Klassifier (or default) and assistant is active
                    setEnableKlassifier(data.voiceProvider === 'klassifier' || !data.voiceProvider)
                }

                if (data.enableElevenLabs !== undefined) {
                    setEnableElevenLabs(data.enableElevenLabs)
                } else {
                    // Fallback: If provider is ElevenLabs and assistant is active
                    setEnableElevenLabs(data.voiceProvider === 'elevenlabs')
                }

            } catch (error) {
                console.error("Error fetching settings:", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchSettings()
        fetchSettings()
    }, [user, effectiveUserId])

    const handleSave = async () => {
        if (!user) return
        setIsSaving(true)
        const token = await user.getIdToken();

        // Determine primary provider for backward compatibility
        // If both enabled, prefer ElevenLabs (or logic could be different)
        // If only one enabled, pick that.
        // If neither, disable main toggle.
        let primaryProvider = "klassifier"
        if (enableElevenLabs) primaryProvider = "elevenlabs"

        const isMainActive = enableKlassifier || enableElevenLabs

        try {
            const response = await fetch("/api/console/settings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    body: JSON.stringify({
                        chatbotId: effectiveUserId,
                        userSettings: {
                            elevenLabsApiKey: apiKey,
                            elevenLabsVoiceId: voiceId,
                            // Save independent states
                            enableKlassifier: enableKlassifier,
                            enableElevenLabs: enableElevenLabs,

                            // Maintain legacy fields for backward compatibility
                            enableVoiceAssistant: isMainActive,
                            voiceProvider: primaryProvider
                        },
                        chatbotSettings: {
                            enableVoiceAssistant: isMainActive,
                            voiceProvider: primaryProvider,
                            // Also save specific flags if chatbot needs them directly
                            enableKlassifier: enableKlassifier,
                            enableElevenLabs: enableElevenLabs
                        }
                    })
                });

                if(!response.ok) throw new Error("Failed to save settings");

            toast({
                title: t('saveSuccess') || "Ayarlar Başarıyla Kaydedildi",
                description: t('saveSuccessDesc') || "Sesli asistan tercihleriniz güncellendi."
            })
        } catch (error) {
            console.error("Error saving settings:", error)
            toast({
                title: t('error') || "Hata",
                description: "Ayarlar kaydedilemedi.",
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
        <div className="flex-1 space-y-8 p-8 pt-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t('voiceSettingsTitle') || "Sesli Asistan Ayarları"}</h2>
                    <p className="text-muted-foreground mt-2">
                        {t('voiceSettingsDesc') || "Yapay zeka ses motorlarını yönetin ve yapılandırın."}
                    </p>
                </div>
                <Button onClick={handleSave} disabled={isSaving} size="lg">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('save') || "Kaydet"}
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Klassifier Card */}
                <Card className={`relative overflow-hidden border-2 transition-all ${enableKlassifier ? 'border-primary/50 shadow-md bg-primary/5' : 'border-border/50 opacity-90'}`}>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                    <Zap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <CardTitle className="text-lg">{t('klassifierTitle') || "Klassifier"}</CardTitle>
                            </div>
                            <Switch
                                checked={enableKlassifier}
                                onCheckedChange={setEnableKlassifier}
                            />
                        </div>
                        <CardDescription className="mt-2 min-h-[3rem]">
                            {t('klassifierDesc') || "Düşük gecikmeli ve yüksek performanslı yerel ses servisimiz."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('defaultVoice') || "Varsayılan Ses"}</Label>
                            <Input disabled value="Derya (Türkçe)" className="bg-background/50" />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mt-2">
                            <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">Ücretsiz</Badge>
                            <span className="text-xs">Sınırsız kullanım</span>
                        </div>
                    </CardContent>
                    {enableKlassifier && (
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <Zap className="w-32 h-32" />
                        </div>
                    )}
                </Card>

                {/* ElevenLabs Card */}
                <Card className={`relative overflow-hidden border-2 transition-all ${enableElevenLabs ? 'border-orange-500/50 shadow-md bg-orange-50/50 dark:bg-orange-950/10' : 'border-border/50 opacity-90'}`}>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                    <Cloud className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                </div>
                                <CardTitle className="text-lg">{t('elevenLabsTitle') || "ElevenLabs"}</CardTitle>
                            </div>
                            <Switch
                                checked={enableElevenLabs}
                                onCheckedChange={setEnableElevenLabs}
                            />
                        </div>
                        <CardDescription className="mt-2 min-h-[3rem]">
                            {t('elevenLabsDesc') || "Dünyanın en gelişmiş yapay zeka ses teknolojisi."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="apiKey">{t('apiKey') || "API Anahtarı"}</Label>
                            <Input
                                id="apiKey"
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk_..."
                                disabled={!enableElevenLabs}
                                className={!enableElevenLabs ? "opacity-50" : ""}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="voiceId">{t('voiceId') || "Voice ID"}</Label>
                            <Input
                                id="voiceId"
                                value={voiceId}
                                onChange={(e) => setVoiceId(e.target.value)}
                                placeholder="21m00Tcm4TlvDq8ikWAM"
                                disabled={!enableElevenLabs}
                                className={!enableElevenLabs ? "opacity-50" : ""}
                            />
                            {enableElevenLabs && (
                                <p className="text-xs text-muted-foreground">
                                    Örnek: Rachel (21m00Tcm4TlvDq8ikWAM)
                                </p>
                            )}
                        </div>
                    </CardContent>
                    {enableElevenLabs && (
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <Cloud className="w-32 h-32" />
                        </div>
                    )}
                </Card>
            </div>

            {/* Summary / Confirmation Section */}
            <div className="rounded-lg border bg-muted/30 p-4 flex items-start gap-4 text-sm text-muted-foreground">
                <div className="p-2 bg-background rounded-full border shadow-sm">
                    <Check className="h-4 w-4 text-primary" />
                </div>
                <div>
                    <p className="font-medium text-foreground mb-1">Yapılandırma Özeti</p>
                    <p>
                        {enableKlassifier && enableElevenLabs
                            ? "Her iki ses motoru da etkinleştirildi. Sistem, duruma göre en uygun motoru kullanacaktır (ElevenLabs öncelikli)."
                            : enableKlassifier
                                ? "Sadece Klassifier (Yerel) motoru aktif. Hızlı ve ekonomik yanıtlar için kullanılacak."
                                : enableElevenLabs
                                    ? "Sadece ElevenLabs motoru aktif. Yüksek kaliteli ses yanıtları için kullanılacak."
                                    : "Her iki ses motoru da devre dışı. Sesli asistan özelliği kullanılmayacak."
                        }
                    </p>
                </div>
            </div>
        </div>
    )
}
