"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Trash2, Clock, MousePointerClick, Save, MessageCircle, Loader2, Sparkles, Rocket, Zap, TrendingUp, CheckCircle2, Lock } from "lucide-react"
import { useParams } from "next/navigation"

interface BubbleMessage {
    id: string
    text: string
    delay: number
    isActive: boolean
}

interface EngagementSettings {
    enabled: boolean
    bubble: {
        messages: BubbleMessage[]
        position: 'top' | 'left' | 'right'
        animation: 'none' | 'bounce' | 'pulse' | 'shake'
        autoDismiss: boolean
        autoDismissDelay: number
        showCloseButton: boolean
        style: {
            backgroundColor: string
            textColor: string
            borderRadius: number
            shadow: 'none' | 'small' | 'medium' | 'large'
        }
    }
    triggers: {
        scrollDepth: number
        exitIntent: boolean
        inactivity: number
        pageRevisit: number
    }
    // Premium Feature: Real-time AI Smart Bubbles
    aiSmartBubbles: {
        visible: boolean       // Super admin: Tenant'a görünsün mü?
        granted: boolean       // Super admin: Tenant kullanabilsin mi?
        enabled: boolean       // Tenant: Kullanıyor mu?
        tone: 'friendly' | 'professional' | 'playful'
        delay: number
        maxPerSession: number
    }
}

const defaultSettings: EngagementSettings = {
    enabled: false,
    bubble: {
        messages: [{ id: '1', text: 'Merhaba! Size nasıl yardımcı olabilirim?', delay: 5, isActive: true }],
        position: 'top',
        animation: 'bounce',
        autoDismiss: true,
        autoDismissDelay: 10,
        showCloseButton: true,
        style: {
            backgroundColor: '#000000',
            textColor: '#FFFFFF',
            borderRadius: 12,
            shadow: 'medium'
        }
    },
    triggers: {
        scrollDepth: 0,
        exitIntent: false,
        inactivity: 0,
        pageRevisit: 0
    },
    aiSmartBubbles: {
        visible: false,
        granted: false,
        enabled: false,
        tone: 'friendly',
        delay: 8,
        maxPerSession: 3
    }
}

// Premium check - checks target tenant's premium status
const useTenantPremiumStatus = (tenantId: string | undefined) => {
    const [isPremium, setIsPremium] = useState(false)

    useEffect(() => {
        const checkPremium = async () => {
            if (!tenantId) return
            try {
                const userDoc = await getDoc(doc(db, "users", tenantId))
                const userData = userDoc.data()
                setIsPremium(userData?.plan === 'premium' || userData?.subscription?.status === 'active')
            } catch (error) {
                console.error("Error checking premium status:", error)
            }
        }
        checkPremium()
    }, [tenantId])

    return isPremium
}

