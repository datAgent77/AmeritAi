"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Sparkles, SlidersHorizontal, ShieldCheck } from "lucide-react";

type RecommendationStrategy = "balanced" | "conversion" | "margin" | "inventory";

interface RecommendationWeights {
    relevance: number;
    margin: number;
    popularity: number;
    inventory: number;
}

interface RecommendationEngineConfig {
    strategy: RecommendationStrategy;
    useAiRerank: boolean;
    maxRecommendations: number;
    includeOutOfStockFallback: boolean;
    weights: RecommendationWeights;
    guardrails: {
        enforceStock: boolean;
        enforcePriceConsistency: boolean;
        diversifyResults: boolean;
    };
}

interface ShopperConfigPayload {
    recommendationStrategy?: string;
    strategy?: string;
    recommendationEngine?: Partial<RecommendationEngineConfig>;
    [key: string]: unknown;
}

const defaultConfig: RecommendationEngineConfig = {
    strategy: "balanced",
    useAiRerank: true,
    maxRecommendations: 4,
    includeOutOfStockFallback: false,
    weights: {
        relevance: 45,
        margin: 20,
        popularity: 20,
        inventory: 15
    },
    guardrails: {
        enforceStock: true,
        enforcePriceConsistency: true,
        diversifyResults: true
    }
};

function clampInt(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, Math.round(value)));
}

function mapLegacyStrategy(value: string | undefined): RecommendationStrategy {
    if (!value) return "balanced";
    const normalized = value.toLowerCase();
    if (normalized === "margin") return "margin";
    if (normalized === "inventory") return "inventory";
    if (normalized === "bestsellers" || normalized === "highest_rated" || normalized === "conversion") return "conversion";
    return "balanced";
}

function mapToLegacyStrategy(value: RecommendationStrategy): string {
    if (value === "margin") return "margin";
    if (value === "inventory") return "inventory";
    if (value === "conversion") return "bestsellers";
    return "relevance";
}

function normalizeConfig(raw: Partial<RecommendationEngineConfig> | undefined, legacyStrategy: string | undefined): RecommendationEngineConfig {
    const strategy = raw?.strategy || mapLegacyStrategy(legacyStrategy);
    return {
        strategy,
        useAiRerank: raw?.useAiRerank ?? defaultConfig.useAiRerank,
        maxRecommendations: clampInt(Number(raw?.maxRecommendations ?? defaultConfig.maxRecommendations), 1, 8),
        includeOutOfStockFallback: raw?.includeOutOfStockFallback ?? defaultConfig.includeOutOfStockFallback,
        weights: {
            relevance: clampInt(Number(raw?.weights?.relevance ?? defaultConfig.weights.relevance), 0, 100),
            margin: clampInt(Number(raw?.weights?.margin ?? defaultConfig.weights.margin), 0, 100),
            popularity: clampInt(Number(raw?.weights?.popularity ?? defaultConfig.weights.popularity), 0, 100),
            inventory: clampInt(Number(raw?.weights?.inventory ?? defaultConfig.weights.inventory), 0, 100)
        },
        guardrails: {
            enforceStock: raw?.guardrails?.enforceStock ?? defaultConfig.guardrails.enforceStock,
            enforcePriceConsistency: raw?.guardrails?.enforcePriceConsistency ?? defaultConfig.guardrails.enforcePriceConsistency,
            diversifyResults: raw?.guardrails?.diversifyResults ?? defaultConfig.guardrails.diversifyResults
        }
    };
}

interface RecommendationEnginePanelProps {
    targetUserId?: string;
}

