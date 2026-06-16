"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Heart, Bell, User, Loader2, Ruler, Fingerprint } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"

interface SmartShopperConfig {
    wishlist: boolean
    priceAlerts: boolean
    stockAlerts: boolean
    visitorProfiling: boolean
    notificationEmail: string
    lowStockThreshold: number
    sizeAndFitProfile?: boolean
    customerIdentity?: boolean
}

const DEFAULT_CONFIG: SmartShopperConfig = {
    wishlist: true,
    priceAlerts: true,
    stockAlerts: true,
    visitorProfiling: true,
    notificationEmail: "",
    lowStockThreshold: 5,
    sizeAndFitProfile: false,
    customerIdentity: false,
}

interface SmartShopperSettingsFormProps {
    targetUserId: string
    isSuperAdmin?: boolean
}

export function SmartShopperSettingsForm({ targetUserId }: SmartShopperSettingsFormProps) {
    const { t, language } = useLanguage()
    const { user } = useAuth()
    const { toast } = useToast()

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [config, setConfig] = useState<SmartShopperConfig>(DEFAULT_CONFIG)

    useEffect(() => {
        const loadConfig = async () => {
            if (!targetUserId || !user) return
            try {
                const token = await user.getIdToken()
                const res = await fetch(`/api/console/settings?chatbotId=${targetUserId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (!res.ok) throw new Error("Failed to fetch settings")
                const data = await res.json()
                if (data.smartShopperConfig) {
                    setConfig({ ...DEFAULT_CONFIG, ...data.smartShopperConfig })
                }
            } catch (error) {
                console.error("Error loading smart shopper config:", error)
            } finally {
                setIsLoading(false)
            }
        }
        loadConfig()
    }, [targetUserId, user])

    const saveConfig = async () => {
        if (!targetUserId || !user) return
        setIsSaving(true)
        try {
            const token = await user.getIdToken()
            const res = await fetch("/api/console/settings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    chatbotId: targetUserId,
                    chatbotSettings: { smartShopperConfig: config },
                }),
            })
            if (!res.ok) throw new Error("Failed to save settings")
            toast({ title: t("saved") || "Saved", description: t("settingsSaved") || "Settings saved successfully" })
        } catch (error) {
            console.error("Error saving smart shopper config:", error)
            toast({ title: t("error") || "Error", description: t("errorSaving") || "Error saving settings", variant: "destructive" })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-8 p-8 pt-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">
                        {language === "tr" ? "Akıllı Alışveriş Asistanı" : language === "es" ? "Asistente de compras inteligente" : "Smart Shopping Assistant"}
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {language === "tr"
                            ? "İstek listesi, fiyat/stok bildirimleri ve kişiselleştirilmiş öneri ayarları"
                            : language === "es"
                            ? "Lista de deseos, alertas de precio/stock y ajustes de recomendación personalizada"
                            : "Wishlist, price/stock alerts, and personalized recommendation settings"}
                    </p>
                </div>
                <Button onClick={saveConfig} disabled={isSaving} className="min-w-[100px]">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("save") || "Save"}
                </Button>
            </div>

            <div className="grid gap-6">
                {/* Wishlist */}
                <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-secondary/50 rounded-xl">
                                    <Heart className="h-5 w-5 text-foreground/80" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-semibold tracking-tight">
                                        {language === "tr" ? "İstek Listesi" : language === "es" ? "Lista de deseos" : "Wishlist"}
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        {language === "tr"
                                            ? "Ziyaretçiler beğendikleri ürünleri sohbet içinden istek listesine ekleyebilir."
                                            : language === "es"
                                            ? "Los visitantes pueden guardar los productos que les gustan en su lista de deseos desde el chat."
                                            : "Visitors can save products they like to their wishlist from the chat."}
                                    </CardDescription>
                                </div>
                            </div>
                            <Switch
                                checked={config.wishlist}
                                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, wishlist: checked }))}
                            />
                        </div>
                    </CardHeader>
                </Card>

                {/* Price & Stock Alerts */}
                <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-secondary/50 rounded-xl">
                                    <Bell className="h-5 w-5 text-foreground/80" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-semibold tracking-tight">
                                        {language === "tr" ? "Fiyat ve Stok Bildirimleri" : language === "es" ? "Alertas de precio y stock" : "Price & Stock Alerts"}
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        {language === "tr"
                                            ? "Fiyat düştüğünde veya stok geldiğinde müşterilere otomatik e-posta gönderilir."
                                            : language === "es"
                                            ? "Los clientes reciben correos automáticos cuando los precios bajan o los artículos vuelven a estar en stock."
                                            : "Customers receive automatic emails when prices drop or items come back in stock."}
                                    </CardDescription>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between border p-3 rounded-lg">
                                <Label>{language === "tr" ? "Fiyat Düşüş Bildirimi" : language === "es" ? "Alerta de bajada de precio" : "Price Drop Alert"}</Label>
                                <Switch
                                    checked={config.priceAlerts}
                                    onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, priceAlerts: checked }))}
                                />
                            </div>
                            <div className="flex items-center justify-between border p-3 rounded-lg">
                                <Label>{language === "tr" ? "Stok Geldi Bildirimi" : language === "es" ? "Alerta de reposición de stock" : "Back-in-Stock Alert"}</Label>
                                <Switch
                                    checked={config.stockAlerts}
                                    onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, stockAlerts: checked }))}
                                />
                            </div>
                        </div>

                        {(config.priceAlerts || config.stockAlerts) && (
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center gap-4 border p-3 rounded-lg">
                                    <Label className="min-w-fit">
                                        {language === "tr" ? "Bildirim E-postası" : language === "es" ? "Correo de notificación" : "Notification Email"}
                                    </Label>
                                    <Input
                                        type="email"
                                        placeholder={language === "tr" ? "ornek@isletme.com" : language === "es" ? "negocio@ejemplo.com" : "business@example.com"}
                                        value={config.notificationEmail}
                                        onChange={(e) => setConfig((prev) => ({ ...prev, notificationEmail: e.target.value }))}
                                        className="flex-1"
                                    />
                                </div>
                                <div className="flex items-center gap-4 border p-3 rounded-lg">
                                    <Label className="min-w-fit">
                                        {language === "tr" ? "Düşük Stok Eşiği" : language === "es" ? "Umbral de stock bajo" : "Low Stock Threshold"}
                                    </Label>
                                    <div className="flex items-center gap-2 ml-auto">
                                        <Input
                                            type="number"
                                            min={1}
                                            value={config.lowStockThreshold}
                                            onChange={(e) => setConfig((prev) => ({ ...prev, lowStockThreshold: parseInt(e.target.value) || 5 }))}
                                            className="w-20 text-center"
                                        />
                                        <span className="text-sm text-muted-foreground">
                                            {language === "tr" ? "adet" : language === "es" ? "unidades" : "units"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Visitor Profiling */}
                <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-secondary/50 rounded-xl">
                                    <User className="h-5 w-5 text-foreground/80" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-semibold tracking-tight">
                                        {language === "tr" ? "Ziyaretçi Profili" : language === "es" ? "Perfil del visitante" : "Visitor Profiling"}
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        {language === "tr"
                                            ? "Gezinme geçmişine göre kişiselleştirilmiş ürün önerileri sunar."
                                            : language === "es"
                                            ? "Ofrece sugerencias de productos personalizadas según el historial de navegación."
                                            : "Provides personalized product suggestions based on browsing history."}
                                    </CardDescription>
                                </div>
                            </div>
                            <Switch
                                checked={config.visitorProfiling}
                                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, visitorProfiling: checked }))}
                            />
                        </div>
                    </CardHeader>
                </Card>

                {/* Size & Fit Profile */}
                <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-secondary/50 rounded-xl">
                                    <Ruler className="h-5 w-5 text-foreground/80" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-semibold tracking-tight">
                                        {language === "tr" ? "Beden ve Tercih Profili" : language === "es" ? "Perfil de talla y ajuste" : "Size & Fit Profile"}
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        {language === "tr"
                                            ? "Ziyaretçinin beden/numara tercihlerini hatırlayarak uygun stoktaki ürünleri önerir."
                                            : language === "es"
                                            ? "Recuerda las preferencias de talla/ajuste del visitante y recomienda productos en stock."
                                            : "Remembers visitor's size/fit preferences and recommends products in stock."}
                                    </CardDescription>
                                </div>
                            </div>
                            <Switch
                                checked={config.sizeAndFitProfile || false}
                                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, sizeAndFitProfile: checked }))}
                            />
                        </div>
                    </CardHeader>
                </Card>

                {/* Customer Identity */}
                <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-secondary/50 rounded-xl">
                                    <Fingerprint className="h-5 w-5 text-foreground/80" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-semibold tracking-tight">
                                        {language === "tr" ? "Müşteri Hesabı Eşleştirme" : language === "es" ? "Coincidencia de identidad del cliente" : "Customer Identity Matching"}
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        {language === "tr"
                                            ? "İstek listesini ve profil verilerini, sitenize giriş yapan müşterinin hesabıyla senkronize eder."
                                            : language === "es"
                                            ? "Sincroniza la lista de deseos y los datos de perfil con la cuenta del cliente que ha iniciado sesión en tu sitio."
                                            : "Synchronizes wishlist and profile data with the logged-in customer account on your site."}
                                    </CardDescription>
                                </div>
                            </div>
                            <Switch
                                checked={config.customerIdentity || false}
                                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, customerIdentity: checked }))}
                            />
                        </div>
                    </CardHeader>
                </Card>
            </div>
        </div>
    )
}
