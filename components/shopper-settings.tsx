import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/LanguageContext";

interface ShopperConfig {
    salesTone: string;
}

interface ShopperSettingsProps {
    targetUserId?: string;
}

type ShopperConfigPayload = Record<string, unknown>;

function formatInitialLanguage(value: string | undefined, language: string): string {
    if (!value || value === "auto") return language === "tr" ? "Otomatik" : language === "es" ? "Automático" : "Auto";
    if (value === "tr") return "Türkçe";
    if (value === "en") return "English";
    if (value === "de") return "Deutsch";
    if (value === "fr") return "Français";
    if (value === "es") return "Español";
    return value;
}

export function ShopperSettings({ targetUserId }: ShopperSettingsProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const { language } = useLanguage();
    const isTr = language === "tr";
    const isEs = language === "es";

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [initialLanguage, setInitialLanguage] = useState<string>("auto");
    const [baseShopperConfig, setBaseShopperConfig] = useState<ShopperConfigPayload>({});

    const effectiveUserId = targetUserId || user?.uid;
    const [config, setConfig] = useState<ShopperConfig>({
        salesTone: "friendly"
    });

    useEffect(() => {
        const fetchSettings = async () => {
            if (!effectiveUserId || !user) return;
            setIsLoading(true);
            try {
                const token = await user.getIdToken();
                const response = await fetch(`/api/console/settings?chatbotId=${effectiveUserId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                if (!response.ok) throw new Error("Failed to fetch settings");
                const data = await response.json();

                const shopperConfig = (data.shopperConfig || {}) as ShopperConfigPayload;
                setBaseShopperConfig(shopperConfig);
                setInitialLanguage(typeof data.initialLanguage === "string" ? data.initialLanguage : "auto");
                setConfig({
                    salesTone: typeof shopperConfig.salesTone === "string" ? shopperConfig.salesTone : "friendly"
                });
            } catch (error) {
                console.error("Error fetching settings:", error);
            } finally {
                setIsLoading(false);
            }
        };
        void fetchSettings();
    }, [effectiveUserId, user]);

    const handleSave = async () => {
        if (!effectiveUserId || !user) return;
        setIsSaving(true);
        try {
            const token = await user.getIdToken();
            const mergedShopperConfig: ShopperConfigPayload = {
                ...baseShopperConfig,
                salesTone: config.salesTone
            };

            const response = await fetch("/api/console/settings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    chatbotId: effectiveUserId,
                    chatbotSettings: {
                        shopperConfig: mergedShopperConfig
                    }
                })
            });

            if (!response.ok) throw new Error("Failed to save settings");
            setBaseShopperConfig(mergedShopperConfig);

            toast({
                title: isTr ? "Ayarlar Kaydedildi" : isEs ? "Ajustes guardados" : "Settings Saved",
                description: isTr ? "Shopper ton ayarları güncellendi." : isEs ? "Ajustes de tono del shopper actualizados." : "Shopper tone settings updated."
            });
        } catch (error) {
            console.error("Error saving settings:", error);
            toast({
                title: isTr ? "Hata" : isEs ? "Error" : "Error",
                description: isTr ? "Ayarlar kaydedilemedi." : isEs ? "No se pudieron guardar los ajustes." : "Failed to save settings.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <Card className="border-zinc-200 bg-white shadow-sm">
            <CardHeader>
                <CardTitle>{isTr ? "Shopper Davranışı" : isEs ? "Comportamiento del shopper" : "Shopper Behavior"}</CardTitle>
                <CardDescription>
                    {isTr
                        ? "Bu bölüm yalnızca Shopper modülünün satış/öneri üslubunu yönetir."
                        : "This section only controls the sales/recommendation tone of the Shopper module."}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                    <p className="font-semibold">{isTr ? "Çakışma Notu" : isEs ? "Nota de conflicto" : "Conflict Note"}</p>
                    <p className="mt-1">
                        {isTr
                            ? "Sohbet dili ayarı Genel Eğitim > Sohbet Davranışı > Chatbot Dili alanından yönetilir. Shopper burada dili değiştirmez."
                            : "Chat language is managed from General Training > Chat Behavior > Chatbot Language. Shopper does not override language here."}
                    </p>
                    <p className="mt-1">
                        {isTr ? "Mevcut genel sohbet dili:" : isEs ? "Idioma de chat global actual:" : "Current global chat language:"}{" "}
                        <span className="font-medium">{formatInitialLanguage(initialLanguage, language)}</span>
                    </p>
                    <p className="mt-1">
                        {isTr
                            ? "Ürün sıralama/strateji ayarı Öneri Motoru sekmesinden yönetilir."
                            : "Recommendation strategy is managed from the Recommendation Engine tab."}
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="tone">{isTr ? "Shopper Yanıt Tonu" : isEs ? "Tono de respuesta del shopper" : "Shopper Response Tone"}</Label>
                    <Select
                        value={config.salesTone}
                        onValueChange={(val) => setConfig({ ...config, salesTone: val })}
                    >
                        <SelectTrigger id="tone">
                            <SelectValue placeholder={isTr ? "Bir ton seçin" : isEs ? "Selecciona un tono" : "Select a tone"} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="friendly">{isTr ? "Dostça ve Yardımsever" : isEs ? "Amigable y servicial" : "Friendly and Helpful"}</SelectItem>
                            <SelectItem value="professional">{isTr ? "Profesyonel ve Resmi" : isEs ? "Profesional y formal" : "Professional and Formal"}</SelectItem>
                            <SelectItem value="enthusiastic">{isTr ? "Enerjik ve İkna Edici" : isEs ? "Enérgico y persuasivo" : "Energetic and Persuasive"}</SelectItem>
                            <SelectItem value="empathetic">{isTr ? "Empatik ve Dinleyici" : isEs ? "Empático y receptivo" : "Empathetic and Listener"}</SelectItem>
                            <SelectItem value="direct">{isTr ? "Doğrudan ve Kısa" : isEs ? "Directo y conciso" : "Direct and Concise"}</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                        {isTr
                            ? "Bu ayar yalnızca Personal Shopper ürün önerisi cevaplarının üslubunu etkiler."
                            : "This setting only affects the style of Personal Shopper product recommendation responses."}
                    </p>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSave} disabled={isSaving} className="bg-black text-white hover:bg-zinc-800">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    {isTr ? "Değişiklikleri Kaydet" : isEs ? "Guardar cambios" : "Save Changes"}
                </Button>
            </CardFooter>
        </Card>
    );
}
