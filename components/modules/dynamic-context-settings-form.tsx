"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { Plus, Trash2, Search, Wand2, Loader2 } from "lucide-react"

import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { DYNAMIC_CONTEXT_PRESETS, resolveDynamicContextPresetSelection, type DynamicContextPresetMode } from "@/lib/dynamic-context-presets"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"

type DynamicSelector = {
    id: string
    key: string
    selector: string
}

type SiteCrawlProgress = {
    total?: number
    visited?: number
    success?: number
    failed?: number
    currentRoute?: string
}

type SiteCrawlRoutePreview = {
    route: string
    title?: string
    visitedAt?: string
    selectorCandidates?: Array<{ key: string; selector: string }>
    domSummary?: {
        headings?: string[]
        stats?: Array<{ label: string; value: string }>
    }
}

const DEFAULT_SELECTORS: DynamicSelector[] = [{ id: "1", key: "balance", selector: "#user-balance" }]

const parseLineList = (value: string) =>
    value
        .split(/\r?\n|,/g)
        .map((v) => v.trim())
        .filter(Boolean)

export default function DynamicContextSettings() {
    const { t, language } = useLanguage()
    const { user } = useAuth()
    const { toast } = useToast()
    const searchParams = useSearchParams()

    const userIdParam = searchParams.get("userId")
    const targetUserId = userIdParam || user?.uid

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isEnabled, setIsEnabled] = useState(false)
    const [isContextAwarenessEnabled, setIsContextAwarenessEnabled] = useState(false)
    const [dynamicContextMode, setDynamicContextMode] = useState<"nocode" | "enterprise_adapter">("nocode")
    const [selectors, setSelectors] = useState<DynamicSelector[]>(DEFAULT_SELECTORS)

    // Auto-Discovery State
    const [domain, setDomain] = useState<string>("")
    const [isDiscovering, setIsDiscovering] = useState(false)
    const [discoveredSelectors, setDiscoveredSelectors] = useState<DynamicSelector[]>([])
    const [lastDiscoveryCount, setLastDiscoveryCount] = useState<number | null>(null)
    const [scanMode, setScanMode] = useState<"single_page" | "site_wide">("single_page")
    const [enableDynamicSiteContext, setEnableDynamicSiteContext] = useState(false)
    const [siteCollectionMode, setSiteCollectionMode] = useState<"dom" | "dom_network">("dom_network")
    const [siteRouteScope, setSiteRouteScope] = useState<"sidebar_safe" | "same_origin_all" | "allowlist">("sidebar_safe")
    const [siteCapturePII, setSiteCapturePII] = useState(false)
    const [siteMaxRoutes, setSiteMaxRoutes] = useState<number>(30)
    const [siteMaxDurationSec, setSiteMaxDurationSec] = useState<number>(90)
    const [siteHydrationWaitMs, setSiteHydrationWaitMs] = useState<number>(4000)
    const [siteCrawlStatus, setSiteCrawlStatus] = useState<"idle" | "running" | "completed" | "partial" | "failed">("idle")
    const [siteCrawlProgress, setSiteCrawlProgress] = useState<SiteCrawlProgress | null>(null)
    const [siteCrawlErrors, setSiteCrawlErrors] = useState<Array<{ route: string; code: string; message?: string }>>([])
    const [siteCrawlRoutes, setSiteCrawlRoutes] = useState<SiteCrawlRoutePreview[]>([])
    const [siteCrawlEntityPreview, setSiteCrawlEntityPreview] = useState<Record<string, unknown> | null>(null)
    const [siteIndustry, setSiteIndustry] = useState<string>("other")
    const [sitePresetMode, setSitePresetMode] = useState<DynamicContextPresetMode>("none")
    const [sitePresetId, setSitePresetId] = useState<string>("")
    const [sitePresetApprovedAt, setSitePresetApprovedAt] = useState<string>("")
    const [sitePresetOverridesJson, setSitePresetOverridesJson] = useState<string>("{}")
    const [siteNetworkAllowlistInput, setSiteNetworkAllowlistInput] = useState<string>("")
    const [siteGraphqlAllowlistInput, setSiteGraphqlAllowlistInput] = useState<string>("")
    const discoveryPopupRef = useRef<Window | null>(null)
    const discoveryTimeoutRef = useRef<number | null>(null)
    const discoveryClosePollRef = useRef<number | null>(null)

    const clearDiscoveryWatchers = () => {
        if (discoveryTimeoutRef.current) {
            window.clearTimeout(discoveryTimeoutRef.current)
            discoveryTimeoutRef.current = null
        }
        if (discoveryClosePollRef.current) {
            window.clearInterval(discoveryClosePollRef.current)
            discoveryClosePollRef.current = null
        }
    }

    const parsedPresetOverrides = useMemo(() => {
        const raw = sitePresetOverridesJson.trim()
        if (!raw) return { value: {}, error: null as string | null }
        try {
            const parsed = JSON.parse(raw)
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                return { value: {}, error: language === "tr" ? "Preset override JSON bir nesne olmalı." : "Preset override JSON must be an object." }
            }
            return { value: parsed as Record<string, unknown>, error: null as string | null }
        } catch {
            return { value: {}, error: language === "tr" ? "Preset override JSON geçersiz." : "Preset override JSON is invalid." }
        }
    }, [sitePresetOverridesJson, language])

    const dynamicPresetSelection = useMemo(() => {
        return resolveDynamicContextPresetSelection({
            sectorId: siteIndustry,
            presetMode: sitePresetMode,
            presetId: sitePresetId || undefined,
            presetOverrides: parsedPresetOverrides.value,
            networkAllowlist: parseLineList(siteNetworkAllowlistInput),
            graphqlOperationAllowlist: parseLineList(siteGraphqlAllowlistInput),
        })
    }, [siteIndustry, sitePresetMode, sitePresetId, parsedPresetOverrides.value, siteNetworkAllowlistInput, siteGraphqlAllowlistInput])

    const isEnterpriseMode = dynamicContextMode === "enterprise_adapter"

    const enterpriseBridgeSnippet = useMemo(() => `window.VionContextBridge = {
  getSnapshot() {
    return {
      source: "host_app",
      publicContext: {
        module: "project_dashboard",
        page: "overview",
        companyName: "NOVA OPERASYON TEKNOLOJILERI A.S.",
        activeWorkspace: "Satis Operasyonlari",
        openAnnouncements: 3
      },
      privateContextSummary: {
        employee: {
          displayName: "Deniz Kaya",
          title: "Operasyon Uzmani",
          department: "Kurumsal Cozumler"
        },
        projects: { active: 4, delayed: 1 },
        approvals: { pending: 2 },
        tasks: { today: 6, overdue: 1 },
        leave: { annualLeaveRemainingDays: 12 }
      }
    }
  }
}`, [])

    const enterpriseToolSnippet = useMemo(() => `window.VionContextBridge = {
  async resolveTool(name, args) {
    switch (name) {
      case "project_overview":
        return fetch("/api/assistant/project-overview", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args || {})
        }).then((r) => r.json())

      case "approval_queue":
        return fetch("/api/assistant/approval-queue", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args || {})
        }).then((r) => r.json())

      case "leave_calendar":
        return fetch("/api/assistant/leave-calendar", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args || {})
        }).then((r) => r.json())

      default:
        return { ok: false, error: "unknown_tool" }
    }
  }
}`, [])

    const enterpriseDeveloperBrief = useMemo(() => language === "tr"
        ? `Developer brief

Bu modda ilk fazda yapman gereken sey service yazmak degil, host app icinde guvenli context bridge'i baglamak.

1. window.VionContextBridge.getSnapshot() implement et.
2. Widget'a sadece publicContext ve privateContextSummary dondur.
3. Route veya ekran verisi degistiginde:
   window.UserexWidget?.setContext(window.VionContextBridge.getSnapshot())
4. Ham personel verisi gonderme:
   TC kimlik, dogum tarihi, kisisel GSM, adres, saglik verisi, izin nedeni, ham dokuman.
5. /api/assistant/... endpoint ornekleri su an hazir Vion servisi degil.
6. resolveTool ikinci faz; ilk fazda sadece getSnapshot yeterli.

Minimum kontrat:
- source: "host_app"
- publicContext: modul, page, companyName, counters gibi dusuk riskli alanlar
- privateContextSummary: employee, tasks, approvals, projects, expenses, leave gibi minimize edilmis ozetler`
        : `Developer brief

In phase one, do not start by building services. First wire the safe context bridge inside the host app.

1. Implement window.VionContextBridge.getSnapshot().
2. Return only publicContext and privateContextSummary to the widget.
3. When the route or page data changes, call:
   window.UserexWidget?.setContext(window.VionContextBridge.getSnapshot())
4. Do not send raw employee data:
   national ID, birth date, personal phone, address, health data, leave reason, raw documents.
5. The /api/assistant/... endpoints shown here are examples only, not built-in Vion services.
6. resolveTool is phase two; for phase one, getSnapshot alone is enough.

Minimum contract:
- source: "host_app"
- publicContext: low-risk values like module, page, companyName, counters
- privateContextSummary: minimized summaries such as employee, tasks, approvals, projects, expenses, leave`, [language])

    useEffect(() => {
        const loadSettings = async () => {
            if (!targetUserId) return

            try {
                const docRef = doc(db, "chatbots", targetUserId)
                const docSnap = await getDoc(docRef)

                if (docSnap.exists()) {
                    const data = docSnap.data()
                    setIsEnabled(Boolean(data.enableDynamicContext))
                    setIsContextAwarenessEnabled(Boolean(data.enableContextAwareness))
                    setDynamicContextMode(data.dynamicContextMode === "enterprise_adapter" ? "enterprise_adapter" : "nocode")
                    setDomain(data.domain || data.website || "")
                    setSiteIndustry(data.industry || data.sector || data.sectorId || "other")
                    setEnableDynamicSiteContext(data.enableDynamicSiteContext === true)
                    setSiteCollectionMode(data.dynamicSiteContextCollectionMode === "dom" ? "dom" : "dom_network")
                    setSiteRouteScope(
                        data.dynamicSiteContextRouteScope === "same_origin_all"
                            ? "same_origin_all"
                            : data.dynamicSiteContextRouteScope === "allowlist"
                                ? "allowlist"
                                : "sidebar_safe"
                    )
                    setSiteCapturePII(data.dynamicSiteContextCapturePII === true)
                    setSiteMaxRoutes(typeof data.dynamicSiteContextMaxRoutes === "number" ? data.dynamicSiteContextMaxRoutes : 30)
                    setSiteMaxDurationSec(typeof data.dynamicSiteContextMaxDurationSec === "number" ? data.dynamicSiteContextMaxDurationSec : 90)
                    setSiteHydrationWaitMs(typeof data.dynamicSiteContextHydrationWaitMs === "number" ? data.dynamicSiteContextHydrationWaitMs : 4000)
                    setSitePresetMode(
                        data.dynamicSiteContextPresetMode === "approved"
                            ? "approved"
                            : data.dynamicSiteContextPresetMode === "suggested"
                                ? "suggested"
                                : "none"
                    )
                    setSitePresetId(typeof data.dynamicSiteContextPresetId === "string" ? data.dynamicSiteContextPresetId : "")
                    setSitePresetApprovedAt(typeof data.dynamicSiteContextPresetApprovedAt === "string" ? data.dynamicSiteContextPresetApprovedAt : "")
                    setSitePresetOverridesJson(
                        data.dynamicSiteContextPresetOverrides && typeof data.dynamicSiteContextPresetOverrides === "object"
                            ? JSON.stringify(data.dynamicSiteContextPresetOverrides, null, 2)
                            : "{}"
                    )
                    setSiteNetworkAllowlistInput(
                        Array.isArray(data.dynamicSiteContextNetworkAllowlist)
                            ? data.dynamicSiteContextNetworkAllowlist.join("\n")
                            : ""
                    )
                    setSiteGraphqlAllowlistInput(
                        Array.isArray(data.dynamicSiteContextGraphqlOperationAllowlist)
                            ? data.dynamicSiteContextGraphqlOperationAllowlist.join("\n")
                            : ""
                    )

                    if (Array.isArray(data.dynamicContextSelectors) && data.dynamicContextSelectors.length > 0) {
                        setSelectors(data.dynamicContextSelectors)
                    }
                }
            } catch (error) {
                console.error("Error loading dynamic context settings:", error)
            } finally {
                setIsLoading(false)
            }
        }

        loadSettings()
    }, [targetUserId])

    const handleSave = async () => {
        if (!targetUserId) return
        if (parsedPresetOverrides.error) {
            toast({
                title: language === "tr" ? "Geçersiz Preset Override" : "Invalid Preset Override",
                description: parsedPresetOverrides.error,
                variant: "destructive",
            })
            return
        }
        setIsSaving(true)

        try {
            const networkAllowlist = parseLineList(siteNetworkAllowlistInput)
            const graphqlOperationAllowlist = parseLineList(siteGraphqlAllowlistInput)
            const now = new Date().toISOString()
            const effectivePresetId = sitePresetMode === "approved"
                ? (sitePresetId || dynamicPresetSelection.suggestedPresetId)
                : (sitePresetId || "")
            const approvedAt = sitePresetMode === "approved"
                ? (sitePresetApprovedAt || now)
                : ""

            await setDoc(
                doc(db, "chatbots", targetUserId),
                {
                    enableDynamicContext: isEnabled,
                    enableContextAwareness: isContextAwarenessEnabled,
                    dynamicContextSelectors: selectors,
                    dynamicContextMode,
                    enableDynamicSiteContext,
                    dynamicSiteContextCollectionMode: siteCollectionMode,
                    dynamicSiteContextCrawlTrigger: "manual",
                    dynamicSiteContextRouteScope: siteRouteScope,
                    dynamicSiteContextMaxRoutes: Number(siteMaxRoutes) || 30,
                    dynamicSiteContextMaxDurationSec: Number(siteMaxDurationSec) || 90,
                    dynamicSiteContextHydrationWaitMs: Number(siteHydrationWaitMs) || 4000,
                    dynamicSiteContextCapturePII: siteCapturePII,
                    dynamicSiteContextExcludeSelectorPrefixes: ["#userex-", ".userex-", "#vion-", ".vion-"],
                    dynamicSiteContextPresetMode: sitePresetMode,
                    dynamicSiteContextPresetId: effectivePresetId,
                    dynamicSiteContextPresetApprovedAt: approvedAt,
                    dynamicSiteContextPresetOverrides: parsedPresetOverrides.value,
                    dynamicSiteContextNetworkAllowlist: networkAllowlist,
                    dynamicSiteContextGraphqlOperationAllowlist: graphqlOperationAllowlist,
                },
                { merge: true }
            )
            if (approvedAt && approvedAt !== sitePresetApprovedAt) {
                setSitePresetApprovedAt(approvedAt)
            }

            toast({
                title: t("settingsSaved") || "Settings Saved",
                description: t("settingsSavedDesc") || "Your changes have been saved successfully.",
            })
        } catch (error) {
            console.error("Error saving dynamic context settings:", error)
            toast({
                title: t("error") || "Error",
                description: t("saveFailed") || "Failed to save settings.",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const addSelector = () => {
        setSelectors((prev) => [...prev, { id: Date.now().toString(), key: "", selector: "" }])
    }

    const removeSelector = (id: string) => {
        setSelectors((prev) => prev.filter((item) => item.id !== id))
    }

    const updateSelector = (id: string, field: "key" | "selector", value: string) => {
        setSelectors((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
    }

    const startAutoDiscovery = () => {
        let savedDomain = domain;
        if (!savedDomain || !savedDomain.startsWith('http')) {
            savedDomain = prompt(language === "tr" ? "Lütfen widget'ınızın kurulu olduğu sitenin URL'sini girin (Örn: https://site.com)" : "Please enter the URL where your widget is installed (e.g., https://site.com)") || "";
        }

        if (!savedDomain) return;
        if (!savedDomain.startsWith('http')) savedDomain = 'https://' + savedDomain;

        try {
            const url = new URL(savedDomain);

            if (scanMode === "site_wide") {
                const scanId = `site_scan_${Date.now()}`
                url.searchParams.set('vion_site_crawl', '1')
                url.searchParams.set('vion_site_crawl_scan_id', scanId)
                url.searchParams.set('vion_site_crawl_route_scope', siteRouteScope)
                url.searchParams.set('vion_site_crawl_collection_mode', siteCollectionMode)
                url.searchParams.set('vion_site_crawl_max_routes', String(Math.max(1, siteMaxRoutes || 30)))
                url.searchParams.set('vion_site_crawl_max_duration_sec', String(Math.max(15, siteMaxDurationSec || 90)))
                url.searchParams.set('vion_site_crawl_hydration_wait_ms', String(Math.max(800, siteHydrationWaitMs || 4000)))
                url.searchParams.set('vion_site_crawl_capture_pii', siteCapturePII ? '1' : '0')
                url.searchParams.set('vion_site_crawl_auto_close', '0')
            } else {
                url.searchParams.set('vion_scan', '1');
            }

            const popup = window.open(url.toString(), 'VionScanner', 'width=800,height=600');
            if (!popup) {
                toast({
                    title: language === "tr" ? "Popup Engellendi" : "Popup Blocked",
                    description: language === "tr"
                        ? "Tarama penceresi açılamadı. Lütfen popup izni verip tekrar deneyin."
                        : "Could not open the scan window. Please allow popups and try again.",
                    variant: "destructive",
                });
                return;
            }

            clearDiscoveryWatchers();
            discoveryPopupRef.current = popup;
            setIsDiscovering(true);
            setLastDiscoveryCount(null);
            setDiscoveredSelectors([]);
            setSiteCrawlStatus("running")
            setSiteCrawlProgress(null)
            setSiteCrawlErrors([])
            setSiteCrawlRoutes([])
            setSiteCrawlEntityPreview(null)

            // Fallback 1: If no results arrive, stop the loader after a reasonable timeout.
            const timeoutMs = scanMode === "site_wide"
                ? Math.max(20000, (Number(siteMaxDurationSec) || 90) * 1000 + 15000)
                : 30000

            discoveryTimeoutRef.current = window.setTimeout(() => {
                clearDiscoveryWatchers();
                discoveryPopupRef.current = null;
                setIsDiscovering(false);
                setSiteCrawlStatus("failed")
                toast({
                    title: language === "tr" ? "Tarama Zaman Aşımı" : "Scan Timed Out",
                    description: language === "tr"
                        ? "Tarama sonucu alınamadı. Widget kurulu siteyi açtığınızdan emin olun veya manuel seçici ekleyin."
                        : "No scan results were received. Make sure you opened a page with the widget installed, or add selectors manually.",
                    variant: "destructive",
                });
            }, timeoutMs);

            // Fallback 2: If user closes popup before results, stop the loader.
            discoveryClosePollRef.current = window.setInterval(() => {
                const activePopup = discoveryPopupRef.current;
                if (!activePopup) return;
                if (activePopup.closed) {
                    clearDiscoveryWatchers();
                    discoveryPopupRef.current = null;
                    setIsDiscovering(false);
                    setSiteCrawlStatus(prev => prev === "running" ? "failed" : prev)
                    toast({
                        title: language === "tr" ? "Tarama Durduruldu" : "Scan Stopped",
                        description: language === "tr"
                            ? "Tarama penceresi kapatıldı. Sonuç gelmediği için işlem durduruldu."
                            : "The scan window was closed before results were received.",
                    });
                }
            }, 500);

            toast({
                title: language === "tr" ? "Tarama Başlatıldı" : "Scan Started",
                description: scanMode === "site_wide"
                    ? (language === "tr"
                        ? "Site genel tarama (beta) başlatıldı. Sidebar güvenli route'lar arka planda gezilecek."
                        : "Site-wide crawl (beta) started. Sidebar-safe routes will be scanned in the popup.")
                    : (language === "tr"
                        ? "Açılan pencerede siteniz taranırken lütfen bekleyin... (Pencereyi kapatabilirsiniz)"
                        : "Scanning your site in the new window, please wait... (You can close the window)"),
            });
        } catch (e) {
            toast({ title: "Hata", description: "Geçersiz URL", variant: "destructive" });
        }
    }

    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data && e.data.type === 'USEREX_DISCOVERY_RESULTS') {
                clearDiscoveryWatchers();
                discoveryPopupRef.current = null;
                setIsDiscovering(false);
                const payload = Array.isArray(e.data.payload) ? e.data.payload : [];
                setLastDiscoveryCount(payload.length);
                setDiscoveredSelectors(payload.map((p: any, i: number) => ({ id: `discovered_${i}`, key: p.key, selector: p.selector })));
                toast({
                    title: language === "tr" ? "Tarama Tamamlandı" : "Scan Completed",
                    description: language === "tr" ? `${payload.length} adet veri noktası bulundu.` : `Found ${payload.length} data points.`,
                });
            }

            if (e.data && e.data.type === 'USEREX_SITE_CRAWL_START') {
                setSiteCrawlStatus("running")
                setSiteCrawlProgress((e.data.payload?.progress || null) as SiteCrawlProgress | null)
                setSiteCrawlErrors([])
                setSiteCrawlRoutes([])
                setSiteCrawlEntityPreview(null)
            }

            if (e.data && e.data.type === 'USEREX_SITE_CRAWL_PROGRESS') {
                const payload = e.data.payload || {}
                setSiteCrawlStatus("running")
                setSiteCrawlProgress((payload.progress || null) as SiteCrawlProgress | null)
            }

            if (e.data && e.data.type === 'USEREX_SITE_CRAWL_ERROR') {
                clearDiscoveryWatchers();
                discoveryPopupRef.current = null;
                setIsDiscovering(false);
                setSiteCrawlStatus("failed")
                const err = e.data.payload?.error
                if (err) {
                    setSiteCrawlErrors((prev) => [...prev, { route: err.route || "", code: err.code || "parse_error", message: err.message }].slice(-20))
                }
                toast({
                    title: language === "tr" ? "Site Tarama Hatası" : "Site Crawl Error",
                    description: err?.message || (language === "tr" ? "Site taraması başlatılamadı veya başarısız oldu." : "Site crawl failed."),
                    variant: "destructive",
                })
            }

            if (e.data && e.data.type === 'USEREX_SITE_CRAWL_COMPLETE') {
                clearDiscoveryWatchers();
                discoveryPopupRef.current = null;
                setIsDiscovering(false);
                const payload = e.data.payload || {}
                const siteSessionContext = payload.siteSessionContext || {}
                const discovered = Array.isArray(payload.discoveredSelectors) ? payload.discoveredSelectors : []
                const routesObj = siteSessionContext.routes && Array.isArray(siteSessionContext.routes)
                    ? siteSessionContext.routes
                    : []
                setSiteCrawlStatus((payload.status || siteSessionContext.crawl?.status || "completed") as any)
                setSiteCrawlProgress((payload.progress || siteSessionContext.crawl?.progress || null) as SiteCrawlProgress | null)
                setSiteCrawlErrors(Array.isArray(payload.errors) ? payload.errors : (Array.isArray(siteSessionContext.crawl?.errors) ? siteSessionContext.crawl.errors : []))
                setSiteCrawlRoutes(routesObj as SiteCrawlRoutePreview[])
                setSiteCrawlEntityPreview((siteSessionContext.entityIndex || null) as Record<string, unknown> | null)

                setLastDiscoveryCount(discovered.length)
                setDiscoveredSelectors(discovered.map((p: any, i: number) => ({
                    id: `site_discovered_${i}`,
                    key: p.key || `field_${i + 1}`,
                    selector: p.selector || ""
                })).filter((item: DynamicSelector) => item.selector))

                toast({
                    title: language === "tr" ? "Site Taraması Tamamlandı" : "Site Crawl Completed",
                    description: language === "tr"
                        ? `${payload.progress?.success ?? siteSessionContext.crawl?.progress?.success ?? 0} route başarıyla tarandı.`
                        : `${payload.progress?.success ?? siteSessionContext.crawl?.progress?.success ?? 0} routes scanned successfully.`,
                })
            }
        };
        window.addEventListener('message', handleMessage);
        return () => {
            clearDiscoveryWatchers();
            window.removeEventListener('message', handleMessage);
        };
    }, [language, toast]);

    if (isLoading) {
        return <div className="p-8 text-center">Loading settings...</div>
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">{language === "tr" ? "Dinamik Veri Bağlamı" : "Dynamic Data Context"}</h1>
                    <p className="text-muted-foreground">
                        {dynamicContextMode === "enterprise_adapter"
                            ? (language === "tr"
                                ? "Asistanin loginli kurumsal portal verilerini host uygulamanin guvenli ozetleriyle anlik okuyup daha kisisellestirilmis yardim vermesi icin kullanilir."
                                : "Use this to let the assistant read authenticated enterprise context through safe host-provided summaries and deliver more personalized help.")
                            : (language === "tr"
                                ? "Asistanin sayfadaki acik ve dusuk riskli canli verileri okuyup daha dogru yanit vermesi icin kullanilir."
                                : "Use this to let the assistant read open, low-risk live page data and answer more accurately.")}
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-900 px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-800">
                    <span className={`text-sm font-medium ${isEnabled ? "text-green-600 dark:text-green-400" : "text-zinc-500"}`}>
                        {isEnabled
                            ? language === "tr"
                                ? "Modül Aktif"
                                : "Module Active"
                            : language === "tr"
                                ? "Modül Pasif"
                                : "Module Inactive"}
                    </span>
                    <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{language === "tr" ? "Nasıl Çalışır?" : "How it works?"}</CardTitle>
                    <CardDescription>
                        {language === "tr"
                            ? "Dusuk riskli selector modu veya loginli sistemler icin Enterprise Bridge kullanin."
                            : "Use low-risk selector mode or Enterprise Bridge for authenticated systems."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    <ul className="list-disc pl-4 space-y-1">
                        <li>{language === "tr" ? "Selector modu sadece acik ve dusuk riskli veriler icin uygundur." : "Selector mode is only appropriate for open, low-risk values."}</li>
                        <li>{language === "tr" ? "Enterprise Bridge loginli kullanici verisini host uygulamanin guvenli ozetiyle aktarir." : "Enterprise Bridge sends authenticated user context through safe host-provided summaries."}</li>
                        <li>{language === "tr" ? "Ham kimlik, iletisim, izin nedeni veya saglik verisini prompta gondermeyin." : "Do not send raw identity, contact, leave-reason, or health data to the prompt."}</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{language === "tr" ? "Calisma Modu" : "Operating Mode"}</CardTitle>
                    <CardDescription>
                        {language === "tr"
                            ? "Loginli kurumsal portal senaryolarinda Enterprise Bridge kullanin."
                            : "Use Enterprise Bridge for authenticated enterprise portal scenarios."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <label className="text-xs space-y-1 block">
                        <span className="text-muted-foreground">{language === "tr" ? "Mod" : "Mode"}</span>
                        <select
                            className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                            value={dynamicContextMode}
                            onChange={(e) => setDynamicContextMode(e.target.value === "enterprise_adapter" ? "enterprise_adapter" : "nocode")}
                        >
                            <option value="nocode">{language === "tr" ? "No-code Selector" : "No-code Selector"}</option>
                            <option value="enterprise_adapter">{language === "tr" ? "Enterprise Bridge" : "Enterprise Bridge"}</option>
                        </select>
                    </label>
                    <p className="text-xs text-muted-foreground">
                        {dynamicContextMode === "enterprise_adapter"
                            ? (language === "tr"
                                ? "Bu modda widget scrape yerine host uygulamanin verdigi public context ve private summary payloadlarini kullanir."
                                : "In this mode the widget uses host-provided public context and private summary payloads instead of scraping.")
                            : (language === "tr"
                                ? "Bu mod loginli employee verisi icin onerilmez."
                                : "This mode is not recommended for authenticated employee data." )}
                    </p>
                </CardContent>
            </Card>

            {isEnterpriseMode ? (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>{language === "tr" ? "Enterprise Bridge Kurulumu" : "Enterprise Bridge Setup"}</CardTitle>
                            <CardDescription>
                                {language === "tr"
                                    ? "Bu modda selector, page text ve site crawl ayarlari gizlenir. Widget sadece host uygulamanin guvenli context ozetini okur."
                                    : "In this mode selector, page-text, and site-crawl settings are hidden. The widget only reads the host app's trusted context summary."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-3">
                                <div className="rounded-lg border p-4">
                                    <div className="text-sm font-semibold">{language === "tr" ? "Public Context" : "Public Context"}</div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {language === "tr"
                                            ? "Modul adi, sayfa tipi, sayaclar, sirket bilgisi, aktif durum gibi dusuk riskli alanlar."
                                            : "Low-risk fields such as module name, page type, counters, company info, and active state."}
                                    </p>
                                </div>
                                <div className="rounded-lg border p-4">
                                    <div className="text-sm font-semibold">{language === "tr" ? "Private Summary" : "Private Summary"}</div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {language === "tr"
                                            ? "Gorev, proje, onay, masraf ve izin gibi loginli kullaniciya ait ozetler."
                                            : "Authenticated-user summaries for tasks, projects, approvals, expenses, and leave."}
                                    </p>
                                </div>
                                <div className="rounded-lg border p-4">
                                    <div className="text-sm font-semibold">{language === "tr" ? "Asla Gonderme" : "Never Send"}</div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {language === "tr"
                                            ? "TC kimlik, dogum tarihi, kisisel GSM, adres, saglik bilgisi, izin nedeni veya ham belgeler."
                                            : "National ID, birth date, personal phone, address, health data, leave reason, or raw documents."}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                                <div className="text-sm font-semibold">
                                    {language === "tr" ? "Host Uygulamada Ornek Entegrasyon" : "Example Host App Integration"}
                                </div>
                                <pre className="overflow-x-auto rounded-md bg-background p-3 text-[11px] leading-5 border">
                                    <code>{enterpriseBridgeSnippet}</code>
                                </pre>
                                <p className="text-xs text-muted-foreground">
                                    {language === "tr"
                                        ? "Bu payload her route degisiminde veya sayfa icindeki veri guncellendiginde yeniden uretilebilir."
                                        : "This payload can be regenerated on every route change or when page-level data changes."}
                                </p>
                            </div>

                            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                                <div className="text-sm font-semibold">
                                    {language === "tr" ? "Opsiyonel Tool Bridge Ornegi (Mimari Ornek)" : "Optional Tool Bridge Example (Architecture Example)"}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {language === "tr"
                                        ? "Anlik ve loginli veriler icin host uygulama kendi first-party endpointlerini kullanmali. Ham personel verisini prompta gommeyin."
                                        : "For live authenticated data, the host app should use first-party endpoints. Do not embed raw employee records into the prompt."}
                                </p>
                                <div className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-800">
                                    {language === "tr"
                                        ? "Not: Bu endpoint path'leri sadece ornek. Vion repo'sunda hazir gelmez ve widget su anda resolveTool() cagirmiyor. Canli kullanim icin tenant'in kendi backend servislerini yazmasi ve bu akisi ayrica baglamasi gerekir."
                                        : "Note: These endpoint paths are examples only. They are not shipped by default in Vion, and the widget does not currently call resolveTool() automatically. For live usage, the tenant must implement their own backend services and wire this flow separately."}
                                </div>
                                <pre className="overflow-x-auto rounded-md bg-background p-3 text-[11px] leading-5 border">
                                    <code>{enterpriseToolSnippet}</code>
                                </pre>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{language === "tr" ? "Bu Modda Ne Degisti?" : "What Changes In This Mode?"}</CardTitle>
                            <CardDescription>
                                {language === "tr"
                                    ? "Enterprise secildiginde alttaki selector ve crawl ayarlari bilerek devreden cikar."
                                    : "When Enterprise is selected, the selector and crawl controls below are intentionally disabled."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-muted-foreground">
                            <p>{language === "tr" ? "Page Content Reading kullanilmaz." : "Page Content Reading is not used."}</p>
                            <p>{language === "tr" ? "CSS selector ve otomatik tarama kullanilmaz." : "CSS selectors and auto-scan are not used."}</p>
                            <p>{language === "tr" ? "Kisisellestirme, host app tarafindan verilen public context ve private summary ile yapilir." : "Personalization is driven by host-provided public context and private summary."}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{language === "tr" ? "Tenant Icin Kurulum Adimlari" : "Tenant Setup Steps"}</CardTitle>
                            <CardDescription>
                                {language === "tr"
                                    ? "Loginli bir kurumsal portal bunu su sira ile kurmali."
                                    : "For an authenticated enterprise portal, follow this sequence."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ol className="list-decimal pl-5 space-y-3 text-sm text-muted-foreground">
                                <li>
                                    {language === "tr"
                                        ? "Bu panelde Dynamic Context modunu Enterprise Bridge olarak secin ve kaydedin."
                                        : "Set the Dynamic Context mode to Enterprise Bridge in this panel and save."}
                                </li>
                                <li>
                                    {language === "tr"
                                        ? "Host uygulamada widget scripti yuklenmeden once veya en gec yuklendikten hemen sonra window.VionContextBridge nesnesini tanimlayin."
                                        : "Define window.VionContextBridge in the host app before the widget script loads, or immediately after it loads at the latest."}
                                </li>
                                <li>
                                    {language === "tr"
                                        ? "getSnapshot() icinde yalnizca guvenli publicContext ve minimize edilmis privateContextSummary dondurun."
                                        : "Return only safe publicContext and minimized privateContextSummary inside getSnapshot()."}
                                </li>
                                <li>
                                    {language === "tr"
                                        ? "Kullaniciya ozel canli veriler gerekiyorsa resolveTool() uzerinden kendi same-origin endpointlerinizi cagin. Ornek: project_overview, approval_queue, leave_calendar."
                                        : "If live user-specific data is required, call your own same-origin endpoints through resolveTool(), for example project_overview, approval_queue, and leave_calendar."}
                                </li>
                                <li>
                                    {language === "tr"
                                        ? "Route veya sayfa verisi degistiginde window.UserexWidget.setContext(window.VionContextBridge.getSnapshot()) cagirarak widget baglamini yenileyin."
                                        : "When the route or page data changes, call window.UserexWidget.setContext(window.VionContextBridge.getSnapshot()) to refresh the widget context."}
                                </li>
                                <li>
                                    {language === "tr"
                                        ? "Asla TC kimlik, dogum tarihi, kisisel GSM, adres, izin nedeni, saglik verisi veya ham belgeleri bridge payloadina koymayin."
                                        : "Never place national ID, birth date, personal phone, address, leave reason, health data, or raw documents into the bridge payload."}
                                </li>
                            </ol>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{language === "tr" ? "Developer Yönergesi" : "Developer Brief"}</CardTitle>
                            <CardDescription>
                                {language === "tr"
                                    ? "Asagidaki metin dogrudan tenant developer'ina gonderilecek kadar kisadir."
                                    : "This text is short enough to forward directly to the tenant developer."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <pre className="whitespace-pre-wrap rounded-md border bg-muted/20 p-4 text-[12px] leading-6 text-muted-foreground">
                                <code>{enterpriseDeveloperBrief}</code>
                            </pre>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <>
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <CardTitle>{language === "tr" ? "Sayfa İçeriği Okuma" : "Page Content Reading"}</CardTitle>
                                    <CardDescription className="max-w-2xl">
                                        {language === "tr"
                                            ? "Sadece seçili alanları değil, ziyaretçinin gezdiği tüm sayfanın metinlerini (body) okuyarak bağlama ekler."
                                            : "Adds context by reading all the text on the page the visitor is browsing, not just selected areas."}
                                    </CardDescription>
                                </div>
                                <Switch
                                    checked={isContextAwarenessEnabled}
                                    onCheckedChange={setIsContextAwarenessEnabled}
                                    disabled={isEnterpriseMode}
                                />
                            </div>
                        </CardHeader>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <CardTitle>{language === "tr" ? "CSS Seçiciler" : "CSS Selectors"}</CardTitle>
                                    <CardDescription>
                                        {language === "tr"
                                            ? "Metin alanları ve form input değişimleri canlı izlenir. Manuel ekleyebilir veya sitenizi tarayabilirsiniz."
                                            : "Text content and input value changes are tracked in real time. Add manually or scan your site."}
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={startAutoDiscovery}
                                    disabled={isDiscovering || isEnterpriseMode}
                                    className="shrink-0 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                                >
                                    {isDiscovering ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Wand2 className="w-4 h-4 mr-2" />
                                    )}
                                    {scanMode === "site_wide"
                                        ? (language === "tr" ? "Site Genel Tara (Beta)" : "Scan Entire Site (Beta)")
                                        : (language === "tr" ? "Sitemi Otomatik Tara" : "Auto-Scan Website")}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-lg border p-4 space-y-4">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-semibold">{language === "tr" ? "Tarama Modu" : "Scan Mode"}</div>
                                        <p className="text-xs text-muted-foreground">
                                            {language === "tr"
                                                ? "Tek sayfa selector keşfi veya site-geneli beta crawl."
                                                : "Single-page selector discovery or site-wide beta crawl."}
                                        </p>
                                    </div>
                                    <div className="inline-flex rounded-lg border p-1 bg-muted/40">
                                        <Button type="button" size="sm" variant={scanMode === "single_page" ? "default" : "ghost"} onClick={() => setScanMode("single_page")} className="h-8">
                                            {language === "tr" ? "Tek Sayfa" : "Single Page"}
                                        </Button>
                                        <Button type="button" size="sm" variant={scanMode === "site_wide" ? "default" : "ghost"} onClick={() => setScanMode("site_wide")} className="h-8">
                                            {language === "tr" ? "Site Genel (Beta)" : "Site-wide (Beta)"}
                                        </Button>
                                    </div>
                                </div>

                                {scanMode === "site_wide" && (
                                    <div className="space-y-4 rounded-lg border border-indigo-200/70 dark:border-indigo-900/40 p-4 bg-indigo-50/30 dark:bg-indigo-950/10">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-semibold">{language === "tr" ? "Site-Geneli Dynamic Context" : "Site-wide Dynamic Context"}</div>
                                                <p className="text-xs text-muted-foreground">
                                                    {language === "tr"
                                                        ? "Widget runtime, güvenli route’larda DOM + JSON özetlerini toplayarak chat bağlamını genişletir."
                                                        : "Widget runtime collects DOM + JSON summaries on safe routes to expand chat context."}
                                                </p>
                                            </div>
                                            <Switch checked={enableDynamicSiteContext} onCheckedChange={setEnableDynamicSiteContext} />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <label className="text-xs space-y-1">
                                                <span className="text-muted-foreground">{language === "tr" ? "Veri Kaynağı" : "Data Source"}</span>
                                                <select
                                                    className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                                                    value={siteCollectionMode}
                                                    onChange={(e) => setSiteCollectionMode(e.target.value === "dom" ? "dom" : "dom_network")}
                                                >
                                                    <option value="dom">DOM</option>
                                                    <option value="dom_network">DOM + Network (JSON GET)</option>
                                                </select>
                                            </label>

                                            <label className="text-xs space-y-1">
                                                <span className="text-muted-foreground">{language === "tr" ? "Route Kapsamı" : "Route Scope"}</span>
                                                <select
                                                    className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                                                    value={siteRouteScope}
                                                    onChange={(e) => {
                                                        const v = e.target.value
                                                        setSiteRouteScope(v === "same_origin_all" ? "same_origin_all" : v === "allowlist" ? "allowlist" : "sidebar_safe")
                                                    }}
                                                >
                                                    <option value="sidebar_safe">{language === "tr" ? "Sidebar + güvenli route" : "Sidebar + safe routes"}</option>
                                                    <option value="same_origin_all">{language === "tr" ? "Same-origin (geniş)" : "Same-origin (broader)"}</option>
                                                    <option value="allowlist">{language === "tr" ? "Allowlist (beta)" : "Allowlist (beta)"}</option>
                                                </select>
                                            </label>

                                            <label className="text-xs space-y-1">
                                                <span className="text-muted-foreground">{language === "tr" ? "Max Route" : "Max Routes"}</span>
                                                <Input type="number" min={1} max={100} value={siteMaxRoutes} onChange={(e) => setSiteMaxRoutes(Number(e.target.value) || 30)} className="h-9" />
                                            </label>

                                            <label className="text-xs space-y-1">
                                                <span className="text-muted-foreground">{language === "tr" ? "Max Süre (sn)" : "Max Duration (sec)"}</span>
                                                <Input type="number" min={15} max={300} value={siteMaxDurationSec} onChange={(e) => setSiteMaxDurationSec(Number(e.target.value) || 90)} className="h-9" />
                                            </label>

                                            <label className="text-xs space-y-1">
                                                <span className="text-muted-foreground">{language === "tr" ? "Hydration Bekleme (ms)" : "Hydration Wait (ms)"}</span>
                                                <Input type="number" min={800} max={10000} step={100} value={siteHydrationWaitMs} onChange={(e) => setSiteHydrationWaitMs(Number(e.target.value) || 4000)} className="h-9" />
                                            </label>

                                            <div className="rounded-md border px-3 py-2 flex items-center justify-between gap-3">
                                                <div className="text-xs">
                                                    <div className="font-medium">{language === "tr" ? "Tam Görünüm (PII maskesiz)" : "Full View (PII unmasked)"}</div>
                                                    <div className="text-muted-foreground">
                                                        {language === "tr"
                                                            ? "Token/password gibi teknik alanlar yine filtrelenir."
                                                            : "Technical secrets like tokens/passwords are still filtered."}
                                                    </div>
                                                </div>
                                                <Switch checked={siteCapturePII} onCheckedChange={setSiteCapturePII} />
                                            </div>
                                        </div>

                                        <div className="rounded-md border bg-background/70 p-3 space-y-3">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                                <div>
                                                    <div className="text-sm font-semibold">
                                                        {language === "tr" ? "Sektör Preseti (Öner + Onay)" : "Sector Preset (Suggest + Approve)"}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        {language === "tr"
                                                            ? `Sektör: ${dynamicPresetSelection.normalizedSectorId}. Önerilen preset: ${dynamicPresetSelection.suggestedPreset.displayName.tr}.`
                                                            : `Sector: ${dynamicPresetSelection.normalizedSectorId}. Suggested preset: ${dynamicPresetSelection.suggestedPreset.displayName.en}.`}
                                                    </p>
                                                </div>
                                                <span className="text-[11px] rounded-full border px-2 py-1 bg-muted">
                                                    {language === "tr" ? "Aktif" : "Active"}:{" "}
                                                    {language === "tr"
                                                        ? dynamicPresetSelection.activePreset.displayName.tr
                                                        : dynamicPresetSelection.activePreset.displayName.en}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <label className="text-xs space-y-1">
                                                    <span className="text-muted-foreground">{language === "tr" ? "Preset Modu" : "Preset Mode"}</span>
                                                    <select
                                                        className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                                                        value={sitePresetMode}
                                                        onChange={(e) => {
                                                            const nextMode = e.target.value === "approved" ? "approved" : e.target.value === "suggested" ? "suggested" : "none"
                                                            setSitePresetMode(nextMode)
                                                            if (nextMode !== "approved") setSitePresetApprovedAt("")
                                                        }}
                                                    >
                                                        <option value="none">{language === "tr" ? "Kapalı (Generic fallback)" : "Off (Generic fallback)"}</option>
                                                        <option value="suggested">{language === "tr" ? "Sadece Öneri" : "Suggested only"}</option>
                                                        <option value="approved">{language === "tr" ? "Onaylı Preset" : "Approved preset"}</option>
                                                    </select>
                                                </label>

                                                <label className="text-xs space-y-1">
                                                    <span className="text-muted-foreground">{language === "tr" ? "Preset Seçimi" : "Preset Selection"}</span>
                                                    <select
                                                        className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                                                        value={sitePresetId || dynamicPresetSelection.suggestedPresetId}
                                                        onChange={(e) => setSitePresetId(e.target.value)}
                                                    >
                                                        {DYNAMIC_CONTEXT_PRESETS.map((preset) => (
                                                            <option key={preset.presetId} value={preset.presetId}>
                                                                {(language === "tr" ? preset.displayName.tr : preset.displayName.en)} ({preset.status})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSitePresetMode("approved")
                                                        setSitePresetId(dynamicPresetSelection.suggestedPresetId)
                                                        setSitePresetApprovedAt(new Date().toISOString())
                                                    }}
                                                >
                                                    {language === "tr" ? "Önerileni Onayla" : "Approve Suggested"}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setSitePresetMode("none")
                                                        setSitePresetId("")
                                                        setSitePresetApprovedAt("")
                                                    }}
                                                >
                                                    {language === "tr" ? "Preseti Kapat" : "Disable Preset"}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setSitePresetMode("suggested")}
                                                >
                                                    {language === "tr" ? "Sadece Öneri Modu" : "Suggested Mode Only"}
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <label className="text-xs space-y-1">
                                                    <span className="text-muted-foreground">{language === "tr" ? "POST Endpoint Allowlist (preset eklentisi)" : "POST Endpoint Allowlist (preset extension)"}</span>
                                                    <textarea
                                                        className="w-full min-h-[84px] rounded-md border bg-background px-3 py-2 text-xs font-mono"
                                                        value={siteNetworkAllowlistInput}
                                                        onChange={(e) => setSiteNetworkAllowlistInput(e.target.value)}
                                                        placeholder="/graphql&#10;/api/orders"
                                                    />
                                                </label>
                                                <label className="text-xs space-y-1">
                                                    <span className="text-muted-foreground">{language === "tr" ? "GraphQL Operation Allowlist" : "GraphQL Operation Allowlist"}</span>
                                                    <textarea
                                                        className="w-full min-h-[84px] rounded-md border bg-background px-3 py-2 text-xs font-mono"
                                                        value={siteGraphqlAllowlistInput}
                                                        onChange={(e) => setSiteGraphqlAllowlistInput(e.target.value)}
                                                        placeholder="GetOrders&#10;TrackShipment"
                                                    />
                                                </label>
                                            </div>

                                            <label className="text-xs space-y-1 block">
                                                <span className="text-muted-foreground">
                                                    {language === "tr" ? "Preset Override JSON (opsiyonel)" : "Preset Override JSON (optional)"}
                                                </span>
                                                <textarea
                                                    className="w-full min-h-[92px] rounded-md border bg-background px-3 py-2 text-xs font-mono"
                                                    value={sitePresetOverridesJson}
                                                    onChange={(e) => setSitePresetOverridesJson(e.target.value)}
                                                />
                                                {parsedPresetOverrides.error ? (
                                                    <div className="text-[11px] text-red-600">{parsedPresetOverrides.error}</div>
                                                ) : (
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {language === "tr"
                                                            ? `Entity hedefleri: ${dynamicPresetSelection.runtimePreset.entityTargets.join(", ")} | Preset: ${dynamicPresetSelection.runtimePreset.presetId}`
                                                            : `Entity targets: ${dynamicPresetSelection.runtimePreset.entityTargets.join(", ")} | Preset: ${dynamicPresetSelection.runtimePreset.presetId}`}
                                                    </div>
                                                )}
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {scanMode === "site_wide" && (siteCrawlStatus !== "idle" || !!siteCrawlProgress || siteCrawlRoutes.length > 0 || siteCrawlErrors.length > 0) && (
                                <div className="rounded-lg border p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-semibold">{language === "tr" ? "Site Tarama Durumu" : "Site Crawl Status"}</div>
                                            <p className="text-xs text-muted-foreground">
                                                {language === "tr"
                                                    ? "Popup taraması route bazlı çalışır. Hata alan route’lar aşağıda görünür."
                                                    : "Popup crawl runs route-by-route. Failed routes are listed below."}
                                            </p>
                                        </div>
                                        <span className="px-2 py-1 rounded-full border text-xs font-semibold bg-muted">{siteCrawlStatus}</span>
                                    </div>

                                    {siteCrawlProgress && (
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                                            <div className="rounded border p-2"><div className="text-muted-foreground">Total</div><div className="font-semibold">{siteCrawlProgress.total ?? 0}</div></div>
                                            <div className="rounded border p-2"><div className="text-muted-foreground">Visited</div><div className="font-semibold">{siteCrawlProgress.visited ?? 0}</div></div>
                                            <div className="rounded border p-2"><div className="text-muted-foreground">{language === "tr" ? "Başarılı" : "Success"}</div><div className="font-semibold text-green-600">{siteCrawlProgress.success ?? 0}</div></div>
                                            <div className="rounded border p-2"><div className="text-muted-foreground">{language === "tr" ? "Hata" : "Failed"}</div><div className="font-semibold text-red-600">{siteCrawlProgress.failed ?? 0}</div></div>
                                            <div className="rounded border p-2 col-span-2 md:col-span-1">
                                                <div className="text-muted-foreground">{language === "tr" ? "Aktif Route" : "Current Route"}</div>
                                                <div className="font-mono text-[11px] truncate">{siteCrawlProgress.currentRoute || "-"}</div>
                                            </div>
                                        </div>
                                    )}

                                    {siteCrawlErrors.length > 0 && (
                                        <div className="rounded-md border border-red-200 bg-red-50/60 dark:border-red-900/30 dark:bg-red-950/10 p-3">
                                            <div className="text-xs font-semibold text-red-700 dark:text-red-300 mb-2">{language === "tr" ? "Route Hataları" : "Route Errors"}</div>
                                            <div className="space-y-1 max-h-32 overflow-auto">
                                                {siteCrawlErrors.slice(-10).map((err, idx) => (
                                                    <div key={`${err.route}-${idx}`} className="text-[11px]">
                                                        <span className="font-mono">{err.route || "-"}</span>
                                                        <span className="mx-1 text-muted-foreground">•</span>
                                                        <span className="font-medium">{err.code}</span>
                                                        {err.message ? <span className="text-muted-foreground"> — {err.message}</span> : null}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {siteCrawlRoutes.length > 0 && (
                                        <div className="rounded-md border p-3 space-y-2">
                                            <div className="text-xs font-semibold">{language === "tr" ? "Taranan Route Özetleri" : "Scanned Route Summaries"}</div>
                                            <div className="space-y-2 max-h-56 overflow-auto">
                                                {siteCrawlRoutes.slice(0, 12).map((route) => (
                                                    <div key={route.route} className="rounded border p-2 text-xs">
                                                        <div className="font-mono truncate">{route.route}</div>
                                                        {route.title ? <div className="text-muted-foreground truncate">{route.title}</div> : null}
                                                        {(route.domSummary?.stats || []).length > 0 && (
                                                            <div className="mt-1 flex flex-wrap gap-1">
                                                                {(route.domSummary?.stats || []).slice(0, 4).map((s, i) => (
                                                                    <span key={`${route.route}-stat-${i}`} className="rounded-full border px-2 py-0.5 bg-muted/40">
                                                                        {s.label}: {s.value}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {siteCrawlEntityPreview && (
                                        <div className="rounded-md border p-3">
                                            <div className="text-xs font-semibold mb-2">{language === "tr" ? "Entity Özet Önizleme" : "Entity Summary Preview"}</div>
                                            <pre className="text-[11px] overflow-auto max-h-48 whitespace-pre-wrap break-words bg-muted/30 rounded p-2">
                                                {JSON.stringify(siteCrawlEntityPreview, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}

                            {lastDiscoveryCount === 0 && !isDiscovering && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-200">
                                    {language === "tr"
                                        ? "Tarama tamamlandı ama uygun veri alanı bulunamadı. Bu sayfada form/input alanı olmayabilir veya seçiciler çok dinamik olabilir. Manuel seçici ekleyebilir ya da form olan bir sayfayı tarayabilirsiniz."
                                        : "Scan completed but no suitable data fields were found. This page may not contain form/input fields, or selectors may be highly dynamic. You can add selectors manually or scan a page that contains a form."}
                                </div>
                            )}

                            {discoveredSelectors.length > 0 && (
                                <div className="bg-muted/50 rounded-lg p-4 border border-dashed border-indigo-200 dark:border-indigo-900/50 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Search className="w-4 h-4 text-indigo-500" />
                                        <h4 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                                            {language === "tr" ? "Bulunan Potansiyel Veriler" : "Discovered Potential Data"}
                                        </h4>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {discoveredSelectors.map((item) => {
                                            const isAdded = selectors.some((s) => s.selector === item.selector);
                                            return (
                                                <div key={item.id} className="flex items-center bg-white dark:bg-zinc-950 border rounded-full px-3 py-1 text-xs gap-2 shadow-sm">
                                                    <span className="font-mono text-muted-foreground">{item.selector}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className={`h-5 px-2 text-[10px] rounded-full uppercase font-bold ${isAdded ? 'text-green-600 hover:text-green-700 bg-green-50 dark:bg-green-900/20' : 'text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40'}`}
                                                        disabled={isAdded}
                                                        onClick={() => {
                                                            setSelectors(prev => [...prev, { id: Date.now().toString() + item.id, key: item.key, selector: item.selector }]);
                                                        }}
                                                    >
                                                        {isAdded ? (language === "tr" ? "Eklendi" : "Added") : (language === "tr" ? "Ekle" : "Add")}
                                                    </Button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{language === "tr" ? "Değişken Adı (Key)" : "Variable Key"}</TableHead>
                                            <TableHead>{language === "tr" ? "CSS Seçici" : "CSS Selector"}</TableHead>
                                            <TableHead className="w-[50px]" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectors.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <Input
                                                        value={item.key}
                                                        onChange={(e) => updateSelector(item.id, "key", e.target.value)}
                                                        placeholder="e.g. balance"
                                                        className="h-8"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={item.selector}
                                                        onChange={(e) => updateSelector(item.id, "selector", e.target.value)}
                                                        placeholder="e.g. #user-balance"
                                                        className="h-8 font-mono text-xs"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                                        onClick={() => removeSelector(item.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {selectors.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground text-sm">
                                                    {language === "tr" ? "Henüz seçici eklenmedi." : "No selectors added yet."}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <Button variant="outline" size="sm" className="w-full border-dashed" onClick={addSelector}>
                                <Plus className="w-4 h-4 mr-2" />
                                {language === "tr" ? "Yeni Seçici Ekle" : "Add New Selector"}
                            </Button>
                        </CardContent>
                    </Card>
                </>
            )}

            <div className="flex justify-end pt-6 border-t">
                <Button size="lg" className="font-semibold shadow-lg shadow-indigo-500/20 w-full sm:w-auto" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (language === "tr" ? "Kaydediliyor..." : "Saving...") : language === "tr" ? "Ayarları Kaydet" : "Save Settings"}
                </Button>
            </div>
        </div>
    )
}
