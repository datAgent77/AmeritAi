"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Trash2, Clock, MousePointerClick, Save, MessageCircle, Loader2 } from "lucide-react"
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
    }
}

export default function ProactiveEngagementPage() {
    const { user } = useAuth()
    const { t } = useLanguage()
    const { toast } = useToast()

    const [settings, setSettings] = useState<EngagementSettings>(defaultSettings)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (user?.uid) {
            loadSettings()
        }
    }, [user?.uid])

    const loadSettings = async () => {
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
                    }
                })
            }
        } catch (error) {
            console.error("Failed to load engagement settings:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const saveSettings = async () => {
        if (!user?.uid) return
        setIsSaving(true)
        try {
            const docRef = doc(db, "chatbots", user.uid)
            await setDoc(docRef, { engagement: settings }, { merge: true })
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
        <div className="container max-w-4xl py-8 space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/console/modules">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <MessageCircle className="w-6 h-6" />
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

            {/* Bubble Style */}
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
