"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Gift, MousePointerClick, Loader2, Save, Wand2, Plus, Trash2, ArrowDown, Timer } from "lucide-react"

interface Prize {
    name: string
    probability: number
    quantityLimit?: number
}

interface GamificationConfig {
    enabled: boolean
    gameType: "wheel" | "scratch" | "mystery" | "slot"
    requireEmail: boolean
    cooldownHours: number
    themeColor: string
    title: string
    description: string
    buttonText: string
    prizes: Prize[]
    triggers: {
        exitIntent: boolean
        onEntry: boolean
        entryDelay: number
        onScroll: boolean
        scrollPercentage: number
        onInactivity: boolean
        inactivitySeconds: number
    }
}

const defaultConfig: GamificationConfig = {
    enabled: false,
    gameType: "wheel",
    requireEmail: true,
    cooldownHours: 24,
    themeColor: "#8b5cf6",
    title: "Şansını Dene!",
    description: "Hemen oyna ve sürpriz ödüllerden birini kazanma şansı yakala.",
    buttonText: "Hemen Oyna",
    prizes: [
        { name: "10% OFF", probability: 50 },
        { name: "Free Coffee", probability: 30 },
        { name: "Try Again", probability: 20 }
    ],
    triggers: {
        exitIntent: true,
        onEntry: false,
        entryDelay: 5,
        onScroll: false,
        scrollPercentage: 50,
        onInactivity: false,
        inactivitySeconds: 30
    }
}

interface GamificationSettingsFormProps {
    targetUserId: string
    isSuperAdmin?: boolean
}

