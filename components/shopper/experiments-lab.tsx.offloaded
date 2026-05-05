"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Beaker, Loader2, Save, Target } from "lucide-react";

type ExperimentGoal = "ctr" | "add_to_cart" | "conversion" | "avg_order_value";

interface AbTestingConfig {
    enabled: boolean;
    goal: ExperimentGoal;
    trafficSplit: number;
    holdoutPercent: number;
    minSampleSize: number;
    autoPromoteWinner: boolean;
    variantAName: string;
    variantBName: string;
    variantAPrompt: string;
    variantBPrompt: string;
}

interface ShopperConfigPayload {
    abTesting?: Partial<AbTestingConfig>;
    [key: string]: unknown;
}

const defaultConfig: AbTestingConfig = {
    enabled: false,
    goal: "conversion",
    trafficSplit: 50,
    holdoutPercent: 0,
    minSampleSize: 150,
    autoPromoteWinner: false,
    variantAName: "Control",
    variantBName: "Variant B",
    variantAPrompt: "Recommend the top 3 relevant products by user intent. Keep pricing/value summary short.",
    variantBPrompt: "Recommend the top 3 relevant products by user intent. Add a mini comparison and one CTA sentence."
};

function clampInt(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, Math.round(value)));
}

interface ExperimentsLabProps {
    targetUserId?: string;
}

