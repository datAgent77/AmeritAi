"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Zap, CloudLightning, Clock, Loader2 } from "lucide-react"

interface CampaignConfig {
    rainyDay: {
        enabled: boolean
        discount: number
    }
    happyHour: {
        enabled: boolean
        startTime: string
        endTime: string
    }
    flashSale: {
        enabled: boolean
        prompt: string
    }
}

const defaultConfig: CampaignConfig = {
    rainyDay: { enabled: false, discount: 20 },
    happyHour: { enabled: false, startTime: "16:00", endTime: "19:00" },
    flashSale: { enabled: false, prompt: "" }
}

interface CampaignManagerFormProps {
    targetUserId: string
    isSuperAdmin?: boolean
}

export function CampaignManagerForm({ targetUserId, isSuperAdmin = false }: CampaignManagerFormProps) {
    const { user } = useAuth()
    const { t } = useLanguage()
    const { toast } = useToast()

    const [config, setConfig] = useState<CampaignConfig>(defaultConfig)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    const loadConfig = useCallback(async () => {
        setIsLoading(true)
        try {
            const token = await user?.getIdToken()
            const res = await fetch(`/api/widget-settings?chatbotId=${targetUserId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                if (data.campaigns) {
                    setConfig(prev => ({ ...prev, ...data.campaigns }))
                }
            }
        } catch (error) {
            console.error("Failed to load config", error)
        } finally {
            setIsLoading(false)
        }
    }, [targetUserId, user])

    useEffect(() => {
        if (targetUserId && user) {
            loadConfig()
        }
    }, [targetUserId, user, loadConfig])

    const saveConfig = async () => {
        if (!user?.uid) return
        setIsSaving(true)
        try {
            const idToken = await user.getIdToken()
            const response = await fetch('/api/widget-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    chatbotId: targetUserId,
                    campaigns: config
                })
            })

            if (!response.ok) throw new Error('Save failed')

            toast({
                title: t('settingsSaved') || "Ayarlar Kaydedildi",
                description: "Kampanya ayarlarınız güncellendi."
            })
        } catch (error) {
            console.error("Failed to save campaign config:", error)
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
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const campaignCardClass = (enabled: boolean) =>
        `border transition-all ${enabled ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white"}`

    return (
        <div className="flex-1 space-y-6 animate-in fade-in duration-500">
            <section className="rounded-2xl border border-zinc-900 bg-black p-6 text-white">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Campaign Manager</p>
                        <h2 className="text-2xl font-semibold tracking-tight">
                            {t('modules.campaignManager') || "Campaign Wizard"}
                        </h2>
                        <p className="text-sm text-zinc-300">
                            {t('modules.campaignManagerDesc') || "Create instant deals and happy hours driven by AI"}
                        </p>
                        {isSuperAdmin && (
                            <p className="text-xs text-zinc-400">Tenant scope: {targetUserId}</p>
                        )}
                    </div>
                    <Button onClick={saveConfig} disabled={isSaving} className="bg-white text-black hover:bg-zinc-200">
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('save') || "Kaydet"}
                    </Button>
                </div>
            </section>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className={campaignCardClass(config.rainyDay.enabled)}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CloudLightning className="h-5 w-5 text-zinc-800" />
                            Rainy Day Special
                        </CardTitle>
                        <CardDescription>
                            Automatically offers &quot;Hot Coffee + Cookie&quot; deal when local weather is rainy.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                                <Label>Enable</Label>
                                <Switch
                                    checked={config.rainyDay.enabled}
                                    onCheckedChange={(checked) => setConfig(prev => ({
                                        ...prev,
                                        rainyDay: { ...prev.rainyDay, enabled: checked }
                                    }))}
                                />
                            </div>
                            <div className="flex justify-between items-center rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                                <span className="font-medium text-sm">Discount</span>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        className="w-20"
                                        value={config.rainyDay.discount}
                                        onChange={(e) => setConfig(prev => ({
                                            ...prev,
                                            rainyDay: { ...prev.rainyDay, discount: parseInt(e.target.value) || 0 }
                                        }))}
                                    />
                                    <span>%</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className={campaignCardClass(config.happyHour.enabled)}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-zinc-800" />
                            Happy Hour
                        </CardTitle>
                        <CardDescription>
                            Offers &quot;2 for 1&quot; on beverages during set hours.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                                <Label>Enable</Label>
                                <Switch
                                    checked={config.happyHour.enabled}
                                    onCheckedChange={(checked) => setConfig(prev => ({
                                        ...prev,
                                        happyHour: { ...prev.happyHour, enabled: checked }
                                    }))}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-xs">Start</Label>
                                    <Input
                                        type="time"
                                        value={config.happyHour.startTime}
                                        onChange={(e) => setConfig(prev => ({
                                            ...prev,
                                            happyHour: { ...prev.happyHour, startTime: e.target.value }
                                        }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">End</Label>
                                    <Input
                                        type="time"
                                        value={config.happyHour.endTime}
                                        onChange={(e) => setConfig(prev => ({
                                            ...prev,
                                            happyHour: { ...prev.happyHour, endTime: e.target.value }
                                        }))}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className={campaignCardClass(config.flashSale.enabled)}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-zinc-800" />
                            Custom Flash Sale
                        </CardTitle>
                        <CardDescription>
                            Create a custom prompt injection for specific items.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                                <Label>Enable</Label>
                                <Switch
                                    checked={config.flashSale.enabled}
                                    onCheckedChange={(checked) => setConfig(prev => ({
                                        ...prev,
                                        flashSale: { ...prev.flashSale, enabled: checked }
                                    }))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Campaign Prompt</Label>
                                <Input
                                    placeholder='e.g. "Suggest Tiramisu for dessert"'
                                    value={config.flashSale.prompt}
                                    onChange={(e) => setConfig(prev => ({
                                        ...prev,
                                        flashSale: { ...prev.flashSale, prompt: e.target.value }
                                    }))}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-zinc-200 bg-white shadow-sm">
                <CardHeader>
                    <CardTitle>AI Injection Preview</CardTitle>
                    <CardDescription>How the AI sees active campaigns</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg bg-black p-4 font-mono text-sm text-zinc-100">
                        {`{
  "activeCampaigns": [
    ${config.rainyDay.enabled ? '"Rainy Day",' : ''}
    ${config.happyHour.enabled ? '"Happy Hour",' : ''}
    ${config.flashSale.enabled ? '"Flash Sale"' : ''}
  ],
  "instructions": "${config.rainyDay.enabled
                                ? `Suggest warm drinks and offer ${config.rainyDay.discount}% discount on coffee combos.`
                                : config.happyHour.enabled
                                    ? `Current time is within Happy Hour (${config.happyHour.startTime}-${config.happyHour.endTime}). Offer 2-for-1 on all beverages.`
                                    : config.flashSale.enabled && config.flashSale.prompt
                                        ? config.flashSale.prompt
                                        : "No active campaigns. Stick to standard menu."
                            }"
}`}
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={saveConfig} disabled={isSaving} className="bg-black text-white hover:bg-zinc-800">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('save') || "Kaydet"}
                </Button>
            </div>
        </div>
    )
}
