"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Save, Loader2 } from "lucide-react"

import { EngagementSettings, defaultSettings, BubbleMessage } from "./types"
import { EngagementDesignTab } from "./tabs/design-tab"
import { EngagementTriggersTab } from "./tabs/triggers-tab"
import { EngagementAITab } from "./tabs/ai-tab"
import { EngagementPreview } from "./components/preview-panel"

interface EngagementSettingsFormProps {
    targetUserId: string
    isSuperAdmin?: boolean
}

export function EngagementSettingsForm({ targetUserId, isSuperAdmin = false }: EngagementSettingsFormProps) {
    const { user } = useAuth()
    const { t } = useLanguage()
    const { toast } = useToast()
    const effectiveUserId = targetUserId

    const [settings, setSettings] = useState<EngagementSettings>(defaultSettings)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [activeTab, setActiveTab] = useState("design")
    const [sector, setSector] = useState<string>("")

    // Sector Templates
    const sectorTemplates: Record<string, BubbleMessage[]> = {
        'e-commerce': [
            { id: 'ec1', text: '👀 Bu ürüne bakanlar şunları da inceledi...', delay: 5, isActive: true },
            { id: 'ec2', text: '⚡️ Sadece bugüne özel %10 indirim kodunuz: VION10', delay: 30, isActive: true },
            { id: 'ec3', text: '📦 Kargo bedava fırsatını kaçırmayın!', delay: 60, isActive: true }
        ],
        'health': [
            { id: 'h1', text: '👋 Merhaba, randevu almak ister misiniz?', delay: 3, isActive: true },
            { id: 'h2', text: '🩺 Uzman doktorlarımız sorularınızı bekliyor.', delay: 20, isActive: true },
            { id: 'h3', text: '🚑 Acil bir durum mu var? Bize hemen ulaşın.', delay: 45, isActive: true }
        ],
        'education': [
            { id: 'ed1', text: '🎓 Hangi eğitim programı size uygun? Testi çözün.', delay: 5, isActive: true },
            { id: 'ed2', text: '📚 Ücretsiz deneme dersi almak için tıklayın.', delay: 25, isActive: true }
        ],
        'corporate': [
            { id: 'c1', text: '🤝 Projeniz için fiyat teklifi almak ister misiniz?', delay: 5, isActive: true },
            { id: 'c2', text: '💼 Referanslarımızı incelediniz mi?', delay: 20, isActive: true }
        ],
        'booking': [ // Travel/Tourism
            { id: 'b1', text: '🌴 Erken rezervasyon fırsatlarını gördünüz mü?', delay: 5, isActive: true },
            { id: 'b2', text: '✈️ Uçak bileti aramalarında yardımcı olabilirim.', delay: 15, isActive: true }
        ]
    }

    const loadSettings = useCallback(async () => {
        if (!effectiveUserId) return
        setIsLoading(true)
        try {
            // Fetch chatbot details for Sector
            const chatbotRef = doc(db, "chatbots", effectiveUserId);
            const chatbotSnap = await getDoc(chatbotRef);
            let currentSector = 'general';
            if (chatbotSnap.exists()) {
                currentSector = chatbotSnap.data().sector || 'general';
                setSector(currentSector);
            }

            const response = await fetch(`/api/widget-settings?chatbotId=${effectiveUserId}`)
            if (response.ok) {
                const data = await response.json()
                if (data.engagement) {
                    setSettings(prev => ({
                        ...prev,
                        ...data.engagement,
                        bubble: {
                            ...prev.bubble,
                            ...(data.engagement.bubble || {}),
                            messages: (data.engagement.bubble?.messages?.length > 0)
                                ? data.engagement.bubble.messages
                                : [], // Legacy Global Pool
                            style: {
                                ...prev.bubble.style,
                                ...(data.engagement.bubble?.style || {})
                            }
                        },
                        triggers: {
                            ...prev.triggers,
                            ...(data.engagement.triggers || {}),
                            // Auto-populate Sector Templates if empty
                            exitIntentMessages: (data.engagement.triggers?.exitIntentMessages?.length > 0)
                                ? data.engagement.triggers.exitIntentMessages
                                : (sectorTemplates[currentSector.toLowerCase()] || []).slice(0, 1),
                            timeOnPageMessages: (data.engagement.triggers?.timeOnPageMessages?.length > 0)
                                ? data.engagement.triggers.timeOnPageMessages
                                : (sectorTemplates[currentSector.toLowerCase()] || []).slice(1),
                        },
                        aiSmartBubbles: {
                            ...prev.aiSmartBubbles,
                            ...(data.engagement.aiSmartBubbles || {})
                        }
                    }))
                } else if (currentSector && sectorTemplates[currentSector.toLowerCase()]) {
                    // No previous settings, but we have a sector -> Preload templates
                    const defaultMsgs = sectorTemplates[currentSector.toLowerCase()];
                    setSettings(prev => ({
                        ...prev,
                        triggers: {
                            ...prev.triggers,
                            exitIntentMessages: defaultMsgs.slice(0, 1),
                            timeOnPageMessages: defaultMsgs.slice(1)
                        }
                    }))
                }
            }
        } catch (error) {
            console.error("Failed to load engagement settings:", error)
        } finally {
            setIsLoading(false)
        }
    }, [effectiveUserId])

    useEffect(() => {
        if (effectiveUserId) {
            loadSettings()
        }
    }, [effectiveUserId, loadSettings])

    const saveSettings = async () => {
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
                    chatbotId: effectiveUserId,
                    engagement: settings
                })
            })

            if (!response.ok) throw new Error('Save failed')

            toast({
                title: t('settingsSaved') || "Ayarlar Kaydedildi",
                description: "Proaktif etkileşim ayarlarınız güncellendi."
            })
        } catch (error) {
            console.error("Failed to save engagement settings:", error)
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

    return (
        <div className="flex flex-col lg:flex-row gap-8 p-6 items-start">
            {/* Left Panel: Settings Controls */}
            <div className="flex-1 flex flex-col gap-6">
                <div className="flex-none flex items-center justify-between py-2 border-b">
                    <div>
                        <h1 className="text-xl font-semibold flex items-center gap-2">
                            {t('modules.proactiveMessaging') || 'Etkileşim Tasarımcısı'}
                        </h1>
                        <p className="text-muted-foreground text-xs mt-1">
                            Ziyaretçi balonlarını özelleştirin.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border">
                            <Switch
                                id="module-enabled"
                                className="scale-75"
                                checked={settings.enabled}
                                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
                            />
                            <Label htmlFor="module-enabled" className="text-xs font-medium cursor-pointer">{settings.enabled ? 'Aktif' : 'Pasif'}</Label>
                        </div>
                        <Button onClick={saveSettings} disabled={isSaving} size="sm" className="h-8 shadow-sm">
                            {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Save className="w-3 h-3 mr-2" />}
                            {t('save') || 'Kaydet'}
                        </Button>
                    </div>
                </div>

                <div className="space-y-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <div className="sticky top-0 z-20 pb-4 pt-1 bg-[#f4f6f8]/95 backdrop-blur supports-[backdrop-filter]:bg-[#f4f6f8]/60">
                            <TabsList className="grid grid-cols-4 w-full gap-3 bg-transparent p-0 h-auto">
                                <TabsTrigger
                                    value="design"
                                    className="h-auto flex items-center justify-center p-3 rounded-xl border border-muted data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary hover:border-primary/30 transition-all duration-200 shadow-none bg-background"
                                >
                                    <span className="font-medium text-sm">Tasarım</span>
                                </TabsTrigger>

                                <TabsTrigger
                                    value="triggers"
                                    disabled={settings.aiSmartBubbles.enabled}
                                    className="h-auto flex items-center justify-center p-3 rounded-xl border border-muted data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary hover:border-primary/30 transition-all duration-200 shadow-none bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="font-medium text-sm">Tetikleyiciler</span>
                                </TabsTrigger>

                                <TabsTrigger
                                    value="ai"
                                    className="h-auto flex items-center justify-center p-3 rounded-xl border border-muted data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary hover:border-primary/30 transition-all duration-200 shadow-none bg-background relative overflow-visible"
                                >
                                    <span className="font-medium text-sm">AI Asistan</span>
                                    <Badge className="absolute -top-2 -right-1 px-1.5 py-0 text-[9px] bg-gradient-to-r from-amber-500 to-orange-500 border-0 text-white shadow-sm ring-2 ring-background rounded-full">PRO</Badge>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="design" className="space-y-6 mt-0">
                            <EngagementDesignTab settings={settings} setSettings={setSettings} />
                        </TabsContent>

                        <TabsContent value="triggers" className="space-y-6">
                            <EngagementTriggersTab settings={settings} setSettings={setSettings} />
                        </TabsContent>

                        <TabsContent value="ai" className="space-y-6">
                            <EngagementAITab settings={settings} setSettings={setSettings} />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Right Panel: Live Preview */}
            <EngagementPreview settings={settings} />
        </div >
    )
}
