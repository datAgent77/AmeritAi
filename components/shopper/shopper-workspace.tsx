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

function pick3(language: string, tr: string, en: string, es: string): string {
    return language === "tr" ? tr : language === "es" ? es : en;
}

function sourceLabel(source: string, language: string): string {
    if (source === "site-crawl") return "Site Crawl";
    if (source === "xml-feed") return "XML Feed";
    if (source === "file-upload") return pick3(language, "Dosya", "File Upload", "Subir archivo");
    if (source === "manual") return pick3(language, "Manuel", "Manual", "Manual");
    return source;
}

function healthMeta(status: HealthStatus | undefined, language: string): HealthBadgeMeta {
    if (status === "excellent") {
        return { label: pick3(language, "Mükemmel", "Excellent", "Excelente"), className: "border-zinc-900 bg-zinc-900 text-white" };
    }
    if (status === "good") {
        return { label: pick3(language, "İyi", "Good", "Bueno"), className: "border-zinc-300 bg-zinc-100 text-zinc-900" };
    }
    if (status === "needs_attention") {
        return { label: pick3(language, "Dikkat Gerekli", "Needs Attention", "Requiere atención"), className: "border-zinc-400 bg-zinc-200 text-zinc-900" };
    }
    return { label: pick3(language, "Geliştirilmeli", "Weak", "Débil"), className: "border-zinc-300 bg-white text-zinc-900" };
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
    const isEs = language === "es";
    const locale = isTr ? "tr-TR" : isEs ? "es-US" : "en-US";
    const effectiveUserId = targetUserId || user?.uid;
    const isSuperAdminView = Boolean(targetUserId && user?.uid !== targetUserId);
    const statusMeta = healthMeta(health?.quality.status, language);

    const text = useMemo(() => {
        const p = (tr: string, en: string, es: string) => (isTr ? tr : isEs ? es : en);
        return {
            appLabel: "AI Personal Shopper",
            heroTitle: p("Operasyon Merkezi", "Operations Hub", "Centro de operaciones"),
            heroDescription: p(
                "Katalog, veri kaynakları, öneri stratejisi ve deneyleri tek panelden siyah-beyaz sade bir akışla yönetin.",
                "Manage catalog, data sources, recommendation strategy, and experiments in one streamlined panel.",
                "Gestiona el catálogo, las fuentes de datos, la estrategia de recomendación y los experimentos en un solo panel optimizado."
            ),
            healthPrefix: p("Sağlık", "Health", "Salud"),
            totalProducts: p("Toplam Ürün", "Total Products", "Productos totales"),
            qualityScore: p("Kalite Skoru", "Quality Score", "Puntuación de calidad"),
            sourceCount: p("Kaynak", "Sources", "Fuentes"),
            lastUpdated: p("Son Güncelleme", "Last Update", "Última actualización"),
            refreshHealth: p("Sağlığı Yenile", "Refresh Health", "Actualizar salud"),
            addDataSource: p("Veri Kaynağı Ekle", "Add Data Source", "Añadir fuente de datos"),
            openCatalog: p("Kataloğu Aç", "Open Catalog", "Abrir catálogo"),
            tabOverview: p("Genel Bakış", "Overview", "Resumen"),
            tabCatalog: p("Katalog", "Catalog", "Catálogo"),
            tabDataSources: p("Kaynaklar", "Data Sources", "Fuentes de datos"),
            tabRecommendation: p("Öneri Motoru", "Recommendation Engine", "Motor de recomendación"),
            tabExperiments: p("A/B Test", "A/B Test", "Prueba A/B"),
            tabSettings: p("Ayarlar", "Settings", "Ajustes"),
            inStock: p("Stokta Olan", "In Stock", "En stock"),
            outOfStock: p("Stok dışı", "Out of Stock", "Sin stock"),
            descriptionCoverage: p("Açıklama Kapsamı", "Description Coverage", "Cobertura de descripción"),
            imageCoverage: p("Görsel", "Image", "Imagen"),
            priceCoverage: p("Fiyat Kapsamı", "Price Coverage", "Cobertura de precio"),
            stockCoverage: p("Stok kapsaması", "Stock Coverage", "Cobertura de stock"),
            crawlPipeline: "Crawl Pipeline",
            active: p("Aktif", "Active", "Activo"),
            none: p("Yok", "None", "Ninguno"),
            lastRun: p("Son run", "Last run", "Última ejecución"),
            trendTitle: p("30 Günlük Katalog Trendi", "30-Day Catalog Trend", "Tendencia del catálogo de 30 días"),
            trendDesc: p("Günlük eklenen/güncellenen ürün hareketi.", "Daily added/updated product activity.", "Actividad diaria de productos añadidos/actualizados."),
            chartAdded: p("Eklenen", "Added", "Añadidos"),
            chartUpdated: p("Güncellenen", "Updated", "Actualizados"),
            chartTotal: p("Toplam", "Total", "Total"),
            noTrend: p("Trend verisi henüz oluşmadı.", "No trend data yet.", "Aún no hay datos de tendencia."),
            operationsNotes: p("Operasyon Notları", "Operational Notes", "Notas operativas"),
            operationsDesc: p("Kaynak dağılımı ve aksiyon önerileri.", "Source distribution and action recommendations.", "Distribución de fuentes y recomendaciones de acción."),
            sourceDistribution: p("Kaynak Dağılımı", "Source Distribution", "Distribución de fuentes"),
            noSourceData: p("Henüz kaynak verisi yok.", "No source data yet.", "Aún no hay datos de fuentes."),
            recommendations: p("Öneriler", "Recommendations", "Recomendaciones"),
            noCriticalSuggestion: p("Şu an kritik öneri yok. Akış stabil.", "No critical suggestions at the moment. Flow is stable.", "No hay sugerencias críticas por el momento. El flujo es estable."),
            catalogManagement: p("Katalog Yönetimi", "Catalog Management", "Gestión del catálogo"),
            catalogDescription: p("Ürünleri görüntüle, ekle ve düzenle.", "View, add, and manage products.", "Visualiza, añade y gestiona productos."),
            xmlFeedTitle: "XML Feed",
            xmlFeedDescription: p("Planlı veya manuel feed senkronizasyonu.", "Scheduled or manual feed synchronization.", "Sincronización de feed programada o manual."),
            feedUrl: "Feed URL",
            feedPlaceholder: p("https://ornek.com/products.xml", "https://example.com/products.xml", "https://ejemplo.com/products.xml"),
            syncNow: p("Şimdi Senkronize Et", "Sync Now", "Sincronizar ahora"),
            crawlTitle: "Site Crawl",
            crawlDescription: p("Ürün URL’lerini sitemap/robots üzerinden keşfeder.", "Discovers product URLs from sitemap/robots.", "Descubre URLs de productos a través de sitemap/robots."),
            siteUrl: "Site URL",
            sitePlaceholder: p("https://ornekmagaza.com", "https://examplestore.com", "https://tiendaejemplo.com"),
            crawlNow: p("Tara ve Ekle", "Crawl and Import", "Rastrear e importar"),
            csvExcelTitle: "CSV / Excel",
            csvExcelDescription: p("Toplu ürün yükleme (manüel import).", "Bulk product import.", "Importación masiva de productos."),
            fileImportDesc: p("Kolon eşleme ile ürün, fiyat, stok ve görsel verilerini içe alın.", "Import product, price, stock, and image data with flexible column mapping.", "Importa datos de producto, precio, stock e imagen con mapeo flexible de columnas."),
            selectAndUpload: p("Dosya Seç ve Yükle", "Select and Upload File", "Seleccionar y subir archivo"),
            ingestionHubTitle: p("Ingestion Kontrol Merkezi", "Ingestion Control Hub", "Centro de control de ingesta"),
            ingestionHubDescription: p("Kaynak bazında veri akışı ve crawl ilerleme takibi.", "Track source-based data flow and crawl progress.", "Sigue el flujo de datos por fuente y el progreso del rastreo."),
            crawlStatus: p("Durum", "Status", "Estado"),
            crawlScanned: p("Son tarama", "Last scan", "Último escaneo"),
            crawlImported: p("Son import", "Last import", "Última importación"),
            crawlDiscovered: p("Keşif", "Discovered", "Descubiertos"),
            noCrawlConfig: p("Aktif crawl konfigürasyonu yok.", "No active crawl configuration.", "No hay configuración de rastreo activa."),
            success: p("Başarılı", "Success", "Éxito"),
            uploadErrorTitle: p("Yükleme Hatası", "Upload Error", "Error de carga"),
            syncErrorTitle: p("Senkronizasyon Hatası", "Sync Error", "Error de sincronización"),
            crawlErrorTitle: p("Tarama Hatası", "Crawl Error", "Error de rastreo"),
            healthErrorTitle: p("Hata", "Error", "Error"),
            healthErrorMessage: p("Shopper sağlık metrikleri yüklenemedi.", "Failed to load shopper health metrics.", "No se pudieron cargar las métricas de salud del shopper."),
            feedMissingUrl: p("Lütfen geçerli bir XML feed URL girin.", "Please enter a valid XML feed URL.", "Introduce una URL de feed XML válida."),
            siteMissingUrl: p("Lütfen geçerli bir web sitesi URL'i girin.", "Please enter a valid website URL.", "Introduce una URL de sitio web válida."),
            feedSyncedTitle: p("Feed Senkronize", "Feed Synced", "Feed sincronizado"),
            crawlCompletedTitle: p("Site Tarama Tamamlandı", "Site Crawl Completed", "Rastreo del sitio completado"),
            continuationLabel: p("Devamı için yeniden çalıştırın (sonraki başlangıç:", "Run again for continuation (next offset:", "Ejecuta de nuevo para continuar (siguiente offset:"),
            cycleCompletedLabel: p("Keşif havuzu tamamlandı, sonraki çalıştırma baştan güncelleme yapacak.", "Discovery pool completed. Next run starts from the beginning.", "Grupo de descubrimiento completado. La siguiente ejecución comienza desde el principio.")
        };
    }, [isTr, isEs]);

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
                description: isTr ? `${data.count} ürün dosyadan işlendi.` : isEs ? `${data.count} productos procesados del archivo.` : `${data.count} products processed from file.`
            });
            setActiveTab("catalog");
            await loadHealth();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : isTr ? "Dosya yüklenemedi" : isEs ? "Error al subir el archivo" : "File upload failed";
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
                description: isTr ? `${data.count} ürün işlendi.` : isEs ? `${data.count} productos procesados.` : `${data.count} products processed.`
            });
            setActiveTab("catalog");
            await loadHealth();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : isTr ? "Feed senkronizasyonu başarısız" : isEs ? "Error en la sincronización del feed" : "Feed sync failed";
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
                    : isEs
                    ? `${data.count} productos importados. ${data.scanned || 0} URLs escaneadas. ${continuationMessage}`
                    : `${data.count} products imported. ${data.scanned || 0} URLs scanned. ${continuationMessage}`
            });
            setActiveTab("catalog");
            await loadHealth();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : isTr ? "Site tarama başarısız" : isEs ? "Error en el rastreo del sitio" : "Site crawl failed";
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
                    <TabsList className="inline-flex h-auto w-max min-w-full justify-start gap-1 rounded-[12px] border border-zinc-300 bg-zinc-200 p-1">
                        <TabsTrigger value="overview" className="rounded-[8px] px-4 py-2 data-[state=active]:bg-black data-[state=active]:text-white">
                            <LineChartIcon className="mr-2 h-4 w-4" />
                            {text.tabOverview}
                        </TabsTrigger>
                        <TabsTrigger value="catalog" className="rounded-[8px] px-4 py-2 data-[state=active]:bg-black data-[state=active]:text-white">
                            <Layers3 className="mr-2 h-4 w-4" />
                            {text.tabCatalog}
                        </TabsTrigger>
                        <TabsTrigger value="datasources" className="rounded-[8px] px-4 py-2 data-[state=active]:bg-black data-[state=active]:text-white">
                            <Database className="mr-2 h-4 w-4" />
                            {text.tabDataSources}
                        </TabsTrigger>
                        <TabsTrigger value="recommendation" className="rounded-[8px] px-4 py-2 data-[state=active]:bg-black data-[state=active]:text-white">
                            <Bot className="mr-2 h-4 w-4" />
                            {text.tabRecommendation}
                        </TabsTrigger>
                        <TabsTrigger value="experiments" className="rounded-[8px] px-4 py-2 data-[state=active]:bg-black data-[state=active]:text-white">
                            <Beaker className="mr-2 h-4 w-4" />
                            {text.tabExperiments}
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="rounded-[8px] px-4 py-2 data-[state=active]:bg-black data-[state=active]:text-white">
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
                                                <span>{sourceLabel(source, language)}</span>
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
                                        <p>{isTr ? "Son URL" : isEs ? "Última URL" : "Last URL"}: {health.ingestion.crawlConfig.siteUrl}</p>
                                        <p>{isTr ? "Sonraki offset" : isEs ? "Siguiente offset" : "Next offset"}: {health.ingestion.crawlConfig.nextOffset}</p>
                                        <p>{isTr ? "Keşif havuzu" : isEs ? "Grupo de descubrimiento" : "Discovery pool"}: {health.ingestion.crawlConfig.discoveryLimit}</p>
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
                                            <span>{sourceLabel(source, language)}</span>
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
