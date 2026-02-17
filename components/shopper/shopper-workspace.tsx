"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ShopperSettings } from "@/components/shopper-settings";
import { ProductKnowledge } from "@/components/product-knowledge";
import { RecommendationEnginePanel } from "@/components/shopper/recommendation-engine-panel";
import { ExperimentsLab } from "@/components/shopper/experiments-lab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
    Activity,
    Beaker,
    Bot,
    Database,
    FileText,
    Globe,
    Layers3,
    LineChart as LineChartIcon,
    Loader2,
    RefreshCw,
    Rss,
    ShoppingBag,
    Target
} from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type SourceBreakdown = Record<string, number>;
type HealthStatus = "weak" | "needs_attention" | "good" | "excellent";

interface CrawlConfigSummary {
    siteUrl: string;
    limit: number;
    discoveryLimit: number;
    nextOffset: number;
    lastRunAt: string | null;
    lastRunStatus: string | null;
    lastRunCount: number;
    lastRunScanned: number;
    lastRunDiscovered: number;
    lastRunCycleCompleted: boolean;
    enabled: boolean;
}

interface ShopperTrendPoint {
    date: string;
    added: number;
    updated: number;
    cumulativeTotal: number;
    inStockAdded: number;
    withDescriptionAdded: number;
    withImageAdded: number;
    withPriceAdded: number;
    sourceBreakdown: SourceBreakdown;
}

interface ShopperHealthPayload {
    stats: {
        totalProducts: number;
        inStock: number;
        outOfStock: number;
        withDescription: number;
        withImage: number;
        withPrice: number;
    };
    quality: {
        score: number;
        status: HealthStatus;
        descriptionCoverage: number;
        imageCoverage: number;
        priceCoverage: number;
        inStockCoverage: number;
    };
    ingestion: {
        sourceBreakdown: SourceBreakdown;
        lastCatalogUpdateAt: string | null;
        crawlConfig: CrawlConfigSummary | null;
        trend?: {
            days: number;
            timezone: string;
            rangeStart: string;
            rangeEnd: string;
            series: ShopperTrendPoint[];
        };
    };
    recommendations: string[];
}

interface ShopperWorkspaceProps {
    targetUserId?: string;
}

interface HealthBadgeMeta {
    label: string;
    className: string;
}

function formatDateTime(value: string | null | undefined, locale: string): string {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString(locale);
}

function sourceLabel(source: string, isTr: boolean): string {
    if (source === "site-crawl") return "Site Crawl";
    if (source === "xml-feed") return "XML Feed";
    if (source === "file-upload") return isTr ? "Dosya" : "File Upload";
    if (source === "manual") return isTr ? "Manuel" : "Manual";
    return source;
}

function healthMeta(status: HealthStatus | undefined, isTr: boolean): HealthBadgeMeta {
    if (status === "excellent") {
        return { label: isTr ? "Mükemmel" : "Excellent", className: "border-zinc-900 bg-zinc-900 text-white" };
    }
    if (status === "good") {
        return { label: isTr ? "İyi" : "Good", className: "border-zinc-300 bg-zinc-100 text-zinc-900" };
    }
    if (status === "needs_attention") {
        return { label: isTr ? "Dikkat Gerekli" : "Needs Attention", className: "border-zinc-400 bg-zinc-200 text-zinc-900" };
    }
    return { label: isTr ? "Geliştirilmeli" : "Weak", className: "border-zinc-300 bg-white text-zinc-900" };
}

