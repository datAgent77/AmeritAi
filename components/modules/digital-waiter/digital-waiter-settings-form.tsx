"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Save, Loader2, Link2, Clock, Sparkles, Store, Coffee, Utensils } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DigitalWaiterConfig {
    serviceMode: 'table_service' | 'counter_service'
    menuUrl: string
    menuPdfUrl: string
    breakfastHours: { start: string; end: string }
    lunchHours: { start: string; end: string }
    dinnerHours: { start: string; end: string }
    signatureDishes: string[]
    aiSuggestionsEnabled: boolean
}

const defaultConfig: DigitalWaiterConfig = {
    serviceMode: 'table_service',
    menuUrl: '',
    menuPdfUrl: '',
    breakfastHours: { start: '07:00', end: '11:00' },
    lunchHours: { start: '11:00', end: '15:00' },
    dinnerHours: { start: '18:00', end: '23:00' },
    signatureDishes: [],
    aiSuggestionsEnabled: true
}

interface DigitalWaiterSettingsFormProps {
    targetUserId: string
    isSuperAdmin?: boolean
}

export function DigitalWaiterSettingsForm({ targetUserId, isSuperAdmin = false }: DigitalWaiterSettingsFormProps) {
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
            const res = await fetch(`/api/digital-waiter?chatbotId=${targetUserId}`, {
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
                    digitalWaiter: config
                })
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
        <div className="flex-1 w-full space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="flex-1">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        {t('modules.digitalWaiter') || 'Restoran ve Kafe AI'}
                    </h1>
                    <p className="text-muted-foreground">
                        {t('modules.digitalWaiterDesc') || 'Menünüzü AI\'ya öğretin, servis modunu seçin ve satışları artırın.'}
                    </p>
                </div>
                <Button onClick={saveConfig} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    {t('save') || 'Kaydet'}
                </Button>
            </div>

            {/* Service Mode Selection */}
            <Card className="border-l-4 border-l-primary">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Store className="w-5 h-5 text-primary" />
                        <CardTitle>{t('serviceMode') || "Hizmet Modu"}</CardTitle>
                    </div>
                    <CardDescription>
                        {t('serviceModeDesc') || "İşletmenizin çalışma şeklini seçin. AI buna göre davranacaktır."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4">
                        <div className="grid gap-2">
                            <Label>{t('businessType') || "İşletme Tipi"}</Label>
                            <Select
                                value={config.serviceMode}
                                onValueChange={(value: any) => setConfig(prev => ({ ...prev, serviceMode: value }))}
                            >
                                <SelectTrigger className="w-full md:w-[300px]">
                                    <SelectValue placeholder={t('select') || "Seçiniz"} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="table_service">
                                        <div className="flex items-center gap-2">
                                            <Utensils className="w-4 h-4" />
                                            <span>{t('tableService') || "Restoran (Masaya Servis)"}</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="counter_service">
                                        <div className="flex items-center gap-2">
                                            <Coffee className="w-4 h-4" />
                                            <span>{t('counterService') || "Kafe (Kasadan/Self Servis)"}</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                            {config.serviceMode === 'table_service' ? (
                                <p>
                                    <strong>AI Davranışı:</strong> Garson gibi davranır. Masaya servisten bahseder, menüyü sunar, misafirleri masalarında ağırlar.
                                </p>
                            ) : (
                                <p>
                                    <strong>AI Davranışı:</strong> Barista gibi davranır. Ürün içeriklerini anlatır, sipariş için kasaya veya teslim noktasına yönlendirir.
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Menu Source */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Link2 className="w-5 h-5" />
                        {t('menuSource') || "Menü Kaynağı"}
                    </CardTitle>
                    <CardDescription>
                        {t('menuSourceDesc') || "Mevcut QR menü linkinizi veya PDF'inizi ekleyin. AI bu bilgiyi öğrenecek ve müşterilere yardımcı olacak."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('menuUrl') || "Menü URL'si"}</Label>
                        <Input
                            value={config.menuUrl}
                            onChange={(e) => setConfig(prev => ({ ...prev, menuUrl: e.target.value }))}
                            placeholder="https://menu.example.com/restaurant"
                        />
                        <p className="text-xs text-muted-foreground">{t('modules.digitalWaiterDesc')}</p>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('menuPdfUrl') || "Menü PDF URL'si (Opsiyonel)"}</Label>
                        <Input
                            value={config.menuPdfUrl}
                            onChange={(e) => setConfig(prev => ({ ...prev, menuPdfUrl: e.target.value }))}
                            placeholder="https://example.com/menu.pdf"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Business/Meal Hours */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        {config.serviceMode === 'table_service' 
                            ? (t('mealHours') || "Yemek Saatleri") 
                            : (t('operatingHours') || "Hizmet Saatleri")}
                    </CardTitle>
                    <CardDescription>
                        {config.serviceMode === 'table_service'
                            ? (t('mealHoursDesc') || "AI bu saatlere göre uygun öneriler yapacak (örn: sabah kahvaltı).")
                            : (t('operatingHoursDesc') || "Doğru AI önerileri için servis aralıklarınızı belirleyin.")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>
                                {config.serviceMode === 'table_service' 
                                    ? (t('breakfastStart') || "Kahvaltı Başlangıcı") 
                                    : (t('morningStart') || "Sabah Servisi Başlangıcı")}
                            </Label>
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
                            <Label>
                                {config.serviceMode === 'table_service' 
                                    ? (t('breakfastEnd') || "Kahvaltı Bitişi") 
                                    : (t('morningEnd') || "Sabah Servisi Bitişi")}
                            </Label>
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
                            <Label>
                                {config.serviceMode === 'table_service' 
                                    ? (t('lunchStart') || "Öğle Yemeği Başlangıcı") 
                                    : (t('dayStart') || "Gündüz Servisi Başlangıcı")}
                            </Label>
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
                            <Label>
                                {config.serviceMode === 'table_service' 
                                    ? (t('lunchEnd') || "Öğle Yemeği Bitişi") 
                                    : (t('dayEnd') || "Gündüz Servisi Bitişi")}
                            </Label>
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
                            <Label>
                                {config.serviceMode === 'table_service' 
                                    ? (t('dinnerStart') || "Akşam Yemeği Başlangıcı") 
                                    : (t('eveningStart') || "Akşam Servisi Başlangıcı")}
                            </Label>
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
                            <Label>
                                {config.serviceMode === 'table_service' 
                                    ? (t('dinnerEnd') || "Akşam Yemeği Bitişi") 
                                    : (t('eveningEnd') || "Akşam Servisi Bitişi")}
                            </Label>
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
            {/* Signature Dishes */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        {config.serviceMode === 'table_service' 
                                ? (t('signatureDishes') || "İmza Yemekler")
                                : (t('popularItems') || "Öne Çıkan Ürünler")}
                    </CardTitle>
                    <CardDescription>
                        {t('modules.digitalWaiterDesc')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            value={newDish}
                            onChange={(e) => setNewDish(e.target.value)}
                            placeholder={config.serviceMode === 'table_service' 
                                ? (t('addDishPlaceholder') || "Örn: Beef Wellington") 
                                : (t('addProductPlaceholder') || "Örn: Latte, Cheesecake")}
                            onKeyDown={(e) => e.key === 'Enter' && addSignatureDish()}
                        />
                        <Button variant="outline" size="sm" onClick={addSignatureDish}>
                            {config.serviceMode === 'table_service' 
                                ? (t('addDish') || "+ Yemek Ekle") 
                                : (t('addItem') || "+ Ürün Ekle")}
                        </Button>
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
                            <p className="text-sm text-muted-foreground">
                                {config.serviceMode === 'table_service' 
                                    ? "Henüz imza yemek eklenmedi." 
                                    : "Henüz ürün eklenmedi."}
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* AI Settings */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>{t('aiSuggestions') || "AI Önerileri"}</CardTitle>
                            <CardDescription>
                                {t('aiSuggestionsFormDesc') || "AI'ın saate ve menüye göre otomatik balon mesajları oluşturmasına izin verin."}
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
