import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Save, Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/context/LanguageContext"

interface ShopperConfig {
    salesTone: string
    strategy: string
    strictMode: boolean
}

interface ShopperSettingsProps {
    targetUserId?: string
}

export function ShopperSettings({ targetUserId }: ShopperSettingsProps) {
    const { user } = useAuth()
    const { toast } = useToast()
    const { t } = useLanguage()
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    const effectiveUserId = targetUserId || user?.uid

    const [config, setConfig] = useState<ShopperConfig>({
        salesTone: "friendly",
        strategy: "relevance",
        strictMode: false
    })

    useEffect(() => {
        const fetchSettings = async () => {
            if (!effectiveUserId) return
            setIsLoading(true)
            try {
                const response = await fetch(`/api/console/settings?chatbotId=${effectiveUserId}`);
                if (!response.ok) throw new Error("Failed to fetch settings");
                const data = await response.json();

                if (data.shopperConfig) {
                    setConfig({
                        salesTone: data.shopperConfig.salesTone || "friendly",
                        strategy: data.shopperConfig.strategy || "relevance",
                        strictMode: data.shopperConfig.strictMode || false
                    })
                }
            } catch (error) {
                console.error("Error fetching settings:", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchSettings()
    }, [effectiveUserId])

    const handleSave = async () => {
        if (!effectiveUserId) return
        setIsSaving(true)
        try {
            const response = await fetch("/api/console/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chatbotId: effectiveUserId,
                    chatbotSettings: {
                        shopperConfig: config
                    }
                })
            });

            if (!response.ok) throw new Error("Failed to save settings");

            toast({
                title: t('settingsSaved') || "Ayarlar Kaydedildi",
                description: t('settingsSavedDesc') || "Alışveriş asistanı ayarlarınız güncellendi."
            })
        } catch (error) {
            console.error("Error saving settings:", error)
            toast({
                title: "Hata",
                description: "Ayarlar kaydedilemedi.",
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Davranış Yapılandırması</CardTitle>
                <CardDescription>
                    AI asistanınızın kişiliğini ve mantığını özelleştirin.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="tone">Satış Tonu</Label>
                    <Select
                        value={config.salesTone}
                        onValueChange={(val) => setConfig({ ...config, salesTone: val })}
                    >
                        <SelectTrigger id="tone">
                            <SelectValue placeholder="Bir ton seçin" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="friendly">Dostça & Yardımsever (Önerilen)</SelectItem>
                            <SelectItem value="professional">Profesyonel & Resmi</SelectItem>
                            <SelectItem value="enthusiastic">Enerjik & İkna Edici</SelectItem>
                            <SelectItem value="empathetic">Empatik & Dinleyici</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                        AI&apos;nın müşterilerle konuşurken kullandığı dil tarzını belirler.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="strategy">Öneri Stratejisi</Label>
                    <Select
                        value={config.strategy}
                        onValueChange={(val) => setConfig({ ...config, strategy: val })}
                    >
                        <SelectTrigger id="strategy">
                            <SelectValue placeholder="Bir strateji seçin" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="relevance">En İyi Eşleşme (Alaka Düzeyi)</SelectItem>
                            <SelectItem value="bestsellers">Çok Satanları Öne Çıkar</SelectItem>
                            <SelectItem value="margin">Yüksek Kârlılık Öncelikli</SelectItem>
                            <SelectItem value="inventory">Stok Eritme Odaklı</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                        AI&apos;nın hangi ürünleri önce önereceğini nasıl önceliklendirdiği.
                    </p>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label className="text-base">Katı Mod</Label>
                        <p className="text-sm text-muted-foreground">
                            AI&apos;yı yalnızca şirketiniz ve ürünlerinizle ilgili soruları yanıtlaması için kısıtlayın. Yaratıcı yazıları (örn. şiirler) ve konu dışı tartışmaları engeller.
                        </p>
                    </div>
                    <Switch
                        checked={config.strictMode}
                        onCheckedChange={(checked) => setConfig({ ...config, strictMode: checked })}
                    />
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="w-4 h-4 mr-2" />
                    Değişiklikleri Kaydet
                </Button>
            </CardFooter>
        </Card>
    )
}
