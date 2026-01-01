"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    ShoppingBag,
    ArrowRight,
    Mic,
    MessageSquare,
    Calendar,
    Users,
    BookOpen,
    Share2,
    Mail,
    Lock,
    TrendingUp,
    Check,
    Globe,
    Zap,
    CheckCircle2,
    Shield,
    BarChart,
    Info,
    LayoutGrid,
    List,
    Search,
    Filter,
    Settings2
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { useState, useEffect, useMemo } from "react"
import { doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { MODULES_REGISTRY as MODULE_DEFINITIONS, ModuleId, ORDERED_MODULES, ModuleDefinition } from "@/lib/modules-registry"
import { INDUSTRY_CONFIG, IndustryType, DEFAULT_INDUSTRY } from "@/lib/industry-config"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose
} from "@/components/ui/dialog"
import { getAllModules as getAllRegistryModules } from "@/lib/modules-registry"
import { ModuleDetailsDialog } from "@/components/modules/module-details-dialog"

// Lucide Icon Mapping
export const ICON_MAP = {
    ShoppingBag,
    Check,
    Globe,
    Zap,
    TrendingUp,
    CheckCircle2,
    Shield,
    BarChart,
    Mic,
    MessageSquare,
    Calendar,
    Users,
    BookOpen,
    Share2,
    Mail
}

// Map ModuleId to Firestore Field
const MODULE_FIRESTORE_MAP: Record<ModuleId, string> = {
    generalChatbot: 'enableChatbot',
    productCatalog: 'enablePersonalShopper',
    voiceAssistant: 'enableVoiceAssistant',
    appointments: 'enableAppointments',
    leadCollection: 'enableLeadCollection',
    knowledgeBase: 'enableKnowledgeBase',

    emailMarketing: 'enableEmailMarketing',
    salesOptimization: 'enableSalesOptimization',
    reviewManagement: 'enableReviewManagement',
    loyaltyProgram: 'enableLoyaltyProgram',
    campaignManager: 'enableCampaignManager',
    autoTranslate: 'enableAutoTranslate',
    gamification: 'enableGamification',
    visualDiagnosis: 'enableVisualDiagnosis',
    digitalWaiter: 'enableDigitalWaiter',
    proactiveMessaging: 'enableProactiveMessaging'
}

interface ModulesContentProps {
    targetUserId?: string
}