export function RecommendationEnginePanel({ targetUserId }: RecommendationEnginePanelProps) {
    const { user } = useAuth();
    const { language } = useLanguage();
    const { toast } = useToast();
    const isTr = language === "tr";
    const isEs = language === "es";

    const effectiveUserId = targetUserId || user?.uid;
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [baseShopperConfig, setBaseShopperConfig] = useState<ShopperConfigPayload>({});
    const [config, setConfig] = useState<RecommendationEngineConfig>(defaultConfig);

    const totalWeight = useMemo(
        () => config.weights.relevance + config.weights.margin + config.weights.popularity + config.weights.inventory,
        [config.weights]
    );

    useEffect(() => {
        const load = async () => {
            if (!effectiveUserId || !user) return;
            setIsLoading(true);
            try {
                const token = await user.getIdToken();
                const response = await fetch(`/api/console/settings?chatbotId=${effectiveUserId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!response.ok) throw new Error("Failed to load recommendation settings");
                const data = await response.json();
                const shopperConfig = (data.shopperConfig || {}) as ShopperConfigPayload;
                setBaseShopperConfig(shopperConfig);
                const legacy = typeof shopperConfig.recommendationStrategy === "string"
                    ? shopperConfig.recommendationStrategy
                    : typeof shopperConfig.strategy === "string"
                        ? shopperConfig.strategy
                        : undefined;
                const normalized = normalizeConfig(shopperConfig.recommendationEngine, legacy);
                setConfig(normalized);
            } catch (error) {
                console.error("[RecommendationEnginePanel] Load error:", error);
                toast({
                    title: isTr ? "Hata" : isEs ? "Error" : "Error",
                    description: isTr ? "Öneri motoru ayarları yüklenemedi." : isEs ? "No se pudieron cargar los ajustes del motor de recomendación." : "Recommendation engine settings could not be loaded.",
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
            const payloadConfig = {
                ...config,
                maxRecommendations: clampInt(config.maxRecommendations, 1, 8),
                weights: {
                    relevance: clampInt(config.weights.relevance, 0, 100),
                    margin: clampInt(config.weights.margin, 0, 100),
                    popularity: clampInt(config.weights.popularity, 0, 100),
                    inventory: clampInt(config.weights.inventory, 0, 100)
                }
            };

            const mergedShopperConfig: ShopperConfigPayload = {
                ...baseShopperConfig,
                recommendationStrategy: mapToLegacyStrategy(payloadConfig.strategy),
                strategy: mapToLegacyStrategy(payloadConfig.strategy),
                recommendationEngine: payloadConfig
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

            if (!response.ok) throw new Error("Failed to save recommendation settings");

            setBaseShopperConfig(mergedShopperConfig);
            toast({
                title: isTr ? "Kaydedildi" : isEs ? "Guardado" : "Saved",
                description: isTr ? "Öneri motoru ayarları güncellendi." : isEs ? "Ajustes del motor de recomendación actualizados." : "Recommendation engine settings updated."
            });
        } catch (error) {
            console.error("[RecommendationEnginePanel] Save error:", error);
            toast({
                title: isTr ? "Hata" : isEs ? "Error" : "Error",
                description: isTr ? "Öneri motoru ayarları kaydedilemedi." : isEs ? "No se pudieron guardar los ajustes del motor de recomendación." : "Recommendation engine settings could not be saved.",
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
                        <Sparkles className="h-5 w-5 text-zinc-800" />
                        {isTr ? "Öneri Motoru" : isEs ? "Motor de recomendación" : "Recommendation Engine"}
                    </CardTitle>
                    <CardDescription>
                        {isTr ? "Kural ağırlıkları ve AI yeniden sıralama ayarlarını birlikte yönetin." : isEs ? "Gestiona los pesos de las reglas y el reordenamiento por IA juntos." : "Manage rule weights and AI re-ranking together."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                        <Label>{isTr ? "Ana Strateji" : isEs ? "Estrategia principal" : "Primary Strategy"}</Label>
                        <Select
                            value={config.strategy}
                            onValueChange={(value: RecommendationStrategy) => setConfig((prev) => ({ ...prev, strategy: value }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="balanced">{isTr ? "Dengeli (Alaka + Dönüşüm)" : isEs ? "Equilibrada (Relevancia + Conversión)" : "Balanced (Relevance + Conversion)"}</SelectItem>
                                <SelectItem value="conversion">{isTr ? "Dönüşüm Öncelikli" : isEs ? "Prioridad de conversión" : "Conversion Priority"}</SelectItem>
                                <SelectItem value="margin">{isTr ? "Marj Öncelikli" : isEs ? "Prioridad de margen" : "Margin Priority"}</SelectItem>
                                <SelectItem value="inventory">{isTr ? "Stok Öncelikli" : isEs ? "Prioridad de inventario" : "Inventory Priority"}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <Label>{isTr ? "Oturum Başına Öneri Sayısı" : isEs ? "Recomendaciones por sesión" : "Recommendations Per Session"}</Label>
                        <Input
                            type="number"
                            min={1}
                            max={8}
                            value={config.maxRecommendations}
                            onChange={(e) => setConfig((prev) => ({
                                ...prev,
                                maxRecommendations: clampInt(Number(e.target.value || 1), 1, 8)
                            }))}
                        />
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold">AI Re-rank</p>
                                <p className="text-xs text-muted-foreground">
                                    {isTr ? "Kural sonuçlarını AI ile yeniden sırala." : isEs ? "Reordena los resultados basados en reglas con IA." : "Re-rank rule-based results with AI."}
                                </p>
                            </div>
                            <Switch
                                checked={config.useAiRerank}
                                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, useAiRerank: checked }))}
                            />
                        </div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold">{isTr ? "Stok Dışı Fallback" : isEs ? "Alternativa sin stock" : "Out-of-Stock Fallback"}</p>
                                <p className="text-xs text-muted-foreground">
                                    {isTr ? "Stok dışıysa benzer alternatif öner." : isEs ? "Sugiere alternativas si un artículo está sin stock." : "Suggest alternatives if an item is out of stock."}
                                </p>
                            </div>
                            <Switch
                                checked={config.includeOutOfStockFallback}
                                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, includeOutOfStockFallback: checked }))}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-zinc-200 bg-white shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <SlidersHorizontal className="h-5 w-5 text-zinc-800" />
                        {isTr ? "Ağırlık Dağılımı" : isEs ? "Distribución de pesos" : "Weight Distribution"}
                    </CardTitle>
                    <CardDescription>
                        {isTr ? "Toplamın 100 olması önerilir. Şu an:" : isEs ? "El total recomendado es 100. Actual:" : "Recommended total is 100. Current:"} <strong>{totalWeight}</strong>
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label>{isTr ? "Alaka Düzeyi (%)" : isEs ? "Relevancia (%)" : "Relevance (%)"}</Label>
                        <Input
                            type="number"
                            min={0}
                            max={100}
                            value={config.weights.relevance}
                            onChange={(e) => setConfig((prev) => ({
                                ...prev,
                                weights: { ...prev.weights, relevance: clampInt(Number(e.target.value || 0), 0, 100) }
                            }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{isTr ? "Marj (%)" : isEs ? "Margen (%)" : "Margin (%)"}</Label>
                        <Input
                            type="number"
                            min={0}
                            max={100}
                            value={config.weights.margin}
                            onChange={(e) => setConfig((prev) => ({
                                ...prev,
                                weights: { ...prev.weights, margin: clampInt(Number(e.target.value || 0), 0, 100) }
                            }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{isTr ? "Popülerlik (%)" : isEs ? "Popularidad (%)" : "Popularity (%)"}</Label>
                        <Input
                            type="number"
                            min={0}
                            max={100}
                            value={config.weights.popularity}
                            onChange={(e) => setConfig((prev) => ({
                                ...prev,
                                weights: { ...prev.weights, popularity: clampInt(Number(e.target.value || 0), 0, 100) }
                            }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{isTr ? "Stok Sağlığı (%)" : isEs ? "Salud del inventario (%)" : "Inventory Health (%)"}</Label>
                        <Input
                            type="number"
                            min={0}
                            max={100}
                            value={config.weights.inventory}
                            onChange={(e) => setConfig((prev) => ({
                                ...prev,
                                weights: { ...prev.weights, inventory: clampInt(Number(e.target.value || 0), 0, 100) }
                            }))}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-zinc-200 bg-white shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <ShieldCheck className="h-5 w-5 text-zinc-800" />
                        Guardrails
                    </CardTitle>
                    <CardDescription>
                        {isTr ? "Yanlış önerileri azaltan güvenlik kuralları." : isEs ? "Reglas de seguridad que reducen las recomendaciones deficientes." : "Safety rules that reduce poor recommendations."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                        <div>
                            <p className="text-sm font-medium">{isTr ? "Sadece stoktakini öner" : isEs ? "Recomendar solo artículos en stock" : "Recommend only in-stock items"}</p>
                            <p className="text-xs text-muted-foreground">
                                {isTr ? "Stok dışı ürünleri ana öneri listesine alma." : isEs ? "Excluye los artículos sin stock de las recomendaciones principales." : "Exclude out-of-stock items from primary recommendations."}
                            </p>
                        </div>
                        <Switch
                            checked={config.guardrails.enforceStock}
                            onCheckedChange={(checked) => setConfig((prev) => ({
                                ...prev,
                                guardrails: { ...prev.guardrails, enforceStock: checked }
                            }))}
                        />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                        <div>
                            <p className="text-sm font-medium">{isTr ? "Fiyat tutarlılığı" : isEs ? "Consistencia de precios" : "Price consistency"}</p>
                            <p className="text-xs text-muted-foreground">
                                {isTr ? "Konuşma içindeki fiyat değişimlerini sınırla." : isEs ? "Limita los cambios de precio inconsistentes en la conversación." : "Limit inconsistent price shifts in conversation."}
                            </p>
                        </div>
                        <Switch
                            checked={config.guardrails.enforcePriceConsistency}
                            onCheckedChange={(checked) => setConfig((prev) => ({
                                ...prev,
                                guardrails: { ...prev.guardrails, enforcePriceConsistency: checked }
                            }))}
                        />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                        <div>
                            <p className="text-sm font-medium">{isTr ? "Sonuç çeşitliliği" : isEs ? "Diversidad de resultados" : "Result diversity"}</p>
                            <p className="text-xs text-muted-foreground">
                                {isTr ? "Aynı kategoriye aşırı yığılmayı azalt." : isEs ? "Reduce la sobreconcentración en la misma categoría." : "Reduce over-concentration in the same category."}
                            </p>
                        </div>
                        <Switch
                            checked={config.guardrails.diversifyResults}
                            onCheckedChange={(checked) => setConfig((prev) => ({
                                ...prev,
                                guardrails: { ...prev.guardrails, diversifyResults: checked }
                            }))}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={save} disabled={isSaving} className="bg-black text-white hover:bg-zinc-800">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isTr ? "Öneri Motorunu Kaydet" : isEs ? "Guardar motor de recomendación" : "Save Recommendation Engine"}
                </Button>
            </div>
        </div>
    );
}