export default function TenantEngagementPage() {
    const params = useParams()
    const tenantUserId = params.userId as string

    const { user, role } = useAuth()
    const { t } = useLanguage()
    const { toast } = useToast()

    // Check tenant's premium status (not super admin's)
    const isTenantPremium = useTenantPremiumStatus(tenantUserId)
    const [adminOverride, setAdminOverride] = useState(false)
    // Super admin can force premium features with override toggle
    const isPremium = isTenantPremium || (role === 'SUPER_ADMIN' && adminOverride)

    // Use tenant's userId for all operations
    const effectiveUserId = tenantUserId

    const [settings, setSettings] = useState<EngagementSettings>(defaultSettings)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    const loadSettings = useCallback(async () => {
        if (!effectiveUserId) return
        setIsLoading(true)
        try {
            const response = await fetch(`/api/widget-settings?chatbotId=${effectiveUserId}`)
            if (response.ok) {
                const data = await response.json()
                if (data.engagement) {
                    setSettings({
                        ...defaultSettings,
                        ...data.engagement,
                        bubble: {
                            ...defaultSettings.bubble,
                            ...(data.engagement.bubble || {}),
                            style: {
                                ...defaultSettings.bubble.style,
                                ...(data.engagement.bubble?.style || {})
                            }
                        },
                        triggers: {
                            ...defaultSettings.triggers,
                            ...(data.engagement.triggers || {})
                        },
                        aiSmartBubbles: {
                            ...defaultSettings.aiSmartBubbles,
                            ...(data.engagement.aiSmartBubbles || {})
                        }
                    })
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
                description: t('settingsSavedDesc') || "Proaktif etkileşim ayarlarınız güncellendi."
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

    const addMessage = () => {
        const newMsg: BubbleMessage = {
            id: Date.now().toString(),
            text: '',
            delay: (settings.bubble.messages.length + 1) * 5,
            isActive: true
        }
        setSettings(prev => ({
            ...prev,
            bubble: {
                ...prev.bubble,
                messages: [...prev.bubble.messages, newMsg]
            }
        }))
    }

    const removeMessage = (id: string) => {
        setSettings(prev => ({
            ...prev,
            bubble: {
                ...prev.bubble,
                messages: prev.bubble.messages.filter(m => m.id !== id)
            }
        }))
    }

    const updateMessage = (id: string, field: keyof BubbleMessage, value: any) => {
        setSettings(prev => ({
            ...prev,
            bubble: {
                ...prev.bubble,
                messages: prev.bubble.messages.map(m =>
                    m.id === id ? { ...m, [field]: value } : m
                )
            }
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
        <div className="flex-1 space-y-8 p-8 pt-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        {t('modules.proactiveMessaging') || 'Proaktif Etkileşim'}
                    </h1>
                    <p className="text-muted-foreground">
                        {t('modules.proactiveMessagingDesc') || 'Ziyaretçilerinize küçük balon mesajlarıyla ulaşın.'}
                    </p>
                </div>
                <Button onClick={saveSettings} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    {t('save') || 'Kaydet'}
                </Button>
            </div>

            {/* Enable Toggle */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Modül Durumu</CardTitle>
                            <CardDescription>Proaktif balon mesajlarını etkinleştirin veya devre dışı bırakın.</CardDescription>
                        </div>
                        <Switch
                            checked={settings.enabled}
                            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
                        />
                    </div>
                </CardHeader>
            </Card>

            {/* Bubble Messages */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5" />
                        Balon Mesajları
                    </CardTitle>
                    <CardDescription>
                        Ziyaretçilere gösterilecek mesajları ekleyin. Her mesaj belirlenen gecikme süresinde görünür.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {settings.bubble.messages.map((msg, index) => (
                        <div key={msg.id} className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline">#{index + 1}</Badge>
                                    <Switch
                                        checked={msg.isActive}
                                        onCheckedChange={(checked) => updateMessage(msg.id, 'isActive', checked)}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                        {msg.isActive ? 'Aktif' : 'Pasif'}
                                    </span>
                                </div>
                                <Textarea
                                    value={msg.text}
                                    onChange={(e) => updateMessage(msg.id, 'text', e.target.value)}
                                    placeholder="Mesaj metni..."
                                    className="min-h-[60px]"
                                />
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        value={msg.delay}
                                        onChange={(e) => updateMessage(msg.id, 'delay', parseInt(e.target.value) || 0)}
                                        className="w-20"
                                        min={0}
                                    />
                                    <span className="text-sm text-muted-foreground">saniye sonra göster</span>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeMessage(msg.id)}
                                className="text-destructive hover:text-destructive"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                    <Button variant="outline" onClick={addMessage} className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Yeni Mesaj Ekle
                    </Button>
                </CardContent>
            </Card>

            {/* AI Smart Bubbles - PREMIUM */}
            {/* Super Admin viewing tenant */}
            {role === 'SUPER_ADMIN' ? (
                // SUPER ADMIN viewing tenant - show admin controls
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-amber-500" />
                                    AI Akıllı Balonlar
                                    <Badge variant="secondary" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                                        Premium
                                    </Badge>
                                </CardTitle>
                                <CardDescription>
                                    Tenant için AI balon özelliğini yönetin.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Admin Controls */}
                        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border space-y-4">
                            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Admin Kontrolleri</p>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium flex items-center gap-2">
                                        👁️ Tenant&apos;a Görünsün
                                    </p>
                                    <p className="text-sm text-muted-foreground">Bu özellik tenant panelinde görünsün mü?</p>
                                </div>
                                <Switch
                                    checked={settings.aiSmartBubbles.visible}
                                    onCheckedChange={(checked) => setSettings(prev => ({
                                        ...prev,
                                        aiSmartBubbles: { ...prev.aiSmartBubbles, visible: checked }
                                    }))}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium flex items-center gap-2">
                                        🔓 Kullanım İzni Ver
                                    </p>
                                    <p className="text-sm text-muted-foreground">Tenant bu özelliği kullanabilsin mi?</p>
                                </div>
                                <Switch
                                    checked={settings.aiSmartBubbles.granted}
                                    onCheckedChange={(checked) => setSettings(prev => ({
                                        ...prev,
                                        aiSmartBubbles: { ...prev.aiSmartBubbles, granted: checked }
                                    }))}
                                    disabled={!settings.aiSmartBubbles.visible}
                                />
                            </div>
                        </div>

                        {/* Current Status & Settings Preview */}
                        <div className="flex items-center justify-between pt-2 border-t">
                            <div>
                                <p className="font-medium">Özellik Durumu</p>
                                <p className="text-sm text-muted-foreground">Tenant tarafından aktif mi?</p>
                            </div>
                            <Switch
                                checked={settings.aiSmartBubbles.enabled}
                                onCheckedChange={(checked) => setSettings(prev => ({
                                    ...prev,
                                    aiSmartBubbles: { ...prev.aiSmartBubbles, enabled: checked }
                                }))}
                            />
                        </div>

                        {settings.aiSmartBubbles.enabled && (
                            <>
                                <div className="space-y-2">
                                    <Label>Mesaj Tonu</Label>
                                    <Select
                                        value={settings.aiSmartBubbles.tone}
                                        onValueChange={(value: 'friendly' | 'professional' | 'playful') =>
                                            setSettings(prev => ({ ...prev, aiSmartBubbles: { ...prev.aiSmartBubbles, tone: value } }))
                                        }
                                    >
                                        <SelectTrigger className="w-48">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="friendly">😊 Samimi</SelectItem>
                                            <SelectItem value="professional">💼 Profesyonel</SelectItem>
                                            <SelectItem value="playful">🎉 Eğlenceli</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Gecikme</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                value={settings.aiSmartBubbles.delay}
                                                onChange={(e) => setSettings(prev => ({
                                                    ...prev,
                                                    aiSmartBubbles: { ...prev.aiSmartBubbles, delay: parseInt(e.target.value) || 5 }
                                                }))}
                                                min={3}
                                                max={30}
                                                className="w-20"
                                            />
                                            <span className="text-sm text-muted-foreground">saniye</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Oturum Limiti</Label>
                                        <Input
                                            type="number"
                                            value={settings.aiSmartBubbles.maxPerSession}
                                            onChange={(e) => setSettings(prev => ({
                                                ...prev,
                                                aiSmartBubbles: { ...prev.aiSmartBubbles, maxPerSession: parseInt(e.target.value) || 1 }
                                            }))}
                                            min={1}
                                            max={5}
                                            className="w-20"
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            ) : (
                // This branch won't be hit in tenant admin page (super admin always views)
                // But keeping for consistency with console page
                null
            )}
            <Card>
                <CardHeader>
                    <CardTitle>Balon Stili</CardTitle>
                    <CardDescription>Balon mesajlarının görünümünü özelleştirin.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Konum</Label>
                        <Select
                            value={settings.bubble.position}
                            onValueChange={(value: 'top' | 'left' | 'right') =>
                                setSettings(prev => ({ ...prev, bubble: { ...prev.bubble, position: value } }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="top">Üstte</SelectItem>
                                <SelectItem value="left">Solda</SelectItem>
                                <SelectItem value="right">Sağda</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Animasyon</Label>
                        <Select
                            value={settings.bubble.animation}
                            onValueChange={(value: 'none' | 'bounce' | 'pulse' | 'shake') =>
                                setSettings(prev => ({ ...prev, bubble: { ...prev.bubble, animation: value } }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Yok</SelectItem>
                                <SelectItem value="bounce">Zıplama</SelectItem>
                                <SelectItem value="pulse">Nabız</SelectItem>
                                <SelectItem value="shake">Titreme</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Arka Plan Rengi</Label>
                        <div className="flex gap-2">
                            <Input
                                type="color"
                                value={settings.bubble.style.backgroundColor}
                                onChange={(e) => setSettings(prev => ({
                                    ...prev,
                                    bubble: { ...prev.bubble, style: { ...prev.bubble.style, backgroundColor: e.target.value } }
                                }))}
                                className="w-12 h-10 p-1"
                            />
                            <Input
                                value={settings.bubble.style.backgroundColor}
                                onChange={(e) => setSettings(prev => ({
                                    ...prev,
                                    bubble: { ...prev.bubble, style: { ...prev.bubble.style, backgroundColor: e.target.value } }
                                }))}
                                className="flex-1"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Metin Rengi</Label>
                        <div className="flex gap-2">
                            <Input
                                type="color"
                                value={settings.bubble.style.textColor}
                                onChange={(e) => setSettings(prev => ({
                                    ...prev,
                                    bubble: { ...prev.bubble, style: { ...prev.bubble.style, textColor: e.target.value } }
                                }))}
                                className="w-12 h-10 p-1"
                            />
                            <Input
                                value={settings.bubble.style.textColor}
                                onChange={(e) => setSettings(prev => ({
                                    ...prev,
                                    bubble: { ...prev.bubble, style: { ...prev.bubble.style, textColor: e.target.value } }
                                }))}
                                className="flex-1"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Triggers */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MousePointerClick className="w-5 h-5" />
                        Tetikleyiciler
                    </CardTitle>
                    <CardDescription>
                        Balon mesajlarının görünmesi için ek koşullar belirleyin.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Çıkış Niyeti</p>
                            <p className="text-sm text-muted-foreground">Kullanıcı sayfadan çıkmak üzereyken göster (Masaüstü)</p>
                        </div>
                        <Switch
                            checked={settings.triggers.exitIntent}
                            onCheckedChange={(checked) => setSettings(prev => ({
                                ...prev,
                                triggers: { ...prev.triggers, exitIntent: checked }
                            }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Kaydırma Derinliği (%)</Label>
                        <p className="text-sm text-muted-foreground">Sayfa belirli oranda kaydırıldığında göster. 0 = devre dışı.</p>
                        <Input
                            type="number"
                            value={settings.triggers.scrollDepth}
                            onChange={(e) => setSettings(prev => ({
                                ...prev,
                                triggers: { ...prev.triggers, scrollDepth: parseInt(e.target.value) || 0 }
                            }))}
                            min={0}
                            max={100}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Hareketsizlik Süresi (saniye)</Label>
                        <p className="text-sm text-muted-foreground">Kullanıcı belirli süre hareketsiz kaldığında göster. 0 = devre dışı.</p>
                        <Input
                            type="number"
                            value={settings.triggers.inactivity}
                            onChange={(e) => setSettings(prev => ({
                                ...prev,
                                triggers: { ...prev.triggers, inactivity: parseInt(e.target.value) || 0 }
                            }))}
                            min={0}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