export function ShopperWorkspace({ targetUserId }: ShopperWorkspaceProps) {
    const { user } = useAuth();
    const { language } = useLanguage();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("overview");
    const [feedUrl, setFeedUrl] = useState("");
    const [siteUrl, setSiteUrl] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isCrawling, setIsCrawling] = useState(false);
    const [health, setHealth] = useState<ShopperHealthPayload | null>(null);
    const [isHealthLoading, setIsHealthLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isTr = language === "tr";
    const locale = isTr ? "tr-TR" : "en-US";
    const effectiveUserId = targetUserId || user?.uid;
    const isSuperAdminView = Boolean(targetUserId && user?.uid !== targetUserId);
    const statusMeta = healthMeta(health?.quality.status, isTr);

    const text = useMemo(
        () => ({
            appLabel: "AI Personal Shopper",
            heroTitle: isTr ? "Operasyon Merkezi" : "Operations Hub",
            heroDescription: isTr
                ? "Katalog, veri kaynakları, öneri stratejisi ve deneyleri tek panelden siyah-beyaz sade bir akışla yönetin."
                : "Manage catalog, data sources, recommendation strategy, and experiments in one streamlined panel.",
            healthPrefix: isTr ? "Sağlık" : "Health",
            totalProducts: isTr ? "Toplam Ürün" : "Total Products",
            qualityScore: isTr ? "Kalite Skoru" : "Quality Score",
            sourceCount: isTr ? "Kaynak" : "Sources",
            lastUpdated: isTr ? "Son Güncelleme" : "Last Update",
            refreshHealth: isTr ? "Sağlığı Yenile" : "Refresh Health",
            addDataSource: isTr ? "Veri Kaynağı Ekle" : "Add Data Source",
            openCatalog: isTr ? "Kataloğu Aç" : "Open Catalog",
            tabOverview: isTr ? "Genel Bakış" : "Overview",
            tabCatalog: isTr ? "Katalog" : "Catalog",
            tabDataSources: isTr ? "Kaynaklar" : "Data Sources",
            tabRecommendation: isTr ? "Öneri Motoru" : "Recommendation Engine",
            tabExperiments: isTr ? "A/B Test" : "A/B Test",
            tabSettings: isTr ? "Ayarlar" : "Settings",
            inStock: isTr ? "Stokta Olan" : "In Stock",
            outOfStock: isTr ? "Stok dışı" : "Out of Stock",
            descriptionCoverage: isTr ? "Açıklama Kapsamı" : "Description Coverage",
            imageCoverage: isTr ? "Görsel" : "Image",
            priceCoverage: isTr ? "Fiyat Kapsamı" : "Price Coverage",
            stockCoverage: isTr ? "Stok kapsaması" : "Stock Coverage",
            crawlPipeline: isTr ? "Crawl Pipeline" : "Crawl Pipeline",
            active: isTr ? "Aktif" : "Active",
            none: isTr ? "Yok" : "None",
            lastRun: isTr ? "Son run" : "Last run",
            trendTitle: isTr ? "30 Günlük Katalog Trendi" : "30-Day Catalog Trend",
            trendDesc: isTr ? "Günlük eklenen/güncellenen ürün hareketi." : "Daily added/updated product activity.",
            chartAdded: isTr ? "Eklenen" : "Added",
            chartUpdated: isTr ? "Güncellenen" : "Updated",
            chartTotal: isTr ? "Toplam" : "Total",
            noTrend: isTr ? "Trend verisi henüz oluşmadı." : "No trend data yet.",
            operationsNotes: isTr ? "Operasyon Notları" : "Operational Notes",
            operationsDesc: isTr ? "Kaynak dağılımı ve aksiyon önerileri." : "Source distribution and action recommendations.",
            sourceDistribution: isTr ? "Kaynak Dağılımı" : "Source Distribution",
            noSourceData: isTr ? "Henüz kaynak verisi yok." : "No source data yet.",
            recommendations: isTr ? "Öneriler" : "Recommendations",
            noCriticalSuggestion: isTr ? "Şu an kritik öneri yok. Akış stabil." : "No critical suggestions at the moment. Flow is stable.",
            catalogManagement: isTr ? "Katalog Yönetimi" : "Catalog Management",
            catalogDescription: isTr ? "Ürünleri görüntüle, ekle ve düzenle." : "View, add, and manage products.",
            xmlFeedTitle: "XML Feed",
            xmlFeedDescription: isTr ? "Planlı veya manuel feed senkronizasyonu." : "Scheduled or manual feed synchronization.",
            feedUrl: "Feed URL",
            feedPlaceholder: isTr ? "https://ornek.com/products.xml" : "https://example.com/products.xml",
            syncNow: isTr ? "Şimdi Senkronize Et" : "Sync Now",
            crawlTitle: "Site Crawl",
            crawlDescription: isTr ? "Ürün URL’lerini sitemap/robots üzerinden keşfeder." : "Discovers product URLs from sitemap/robots.",
            siteUrl: "Site URL",
            sitePlaceholder: isTr ? "https://ornekmagaza.com" : "https://examplestore.com",
            crawlNow: isTr ? "Tara ve Ekle" : "Crawl and Import",
            csvExcelTitle: "CSV / Excel",
            csvExcelDescription: isTr ? "Toplu ürün yükleme (manüel import)." : "Bulk product import.",
            fileImportDesc: isTr ? "Kolon eşleme ile ürün, fiyat, stok ve görsel verilerini içe alın." : "Import product, price, stock, and image data with flexible column mapping.",
            selectAndUpload: isTr ? "Dosya Seç ve Yükle" : "Select and Upload File",
            ingestionHubTitle: isTr ? "Ingestion Kontrol Merkezi" : "Ingestion Control Hub",
            ingestionHubDescription: isTr ? "Kaynak bazında veri akışı ve crawl ilerleme takibi." : "Track source-based data flow and crawl progress.",
            crawlStatus: isTr ? "Durum" : "Status",
            crawlScanned: isTr ? "Son tarama" : "Last scan",
            crawlImported: isTr ? "Son import" : "Last import",
            crawlDiscovered: isTr ? "Keşif" : "Discovered",
            noCrawlConfig: isTr ? "Aktif crawl konfigürasyonu yok." : "No active crawl configuration.",
            success: isTr ? "Başarılı" : "Success",
            uploadErrorTitle: isTr ? "Yükleme Hatası" : "Upload Error",
            syncErrorTitle: isTr ? "Senkronizasyon Hatası" : "Sync Error",
            crawlErrorTitle: isTr ? "Tarama Hatası" : "Crawl Error",
            healthErrorTitle: isTr ? "Hata" : "Error",
            healthErrorMessage: isTr ? "Shopper sağlık metrikleri yüklenemedi." : "Failed to load shopper health metrics.",
            feedMissingUrl: isTr ? "Lütfen geçerli bir XML feed URL girin." : "Please enter a valid XML feed URL.",
            siteMissingUrl: isTr ? "Lütfen geçerli bir web sitesi URL'i girin." : "Please enter a valid website URL.",
            feedSyncedTitle: isTr ? "Feed Senkronize" : "Feed Synced",
            crawlCompletedTitle: isTr ? "Site Tarama Tamamlandı" : "Site Crawl Completed",
            continuationLabel: isTr ? "Devamı için yeniden çalıştırın (sonraki başlangıç:" : "Run again for continuation (next offset:",
            cycleCompletedLabel: isTr ? "Keşif havuzu tamamlandı, sonraki çalıştırma baştan güncelleme yapacak." : "Discovery pool completed. Next run starts from the beginning."
        }),
        [isTr]
    );

    const loadHealth = useCallback(async () => {
        if (!effectiveUserId || !user) return;
        setIsHealthLoading(true);
        try {
            const token = await user.getIdToken();
            const response = await fetch(`/api/shopper/health?chatbotId=${encodeURIComponent(effectiveUserId)}&days=30`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error("Failed to load shopper health");
            const data = (await response.json()) as ShopperHealthPayload;
            setHealth(data);
        } catch (error) {
            console.error("[ShopperWorkspace] Health error:", error);
            toast({
                title: text.healthErrorTitle,
                description: text.healthErrorMessage,
                variant: "destructive"
            });
        } finally {
            setIsHealthLoading(false);
        }
    }, [effectiveUserId, user, toast, text.healthErrorTitle, text.healthErrorMessage]);

    useEffect(() => {
        void loadHealth();
    }, [loadHealth]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        void handleFileUpload(file);
    };

    const handleFileUpload = async (file: File) => {
        if (!effectiveUserId) return;
        setIsUploading(true);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("chatbotId", effectiveUserId);

        try {
            const response = await fetch("/api/chatbot/shopper/upload", {
                method: "POST",
                body: formData
            });
            const data = await response.json();

            if (!data.success) throw new Error(data.error || "Upload failed");

            toast({
                title: text.success,
                description: isTr ? `${data.count} ürün dosyadan işlendi.` : `${data.count} products processed from file.`
            });
            setActiveTab("catalog");
            await loadHealth();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : isTr ? "Dosya yüklenemedi" : "File upload failed";
            toast({
                title: text.uploadErrorTitle,
                description: message,
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleFeedSync = async () => {
        if (!feedUrl) {
            toast({
                title: text.healthErrorTitle,
                description: text.feedMissingUrl,
                variant: "destructive"
            });
            return;
        }
        if (!effectiveUserId || !user) return;
        setIsSyncing(true);

        try {
            const token = await user.getIdToken();
            const response = await fetch("/api/chatbot/shopper/feed-sync", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    feedUrl,
                    chatbotId: effectiveUserId
                })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error || "Feed sync failed");

            toast({
                title: text.feedSyncedTitle,
                description: isTr ? `${data.count} ürün işlendi.` : `${data.count} products processed.`
            });
            setActiveTab("catalog");
            await loadHealth();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : isTr ? "Feed senkronizasyonu başarısız" : "Feed sync failed";
            toast({
                title: text.syncErrorTitle,
                description: message,
                variant: "destructive"
            });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSiteCrawl = async () => {
        if (!siteUrl) {
            toast({
                title: text.healthErrorTitle,
                description: text.siteMissingUrl,
                variant: "destructive"
            });
            return;
        }
        if (!effectiveUserId || !user) return;
        setIsCrawling(true);

        try {
            const token = await user.getIdToken();
            const response = await fetch("/api/chatbot/shopper/site-crawl", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    siteUrl,
                    chatbotId: effectiveUserId,
                    limit: 50
                })
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.error || "Site crawl failed");

            const continuationMessage = data.hasMore
                ? `${text.continuationLabel} ${data.nextOffset || 0}).`
                : text.cycleCompletedLabel;

            toast({
                title: text.crawlCompletedTitle,
                description: isTr
                    ? `${data.count} ürün eklendi. ${data.scanned || 0} URL tarandı. ${continuationMessage}`
                    : `${data.count} products imported. ${data.scanned || 0} URLs scanned. ${continuationMessage}`
            });
            setActiveTab("catalog");
            await loadHealth();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : isTr ? "Site tarama başarısız" : "Site crawl failed";
            toast({
                title: text.crawlErrorTitle,
                description: message,
                variant: "destructive"
            });
        } finally {
            setIsCrawling(false);
        }
    };

    const trendSeries = useMemo(() => {
        const points = health?.ingestion.trend?.series || [];
        return points.map((item) => ({
            day: item.date.slice(5),
            fullDate: item.date,
            added: item.added,
            updated: item.updated,
            total: item.cumulativeTotal
        }));
    }, [health?.ingestion.trend?.series]);

    const sourceItems = useMemo(
        () =>
            Object.entries(health?.ingestion.sourceBreakdown || {}).sort((a, b) => b[1] - a[1]),
        [health?.ingestion.sourceBreakdown]
    );

    return (
        <div className="space-y-6 p-6 lg:p-8">
            <section className="rounded-2xl border border-zinc-900 bg-black p-6 text-white">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div className="space-y-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">{text.appLabel}</p>
                        <h1 className="text-3xl font-semibold tracking-tight">{text.heroTitle}</h1>
                        <p className="max-w-2xl text-sm text-zinc-300">{text.heroDescription}</p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <Badge className={`rounded-full border px-3 py-1 text-xs font-medium ${statusMeta.className}`}>
                                {text.healthPrefix}: {statusMeta.label}
                            </Badge>
                            {isSuperAdminView && (
                                <Badge className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-100">
                                    Tenant: {effectiveUserId}
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-auto xl:grid-cols-4">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                            <p className="text-xs text-zinc-400">{text.totalProducts}</p>
                            <p className="text-2xl font-semibold text-white">{health?.stats.totalProducts ?? "—"}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                            <p className="text-xs text-zinc-400">{text.qualityScore}</p>
                            <p className="text-2xl font-semibold text-white">{health?.quality.score ?? "—"}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                            <p className="text-xs text-zinc-400">{text.sourceCount}</p>
                            <p className="text-2xl font-semibold text-white">{sourceItems.length}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                            <p className="text-xs text-zinc-400">{text.lastUpdated}</p>
                            <p className="text-sm font-medium text-white">{formatDateTime(health?.ingestion.lastCatalogUpdateAt, locale)}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        className="border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-800 hover:text-white"
                        onClick={() => void loadHealth()}
                        disabled={isHealthLoading}
                    >
                        {isHealthLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        {text.refreshHealth}
                    </Button>
                    <Button className="bg-white text-black hover:bg-zinc-200" onClick={() => setActiveTab("datasources")}>
                        {text.addDataSource}
                    </Button>
                    <Button className="bg-zinc-900 text-white hover:bg-zinc-800" onClick={() => setActiveTab("catalog")}>
                        {text.openCatalog}
                    </Button>
                </div>
            </section>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
                <div className="overflow-x-auto">
                    <TabsList className="inline-flex h-auto w-max min-w-full justify-start gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1">
                        <TabsTrigger value="overview" className="rounded-lg px-4 py-2 data-[state=active]:bg-black data-[state=active]:text-white">
                            <LineChartIcon className="mr-2 h-4 w-4" />
                            {text.tabOverview}
                        </TabsTrigger>
                        <TabsTrigger value="catalog" className="rounded-lg px-4 py-2 data-[state=active]:bg-black data-[state=active]:text-white">
                            <Layers3 className="mr-2 h-4 w-4" />
                            {text.tabCatalog}
                        </TabsTrigger>
                        <TabsTrigger value="datasources" className="rounded-lg px-4 py-2 data-[state=active]:bg-black data-[state=active]:text-white">
                            <Database className="mr-2 h-4 w-4" />
                            {text.tabDataSources}
                        </TabsTrigger>
                        <TabsTrigger value="recommendation" className="rounded-lg px-4 py-2 data-[state=active]:bg-black data-[state=active]:text-white">
                            <Bot className="mr-2 h-4 w-4" />
                            {text.tabRecommendation}
                        </TabsTrigger>
                        <TabsTrigger value="experiments" className="rounded-lg px-4 py-2 data-[state=active]:bg-black data-[state=active]:text-white">
                            <Beaker className="mr-2 h-4 w-4" />
                            {text.tabExperiments}
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="rounded-lg px-4 py-2 data-[state=active]:bg-black data-[state=active]:text-white">
                            <Target className="mr-2 h-4 w-4" />
                            {text.tabSettings}
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Card className="border-zinc-200 bg-white shadow-sm">
                            <CardHeader className="pb-2">
                                <CardDescription>{text.inStock}</CardDescription>
                                <CardTitle className="text-2xl">{health?.stats.inStock ?? 0}</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 text-xs text-zinc-500">{text.outOfStock}: {health?.stats.outOfStock ?? 0}</CardContent>
                        </Card>
                        <Card className="border-zinc-200 bg-white shadow-sm">
                            <CardHeader className="pb-2">
                                <CardDescription>{text.descriptionCoverage}</CardDescription>
                                <CardTitle className="text-2xl">{health?.quality.descriptionCoverage ?? 0}%</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 text-xs text-zinc-500">{text.imageCoverage}: {health?.quality.imageCoverage ?? 0}%</CardContent>
                        </Card>
                        <Card className="border-zinc-200 bg-white shadow-sm">
                            <CardHeader className="pb-2">
                                <CardDescription>{text.priceCoverage}</CardDescription>
                                <CardTitle className="text-2xl">{health?.quality.priceCoverage ?? 0}%</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 text-xs text-zinc-500">{text.stockCoverage}: {health?.quality.inStockCoverage ?? 0}%</CardContent>
                        </Card>
                        <Card className="border-zinc-200 bg-white shadow-sm">
                            <CardHeader className="pb-2">
                                <CardDescription>{text.crawlPipeline}</CardDescription>
                                <CardTitle className="text-2xl">{health?.ingestion.crawlConfig ? text.active : text.none}</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 text-xs text-zinc-500">
                                {text.lastRun}: {formatDateTime(health?.ingestion.crawlConfig?.lastRunAt, locale)}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-3">
                        <Card className="xl:col-span-2 border-zinc-200 bg-white shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <LineChartIcon className="h-5 w-5 text-zinc-800" />
                                    {text.trendTitle}
                                </CardTitle>
                                <CardDescription>{text.trendDesc}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {trendSeries.length > 0 ? (
                                    <div className="h-72">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={trendSeries} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis dataKey="day" stroke="#71717a" fontSize={12} />
                                                <YAxis stroke="#71717a" fontSize={12} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: 10, borderColor: "#d4d4d8" }}
                                                    labelFormatter={(label, payload) => {
                                                        const point = payload?.[0]?.payload as { fullDate?: string } | undefined;
                                                        return point?.fullDate || label;
                                                    }}
                                                />
                                                <Legend />
                                                <Line type="monotone" dataKey="added" stroke="#111827" strokeWidth={2} dot={false} name={text.chartAdded} />
                                                <Line
                                                    type="monotone"
                                                    dataKey="updated"
                                                    stroke="#71717a"
                                                    strokeWidth={2}
                                                    strokeDasharray="4 4"
                                                    dot={false}
                                                    name={text.chartUpdated}
                                                />
                                                <Line type="monotone" dataKey="total" stroke="#d4d4d8" strokeWidth={2} dot={false} name={text.chartTotal} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-500">
                                        {text.noTrend}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-zinc-200 bg-white shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Activity className="h-5 w-5 text-zinc-800" />
                                    {text.operationsNotes}
                                </CardTitle>
                                <CardDescription>{text.operationsDesc}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{text.sourceDistribution}</p>
                                    {sourceItems.length === 0 ? (
                                        <p className="text-sm text-zinc-500">{text.noSourceData}</p>
                                    ) : (
                                        sourceItems.map(([source, count]) => (
                                            <div key={source} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                                                <span>{sourceLabel(source, isTr)}</span>
                                                <span className="font-semibold">{count}</span>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{text.recommendations}</p>
                                    {(health?.recommendations || []).length > 0 ? (
                                        (health?.recommendations || []).map((item) => (
                                            <p key={item} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                                                {item}
                                            </p>
                                        ))
                                    ) : (
                                        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                                            {text.noCriticalSuggestion}
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="catalog" className="space-y-4">
                    <Card className="border-zinc-200 bg-white shadow-sm">
                        <CardHeader>
                            <CardTitle>{text.catalogManagement}</CardTitle>
                            <CardDescription>{text.catalogDescription}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ProductKnowledge targetUserId={effectiveUserId} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="datasources" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                        <Card className="flex flex-col border-zinc-200 bg-white shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Rss className="h-5 w-5 text-zinc-800" />
                                    {text.xmlFeedTitle}
                                </CardTitle>
                                <CardDescription>{text.xmlFeedDescription}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-3">
                                <Label htmlFor="shopper-feed-url">{text.feedUrl}</Label>
                                <Input
                                    id="shopper-feed-url"
                                    placeholder={text.feedPlaceholder}
                                    value={feedUrl}
                                    onChange={(e) => setFeedUrl(e.target.value)}
                                />
                            </CardContent>
                            <CardFooter>
                                <Button onClick={() => void handleFeedSync()} disabled={isSyncing} className="w-full bg-black text-white hover:bg-zinc-800">
                                    {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                    {text.syncNow}
                                </Button>
                            </CardFooter>
                        </Card>

                        <Card className="flex flex-col border-zinc-200 bg-white shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Globe className="h-5 w-5 text-zinc-800" />
                                    {text.crawlTitle}
                                </CardTitle>
                                <CardDescription>{text.crawlDescription}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-3">
                                <Label htmlFor="shopper-site-url">{text.siteUrl}</Label>
                                <Input
                                    id="shopper-site-url"
                                    placeholder={text.sitePlaceholder}
                                    value={siteUrl}
                                    onChange={(e) => setSiteUrl(e.target.value)}
                                />
                                {health?.ingestion.crawlConfig && (
                                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
                                        <p>{isTr ? "Son URL" : "Last URL"}: {health.ingestion.crawlConfig.siteUrl}</p>
                                        <p>{isTr ? "Sonraki offset" : "Next offset"}: {health.ingestion.crawlConfig.nextOffset}</p>
                                        <p>{isTr ? "Keşif havuzu" : "Discovery pool"}: {health.ingestion.crawlConfig.discoveryLimit}</p>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button onClick={() => void handleSiteCrawl()} disabled={isCrawling} className="w-full bg-black text-white hover:bg-zinc-800">
                                    {isCrawling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
                                    {text.crawlNow}
                                </Button>
                            </CardFooter>
                        </Card>

                        <Card className="flex flex-col border-zinc-200 bg-white shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-zinc-800" />
                                    {text.csvExcelTitle}
                                </CardTitle>
                                <CardDescription>{text.csvExcelDescription}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".csv, .xlsx, .xls"
                                    onChange={handleFileSelect}
                                />
                                <p className="text-sm text-zinc-600">{text.fileImportDesc}</p>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="w-full bg-black text-white hover:bg-zinc-800"
                                >
                                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingBag className="mr-2 h-4 w-4" />}
                                    {text.selectAndUpload}
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>

                    <Card className="border-zinc-200 bg-white shadow-sm">
                        <CardHeader>
                            <CardTitle>{text.ingestionHubTitle}</CardTitle>
                            <CardDescription>{text.ingestionHubDescription}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <p className="text-sm font-medium">{text.sourceDistribution}</p>
                                {sourceItems.length === 0 ? (
                                    <p className="text-sm text-zinc-500">{text.noSourceData}</p>
                                ) : (
                                    sourceItems.map(([source, count]) => (
                                        <div key={source} className="flex items-center justify-between rounded border border-zinc-200 px-3 py-2 text-sm">
                                            <span>{sourceLabel(source, isTr)}</span>
                                            <span className="font-semibold">{count}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium">{text.crawlPipeline}</p>
                                {health?.ingestion.crawlConfig ? (
                                    <div className="space-y-2 rounded border border-zinc-200 bg-zinc-50 p-3 text-sm">
                                        <p><span className="text-zinc-500">{text.crawlStatus}:</span> {health.ingestion.crawlConfig.lastRunStatus || "—"}</p>
                                        <p><span className="text-zinc-500">{text.crawlScanned}:</span> {health.ingestion.crawlConfig.lastRunScanned}</p>
                                        <p><span className="text-zinc-500">{text.crawlImported}:</span> {health.ingestion.crawlConfig.lastRunCount}</p>
                                        <p><span className="text-zinc-500">{text.crawlDiscovered}:</span> {health.ingestion.crawlConfig.lastRunDiscovered}</p>
                                        <p><span className="text-zinc-500">{text.lastRun}:</span> {formatDateTime(health.ingestion.crawlConfig.lastRunAt, locale)}</p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-zinc-500">{text.noCrawlConfig}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="recommendation">
                    <RecommendationEnginePanel targetUserId={effectiveUserId} />
                </TabsContent>

                <TabsContent value="experiments">
                    <ExperimentsLab targetUserId={effectiveUserId} />
                </TabsContent>

                <TabsContent value="settings">
                    <ShopperSettings targetUserId={effectiveUserId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