export function ModulesContent({ targetUserId }: ModulesContentProps) {
    const { t, language } = useLanguage()
    const router = useRouter()
    const {
        user,
        role,
        enablePersonalShopper,
        enableChatbot,
        enableVoiceAssistant,
        enableKnowledgeBase,
        enableLeadCollection
    } = useAuth()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState<ModuleId | null>(null)
    const [isPageLoading, setIsPageLoading] = useState(true)
    const [moduleStates, setModuleStates] = useState<Record<string, boolean>>({})
    const [selectedModuleId, setSelectedModuleId] = useState<ModuleId | null>(null)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

    // Search and Filter States
    const [searchQuery, setSearchQuery] = useState("")
    const [industryFilter, setIndustryFilter] = useState("all")

    // Use targetUserId if provided, otherwise use current user's uid
    const effectiveUserId = targetUserId || user?.uid
    const isSuperAdminViewingTenant = !!targetUserId

    // Determine User Industry - Default to ecommerce if not set
    const userIndustry: IndustryType = (user as any)?.industry || DEFAULT_INDUSTRY
    const industryConfig = INDUSTRY_CONFIG[userIndustry]

    useEffect(() => {
        const loadModuleStates = async () => {
            if (!effectiveUserId) return
            setIsPageLoading(true)
            try {
                // Fetch from API to avoid client-side permission issues
                const response = await fetch(`/api/console/settings?chatbotId=${effectiveUserId}`)

                if (response.ok) {
                    const data = await response.json()

                    setModuleStates({
                        generalChatbot: data.enableChatbot ?? true,
                        productCatalog: data.enablePersonalShopper ?? false,
                        voiceAssistant: data.enableVoiceAssistant ?? false,
                        knowledgeBase: data.enableKnowledgeBase ?? true,
                        leadCollection: data.enableLeadCollection ?? data.enableLeadFinder ?? false,
                        appointments: data.enableAppointments ?? false,

                        emailMarketing: data.enableEmailMarketing ?? false,
                        salesOptimization: data.enableSalesOptimization ?? false,
                        reviewManagement: data.enableReviewManagement ?? false,
                        loyaltyProgram: data.enableLoyaltyProgram ?? false,
                        campaignManager: data.enableCampaignManager ?? false,
                        autoTranslate: data.enableAutoTranslate ?? false,
                        gamification: data.enableGamification ?? false,
                        visualDiagnosis: data.enableVisualDiagnosis ?? false,
                        digitalWaiter: data.enableDigitalWaiter ?? false,
                        proactiveMessaging: data.enableProactiveMessaging ?? false,
                    })
                } else {
                    console.error("Failed to load settings via API")
                    // Fallback to defaults
                    setModuleStates({
                        generalChatbot: true,
                        productCatalog: false,
                        voiceAssistant: false,
                        knowledgeBase: true,
                        leadCollection: false,
                        appointments: false,

                        emailMarketing: false,
                        salesOptimization: false,
                        reviewManagement: false,
                        loyaltyProgram: false,
                        campaignManager: false,
                        autoTranslate: false,
                        gamification: false,
                        visualDiagnosis: false,
                        digitalWaiter: false,
                        proactiveMessaging: false,
                    })
                }

            } catch (error) {
                console.error("Error loading module states:", error)
            } finally {
                setIsPageLoading(false)
            }
        }
        loadModuleStates()
    }, [effectiveUserId])

    const handleToggle = async (moduleId: ModuleId, checked: boolean) => {
        if (!effectiveUserId) return
        setIsLoading(moduleId)

        // 1. Check for Conflicts
        const targetModule = getAllRegistryModules().find(m => m.id === moduleId);
        // If we are trying to ENABLE it (checked is true)
        if (checked && targetModule?.conflictsWith) {
            // Check if any conflicting module is currently enabled
            const conflictingModuleId = targetModule.conflictsWith.find(conflictId => {
                return moduleStates[conflictId] === true;
            });

            if (conflictingModuleId) {
                const conflictModule = getAllRegistryModules().find(m => m.id === conflictingModuleId);
                const conflictName = conflictModule
                    ? (language === 'tr' ? conflictModule.name.tr : conflictModule.name.en)
                    : conflictingModuleId;

                toast({
                    variant: "destructive",
                    title: language === 'tr' ? "Modül Çakışması" : "Module Conflict",
                    description: language === 'tr'
                        ? `Bu modül, şu anda aktif olan "${conflictName}" modülü ile çakışmaktadır. Lütfen önce diğer modülü kapatın.`
                        : `This module conflicts with the currently active "${conflictName}" module. Please disable it first.`
                });
                setIsLoading(null); // Stop loading state
                return; // Prevent toggle
            }
        }

        // 2. Optimistic Update
        setModuleStates(prev => ({
            ...prev,
            [moduleId]: checked
        }))

        try {
            const userRef = doc(db, "users", effectiveUserId)
            const chatbotRef = doc(db, "chatbots", effectiveUserId)
            const fieldName = MODULE_FIRESTORE_MAP[moduleId]

            if (!fieldName) throw new Error("Field mapping not found")

            // Get ID token for security check
            const idToken = await user?.getIdToken()

            // Use API to update settings (handles permissions via admin-sdk)
            const response = await fetch("/api/console/settings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    chatbotId: effectiveUserId,
                    userSettings: { [fieldName]: checked },
                    chatbotSettings: { [fieldName]: checked }
                })
            })

            if (!response.ok) throw new Error("Failed to update module settings")

            setModuleStates(prev => ({ ...prev, [moduleId]: checked }))

            toast({
                title: checked ? (t('moduleEnabled') || "Modül Aktif Edildi") : (t('moduleDisabled') || "Modül Pasif Edildi"),
                description: t('settingsSavedDesc') || "Ayarlarınız güncellendi."
            })
        } catch (error) {
            console.error("Error updating module:", error)
            toast({
                title: "Error",
                description: "Failed to update module status.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(null)
        }
    }

    const handleManage = (moduleId: ModuleId) => {
        const basePath = isSuperAdminViewingTenant
            ? `/admin/tenant/${targetUserId}`
            : '/console'

        // SUPER ADMIN VIEWING TENANT (In /admin/tenant/...)
        if (isSuperAdminViewingTenant) {
            // Only route to pages that actually exist in the Admin panel
            switch (moduleId) {
                case 'generalChatbot':
                    router.push(`${basePath}/chatbot`)
                    break
                case 'productCatalog':
                    router.push(`${basePath}/chatbot/shopper`)
                    break
                case 'knowledgeBase':
                    router.push(`${basePath}/knowledge`)
                    break
                case 'appointments':
                    router.push(`${basePath}/chatbot/appointments`)
                    break
                case 'leadCollection':
                    // Maps to the Leads page in admin
                    router.push(`${basePath}/chatbot/leads`)
                    break
                case 'digitalWaiter':
                    // Use console page for now (works for both admin and tenant)
                    router.push("/console/modules/digital-waiter")
                    break
                case 'proactiveMessaging':
                    // Use console page for now (works for both admin and tenant)
                    router.push("/console/modules/engagement")
                    break
                default:
                    // For all other modules which don't have a dedicated Admin page yet
                    toast({
                        title: t('comingSoon'),
                        description: t('moduleUnderDevelopment') || "Bu modülün yönetim sayfası henüz hazırlanmaktadır."
                    })
            }
            return
        }

        // REGULAR USER / CONSOLE VIEW (In /console/...)
        switch (moduleId) {
            case 'generalChatbot':
                router.push(`${basePath}/chatbot`)
                break
            case 'productCatalog':
                router.push(`${basePath}/chatbot/shopper`)
                break
            case 'voiceAssistant':
                router.push("/console/modules/voice/settings")
                break
            case 'knowledgeBase':
                router.push(`${basePath}/knowledge`)
                break
            case 'leadCollection':
                router.push("/console/modules/leads/settings")
                break
            case 'salesOptimization':
                router.push("/console/modules/sales-optimization")
                break
            case 'appointments':
                router.push(`${basePath}/chatbot/appointments`)
                break
            case 'emailMarketing':
                router.push("/console/modules/email")
                break
            case 'reviewManagement':
                router.push("/console/modules/reviews")
                break
            case 'loyaltyProgram':
                router.push("/console/modules/loyalty")
                break
            case 'campaignManager':
                router.push("/console/modules/campaigns")
                break
            case 'autoTranslate':
                router.push("/console/modules/translate")
                break
            case 'gamification':
                router.push("/console/modules/gamification")
                break
            case 'visualDiagnosis':
                router.push("/console/modules/visual")
                break
            case 'digitalWaiter':
                router.push("/console/modules/digital-waiter")
                break
            case 'proactiveMessaging':
                router.push("/console/modules/engagement")
                break
            default:
                toast({
                    title: t('comingSoon'),
                    description: t('moduleUnderDevelopment')
                })
        }
    }

    const handleRequest = async (moduleId: ModuleId) => {
        if (!effectiveUserId) return
        setIsLoading(moduleId)

        const moduleConfig = MODULE_DEFINITIONS[moduleId]
        const lang = language as 'en' | 'tr'
        const moduleName = moduleConfig?.name ? moduleConfig.name[lang] || moduleConfig.name.en : moduleId

        try {
            // Get ID token for authorization
            const idToken = await user?.getIdToken()

            const response = await fetch("/api/console/request-module", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    moduleKey: moduleId,
                    moduleName: moduleName,
                    industry: userIndustry
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to submit request")
            }

            toast({
                title: t('requestSent') || "Talep Gönderildi",
                description: t('requestSentDesc') || "Modül talebiniz yöneticiye iletildi. En kısa sürede sizinle iletişime geçeceğiz.",
            })
        } catch (error) {
            console.error("Error sending request:", error)
            toast({
                title: "Hata",
                description: "Talep gönderilemedi. Lütfen tekrar deneyin.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(null)
        }
    }

    // Check if module is included in the plan based on the TENANT'S sector
    // We must use the tenant's actual sector, not a hardcoded one or default behavior that might be wrong
    // Check if module is included in the plan based on the TENANT'S sector
    // We must use the tenant's actual sector, not a hardcoded one or default behavior that might be wrong
    const isModuleIncluded = (moduleId: string) => {
        const registryModule = getAllRegistryModules().find(m => m.id === moduleId)
        if (!registryModule) return false

        // If we have a specific tenant sector (passed via props/context), use it.
        // If not, fall back to checking if it's default enabled generally (which might be risky if sector is 'other')
        // Ideally we should always have a sector if we are in this view.
        if (userIndustry && registryModule.defaultEnabledBySector.includes(userIndustry as any)) {
            return true
        }

        return false
    }

    const isPremiumModule = (moduleId: ModuleId) => {
        if (moduleId === 'generalChatbot') return false // Core, not premium
        return !isModuleIncluded(moduleId)
    }

    // Filter Logic
    const filteredModules = useMemo(() => {
        const lang = language as 'en' | 'tr'
        return ORDERED_MODULES.filter(module => {
            const name = module.name[lang] || module.name.en
            const description = module.description[lang] || module.description.en
            const query = searchQuery.toLowerCase()

            // Search Match
            const matchesSearch = name.toLowerCase().includes(query) || description.toLowerCase().includes(query)

            // Industry Match
            let matchesIndustry = true
            if (industryFilter !== 'all') {
                const supported = module.supportedSectors || []
                // If module has no recommendations, strictly speaking it might be for all?
                // In registry '[]' means all sectors. In module-config it might be consistent.
                // If recommended list is empty, it usually means Core/General.
                if (supported.length > 0) {
                    matchesIndustry = supported.includes(industryFilter as any)
                }
            }

            return matchesSearch && matchesIndustry
        })
    }, [searchQuery, industryFilter, t])

    // Show loading skeleton while fetching data
    if (isPageLoading) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <div>
                        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
                        <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="border rounded-lg p-6 space-y-4">
                            <div className="flex justify-between">
                                <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
                                <div className="h-6 w-12 bg-gray-200 rounded-full animate-pulse" />
                            </div>
                            <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
                            <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                            <div className="h-10 w-full bg-gray-200 rounded animate-pulse mt-4" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t('modules') || "Modüller"}</h2>
                    <p className="text-muted-foreground mt-1">
                        {t('modulesDescription') || "Yapay zeka asistanlarını ve araçlarını yönetin."}
                    </p>
                </div>
                {!isSuperAdminViewingTenant && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground font-medium">{t('activeSector') || 'Aktif Sektör'}:</span>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-100 dark:border-indigo-500/20 font-semibold shadow-sm">
                            <Zap className="w-3.5 h-3.5 fill-indigo-700/20" />
                            {(industryConfig as any).names?.[language] || industryConfig.label}
                        </div>
                    </div>
                )}
            </div>

            {/* Toolbar: Search, Filter, View Toggle */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-zinc-950 p-1 rounded-xl">
                <div className="flex flex-1 w-full md:w-auto items-center gap-3">
                    <div className="relative flex-1 md:max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('searchModules') || "Modül ara..."}
                            className="pl-9 h-10 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <Select value={industryFilter} onValueChange={setIndustryFilter}>
                        <SelectTrigger className="w-[180px] h-10">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue placeholder={t('filterByIndustry') || "Sektör Filtrele"} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('allIndustries') || "Tüm Sektörler"}</SelectItem>
                            {Object.entries(INDUSTRY_CONFIG).map(([key, config]) => (
                                <SelectItem key={key} value={key}>
                                    {(config as any).names?.[language] || config.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center space-x-1 bg-secondary/30 p-1 rounded-lg border">
                    <Button
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-8 px-2 lg:px-3"
                        onClick={() => setViewMode('grid')}
                    >
                        <LayoutGrid className="h-4 w-4 lg:mr-2" />
                        <span className="hidden lg:inline">{t('gridView') || "Grid"}</span>
                    </Button>
                    <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-8 px-2 lg:px-3"
                        onClick={() => setViewMode('list')}
                    >
                        <List className="h-4 w-4 lg:mr-2" />
                        <span className="hidden lg:inline">{t('listView') || "Liste"}</span>
                    </Button>
                </div>
            </div>

            {/* Modules Render */}
            {filteredModules.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <div className="flex justify-center mb-4">
                        <Search className="w-12 h-12 opacity-20" />
                    </div>
                    <p>{t('noModulesFound') || "Modül bulunamadı."}</p>
                    <Button variant="link" onClick={() => { setSearchQuery(""); setIndustryFilter("all") }}>
                        {t('clearFilters') || "Filtreleri Temizle"}
                    </Button>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                    {filteredModules.map((module) => {
                        const isIncluded = isModuleIncluded(module.id)
                        const isActive = module.isCore ? true : (moduleStates[module.id] || false)
                        const isSuperAdmin = role === 'SUPER_ADMIN'
                        const isCoreModule = module.isCore
                        const isAccessGranted = isSuperAdmin || isIncluded || isActive
                        const IconComponent = ICON_MAP[module.icon as keyof typeof ICON_MAP] || MessageSquare
                        const isEnabled = moduleStates[module.id] || false;
                        const isCore = module.isCore || (module.id === 'generalChatbot')

                        return (
                            <Card
                                key={module.id}
                                className={`relative overflow-hidden transition-all duration-200 ${module.status === 'coming_soon'
                                    ? 'opacity-70 bg-muted/30 border-dashed'
                                    : 'hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800'
                                    }`}
                            >
                                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-0">
                                    <div className={`p-2 rounded-lg ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                                        <IconComponent className="w-6 h-6" />
                                    </div>
                                    {isCoreModule ? (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                                        <span className="w-2 h-2 rounded-full bg-green-500" />
                                                        {t('coreModule') || 'Temel'}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{t('coreModuleTooltip') || 'Bu temel bir modüldür ve kapatılamaz.'}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    ) : module.status === 'beta' ? (
                                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">
                                            Beta
                                        </Badge>
                                    ) : module.status === 'coming_soon' ? (
                                        <Badge variant="secondary" className="bg-zinc-100 text-zinc-700 hover:bg-zinc-100 border-none">
                                            {t('comingSoon') || 'Yakında'}
                                        </Badge>
                                    ) : isAccessGranted ? (
                                        <div className="flex items-center gap-2">
                                            {isIncluded && !module.isCore && (
                                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-2 py-0.5 text-xs font-medium">
                                                    {t('included') || (language === 'tr' ? 'Dahil' : 'Included')}
                                                </Badge>
                                            )}
                                            {module.isPremium && !isIncluded && (
                                                <Badge variant="outline" className="gap-1 text-violet-600 border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium">
                                                    Premium
                                                </Badge>
                                            )}
                                            <Switch
                                                checked={isActive}
                                                onCheckedChange={(checked) => handleToggle(module.id, checked)}
                                                disabled={isLoading === module.id || isCoreModule || !isAccessGranted}
                                                className={isLoading === module.id ? 'opacity-50' : ''}
                                            />
                                        </div>
                                    ) : (
                                        <Lock className="w-5 h-5 text-muted-foreground" />
                                    )}
                                </CardHeader>
                                <CardContent className="pt-0 flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <CardTitle className="text-lg font-semibold">{module.name[language as 'en' | 'tr'] || module.name.en}</CardTitle>
                                        {isCoreModule || module.status === 'beta' || module.status === 'coming_soon' ? null : isIncluded ? (
                                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors border-transparent bg-green-100 text-green-800">
                                                {t('included') || 'Dahil'}
                                            </span>
                                        ) : (
                                            <Badge variant="outline" className="gap-1 text-violet-600 border-violet-200 bg-violet-50">
                                                Premium
                                            </Badge>
                                        )}
                                    </div>
                                    <CardDescription className="line-clamp-2">
                                        {module.description[language as 'en' | 'tr'] || module.description.en}
                                    </CardDescription>

                                    <div className="mt-4 flex items-center gap-2 text-sm font-medium">
                                        {module.status === 'coming_soon' ? (
                                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                                                <Lock className="h-3.5 w-3.5" />
                                                {t('inDevelopment') || 'Geliştiriliyor'}
                                            </span>
                                        ) : (
                                            <>
                                                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                <span className={isActive ? 'text-green-600' : 'text-gray-500'}>
                                                    {isActive ? t('active') : t('inactive')}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-0 mt-auto gap-3">
                                    {isAccessGranted && module.status !== 'coming_soon' ? (
                                        <Button
                                            onClick={() => handleManage(module.id)}
                                            className="flex-1 h-9 text-xs font-medium bg-black text-white hover:bg-zinc-800 rounded-full shadow-sm"
                                            disabled={!isActive}
                                        >
                                            {language === 'tr' ? 'Yönet' : 'Manage'}
                                            <ArrowRight className="w-3 h-3 ml-1.5" />
                                        </Button>
                                    ) : module.status === 'coming_soon' ? (
                                        <Button
                                            className="w-full gap-2"
                                            variant="secondary"
                                            disabled
                                        >
                                            {t('comingSoon') || "Yakında"}
                                        </Button>
                                    ) : (
                                        <Button
                                            className="w-full gap-2"
                                            variant="secondary"
                                            onClick={() => handleRequest(module.id)}
                                            disabled={isLoading === module.id}
                                        >
                                            {isLoading === module.id ? "..." : (t('requestAccess') || "Talep Oluştur")}
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground"
                                        onClick={() => {
                                            setSelectedModuleId(module.id)
                                            setIsDetailsOpen(true)
                                        }}
                                    >
                                        {language === 'tr' ? 'Detaylar' : 'Details'}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            ) : (
                <div className="flex flex-col gap-4 pt-2">
                    {filteredModules.map((module) => {
                        const isIncluded = isModuleIncluded(module.id)
                        const isActive = module.isCore ? true : (moduleStates[module.id] || false)
                        const isSuperAdmin = role === 'SUPER_ADMIN'
                        const isCoreModule = module.isCore
                        const isAccessGranted = isSuperAdmin || isIncluded || isActive
                        const IconComponent = ICON_MAP[module.icon as keyof typeof ICON_MAP] || MessageSquare
                        const isEnabled = moduleStates[module.id] || false;
                        const isCore = module.isCore || (module.id === 'generalChatbot')
                        const registryModule = getAllRegistryModules().find(m => m.id === module.id)
                        const isPremiumAddOn = registryModule?.isPremium || false

                        return (
                            <div key={module.id} className={`flex items-center p-4 border rounded-xl gap-4 bg-white dark:bg-zinc-950 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900 ${!isAccessGranted ? 'opacity-90' : ''}`}>
                                <div className={`p-3 rounded-lg flex-shrink-0 ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                                    <IconComponent className="w-6 h-6" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-semibold text-base">{module.name[language as 'en' | 'tr'] || module.name.en}</h3>
                                        {isCoreModule ? (
                                            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                                                {t('coreModule') || 'Temel'}
                                            </Badge>
                                        ) : module.status === 'beta' ? (
                                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">
                                                Beta
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-none">
                                                {t('comingSoon') || 'Yakında'}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        {isIncluded && !module.isCore && (
                                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-2 py-0.5 text-xs font-medium">
                                                {t('included') || (language === 'tr' ? 'Dahil' : 'Included')}
                                            </Badge>
                                        )}
                                        {isPremiumAddOn && !isIncluded && (
                                            <Badge variant="outline" className="gap-1 text-violet-600 border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium">
                                                Premium
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                        {module.description[language as 'en' | 'tr'] || module.description.en}
                                    </p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-sm font-medium mr-4 hidden md:flex">
                                        {module.status === 'coming_soon' ? (
                                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                                                <Lock className="h-3.5 w-3.5" />
                                                {t('inDevelopment') || 'Geliştiriliyor'}
                                            </span>
                                        ) : (
                                            <>
                                                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                <span className={isActive ? 'text-green-600' : 'text-gray-500'}>
                                                    {isActive ? t('active') : t('inactive')}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* Switch or Lock */}
                                    <div className="flex items-center">
                                        {isCoreModule ? (
                                            <div className="w-10 h-6 flex items-center justify-center">
                                                <Lock className="w-4 h-4 text-gray-400 opacity-50" />
                                            </div>
                                        ) : module.status === 'coming_soon' ? (
                                            <div className="w-10 h-6 flex items-center justify-center">
                                                <Lock className="w-4 h-4 text-gray-400 opacity-50" />
                                            </div>
                                        ) : isAccessGranted ? (
                                            <Switch
                                                checked={isActive}
                                                onCheckedChange={(checked) => handleToggle(module.id, checked)}
                                                disabled={isLoading === module.id}
                                            />
                                        ) : (
                                            <Lock className="w-5 h-5 text-muted-foreground" />
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 pl-4 border-l">
                                        {isAccessGranted && module.status !== 'coming_soon' ? (
                                            <Button
                                                onClick={() => handleManage(module.id)}
                                                size="sm"
                                                className="h-9 bg-black text-white hover:bg-zinc-800 rounded-full px-4"
                                                disabled={!isActive}
                                            >
                                                {language === 'tr' ? 'Yönet' : 'Manage'}
                                            </Button>
                                        ) : module.status === 'coming_soon' ? (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                disabled
                                            >
                                                {t('comingSoon') || "Yakında"}
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleRequest(module.id)}
                                                disabled={isLoading === module.id}
                                            >
                                                {isLoading === module.id ? "..." : (t('requestAccess') || "Talep Oluştur")}
                                            </Button>
                                        )}

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9"
                                            onClick={() => {
                                                setSelectedModuleId(module.id)
                                                setIsDetailsOpen(true)
                                            }}
                                        >
                                            <Info className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <ModuleDetailsDialog
                isOpen={isDetailsOpen}
                onOpenChange={(open) => {
                    setIsDetailsOpen(open)
                    if (!open) handleManage(selectedModuleId as ModuleId)
                }}
                selectedModuleId={selectedModuleId}
                moduleStates={moduleStates}
                onManage={(moduleId) => {
                    const selectedModuleDef = selectedModuleId ? MODULE_DEFINITIONS[selectedModuleId] : null
                    const isSelectedIncluded = selectedModuleId ? isModuleIncluded(selectedModuleId) : false
                    const isSelectedActive = selectedModuleId ? (moduleStates[selectedModuleId] || false) : false
                    const canAccessSelected = selectedModuleId
                        ? (role === 'SUPER_ADMIN' || isSelectedIncluded || isSelectedActive || selectedModuleDef?.isCore)
                        : false

                    setIsDetailsOpen(false)
                    if (canAccessSelected) {
                        handleManage(selectedModuleId!)
                    } else {
                        handleRequest(selectedModuleId!)
                    }
                }}
                registryModules={getAllRegistryModules()}
                firestoreMap={MODULE_FIRESTORE_MAP}
                iconMap={ICON_MAP}
                canAccess={selectedModuleId ? (role === 'SUPER_ADMIN' || isModuleIncluded(selectedModuleId) || moduleStates[selectedModuleId] || MODULE_DEFINITIONS[selectedModuleId]?.isCore) : false}
                onRequest={handleRequest}
            />
        </div>
    )
}

