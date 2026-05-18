"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
    Settings2,
    UserPlus,
    Star,
    Award,
    Languages,
    Gamepad2,
    Scan,
    Utensils,
    MessageCircle,
    Route,
    PenTool, // Email Feature
    Send, // Email Feature Feature
    Inbox, // Review Feature
    QrCode, // Loyalty Feature
    Gift, // Loyalty/Game Feature
    MousePointerClick, // Campaign Feature
    Lightbulb, // Proactive Feature
    Camera // Visual Feature
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { useState, useEffect, useMemo, useCallback } from "react"
import { doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { MODULES_REGISTRY as MODULE_DEFINITIONS, ModuleId, ORDERED_MODULES, ModuleDefinition, SectorId } from "@/lib/modules-registry"
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
import { getModuleAccess, isModuleIncluded } from "@/lib/module-access"
import { PlanUpgradePrompt } from "@/components/plan-upgrade-prompt"
import { getModuleUpgradeTarget } from "@/lib/pricing-config"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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
    Mail,
    UserPlus,
    Star,
    Award,
    Languages,
    Gamepad2,
    Scan,
    Utensils,
    MessageCircle,
    Route,
    PenTool,
    Send,
    Inbox,
    QrCode,
    Gift,
    MousePointerClick,
    Lightbulb,
    Camera,
    Database: LayoutGrid // Fallback or imported icon for Database
}

// Map ModuleId to Firestore Field
const MODULE_FIRESTORE_MAP: Record<ModuleId, string> = {
    generalChatbot: 'enableChatbot',
    productCatalog: 'enablePersonalShopper',
    voiceAssistant: 'enableVoiceAssistant',
    appointments: 'enableAppointments',
    leadCollection: 'enableLeadCollection',
    knowledgeBase: 'enableKnowledgeBase',
    guided: 'enableGuided',


    salesOptimization: 'enableSalesOptimization',

    campaignManager: 'enableCampaignManager',

    gamification: 'enableGamification',
    smartShopper: 'enableSmartShopper',
    visualDiagnosis: 'enableVisualDiagnosis',
    digitalWaiter: 'enableDigitalWaiter',
    proactiveMessaging: 'enableProactiveMessaging',
    dynamicContext: 'enableDynamicContext',
    kvkkConsent: 'enableKvkkConsent',
    humanHandoff: 'enableHumanHandoff',
    surveyManager: 'enableSurveyManager'
}

const ALL_SECTORS_FILTER = "all"
const SECTOR_FILTER_OPTIONS: Array<{ id: SectorId; tr: string; en: string }> = [
    { id: "ecommerce", tr: "E-Ticaret", en: "E-Commerce" },
    { id: "booking", tr: "Seyahat ve Rezervasyon", en: "Travel & Booking" },
    { id: "real_estate", tr: "Emlak ve Gayrimenkul", en: "Real Estate" },
    { id: "saas", tr: "SaaS ve Yazılım", en: "SaaS / Software" },
    { id: "service", tr: "Hizmet ve Ajans", en: "Service & Agency" },
    { id: "healthcare", tr: "Sağlık", en: "Healthcare" },
    { id: "education", tr: "Eğitim", en: "Education" },
    { id: "academic", tr: "Akademik", en: "Academic" },
    { id: "finance", tr: "Finans", en: "Finance" },
    { id: "restaurant", tr: "Restoran", en: "Restaurant" },
    { id: "agriculture", tr: "Tarım", en: "Agriculture" },
    { id: "automotive", tr: "Otomotiv", en: "Automotive" },
    { id: "insurance", tr: "Sigorta", en: "Insurance" },
    { id: "logistics", tr: "Lojistik", en: "Logistics" },
    { id: "beauty", tr: "Güzellik", en: "Beauty" },
    { id: "legal", tr: "Hukuk", en: "Legal" },
    { id: "fitness", tr: "Fitness", en: "Fitness" },
    { id: "maritime", tr: "Denizcilik", en: "Maritime" },
    { id: "manufacturing", tr: "Üretim", en: "Manufacturing" },
    { id: "other", tr: "Diğer", en: "Other" },
]

function getSectorLabel(sectorId: SectorId, language: string) {
    const configured = INDUSTRY_CONFIG[sectorId as IndustryType]
    const localized = (configured as any)?.names?.[language]
    if (localized) return localized
    const fallback = SECTOR_FILTER_OPTIONS.find((option) => option.id === sectorId)
    return language === "tr" ? fallback?.tr || sectorId : fallback?.en || configured?.label || sectorId
}

