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
import Link from "next/link"

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
        enabled: boolean
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
        enabled: false,
        tone: 'friendly',
        delay: 8,
        maxPerSession: 3
    }
}

// Premium check
const usePremiumStatus = () => {
    const { user } = useAuth()
    const [isPremium, setIsPremium] = useState(false)

    useEffect(() => {
        const checkPremium = async () => {
            if (!user?.uid) return
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid))
                const userData = userDoc.data()
                setIsPremium(userData?.plan === 'premium' || userData?.subscription?.status === 'active')
            } catch (error) {
                console.error("Error checking premium status:", error)
            }
        }
        checkPremium()
    }, [user])

    return isPremium
}

export default function EngagementPage() {
    const { user, role } = useAuth()
    const { t } = useLanguage()
    const { toast } = useToast()

    const isTenantPremium = usePremiumStatus()
    const [adminOverride, setAdminOverride] = useState(false)
    const isPremium = isTenantPremium || (role === 'SUPER_ADMIN' && adminOverride)

    const [settings, setSettings] = useState<EngagementSettings>(defaultSettings)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    const loadSettings = useCallback(async () => {
        if (!user?.uid) return
        setIsLoading(true)
        try {
            const docRef = doc(db, "chatbots", user.uid)
            const docSnap = await getDoc(docRef)
            if (docSnap.exists() && docSnap.data().engagement) {
                setSettings({
                    ...defaultSettings,
                    ...docSnap.data().engagement,
                    bubble: {
                        ...defaultSettings.bubble,
                        ...(docSnap.data().engagement?.bubble || {}),
                        style: {
                            ...defaultSettings.bubble.style,
                            ...(docSnap.data().engagement?.bubble?.style || {})
                        }
                    },
                    triggers: {
                        ...defaultSettings.triggers,
                        ...(docSnap.data().engagement?.triggers || {})
                    },
                    aiSmartBubbles: {
                        ...defaultSettings.aiSmartBubbles,
                        ...(docSnap.data().engagement?.aiSmartBubbles || {})
                    }
                })
            }
        } catch (error) {
            console.error("Failed to load engagement settings:", error)
        } finally {
            setIsLoading(false)
        }
    }, [user])

    useEffect(() => {
        if (user?.uid) {
            loadSettings()
        }
    }, [user?.uid, loadSettings])

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
                body: JSON.stringify({ engagement: settings })
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
            <div className="flex items-center gap-4">
                <Link href="/console/modules">

                </Link>
                <div className="flex-1">
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
                            <CardTitle>{t('moduleStatus') || 'Modül Durumu'}</CardTitle>
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
            <Card className={!isPremium ? "relative overflow-hidden" : ""}>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-amber-500" />
                                AI Akıllı Balonlar
                                <Badge variant="secondary" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 hover:from-amber-600 hover:to-orange-600">
                                    Premium
                                </Badge>
                            </CardTitle>
                            <CardDescription>
                                Ziyaretçinin bulunduğu sayfaya özel AI mesajları otomatik üretilsin.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Super Admin Override Toggle */}
                            {!isTenantPremium && role === 'SUPER_ADMIN' && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full border">
                                    <span className="text-xs font-medium text-muted-foreground">Admin Force:</span>
                                    <Switch
                                        checked={adminOverride}
                                        onCheckedChange={setAdminOverride}
                                        className="scale-75 data-[state=checked]:bg-amber-500"
                                    />
                                </div>
                            )}

                            {isPremium ? (
                                <Switch
                                    checked={settings.aiSmartBubbles.enabled}
                                    onCheckedChange={(checked) => setSettings(prev => ({
                                        ...prev,
                                        aiSmartBubbles: { ...prev.aiSmartBubbles, enabled: checked }
                                    }))}
                                />
                            ) : (
                                <Badge variant="outline" className="text-muted-foreground gap-1.5 py-1.5 px-3">
                                    <Lock className="w-3.5 h-3.5" />
                                    Kilitli
                                </Badge>
                            )}
                        </div>
                    </div>
                </CardHeader>

                {isPremium ? (
                    // Premium User - Show settings
                    settings.aiSmartBubbles.enabled && (
                        <CardContent className="space-y-6">
                            {/* Tone Selection */}
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

                            {/* Delay */}
                            <div className="space-y-2">
                                <Label>Gecikme</Label>
                                <p className="text-sm text-muted-foreground">AI balonu kaç saniye sonra gösterilsin?</p>
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

                            {/* Max Per Session */}
                            <div className="space-y-2">
                                <Label>Oturum Limiti</Label>
                                <p className="text-sm text-muted-foreground">Bir ziyarete maksimum kaç AI balonu gösterilsin?</p>
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

                            {/* Preview */}
                            <div className="pt-4 border-t">
                                <p className="font-medium mb-3">Nasıl Çalışır?</p>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-start gap-2">
                                        <span className="text-green-500">✓</span>
                                        <span>Ziyaretçi bir sayfaya gelir → AI sayfa içeriğini analiz eder</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-green-500">✓</span>
                                        <span>O sayfaya özel bir balon mesajı üretir</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-green-500">✓</span>
                                        <span>Ziyaretçi chatbot ile etkileşime geçer</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    )
                ) : (
                    // Free User - Show upgrade prompt (Redesigned)
                    <CardContent className="p-0">
                        <div className="relative overflow-hidden">
                            {/* Background Pattern */}
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-amber-950/20 dark:via-background dark:to-orange-950/10 z-0" />
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
                            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />

                            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 p-8 md:p-10">
                                {/* Left Content */}
                                <div className="flex-1 space-y-6 text-center md:text-left">
                                    <div className="space-y-4">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            Premium Özellik
                                        </div>
                                        <h3 className="text-2xl font-bold tracking-tight text-foreground">
                                            Ziyaretçilerinizi <span className="text-amber-600 dark:text-amber-500">AI Gücüyle</span> Karşılayın
                                        </h3>
                                        <p className="text-muted-foreground leading-relaxed max-w-lg">
                                            Ziyaretçinin gezdiği sayfayı anlık analiz eden yapay zeka, o sayfaya özel en doğru karşılama mesajını otomatik yazar. Satışları artırın, etkileşimi katlayın.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {[
                                            { icon: Zap, text: "Anlık Sayfa Analizi" },
                                            { icon: MessageCircle, text: "Bağlam Odaklı Mesaj" },
                                            { icon: TrendingUp, text: "%40+ Daha Fazla Etkileşim" }
                                        ].map((feature, idx) => (
                                            <div key={idx} className="flex flex-col items-center md:items-start gap-2 p-3 rounded-lg bg-white/50 dark:bg-black/20 border border-amber-100 dark:border-amber-900/50 backdrop-blur-sm">
                                                <feature.icon className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                                                <span className="text-xs font-medium text-foreground/80">{feature.text}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-2">
                                        <Link href="/console/subscription">
                                            <Button size="lg" className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-xl shadow-amber-500/20 border-0 transition-all hover:scale-105">
                                                <Rocket className="w-5 h-5 mr-2" />
                                                Hemen Premium&apos;a Geç
                                            </Button>
                                        </Link>
                                    </div>
                                </div>

                                {/* Right Image/Visual */}
                                <div className="hidden md:flex flex-col items-center justify-center relative w-1/3">
                                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent z-10" />
                                    {/* Mockup Chat Bubble */}
                                    <div className="relative z-0 w-full max-w-[240px] space-y-3 opacity-90">
                                        <div className="flex justify-end">
                                            <div className="bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 p-3 rounded-2xl rounded-tr-none text-sm shadow-sm border border-amber-200 dark:border-amber-800">
                                                Fiyatlar sayfasındasınız 👀 <br /> Size özel indirim tanımlamamı ister misiniz?
                                            </div>
                                        </div>
                                        <div className="flex justify-start">
                                            <div className="bg-white dark:bg-muted p-3 rounded-2xl rounded-tl-none text-sm shadow-sm border">
                                                Evet, lütfen!
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>
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
