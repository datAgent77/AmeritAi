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
import { Loader2, Volume2, Check } from "lucide-react"

interface VoiceSettingsFormProps {
    targetUserId: string
    isSuperAdmin?: boolean
}

export function VoiceSettingsForm({ targetUserId, isSuperAdmin = false }: VoiceSettingsFormProps) {
    const { user } = useAuth()
    const { t } = useLanguage()
    const { toast } = useToast()

    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // ElevenLabs Fields
    const [apiKey, setApiKey] = useState("")
    const [voiceId, setVoiceId] = useState("")
    const [enableElevenLabs, setEnableElevenLabs] = useState(false)

    useEffect(() => {
        const fetchSettings = async () => {
            if (!targetUserId || !user) return
            setIsLoading(true)
            try {
                const token = await user.getIdToken();
                const response = await fetch(`/api/console/settings?chatbotId=${targetUserId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                if (!response.ok) throw new Error("Failed to fetch settings");
                const data = await response.json();

                setApiKey(data.elevenLabsApiKey || "")
                setVoiceId(data.elevenLabsVoiceId || "")
                setEnableElevenLabs(data.enableElevenLabs ?? data.voiceProvider === 'elevenlabs')
            } catch (error) {
                console.error("Error fetching settings:", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchSettings()
    }, [user, targetUserId])

    const handleSave = async () => {
        if (!user) return
        setIsSaving(true)
        const token = await user.getIdToken();

        try {
            const response = await fetch("/api/console/settings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    chatbotId: targetUserId,
                    userSettings: {
                        elevenLabsApiKey: apiKey,
                        elevenLabsVoiceId: voiceId,
                        enableElevenLabs,
                        enableVoiceAssistant: enableElevenLabs,
                        voiceProvider: 'elevenlabs'
                    },
                    chatbotSettings: {
                        enableVoiceAssistant: enableElevenLabs,
                        voiceProvider: 'elevenlabs',
                        enableElevenLabs
                    }
                })
            })

            if (!response.ok) throw new Error("Failed to save settings");

            toast({
                title: t('saveSuccess'),
                description: t('saveSuccessDesc')
            })
        } catch (error) {
            console.error("Error saving settings:", error)
            toast({
                title: t('error'),
                description: t('saveFailedDesc'),
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
        <div className="flex-1 space-y-8 p-8 pt-6 animate-in fade-in duration-500 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t('widgetVoiceSettingsTitle') || 'Widget Voice'}</h2>
                    <p className="text-muted-foreground mt-2">
                        {t('widgetVoiceSettingsDesc') || 'Manage browser-based voice conversations for the web widget.'}
                    </p>
                </div>
                <Button onClick={handleSave} disabled={isSaving} size="lg">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('save')}
                </Button>
            </div>

            {/* ElevenLabs Card */}
            <Card className={`relative overflow-hidden border-2 transition-all ${enableElevenLabs ? 'border-orange-500/50 shadow-md bg-orange-50/50 dark:bg-orange-950/10' : 'border-border/50'}`}>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                <Volume2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">{t('elevenLabsTitle')}</CardTitle>
                                <CardDescription className="mt-1">
                                    {t('elevenLabsDesc')}
                                </CardDescription>
                            </div>
                        </div>
                        <Switch
                            checked={enableElevenLabs}
                            onCheckedChange={setEnableElevenLabs}
                        />
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="apiKey">{t('apiKey')}</Label>
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
                        <Label htmlFor="voiceId">{t('voiceId')}</Label>
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
                        <Volume2 className="w-32 h-32" />
                    </div>
                )}
            </Card>

            {/* Summary Section */}
            <div className="rounded-lg border bg-muted/30 p-4 flex items-start gap-4 text-sm text-muted-foreground">
                <div className="p-2 bg-background rounded-full border shadow-sm">
                    <Check className="h-4 w-4 text-primary" />
                </div>
                <div>
                    <p className="font-medium text-foreground mb-1">{t('configSummary')}</p>
                    <p>
                        {enableElevenLabs
                            ? t('configElevenLabsOnly')
                            : t('configNoEngine')
                        }
                    </p>
                </div>
            </div>
        </div>
    )
}