export function GamificationSettingsForm({ targetUserId, isSuperAdmin = false }: GamificationSettingsFormProps) {
    const { user, role } = useAuth()
    const isSysAdmin = role === 'SUPER_ADMIN' || role === 'AGENCY_ADMIN';
    const { t } = useLanguage()
    const { toast } = useToast()

    const [config, setConfig] = useState<GamificationConfig>(defaultConfig)
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
                if (data.gamification) {
                    setConfig(prev => ({ ...prev, ...data.gamification }))
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
                    gamification: config
                })
            })

            if (!response.ok) throw new Error('Save failed')

            toast({
                title: t('settingsSaved') || "Ayarlar Kaydedildi",
                description: "Gamification ayarlarınız güncellendi."
            })
        } catch (error) {
            console.error("Failed to save gamification config:", error)
            toast({
                title: t('error') || "Hata",
                description: "Ayarlar kaydedilemedi.",
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    const updatePrize = (index: number, field: keyof Prize, value: string | number | undefined) => {
        setConfig(prev => ({
            ...prev,
            prizes: prev.prizes.map((p, i) => i === index ? { ...p, [field]: value } : p)
        }))
    }

    const addPrize = () => {
        setConfig(prev => ({
            ...prev,
            prizes: [...prev.prizes, { name: "", probability: 0 }]
        }))
    }

    const removePrize = (index: number) => {
        if (config.prizes.length <= 2) {
            toast({
                title: "Uyarı",
                description: "En az 2 ödül bulunmalıdır.",
                variant: "destructive"
            })
            return
        }
        setConfig(prev => ({
            ...prev,
            prizes: prev.prizes.filter((_, i) => i !== index)
        }))
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-8 p-8 pt-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            {t('modules.gamification') || "Gamification & Wheel"}
                        </h2>
                        <p className="text-muted-foreground">
                            Özelleştirilebilir çarkıfelek, kazı kazan, gizemli kutu ve slot makinesi oyunlarıyla ziyaretçilerinizi etkileşime teşvik edin.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border px-3 py-2 rounded-lg">
                        <Label htmlFor="game-enable" className="text-sm font-medium cursor-pointer">Oyunu Etkinleştir</Label>
                        <Switch
                            id="game-enable"
                            checked={config.enabled}
                            onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
                        />
                    </div>
                    <Button onClick={saveConfig} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {t('save') || "Kaydet"}
                    </Button>
                </div>
            </div>

            <Tabs 
                value={config.gameType || "wheel"} 
                onValueChange={(val) => setConfig(prev => ({ ...prev, gameType: val as any }))}
                className="space-y-8"
            >
                {/* GAME SPECIFIC SETTINGS */}
                <Card className="border-2 border-violet-100 dark:border-violet-900/20 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                        <Wand2 className="w-48 h-48" />
                    </div>
                    <CardHeader>
                        <CardTitle>Oyun Ayarları & Ödüller</CardTitle>
                        <CardDescription>
                            {config.gameType === "wheel" && "Çarkıfelek dilimlerinde yer alacak ödülleri ve kazanma olasılıklarını belirleyin."}
                            {config.gameType === "scratch" && "Ziyaretçilerin kazıdıklarında karşılarına çıkacak ödülleri ve olasılıkları belirleyin."}
                            {config.gameType === "mystery" && "Kutulardan çıkabilecek ödülleri ve kazanma olasılıklarını belirleyin."}
                            {config.gameType === "slot" && "Slot makinesi eşleştiğinde verilecek ödülleri ve kazanma olasılıklarını belirleyin."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 relative z-10">
                        <div className="flex justify-center -mt-2 mb-4">
                            <TabsList className="grid w-full grid-cols-4 h-11 bg-zinc-100/80 dark:bg-zinc-800/80 p-1">
                                <TabsTrigger value="wheel" className="text-xs sm:text-sm">Çarkıfelek</TabsTrigger>
                                <TabsTrigger value="scratch" className="text-xs sm:text-sm">Kazı Kazan</TabsTrigger>
                                <TabsTrigger value="mystery" className="text-xs sm:text-sm">Gizemli Kutu</TabsTrigger>
                                <TabsTrigger value="slot" className="text-xs sm:text-sm">Slot Makinesi</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Oyun Başlığı</Label>
                                <Input 
                                    value={config.title} 
                                    onChange={e => setConfig(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Örn: Şansını Dene!"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Buton Metni</Label>
                                <Input 
                                    value={config.buttonText} 
                                    onChange={e => setConfig(prev => ({ ...prev, buttonText: e.target.value }))}
                                    placeholder="Örn: Hemen Oyna"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>Açıklama Metni</Label>
                                <Input 
                                    value={config.description} 
                                    onChange={e => setConfig(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Örn: Hemen oyna ve sürpriz ödüllerden birini kazan..."
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-base">Ödüller (Olasılık & Limit)</Label>
                                <Button variant="outline" size="sm" onClick={addPrize} className="h-8 gap-2">
                                    <Plus className="w-4 h-4" />
                                    Ödül Ekle
                                </Button>
                            </div>
                            
                            <div className="space-y-3">
                                {config.prizes.map((prize, index) => (
                                    <div key={index} className="flex gap-3 items-center bg-white dark:bg-zinc-950 p-2 rounded-lg border shadow-sm group">
                                        <div className="flex-1">
                                            <Input
                                                placeholder="Ödül adı (Örn: %10 İndirim)"
                                                value={prize.name}
                                                onChange={(e) => updatePrize(index, 'name', e.target.value)}
                                                className="border-0 shadow-none focus-visible:ring-0 px-2"
                                            />
                                        </div>
                                        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800" />
                                        <div className="flex items-center gap-2 px-2">
                                            <Label className="text-xs text-muted-foreground w-12 text-right">Şans:</Label>
                                            <Input
                                                className="w-16 h-8 text-center"
                                                placeholder="%"
                                                type="number"
                                                value={prize.probability}
                                                onChange={(e) => updatePrize(index, 'probability', parseInt(e.target.value) || 0)}
                                            />
                                            <span className="text-xs text-muted-foreground">%</span>
                                        </div>
                                        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800" />
                                        <div className="flex items-center gap-2 px-2">
                                            <Label className="text-xs text-muted-foreground w-12 text-right">Limit:</Label>
                                            <Input
                                                className="w-20 h-8 text-center"
                                                placeholder="Sınırsız"
                                                type="number"
                                                value={prize.quantityLimit || ''}
                                                onChange={(e) => updatePrize(index, 'quantityLimit', parseInt(e.target.value) || undefined)}
                                            />
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => removePrize(index)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">Toplam olasılığın 100% olmasına dikkat edin. Limit alanını boş bırakırsanız ödül sınırsız sayıda verilebilir.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* GENERAL SETTINGS */}
                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle>Genel Ayarlar ve Tasarım</CardTitle>
                            <CardDescription>Oyunun çalışma kurallarını ve görsel temasını belirleyin.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 border rounded-xl bg-zinc-50 dark:bg-zinc-900/50">
                                <div>
                                    <div className="font-medium">E-posta Zorunluluğu</div>
                                    <div className="text-xs text-muted-foreground mt-1">Kullanıcılar oynamadan önce e-posta adresi girmek zorunda kalsın. (Lead toplamak için önerilir)</div>
                                </div>
                                <Switch
                                    checked={config.requireEmail ?? true}
                                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, requireEmail: checked }))}
                                />
                            </div>

                            <div className="space-y-3 p-4 border rounded-xl">
                                <Label className="font-medium">Yeniden Oynama Süresi (Saat)</Label>
                                <Input 
                                    type="number" 
                                    value={config.cooldownHours ?? 24} 
                                    onChange={e => setConfig(prev => ({ ...prev, cooldownHours: parseInt(e.target.value) || 0 }))} 
                                    className="max-w-[200px]"
                                />
                                <div className="text-xs text-muted-foreground">Aynı kullanıcının tekrar oynayabilmesi için geçmesi gereken süre. Her zaman oynayabilmesi için 0 yapın.</div>
                            </div>

                            <div className="space-y-3 p-4 border rounded-xl">
                                <Label className="font-medium">Tema Rengi</Label>
                                <div className="flex items-center gap-4">
                                    <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 shadow-sm shrink-0">
                                        <input 
                                            type="color" 
                                            className="absolute inset-[-10px] w-20 h-20 cursor-pointer"
                                            value={config.themeColor || "#8b5cf6"} 
                                            onChange={e => setConfig(prev => ({ ...prev, themeColor: e.target.value }))} 
                                        />
                                    </div>
                                    <Input 
                                        type="text" 
                                        value={config.themeColor || "#8b5cf6"} 
                                        onChange={e => setConfig(prev => ({ ...prev, themeColor: e.target.value }))} 
                                        className="font-mono text-sm max-w-[140px]"
                                    />
                                </div>
                                <div className="text-xs text-muted-foreground">Oyun pencerelerinin üst çubuğu ve ana butonlarında bu renk kullanılır.</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle>Tetikleyiciler (Triggers)</CardTitle>
                            <CardDescription>Oyun penceresinin ziyaretçilere hangi durumlarda gösterileceğini seçin.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                <div className="flex gap-4">
                                    <div className="mt-1">
                                        <MousePointerClick className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <div className="font-medium">Çıkış Niyeti (Exit Intent)</div>
                                        <div className="text-xs text-muted-foreground mt-1">Ziyaretçi faresiyle sekmeyi kapatmaya veya sayfadan ayrılmaya yöneldiğinde oyunu gösterir.</div>
                                    </div>
                                </div>
                                <Switch
                                    checked={config.triggers.exitIntent}
                                    onCheckedChange={(checked) => setConfig(prev => ({
                                        ...prev,
                                        triggers: { ...prev.triggers, exitIntent: checked }
                                    }))}
                                />
                            </div>
                            
                            <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                <div className="flex gap-4">
                                    <div className="mt-1">
                                        <Gift className="h-5 w-5 text-purple-500" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium">Girişte (On Entry)</div>
                                        <div className="text-xs text-muted-foreground mt-1">Sayfa yüklendikten sonra otomatik gösterir.</div>
                                        {config.triggers.onEntry && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <Label className="text-xs">Gecikme (sn):</Label>
                                                <Input 
                                                    type="number" 
                                                    className="w-16 h-7 text-xs" 
                                                    value={config.triggers.entryDelay}
                                                    onChange={e => setConfig(prev => ({ ...prev, triggers: { ...prev.triggers, entryDelay: parseInt(e.target.value) || 0 } }))}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Switch
                                    checked={config.triggers.onEntry}
                                    onCheckedChange={(checked) => setConfig(prev => ({
                                        ...prev,
                                        triggers: { ...prev.triggers, onEntry: checked }
                                    }))}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                <div className="flex gap-4">
                                    <div className="mt-1">
                                        <ArrowDown className="h-5 w-5 text-emerald-500" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium">Kaydırma (On Scroll)</div>
                                        <div className="text-xs text-muted-foreground mt-1">Ziyaretçi sayfanın %X&apos;ini kaydırdığında gösterir.</div>
                                        {config.triggers.onScroll && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <Label className="text-xs">Kaydırma (%):</Label>
                                                <Input 
                                                    type="number" 
                                                    className="w-16 h-7 text-xs" 
                                                    value={config.triggers.scrollPercentage}
                                                    onChange={e => setConfig(prev => ({ ...prev, triggers: { ...prev.triggers, scrollPercentage: parseInt(e.target.value) || 0 } }))}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Switch
                                    checked={config.triggers.onScroll}
                                    onCheckedChange={(checked) => setConfig(prev => ({
                                        ...prev,
                                        triggers: { ...prev.triggers, onScroll: checked }
                                    }))}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                <div className="flex gap-4">
                                    <div className="mt-1">
                                        <Timer className="h-5 w-5 text-orange-500" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium">Hareketsizlik (Inactivity)</div>
                                        <div className="text-xs text-muted-foreground mt-1">Ziyaretçi X saniye boyunca hareketsiz kaldığında gösterir.</div>
                                        {config.triggers.onInactivity && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <Label className="text-xs">Süre (sn):</Label>
                                                <Input 
                                                    type="number" 
                                                    className="w-16 h-7 text-xs" 
                                                    value={config.triggers.inactivitySeconds}
                                                    onChange={e => setConfig(prev => ({ ...prev, triggers: { ...prev.triggers, inactivitySeconds: parseInt(e.target.value) || 0 } }))}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Switch
                                    checked={config.triggers.onInactivity}
                                    onCheckedChange={(checked) => setConfig(prev => ({
                                        ...prev,
                                        triggers: { ...prev.triggers, onInactivity: checked }
                                    }))}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </Tabs>
        </div>
    )
}