export function ExperimentsLab({ targetUserId }: ExperimentsLabProps) {
    const { user } = useAuth();
    const { language } = useLanguage();
    const { toast } = useToast();
    const isTr = language === "tr";
    const effectiveUserId = targetUserId || user?.uid;

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [baseShopperConfig, setBaseShopperConfig] = useState<ShopperConfigPayload>({});
    const [config, setConfig] = useState<AbTestingConfig>(defaultConfig);

    useEffect(() => {
        const load = async () => {
            if (!effectiveUserId || !user) return;
            setIsLoading(true);
            try {
                const token = await user.getIdToken();
                const response = await fetch(`/api/console/settings?chatbotId=${effectiveUserId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!response.ok) throw new Error("Failed to load A/B settings");
                const data = await response.json();
                const shopperConfig = (data.shopperConfig || {}) as ShopperConfigPayload;
                setBaseShopperConfig(shopperConfig);
                const loaded = shopperConfig.abTesting || {};
                setConfig({
                    enabled: loaded.enabled ?? defaultConfig.enabled,
                    goal: (loaded.goal as ExperimentGoal) || defaultConfig.goal,
                    trafficSplit: clampInt(Number(loaded.trafficSplit ?? defaultConfig.trafficSplit), 10, 90),
                    holdoutPercent: clampInt(Number(loaded.holdoutPercent ?? defaultConfig.holdoutPercent), 0, 40),
                    minSampleSize: clampInt(Number(loaded.minSampleSize ?? defaultConfig.minSampleSize), 50, 5000),
                    autoPromoteWinner: loaded.autoPromoteWinner ?? defaultConfig.autoPromoteWinner,
                    variantAName: String(loaded.variantAName || defaultConfig.variantAName),
                    variantBName: String(loaded.variantBName || defaultConfig.variantBName),
                    variantAPrompt: String(loaded.variantAPrompt || defaultConfig.variantAPrompt),
                    variantBPrompt: String(loaded.variantBPrompt || defaultConfig.variantBPrompt)
                });
            } catch (error) {
                console.error("[ExperimentsLab] Load error:", error);
                toast({
                    title: isTr ? "Hata" : "Error",
                    description: isTr ? "A/B test ayarları yüklenemedi." : "Failed to load A/B test settings.",
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        };

        void load();
    }, [effectiveUserId, user, toast, isTr]);

    const save = async () => {
        if (!effectiveUserId || !user) return;
        setIsSaving(true);
        try {
            const token = await user.getIdToken();
            const payload: AbTestingConfig = {
                ...config,
                trafficSplit: clampInt(config.trafficSplit, 10, 90),
                holdoutPercent: clampInt(config.holdoutPercent, 0, 40),
                minSampleSize: clampInt(config.minSampleSize, 50, 5000)
            };

            const mergedShopperConfig: ShopperConfigPayload = {
                ...baseShopperConfig,
                abTesting: payload
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
            if (!response.ok) throw new Error("Failed to save A/B settings");

            setBaseShopperConfig(mergedShopperConfig);
            toast({
                title: isTr ? "Kaydedildi" : "Saved",
                description: isTr ? "A/B test ayarları güncellendi." : "A/B test settings updated."
            });
        } catch (error) {
            console.error("[ExperimentsLab] Save error:", error);
            toast({
                title: isTr ? "Hata" : "Error",
                description: isTr ? "A/B test ayarları kaydedilemedi." : "Failed to save A/B test settings.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[220px] items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-zinc-200 bg-white shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Beaker className="h-5 w-5 text-zinc-800" />
                        {isTr ? "A/B Test Lab" : "A/B Test Lab"}
                    </CardTitle>
                    <CardDescription>
                        {isTr
                            ? "Konuşma stratejilerini kontrollü trafikle test edin, kazananı ölçekleyin."
                            : "Test conversation strategies with controlled traffic and scale the winner."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold">{isTr ? "A/B Test Aktif" : "Enable A/B Test"}</p>
                                <p className="text-xs text-muted-foreground">
                                    {isTr ? "Aktif olduğunda trafik split uygulanır." : "Traffic split is applied when enabled."}
                                </p>
                            </div>
                            <Switch
                                checked={config.enabled}
                                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, enabled: checked }))}
                            />
                        </div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold">{isTr ? "Kazananı Otomatik Yükselt" : "Auto-Promote Winner"}</p>
                                <p className="text-xs text-muted-foreground">
                                    {isTr ? "Örneklem tamamlandığında kazananı devreye al." : "Activate winner automatically after sample threshold."}
                                </p>
                            </div>
                            <Switch
                                checked={config.autoPromoteWinner}
                                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, autoPromoteWinner: checked }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{isTr ? "Hedef KPI" : "Target KPI"}</Label>
                        <Select value={config.goal} onValueChange={(value: ExperimentGoal) => setConfig((prev) => ({ ...prev, goal: value }))}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ctr">{isTr ? "Öneri Tıklama Oranı (CTR)" : "Recommendation CTR"}</SelectItem>
                                <SelectItem value="add_to_cart">{isTr ? "Sepete Ekleme Oranı" : "Add to Cart Rate"}</SelectItem>
                                <SelectItem value="conversion">{isTr ? "Dönüşüm Oranı" : "Conversion Rate"}</SelectItem>
                                <SelectItem value="avg_order_value">{isTr ? "Ortalama Sepet Tutarı" : "Average Order Value"}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>{isTr ? "Varyant B Trafik Yüzdesi" : "Variant B Traffic Share (%)"}</Label>
                        <Input
                            type="number"
                            min={10}
                            max={90}
                            value={config.trafficSplit}
                            onChange={(e) => setConfig((prev) => ({
                                ...prev,
                                trafficSplit: clampInt(Number(e.target.value || 50), 10, 90)
                            }))}
                        />
                        <p className="text-xs text-muted-foreground">
                            {isTr ? "Kalan trafik otomatik olarak Varyant A'ya gider." : "Remaining traffic automatically goes to Variant A."}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>{isTr ? "Holdout Yüzdesi" : "Holdout (%)"}</Label>
                        <Input
                            type="number"
                            min={0}
                            max={40}
                            value={config.holdoutPercent}
                            onChange={(e) => setConfig((prev) => ({
                                ...prev,
                                holdoutPercent: clampInt(Number(e.target.value || 0), 0, 40)
                            }))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>{isTr ? "Minimum Örneklem" : "Minimum Sample Size"}</Label>
                        <Input
                            type="number"
                            min={50}
                            max={5000}
                            value={config.minSampleSize}
                            onChange={(e) => setConfig((prev) => ({
                                ...prev,
                                minSampleSize: clampInt(Number(e.target.value || 150), 50, 5000)
                            }))}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-zinc-200 bg-white shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Target className="h-5 w-5 text-zinc-800" />
                        {isTr ? "Prompt Varyantları" : "Prompt Variants"}
                    </CardTitle>
                    <CardDescription>
                        {isTr ? "İki farklı satış yaklaşımı tanımlayın ve performansını ölçün." : "Define two sales styles and compare performance."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                        <Label>{isTr ? "Varyant A Adı" : "Variant A Name"}</Label>
                        <Input
                            value={config.variantAName}
                            onChange={(e) => setConfig((prev) => ({ ...prev, variantAName: e.target.value }))}
                        />
                        <Label>{isTr ? "Varyant A Prompt" : "Variant A Prompt"}</Label>
                        <Textarea
                            rows={7}
                            value={config.variantAPrompt}
                            onChange={(e) => setConfig((prev) => ({ ...prev, variantAPrompt: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-3">
                        <Label>{isTr ? "Varyant B Adı" : "Variant B Name"}</Label>
                        <Input
                            value={config.variantBName}
                            onChange={(e) => setConfig((prev) => ({ ...prev, variantBName: e.target.value }))}
                        />
                        <Label>{isTr ? "Varyant B Prompt" : "Variant B Prompt"}</Label>
                        <Textarea
                            rows={7}
                            value={config.variantBPrompt}
                            onChange={(e) => setConfig((prev) => ({ ...prev, variantBPrompt: e.target.value }))}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-zinc-200 bg-white shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">{isTr ? "Hızlı Deney Fikirleri" : "Quick Experiment Ideas"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    {isTr ? (
                        <>
                            <p>1. Kısa vs detaylı ürün karşılaştırma çıktısı</p>
                            <p>2. Tek ürün CTA vs çoklu alternatif CTA</p>
                            <p>3. İndirim odaklı metin vs fayda odaklı metin</p>
                            <p>4. Hızlı öneri (2 ürün) vs kapsamlı öneri (4 ürün)</p>
                        </>
                    ) : (
                        <>
                            <p>1. Short vs detailed product comparison output</p>
                            <p>2. Single-product CTA vs multi-option CTA</p>
                            <p>3. Discount-focused copy vs benefit-focused copy</p>
                            <p>4. Quick recommendation (2 items) vs comprehensive recommendation (4 items)</p>
                        </>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={save} disabled={isSaving} className="bg-black text-white hover:bg-zinc-800">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isTr ? "A/B Ayarlarını Kaydet" : "Save A/B Settings"}
                </Button>
            </div>
        </div>
    );
}
