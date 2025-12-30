"use client"

import { useState, useEffect, useCallback } from "react"
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
import { ArrowLeft, Save, Utensils, Loader2, Link2, FileText, Clock, Sparkles } from "lucide-react"
import Link from "next/link"

interface DigitalWaiterConfig {
    menuUrl: string
    menuPdfUrl: string
    breakfastHours: { start: string; end: string }
    lunchHours: { start: string; end: string }
    dinnerHours: { start: string; end: string }
    signatureDishes: string[]
    aiSuggestionsEnabled: boolean
}

const defaultConfig: DigitalWaiterConfig = {
    menuUrl: '',
    menuPdfUrl: '',
    breakfastHours: { start: '07:00', end: '11:00' },
    lunchHours: { start: '11:00', end: '15:00' },
    dinnerHours: { start: '18:00', end: '23:00' },
    signatureDishes: [],
    aiSuggestionsEnabled: true
}

export default function DigitalWaiterPage() {
    const { user } = useAuth()
    const { t } = useLanguage()
    const { toast } = useToast()

    const [config, setConfig] = useState<DigitalWaiterConfig>(defaultConfig)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [newDish, setNewDish] = useState('')

    const loadConfig = useCallback(async () => {
        setIsLoading(true)
        try {
            const token = await user?.getIdToken()
            const res = await fetch(`/api/digital-waiter?chatbotId=${user?.uid}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setConfig(prev => ({ ...prev, ...data }))
            }
        } catch (error) {
            console.error("Failed to load config", error)
        } finally {
            setIsLoading(false)
        }
    }, [user])

    useEffect(() => {
        if (user) {
            loadConfig()
        }
    }, [user, loadConfig])

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
                body: JSON.stringify({ digitalWaiter: config })
            })

            if (!response.ok) throw new Error('Save failed')

            toast({
                title: t('settingsSaved') || "Ayarlar Kaydedildi",
                description: "Dijital Garson ayarlarınız güncellendi."
            })
        } catch (error) {
            console.error("Failed to save digital waiter config:", error)
            toast({
                title: t('error') || "Hata",
                description: "Ayarlar kaydedilemedi.",
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    const addSignatureDish = () => {
        if (newDish.trim()) {
            setConfig(prev => ({
                ...prev,
                signatureDishes: [...prev.signatureDishes, newDish.trim()]
            }))
            setNewDish('')
        }
    }

    const removeSignatureDish = (index: number) => {
        setConfig(prev => ({
            ...prev,
            signatureDishes: prev.signatureDishes.filter((_, i) => i !== index)
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
                        <Utensils className="w-6 h-6" />
                        {t('modules.digitalWaiter') || 'Dijital Garson'}
                    </h1>
                    <p className="text-muted-foreground">
                        Menünüzü AI&apos;ya öğretin ve akıllı öneriler sunun.
                    </p>
                </div>
                <Button onClick={saveConfig} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    {t('save') || 'Kaydet'}
                </Button>
            </div>

            {/* Menu Source */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Link2 className="w-5 h-5" />
                        Menü Kaynağı
                    </CardTitle>
                    <CardDescription>
                        Mevcut QR menü linkinizi veya PDF&apos;inizi ekleyin. AI bu bilgiyi öğrenecek ve müşterilere yardımcı olacak.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Menü URL&apos;si</Label>
                        <Input
                            value={config.menuUrl}
                            onChange={(e) => setConfig(prev => ({ ...prev, menuUrl: e.target.value }))}
                            placeholder="https://menu.example.com/restaurant"
                        />
                        <p className="text-xs text-muted-foreground">Mevcut QR menü sisteminizin linki</p>
                    </div>
                    <div className="space-y-2">
                        <Label>Menü PDF URL&apos;si (Opsiyonel)</Label>
                        <Input
                            value={config.menuPdfUrl}
                            onChange={(e) => setConfig(prev => ({ ...prev, menuPdfUrl: e.target.value }))}
                            placeholder="https://example.com/menu.pdf"
                        />
                        <p className="text-xs text-muted-foreground">PDF formatındaki menünüzün linki</p>
                    </div>
                </CardContent>
            </Card>

            {/* Business Hours */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Yemek Saatleri
                    </CardTitle>
                    <CardDescription>
                        AI bu saatlere göre uygun öneriler yapacak (örn: sabah kahvaltı, akşam şarap).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Kahvaltı Başlangıcı</Label>
                            <Input
                                type="time"
                                value={config.breakfastHours.start}
                                onChange={(e) => setConfig(prev => ({
                                    ...prev,
                                    breakfastHours: { ...prev.breakfastHours, start: e.target.value }
                                }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Kahvaltı Bitişi</Label>
                            <Input
                                type="time"
                                value={config.breakfastHours.end}
                                onChange={(e) => setConfig(prev => ({
                                    ...prev,
                                    breakfastHours: { ...prev.breakfastHours, end: e.target.value }
                                }))}
                            />
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Öğle Yemeği Başlangıcı</Label>
                            <Input
                                type="time"
                                value={config.lunchHours.start}
                                onChange={(e) => setConfig(prev => ({
                                    ...prev,
                                    lunchHours: { ...prev.lunchHours, start: e.target.value }
                                }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Öğle Yemeği Bitişi</Label>
                            <Input
                                type="time"
                                value={config.lunchHours.end}
                                onChange={(e) => setConfig(prev => ({
                                    ...prev,
                                    lunchHours: { ...prev.lunchHours, end: e.target.value }
                                }))}
                            />
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Akşam Yemeği Başlangıcı</Label>
                            <Input
                                type="time"
                                value={config.dinnerHours.start}
                                onChange={(e) => setConfig(prev => ({
                                    ...prev,
                                    dinnerHours: { ...prev.dinnerHours, start: e.target.value }
                                }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Akşam Yemeği Bitişi</Label>
                            <Input
                                type="time"
                                value={config.dinnerHours.end}
                                onChange={(e) => setConfig(prev => ({
                                    ...prev,
                                    dinnerHours: { ...prev.dinnerHours, end: e.target.value }
                                }))}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Signature Dishes */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        İmza Yemekler
                    </CardTitle>
                    <CardDescription>
                        Öne çıkarmak istediğiniz yemekleri ekleyin. AI bunları öncelikli olarak önerecek.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            value={newDish}
                            onChange={(e) => setNewDish(e.target.value)}
                            placeholder="Yemek adı..."
                            onKeyDown={(e) => e.key === 'Enter' && addSignatureDish()}
                        />
                        <Button onClick={addSignatureDish}>Ekle</Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {config.signatureDishes.map((dish, index) => (
                            <Badge
                                key={index}
                                variant="secondary"
                                className="px-3 py-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                                onClick={() => removeSignatureDish(index)}
                            >
                                {dish} ×
                            </Badge>
                        ))}
                        {config.signatureDishes.length === 0 && (
                            <p className="text-sm text-muted-foreground">Henüz imza yemek eklenmedi.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* AI Settings */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>AI Önerileri</CardTitle>
                            <CardDescription>
                                AI&apos;ın saate ve menüye göre otomatik balon mesajları oluşturmasına izin verin.
                            </CardDescription>
                        </div>
                        <Switch
                            checked={config.aiSuggestionsEnabled}
                            onCheckedChange={(checked) => setConfig(prev => ({ ...prev, aiSuggestionsEnabled: checked }))}
                        />
                    </div>
                </CardHeader>
            </Card>
        </div>
    )
}