const DEFAULT_MODULE_STATES: Record<string, boolean> = {
    generalChatbot: true,
    productCatalog: false,
    voiceAssistant: false,
    knowledgeBase: true,
    guided: false,
    leadCollection: false,
    appointments: false,
    salesOptimization: false,
    campaignManager: false,
    gamification: false,
    smartShopper: false,
    visualDiagnosis: false,
    digitalWaiter: false,
    proactiveMessaging: false,
    dynamicContext: false,
    kvkkConsent: false,
    humanHandoff: false,
    surveyManager: false,
}

function buildModuleStatesFromSettings(data: Record<string, any>): Record<string, boolean> {
    return {
        generalChatbot: data.enableChatbot ?? true,
        productCatalog: data.enablePersonalShopper ?? false,
        voiceAssistant: data.enableVoiceAssistant ?? false,
        knowledgeBase: data.enableKnowledgeBase ?? true,
        guided: data.enableGuided ?? false,
        leadCollection: data.enableLeadCollection ?? data.enableLeadFinder ?? false,
        appointments: data.enableAppointments ?? false,
        salesOptimization: data.enableSalesOptimization ?? false,
        campaignManager: data.enableCampaignManager ?? false,
        gamification: data.enableGamification ?? false,
        smartShopper: data.enableSmartShopper ?? false,
        visualDiagnosis: data.enableVisualDiagnosis ?? false,
        digitalWaiter: data.enableDigitalWaiter ?? false,
        proactiveMessaging: data.enableProactiveMessaging ?? false,
        dynamicContext: data.enableDynamicContext ?? false,
        kvkkConsent: data.enableKvkkConsent ?? false,
        humanHandoff: data.enableHumanHandoff ?? false,
        surveyManager: data.enableSurveyManager ?? false,
    }
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
    const [adminGrantedModules, setAdminGrantedModules] = useState<Record<string, boolean> | null>(null)
    const [settingsLoadError, setSettingsLoadError] = useState<string | null>(null)
    const [loadAttempt, setLoadAttempt] = useState(0)
    const [selectedModuleId, setSelectedModuleId] = useState<ModuleId | null>(null)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [isPricingModalOpen, setIsPricingModalOpen] = useState(false)
    const [upgradeTargetModuleId, setUpgradeTargetModuleId] = useState<ModuleId | null>(null)

    // Search state
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>("")

    // Use targetUserId if provided, otherwise use current user's uid
    const effectiveUserId = targetUserId || user?.uid
    const isSuperAdminViewingTenant = !!targetUserId

    // Determine User Industry - Default to ecommerce if not set
    const userIndustry: IndustryType = (user as any)?.industry || DEFAULT_INDUSTRY
    const industryConfig = INDUSTRY_CONFIG[userIndustry]
    const defaultSectorFilter = isSuperAdminViewingTenant ? ALL_SECTORS_FILTER : userIndustry

    useEffect(() => {
        setSelectedSectorFilter((current) => current || defaultSectorFilter)
    }, [defaultSectorFilter])
    
    // Get user plan ID - Default to starter if not set
    const userPlanId = (user as any)?.planId || (user as any)?.entitlements?.planId || 'starter'

    useEffect(() => {
        let isCancelled = false
        let controller: AbortController | null = null
        let timeoutId: number | null = null

        const clearLoadTimeout = () => {
            if (timeoutId) {
                window.clearTimeout(timeoutId)
                timeoutId = null
            }
        }

        const loadSettingsFromClientFirestore = async () => {
            if (!effectiveUserId) {
                throw new Error("Missing user id")
            }

            const [userSnap, chatbotSnap] = await Promise.all([
                getDoc(doc(db, "users", effectiveUserId)),
                getDoc(doc(db, "chatbots", effectiveUserId)),
            ])

            if (!userSnap.exists() && !chatbotSnap.exists()) {
                throw new Error("Settings not found")
            }

            return {
                ...(userSnap.exists() ? userSnap.data() : {}),
                ...(chatbotSnap.exists() ? chatbotSnap.data() : {}),
            }
        }

        const loadModuleStates = async () => {
            if (!effectiveUserId || !user) return
            setIsPageLoading(true)
            setSettingsLoadError(null)
            try {
                // Fetch from API to avoid client-side permission issues
                const token = await user.getIdToken()
                controller = new AbortController()
                timeoutId = window.setTimeout(() => controller?.abort(), 8000)
                const response = await fetch(`/api/console/settings?chatbotId=${effectiveUserId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    signal: controller.signal,
                    cache: "no-store",
                })

                if (!response.ok) {
                    throw new Error(`Settings request failed with ${response.status}`)
                }

                const data = await response.json()
                if (isCancelled) return
                setModuleStates(buildModuleStatesFromSettings(data))
                setAdminGrantedModules(
                    data.adminGrantedModules && typeof data.adminGrantedModules === "object"
                        ? data.adminGrantedModules
                        : null
                )
            } catch (error) {
                if (isCancelled) return
                clearLoadTimeout()

                try {
                    const fallbackData = await loadSettingsFromClientFirestore()
                    if (isCancelled) return
                    setModuleStates(buildModuleStatesFromSettings(fallbackData))
                    setAdminGrantedModules(
                        fallbackData.adminGrantedModules && typeof fallbackData.adminGrantedModules === "object"
                            ? fallbackData.adminGrantedModules
                            : null
                    )
                    setSettingsLoadError(null)
                } catch (fallbackError) {
                    if (isCancelled) return
                    console.error("Error loading module states:", error)
                    console.error("Client Firestore fallback also failed:", fallbackError)
                    setModuleStates(DEFAULT_MODULE_STATES)
                    setAdminGrantedModules(null)
                    setSettingsLoadError(
                        isSuperAdminViewingTenant
                            ? null
                            : error instanceof DOMException && error.name === "AbortError"
                                ? "settings-timeout"
                                : "settings-failed"
                    )
                }
            } finally {
                clearLoadTimeout()
                if (!isCancelled) {
                    setIsPageLoading(false)
                }
            }
        }
        loadModuleStates()

        return () => {
            isCancelled = true
            clearLoadTimeout()
            controller?.abort()
        }
    }, [effectiveUserId, user, loadAttempt, isSuperAdminViewingTenant])

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
                    title: t('moduleConflict') || "Module Conflict",
                    description: (t('moduleConflictDesc') || "This module conflicts with the currently active \"{moduleName}\" module. Please disable it first.").replace('{moduleName}', conflictName)
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

            const userSettingsUpdate: Record<string, any> = { [fieldName]: checked }
            if (isSuperAdminViewingTenant) {
                userSettingsUpdate.adminGrantedModules = {
                    ...(adminGrantedModules || {}),
                    [moduleId]: checked,
                }
            }

            const response = await fetch("/api/console/settings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    chatbotId: effectiveUserId,
                    userSettings: userSettingsUpdate,
                    chatbotSettings: { [fieldName]: checked }
                })
            })

            if (!response.ok) throw new Error("Failed to update module settings")

            setModuleStates(prev => ({ ...prev, [moduleId]: checked }))
            if (isSuperAdminViewingTenant) {
                setAdminGrantedModules(prev => ({
                    ...(prev || {}),
                    [moduleId]: checked,
                }))
            }

            // If skill was just ENABLED (off → on), auto-redirect to settings page
            if (checked && targetModule && !targetModule.isCore && targetModule.status !== 'coming_soon') {
                toast({
                    title: t('moduleEnabled') || "Module Enabled",
                    description: t('redirectingToConfigure')
                })
                // Small delay so user sees the toast before redirect
                setTimeout(() => handleManage(moduleId), 800)
                return
            }

            toast({
                title: checked ? (t('moduleEnabled') || "Module Enabled") : (t('moduleDisabled') || "Module Disabled"),
                description: t('settingsSavedDesc') || "Your settings have been successfully updated."
            })
        } catch (error) {
            console.error("Error updating module:", error)
            toast({
                title: t('error') || "Error",
                description: t('updateFailedDesc') || "Failed to update module status.",
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
            // All routes should stay within /admin/tenant/[userId]/ context
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
                case 'guided':
                    router.push(`${basePath}/modules/guided`)
                    break
                case 'surveyManager':
                    router.push(`${basePath}/modules/surveys`)
                    break
                case 'appointments':
                    router.push(`${basePath}/appointments?tab=settings`)
                    break
                case 'leadCollection':
                    router.push(`${basePath}/modules/lead-collection`)


                    break
                case 'digitalWaiter':
                    router.push(`${basePath}/modules/digital-waiter`)
                    break
                case 'visualDiagnosis':
                    router.push(`${basePath}/modules/visual`)
                    break
                case 'proactiveMessaging':
                    router.push(`${basePath}/modules/engagement`)
                    break
                case 'salesOptimization':
                    router.push(`${basePath}/modules/sales-optimization`)
                    break

                case 'dynamicContext':
                    router.push(`${basePath}/modules/dynamic-context`)
                    break
                case 'smartShopper':
                    router.push(`${basePath}/modules/smart-shopper`)
                    break
                case 'campaignManager':
                    router.push(`${basePath}/modules/campaigns`)
                    break
                case 'voiceAssistant':
                    router.push(`${basePath}/modules/voice`)
                    break
                case 'kvkkConsent':
                    router.push(`${basePath}/modules/kvkk`)
                    break
                case 'humanHandoff':
                    router.push(`${basePath}/modules/human-handoff`)
                    break
                case 'gamification':
                    router.push(`${basePath}/modules/gamification`)
                    break
                default:
                    // For all other modules which don't have a dedicated Admin page yet
                    toast({
                        title: t('comingSoon'),
                        description: t('moduleUnderDevelopment') || "This module's settings page is currently under development."
                    })
            }
            return
        }


        // REGULAR USER / CONSOLE VIEW (In /console/...)
        const queryParams = effectiveUserId && effectiveUserId !== user?.uid ? `?userId=${effectiveUserId}` : ''

        switch (moduleId) {
            case 'generalChatbot':
                router.push(`${basePath}/chatbot`) // This uses basePath which handles /admin/tenant logic correctly for chatbots
                break
            case 'productCatalog':
                router.push(`${basePath}/chatbot/shopper`)
                break
            case 'voiceAssistant':
                router.push(`/console/modules/voice/settings${queryParams}`)
                break
            case 'knowledgeBase':
                router.push(`${basePath}/knowledge`)
                break
            case 'guided':
                router.push(`/console/modules/guided${queryParams}`)
                break
            case 'surveyManager':
                router.push(`/console/modules/surveys${queryParams}`)
                break
            case 'leadCollection':
                router.push(`/console/modules/leads/settings${queryParams}`)
                break
            case 'salesOptimization':
                router.push(`/console/modules/sales-optimization${queryParams}`)
                break
            case 'smartShopper':
                router.push(`/console/modules/smart-shopper${queryParams}`)
                break
            case 'appointments':
                router.push(`${basePath}/appointments?tab=settings`)
                break
            case 'campaignManager':
                router.push(`/console/modules/campaigns${queryParams}`)
                break
            case 'gamification':
                router.push(`/console/modules/gamification${queryParams}`)
                break
            case 'visualDiagnosis':
                router.push(`/console/modules/visual${queryParams}`)
                break
            case 'digitalWaiter':
                router.push(`/console/modules/digital-waiter${queryParams}`)
                break
            case 'proactiveMessaging':
                router.push(`/console/modules/engagement${queryParams}`)
                break
            case 'dynamicContext':
                router.push(`/console/modules/dynamic-context${queryParams}`)
                break
            case 'kvkkConsent':
                router.push(`/console/modules/kvkk${queryParams}`)
                break
            case 'humanHandoff':
                router.push(`/console/modules/human-handoff${queryParams}`)
                break
            default:
                toast({
                    title: t('comingSoon'),
                    description: t('moduleUnderDevelopment')
                })
        }
    }

    const handleUpgrade = (moduleId: ModuleId) => {
        setUpgradeTargetModuleId(moduleId)
        setIsPricingModalOpen(true)
    }

    // Check if module is included in the plan (package-based check)
    const checkModuleIncluded = useCallback((moduleId: string) => {
        // Check if module is included in user's plan
        return isModuleIncluded(userPlanId, moduleId as any)
    }, [userPlanId])

    const isPremiumModule = (moduleId: ModuleId) => {
        if (moduleId === 'generalChatbot') return false // Core, not premium
        return !checkModuleIncluded(moduleId)
    }

    // Admin view: ONLY true when super admin is viewing a tenant's modules via the Admin Panel
    const isAdminView = isSuperAdminViewingTenant
    const activeSectorFilter = selectedSectorFilter || defaultSectorFilter

    // Filter Logic
    const filteredModules = useMemo(() => {
        const lang = language as 'en' | 'tr'
        return ORDERED_MODULES.filter(module => {
            // Exclude core modules
            if (module.isCore) return false

            // Super Admin bypass for visibility
            if (role === 'SUPER_ADMIN') return true

            // Tenant view: only show ready modules
            if (!isAdminView && module.status !== 'ready') return false

            // Visibility rules
            if (!isAdminView) {
                const adminDecision = adminGrantedModules ? adminGrantedModules[module.id] : undefined
                if (adminDecision === false) return false
                
                if (moduleStates[module.id] !== true) {
                    const isIncluded = checkModuleIncluded(module.id)
                    if (!isIncluded && adminDecision !== true) return false
                }
            }

            if (activeSectorFilter !== ALL_SECTORS_FILTER) {
                const sector = activeSectorFilter as SectorId
                const supportsSector = module.supportedSectors.length === 0 || module.supportedSectors.includes(sector)
                if (!supportsSector) {
                    return false
                }
            }

            const name = module.name[lang] || module.name.en
            const description = module.description[lang] || module.description.en
            const query = searchQuery.toLowerCase()

            // Search Match
            const matchesSearch = name.toLowerCase().includes(query) || description.toLowerCase().includes(query)

            return matchesSearch
        }).sort((a, b) => {
            const getSortGroup = (module: ModuleDefinition) => {
                if (module.status === 'coming_soon') return 2
                return moduleStates[module.id] === true ? 0 : 1
            }

            // 1. Active modules first, inactive modules second, in-development modules last
            const aGroup = getSortGroup(a)
            const bGroup = getSortGroup(b)
            if (aGroup !== bGroup) return aGroup - bGroup

            // 2. Included modules come first (before premium modules)
            const aIncluded = checkModuleIncluded(a.id)
            const bIncluded = checkModuleIncluded(b.id)
            if (aIncluded && !bIncluded) return -1
            if (!aIncluded && bIncluded) return 1

            // 3. Within same group (included/premium), sort alphabetically by name
            const nameA = (a.name[lang] || a.name.en).toLowerCase()
            const nameB = (b.name[lang] || b.name.en).toLowerCase()
            return nameA.localeCompare(nameB, language === 'tr' ? 'tr' : 'en')
        })
    }, [searchQuery, language, checkModuleIncluded, isAdminView, moduleStates, activeSectorFilter])

    // Show loading skeleton while fetching data
    if (isPageLoading) {
        return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
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
        <div className="flex-1 space-y-6 p-4 md:p-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t('skills') || "Skills"}</h2>
                    <p className="text-muted-foreground mt-1">
                        {t('modulesDescription') || "Manage your active AI agents and tools."}
                    </p>
                </div>
                {!isSuperAdminViewingTenant && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground font-medium">{t('activeSector') || 'Active Sector'}:</span>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-100 dark:border-indigo-500/20 font-semibold shadow-sm">
                            <Zap className="w-3.5 h-3.5 fill-indigo-700/20" />
                            {(industryConfig as any).names?.[language] || industryConfig.label}
                        </div>
                    </div>
                )}
            </div>

            {/* Toolbar: Search, Sector Filter, View Toggle */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-zinc-950 p-1 rounded-xl">
                <div className="flex flex-1 w-full md:w-auto flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1 sm:max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('searchModules') || "Search modules..."}
                            className="pl-9 h-10 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="w-full sm:w-64">
                        <Select
                            value={activeSectorFilter}
                            onValueChange={setSelectedSectorFilter}
                        >
                            <SelectTrigger className="h-10 w-full">
                                <SelectValue placeholder={language === "tr" ? "Sektör seç" : "Select sector"} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_SECTORS_FILTER}>
                                    {language === "tr" ? "Tüm sektörler" : "All sectors"}
                                </SelectItem>
                                {SECTOR_FILTER_OPTIONS.map((option) => (
                                    <SelectItem key={option.id} value={option.id}>
                                        {getSectorLabel(option.id, language)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center space-x-1 bg-secondary/30 p-1 rounded-lg border">
                    <Button
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-8 px-2 lg:px-3"
                        onClick={() => setViewMode('grid')}
                    >
                        <LayoutGrid className="h-4 w-4 lg:mr-2" />
                        <span className="hidden lg:inline">{t('gridView') || "Grid View"}</span>
                    </Button>
                    <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-8 px-2 lg:px-3"
                        onClick={() => setViewMode('list')}
                    >
                        <List className="h-4 w-4 lg:mr-2" />
                        <span className="hidden lg:inline">{t('listView') || "List View"}</span>
                    </Button>
                </div>
            </div>

            {settingsLoadError && (
                <Alert variant="destructive" className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                    <Info className="h-4 w-4" />
                    <AlertTitle>
                        {language === "tr" ? "Skill ayarları yüklenemedi" : "Skill settings could not be loaded"}
                    </AlertTitle>
                    <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <span>
                            {settingsLoadError === "settings-timeout"
                                ? (language === "tr"
                                    ? "Ayar servisi zamanında yanıt vermedi. Liste varsayılan durumlarla açıldı."
                                    : "The settings service did not respond in time. The list opened with default states.")
                                : (language === "tr"
                                    ? "Ayar servisi şu anda yanıt vermiyor. Liste varsayılan durumlarla açıldı."
                                    : "The settings service is not responding right now. The list opened with default states.")}
                        </span>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 shrink-0 border-amber-300 bg-white text-amber-950 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100 dark:hover:bg-amber-900"
                            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
                        >
                            {language === "tr" ? "Tekrar dene" : "Retry"}
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Modules Render */}
            {filteredModules.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <div className="flex justify-center mb-4">
                        <Search className="w-12 h-12 opacity-20" />
                    </div>
                    <p>{t('noModulesFound') || "No modules found"}</p>
                    <Button variant="link" onClick={() => setSearchQuery("")}>
                        {t('clearSearch') || "Clear Search"}
                    </Button>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="space-y-8 pt-2">
                    {(() => {
                        const ecommerceIds = ['productCatalog', 'smartShopper', 'salesOptimization', 'campaignManager', 'gamification'];
                        const ecommerceModules = filteredModules.filter(m => ecommerceIds.includes(m.id));
                        const otherModules = filteredModules.filter(m => !ecommerceIds.includes(m.id));
                        const groups = [];
                        if (ecommerceModules.length > 0) groups.push({ title: language === 'tr' ? 'E-Ticaret Modülleri' : 'E-Commerce Modules', modules: ecommerceModules });
                        if (otherModules.length > 0) groups.push({ title: language === 'tr' ? 'Genel Modüller' : 'General Modules', modules: otherModules });

                        return groups.map((group, idx) => (
                            <div key={idx} className="space-y-4">
                                <div className="flex items-center gap-3 pb-2 border-b border-zinc-100 dark:border-zinc-800/50">
                                    <div className="p-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-md">
                                        {group.title.includes('E-') ? <ShoppingBag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> : <LayoutGrid className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                                    </div>
                                    <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{group.title}</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {group.modules.map((module) => {
                        // Get module access info - single source of truth
                        const baseAccess = getModuleAccess(
                            userPlanId,
                            module.id,
                            userIndustry,
                            moduleStates[module.id] || false,
                            language as 'en' | 'tr'
                        )
                        const isAdminGranted = adminGrantedModules?.[module.id] === true
                        const access = isAdminGranted
                            ? { ...baseAccess, badge: 'included' as const, canToggle: true, upgradeMessage: null }
                            : baseAccess
                        const isActive = module.isCore ? true : (moduleStates[module.id] || false)
                        const isSuperAdmin = role === 'SUPER_ADMIN'
                        const isAccessGranted = isSuperAdmin || isAdminGranted || access.status === 'included' || access.status === 'core' || isActive
                        const IconComponent = ICON_MAP[module.icon as keyof typeof ICON_MAP] || MessageSquare

                        return (
                            <Card
                                key={module.id}
                                className={`relative overflow-hidden transition-all duration-200 ${module.status === 'coming_soon'
                                    ? 'opacity-70 bg-muted/30 border-dashed'
                                    : 'hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800'
                                    }`}
                            >
                                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-0">
                                    <div className="p-2 rounded-lg bg-gray-100 text-gray-900">
                                        <IconComponent className="w-6 h-6" />
                                    </div>
                                    {access.isCore ? (
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
                                    ) : access.isComingSoon ? (
                                        <Badge variant="secondary" className="bg-zinc-100 text-zinc-700 hover:bg-zinc-100 border-none">
                                            {t('comingSoon') || 'Yakında'}
                                        </Badge>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            {module.status === 'beta' && (
                                                <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">
                                                    Beta
                                                </Badge>
                                            )}
                                            {access.badge === 'included' && !isSuperAdminViewingTenant && (
                                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-2 py-0.5 text-xs font-medium">
                                                    {t('included') || 'Dahil'}
                                                </Badge>
                                            )}

                                            {isSuperAdminViewingTenant && (
                                                <Badge variant="secondary" className={`border-none px-2 py-0.5 text-xs font-medium ${
                                                    adminGrantedModules?.[module.id] === false 
                                                        ? 'bg-red-100 text-red-700 hover:bg-red-100' 
                                                        : adminGrantedModules?.[module.id] === true
                                                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-100'
                                                }`}>
                                                    {adminGrantedModules?.[module.id] === false 
                                                        ? (language === 'tr' ? 'Yetki: Kapalı' : 'Access: Denied')
                                                        : adminGrantedModules?.[module.id] === true
                                                            ? (language === 'tr' ? 'Yetki: Açık' : 'Access: Granted')
                                                            : (language === 'tr' ? 'Yetki: Standart' : 'Access: Default')}
                                                </Badge>
                                            )}

                                            {isAccessGranted ? (
                                                <Switch
                                                    checked={isActive}
                                                    onCheckedChange={(checked) => handleToggle(module.id, checked)}
                                                    disabled={isLoading === module.id || access.isCore || (!isSuperAdmin && !access.canToggle && !isAdminGranted)}
                                                    className={isLoading === module.id ? 'opacity-50' : ''}
                                                />
                                            ) : (
                                                <Lock className="w-5 h-5 text-muted-foreground ml-1" />
                                            )}
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent className="pt-0 flex-1">
                                    <div className="mb-2">
                                        <CardTitle className="text-lg font-semibold">{module.name[language as 'en' | 'tr'] || module.name.en}</CardTitle>
                                    </div>
                                    <CardDescription className="line-clamp-2">
                                        {module.description[language as 'en' | 'tr'] || module.description.en}
                                    </CardDescription>

                                    {/* Upgrade Message */}
                                    {access.upgradeMessage && (
                                        <div className="mt-2">
                                            <div className="text-xs text-muted-foreground bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700">
                                                {access.upgradeMessage}
                                            </div>
                                        </div>
                                    )}

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
                                            {t('manage') || 'Manage'}
                                            <ArrowRight className="w-3 h-3 ml-1.5" />
                                        </Button>
                                    ) : module.status === 'coming_soon' ? (
                                        <Button
                                            className="w-full gap-2"
                                            variant="secondary"
                                            disabled
                                        >
                                            {t('comingSoon') || "Coming Soon"}
                                        </Button>
                                    ) : (
                                        <Button
                                            className="w-full gap-2"
                                            variant="default"
                                            onClick={() => handleUpgrade(module.id)}
                                        >
                                            {language === 'tr' ? 'Planı Yükselt' : 'Upgrade Plan'}
                                            <ArrowRight className="w-3 h-3 ml-1" />
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
                                        {t('details') || 'Details'}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )
                    })}
                                </div>
                            </div>
                        ))
                    })()}
                </div>
            ) : (
                <div className="space-y-8 pt-2">
                    {(() => {
                        const ecommerceIds = ['productCatalog', 'smartShopper', 'salesOptimization', 'campaignManager', 'gamification'];
                        const ecommerceModules = filteredModules.filter(m => ecommerceIds.includes(m.id));
                        const otherModules = filteredModules.filter(m => !ecommerceIds.includes(m.id));
                        const groups = [];
                        if (ecommerceModules.length > 0) groups.push({ title: language === 'tr' ? 'E-Ticaret Modülleri' : 'E-Commerce Modules', modules: ecommerceModules });
                        if (otherModules.length > 0) groups.push({ title: language === 'tr' ? 'Genel Modüller' : 'General Modules', modules: otherModules });

                        return groups.map((group, idx) => (
                            <div key={idx} className="space-y-4">
                                <div className="flex items-center gap-3 pb-2 border-b border-zinc-100 dark:border-zinc-800/50">
                                    <div className="p-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-md">
                                        {group.title.includes('E-') ? <ShoppingBag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> : <LayoutGrid className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                                    </div>
                                    <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{group.title}</h3>
                                </div>
                                <div className="flex flex-col gap-4">
                                    {group.modules.map((module) => {
                        // Get module access info - single source of truth
                        const baseAccess = getModuleAccess(
                            userPlanId,
                            module.id,
                            userIndustry,
                            moduleStates[module.id] || false,
                            language as 'en' | 'tr'
                        )
                        const isAdminGranted = adminGrantedModules?.[module.id] === true
                        const access = isAdminGranted
                            ? { ...baseAccess, badge: 'included' as const, canToggle: true, upgradeMessage: null }
                            : baseAccess
                        const isActive = module.isCore ? true : (moduleStates[module.id] || false)
                        const isSuperAdmin = role === 'SUPER_ADMIN'
                        const isAccessGranted = isSuperAdmin || isAdminGranted || access.status === 'included' || access.status === 'core' || isActive
                        const IconComponent = ICON_MAP[module.icon as keyof typeof ICON_MAP] || MessageSquare

                        return (
                            <div key={module.id} className={`flex items-center p-4 border rounded-xl gap-4 bg-white dark:bg-zinc-950 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900 ${!isAccessGranted ? 'opacity-90' : ''}`}>
                                <div className="p-3 rounded-lg flex-shrink-0 bg-gray-100 text-gray-900">
                                    <IconComponent className="w-6 h-6" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-semibold text-base">{module.name[language as 'en' | 'tr'] || module.name.en}</h3>
                                        {access.isCore ? (
                                            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                                                {t('coreModule') || 'Temel'}
                                            </Badge>
                                        ) : module.status === 'beta' ? (
                                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">
                                                Beta
                                            </Badge>
                                        ) : access.isComingSoon ? (
                                            <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-none">
                                                {t('comingSoon') || 'Yakında'}
                                            </Badge>
                                        ) : null}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        {access.badge === 'included' && (
                                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-2 py-0.5 text-xs font-medium">
                                                {t('included') || 'Dahil'}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                        {module.description[language as 'en' | 'tr'] || module.description.en}
                                    </p>
                                    {access.upgradeMessage && (
                                        <div className="mt-2 text-xs text-muted-foreground bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700">
                                            {access.upgradeMessage}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-sm font-medium mr-4 hidden md:flex">
                                        {access.isComingSoon ? (
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
                                        {access.isCore ? (
                                            <div className="w-10 h-6 flex items-center justify-center">
                                                <Lock className="w-4 h-4 text-gray-400 opacity-50" />
                                            </div>
                                        ) : access.isComingSoon ? (
                                            <div className="w-10 h-6 flex items-center justify-center">
                                                <Lock className="w-4 h-4 text-gray-400 opacity-50" />
                                            </div>
                                        ) : isAccessGranted ? (
                                            <Switch
                                                checked={isActive}
                                                onCheckedChange={(checked) => handleToggle(module.id, checked)}
                                                disabled={isLoading === module.id || (!access.canToggle && !isAdminGranted)}
                                            />
                                        ) : (
                                            <Lock className="w-5 h-5 text-muted-foreground" />
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 pl-4 border-l">
                                        {isAccessGranted && !access.isComingSoon ? (
                                            <Button
                                                onClick={() => handleManage(module.id)}
                                                size="sm"
                                                className="h-9 bg-black text-white hover:bg-zinc-800 rounded-full px-4"
                                                disabled={!isActive}
                                            >
                                                {t('manage') || 'Manage'}
                                            </Button>
                                        ) : access.isComingSoon ? (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                disabled
                                            >
                                                {t('comingSoon') || "Coming Soon"}
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="default"
                                                onClick={() => handleUpgrade(module.id)}
                                            >
                                                {language === 'tr' ? 'Planı Yükselt' : 'Upgrade Plan'}
                                                <ArrowRight className="w-3 h-3 ml-1" />
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
                            </div>
                        ))
                    })()}
                </div>
            )}

            <ModuleDetailsDialog
                isOpen={isDetailsOpen}
                onOpenChange={(open) => {
                    setIsDetailsOpen(open)
                }}
                selectedModuleId={selectedModuleId}
                moduleStates={moduleStates}
                onManage={(moduleId) => {
                    if (!selectedModuleId) return
                    
                    const selectedAccess = getModuleAccess(
                        userPlanId,
                        selectedModuleId,
                        userIndustry,
                        moduleStates[selectedModuleId] || false,
                        language as 'en' | 'tr'
                    )
                    const canAccessSelected = role === 'SUPER_ADMIN' || 
                        selectedAccess.status === 'included' || 
                        selectedAccess.status === 'core' || 
                        moduleStates[selectedModuleId] || false

                    setIsDetailsOpen(false)
                    if (canAccessSelected) {
                        handleManage(selectedModuleId)
                    } else {
                        handleUpgrade(selectedModuleId)
                    }
                }}
                registryModules={getAllRegistryModules()}
                firestoreMap={MODULE_FIRESTORE_MAP}
                iconMap={ICON_MAP}
                canAccess={selectedModuleId ? (() => {
                    const selectedAccess = getModuleAccess(
                        userPlanId,
                        selectedModuleId,
                        userIndustry,
                        moduleStates[selectedModuleId] || false,
                        language as 'en' | 'tr'
                    )
                    return role === 'SUPER_ADMIN' || 
                        selectedAccess.status === 'included' || 
                        selectedAccess.status === 'core' || 
                        moduleStates[selectedModuleId] || false
                })() : false}
                onRequest={handleUpgrade}
            />
            
            {/* Plan Upgrade Prompt */}
            <PlanUpgradePrompt
                isOpen={isPricingModalOpen}
                onOpenChange={(open) => {
                    setIsPricingModalOpen(open)
                    if (!open) setUpgradeTargetModuleId(null)
                }}
                currentPlanId={userPlanId}
                requiredPlanId={upgradeTargetModuleId ? getModuleUpgradeTarget(userPlanId, upgradeTargetModuleId) : null}
                featureName={upgradeTargetModuleId ? (getAllRegistryModules().find(m => m.id === upgradeTargetModuleId)?.name[language as 'en' | 'tr'] || upgradeTargetModuleId) : ''}
            />
        </div>
    )
}
