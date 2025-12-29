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
    Filter
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { useState, useEffect, useMemo } from "react"
import { doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { MODULES as MODULE_DEFINITIONS, ModuleId, ORDERED_MODULES } from "@/lib/module-config"
import { INDUSTRY_CONFIG, IndustryType, DEFAULT_INDUSTRY } from "@/lib/industry-config"
import { INDUSTRY_DEFAULT_MODULES, MODULES as NEW_MODULES } from "@/lib/modules-config"
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
    digitalWaiter: 'enableDigitalWaiter'
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
        enableLeadFinder
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
                        leadCollection: data.enableLeadCollection ?? false,
                        appointments: data.enableAppointments ?? false,

                        emailMarketing: data.enableEmailMarketing ?? false,
                        salesOptimization: data.enableSalesOptimization ?? false,
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
        // Build base path based on whether viewing tenant or own console
        const basePath = isSuperAdminViewingTenant
            ? `/admin/tenant/${targetUserId}`
            : '/console'

        // Route to specific module management pages
        switch (moduleId) {
            case 'generalChatbot':
                router.push(`${basePath}/chatbot`)
                break
            case 'productCatalog':
                router.push(`${basePath}/chatbot/shopper`)
                break
            case 'voiceAssistant':
                router.push(isSuperAdminViewingTenant ? `${basePath}/modules` : "/console/modules/voice/settings")
                break
            case 'knowledgeBase':
                router.push(`${basePath}/knowledge`)
                break
            case 'leadCollection':
                router.push(isSuperAdminViewingTenant ? `${basePath}/modules` : "/console/modules/leads/settings")
                break
            case 'salesOptimization':
                router.push(isSuperAdminViewingTenant ? `${basePath}/modules` : "/console/modules/sales-optimization")
                break
            case 'appointments':
                router.push(`${basePath}/chatbot/appointments`)
                break

            case 'emailMarketing':
                router.push(isSuperAdminViewingTenant ? `${basePath}/modules` : "/console/modules/email")
                break
            case 'reviewManagement':
                router.push(isSuperAdminViewingTenant ? `${basePath}/modules` : "/console/modules/reviews")
                break
            case 'loyaltyProgram':
                router.push(isSuperAdminViewingTenant ? `${basePath}/modules` : "/console/modules/loyalty")
                break
            case 'campaignManager':
                router.push(isSuperAdminViewingTenant ? `${basePath}/modules` : "/console/modules/campaigns")
                break
            case 'autoTranslate':
                router.push(isSuperAdminViewingTenant ? `${basePath}/modules` : "/console/modules/translate")
                break
            case 'gamification':
                router.push(isSuperAdminViewingTenant ? `${basePath}/modules` : "/console/modules/gamification")
                break
            case 'visualDiagnosis':
                router.push(isSuperAdminViewingTenant ? `${basePath}/modules` : "/console/modules/visual")
                break
            // Add other routes as they are implemented
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
        const moduleName = moduleConfig?.nameKey ? t(moduleConfig.nameKey) || moduleConfig.nameKey : moduleId

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

    const isModuleIncluded = (moduleId: ModuleId) => {
        if (moduleId === 'generalChatbot') return true // Always included

        // Map old module IDs to new ones
        const moduleIdMap: Record<string, string> = {
            'generalChatbot': 'chatbot',
            'productCatalog': 'personalShopper',
            'voiceAssistant': 'voiceAssistant',
            'leadCollection': 'leadFinder',
            'knowledgeBase': 'chatbot', // Part of chatbot
            'appointments': 'voiceAssistant', // Part of voice
        }

        const mappedId = moduleIdMap[moduleId] || moduleId
        const industryModules = INDUSTRY_DEFAULT_MODULES[userIndustry] || INDUSTRY_DEFAULT_MODULES.other
        return industryModules.includes(mappedId)
    }

    const isPremiumModule = (moduleId: ModuleId) => {
        if (moduleId === 'generalChatbot') return false // Core, not premium
        return !isModuleIncluded(moduleId)
    }

    // Filter Logic
    const filteredModules = useMemo(() => {
        return ORDERED_MODULES.filter(module => {
            const name = t(module.nameKey) || module.nameKey
            const description = t(module.descriptionKey) || module.descriptionKey
            const query = searchQuery.toLowerCase()

            // Search Match
            const matchesSearch = name.toLowerCase().includes(query) || description.toLowerCase().includes(query)

            // Industry Match
            let matchesIndustry = true
            if (industryFilter !== 'all') {
                const recommended = module.recommendedFor || []
                // If module has no recommendations, strictly speaking it might be for all? 
                // In registry '[]' means all sectors. In module-config it might be consistent.
                // If recommended list is empty, it usually means Core/General.
                if (recommended.length > 0) {
                    matchesIndustry = recommended.includes(industryFilter as IndustryType)
                }
            }

            return matchesSearch && matchesIndustry
        })
    }, [ORDERED_MODULES, searchQuery, industryFilter, t])

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

                        return (
                            <Card key={module.id} className={`flex flex-col border transition-all hover:shadow-md ${!isAccessGranted ? 'opacity-90 bg-gray-50/50 dark:bg-zinc-900/50' : ''}`}>
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
                                    ) : isAccessGranted ? (
                                        <Switch
                                            checked={isActive}
                                            onCheckedChange={(checked) => handleToggle(module.id, checked)}
                                            disabled={isLoading === module.id}
                                        />
                                    ) : (
                                        <Lock className="w-5 h-5 text-muted-foreground" />
                                    )}
                                </CardHeader>
                                <CardContent className="pt-0 flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <CardTitle className="text-lg font-semibold">{t(module.nameKey) || module.nameKey}</CardTitle>
                                        {isCoreModule ? null : isIncluded ? (
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
                                        {t(module.descriptionKey) || module.descriptionKey}
                                    </CardDescription>

                                    <div className="mt-4 flex items-center gap-2 text-sm font-medium">
                                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                                        <span className={isActive ? 'text-green-600' : 'text-gray-500'}>
                                            {isActive ? t('active') : t('inactive')}
                                        </span>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-0 mt-auto">
                                    {isAccessGranted ? (
                                        <Button
                                            onClick={() => handleManage(module.id)}
                                            className="flex-1 h-9 text-xs font-medium bg-black text-white hover:bg-zinc-800 rounded-full shadow-sm"
                                            disabled={!isActive}
                                        >
                                            {language === 'tr' ? 'Yönet' : 'Manage'}
                                            <ArrowRight className="w-3 h-3 ml-1.5" />
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

                        return (
                            <div key={module.id} className={`flex items-center p-4 border rounded-xl gap-4 bg-white dark:bg-zinc-950 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900 ${!isAccessGranted ? 'opacity-90' : ''}`}>
                                <div className={`p-3 rounded-lg flex-shrink-0 ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                                    <IconComponent className="w-6 h-6" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-semibold text-base">{t(module.nameKey) || module.nameKey}</h3>
                                        {isCoreModule ? (
                                            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                                                {t('coreModule') || 'Temel'}
                                            </Badge>
                                        ) : isIncluded ? (
                                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
                                                {t('included') || 'Dahil'}
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-violet-600 border-violet-200 bg-violet-50">
                                                Premium
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                        {t(module.descriptionKey) || module.descriptionKey}
                                    </p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-sm font-medium mr-4 hidden md:flex">
                                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                                        <span className={isActive ? 'text-green-600' : 'text-gray-500'}>
                                            {isActive ? t('active') : t('inactive')}
                                        </span>
                                    </div>

                                    {/* Switch or Lock */}
                                    <div className="flex items-center">
                                        {isCoreModule ? (
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
                                        {isAccessGranted ? (
                                            <Button
                                                onClick={() => handleManage(module.id)}
                                                size="sm"
                                                className="h-9 bg-black text-white hover:bg-zinc-800 rounded-full px-4"
                                                disabled={!isActive}
                                            >
                                                {language === 'tr' ? 'Yönet' : 'Manage'}
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
                onOpenChange={setIsDetailsOpen}
                selectedModuleId={selectedModuleId}
                moduleStates={moduleStates}
                onManage={handleManage}
                registryModules={getAllRegistryModules()}
                firestoreMap={MODULE_FIRESTORE_MAP}
                iconMap={ICON_MAP}
            />
        </div>
    )
}
