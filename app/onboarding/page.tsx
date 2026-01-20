"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { VionLogo } from "@/components/vion-logo"
import {
    Check, ChevronRight, ArrowLeft, Loader2,
    Building2, Palette, Rocket, Copy, CheckCircle2,
    ShoppingBag, Calendar, Home, Briefcase, Heart,
    GraduationCap, BookOpen, Landmark, HelpCircle, Wrench,
    MessageSquare, UserPlus, Mic, PenTool, Lock,
    ExternalLink, TrendingUp, Share2, Mail, Info, Send, Bot,
    ChefHat, Sprout, Car, Shield, Truck, Sparkles, Scale, Dumbbell, Anchor
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import {
    ONBOARDING_STEPS,
    OnboardingStep,
    STEP_CONFIG,
    STEP_INDEX,
    OnboardingData,
    canAccessStep,
    getCompletionPercentage
} from "@/lib/onboarding-config"
import { INDUSTRY_CONFIG, IndustryType } from "@/lib/industry-config"
import {
    getAllModules,
    getModule
} from "@/lib/modules-registry"
import { getModuleAccess } from "@/lib/module-access"
import { PricingModal } from "@/components/pricing-modal"

// Industry icons
const INDUSTRY_ICONS: Record<string, any> = {
    ecommerce: ShoppingBag,
    booking: Calendar,
    real_estate: Home,
    saas: Briefcase,
    service: Wrench,
    healthcare: Heart,
    education: GraduationCap,
    academic: BookOpen,
    finance: Landmark,
    restaurant: ChefHat,
    agriculture: Sprout,
    automotive: Car,
    insurance: Shield,
    logistics: Truck,
    beauty: Sparkles,
    legal: Scale,
    fitness: Dumbbell,
    maritime: Anchor,
    other: HelpCircle
}

// Module icons mapping
const MODULE_ICON_MAP: Record<string, any> = {
    MessageSquare,
    BookOpen,
    ShoppingBag,
    UserPlus,
    Mic,
    PenTool,
    TrendingUp,
    Share2,
    Mail
}

export default function OnboardingPage() {
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()
    const { t, language } = useLanguage()
    const { toast } = useToast()

    // State
    const [currentStep, setCurrentStep] = useState<OnboardingStep>('sector')
    const [completedSteps, setCompletedSteps] = useState<OnboardingStep[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [pageLoading, setPageLoading] = useState(true)

    // Form state
    const [selectedSector, setSelectedSector] = useState<IndustryType | null>(null)
    const [modules, setModules] = useState<Record<string, any>>({})
    const [userPlanId, setUserPlanId] = useState<string>('starter') // Default to starter
    const [knowledgeUrl, setKnowledgeUrl] = useState("")
    const [fullCrawl, setFullCrawl] = useState(false)
    const [isScanning, setIsScanning] = useState(false)
    const [discoveredUrls, setDiscoveredUrls] = useState<string[]>([])
    const [selectedUrls, setSelectedUrls] = useState<string[]>([])
    const [scanProgress, setScanProgress] = useState(0)
    const [widget, setWidget] = useState({
        brandName: "",
        welcomeMessage: language === 'tr'
            ? "Merhaba! Size nasıl yardımcı olabilirim?"
            : "Hi! How can I help you?",
        brandColor: "#6366f1",
        position: "bottom-right" as "bottom-right" | "bottom-left"
    })
    const [copied, setCopied] = useState(false)
    const [verifying, setVerifying] = useState(false)
    const [verifyUrl, setVerifyUrl] = useState("")
    const [verifyResult, setVerifyResult] = useState<{ installed: boolean; message: string } | null>(null)
    const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([])

    // Pricing Modal State
    const [isPricingModalOpen, setIsPricingModalOpen] = useState(false)
    const [upgradeTargetModuleId, setUpgradeTargetModuleId] = useState<string | null>(null)

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring" as const,
                stiffness: 100
            }
        }
    }

    // Load existing onboarding state
    useEffect(() => {
        if (authLoading) return
        if (!user) {
            router.replace("/login")
            return
        }

        const loadOnboardingState = async () => {
            try {
                const token = await user.getIdToken()
                const response = await fetch("/api/onboarding", {
                    headers: { Authorization: `Bearer ${token}` }
                })

                if (response.ok) {
                    const data = await response.json()

                    // If already completed, redirect to console
                    if (data.onboarding?.status === 'completed' || data.onboarding?.status === 'skipped') {
                        router.replace("/console/chatbot")
                        return
                    }

                    // If completed_soft, also allow panel access
                    if (data.onboarding?.status === 'completed_soft') {
                        router.replace("/console/chatbot")
                        return
                    }

                    // Restore state
                    if (data.sector) setSelectedSector(data.sector)
                    if (data.entitlements?.planId) setUserPlanId(data.entitlements.planId)
                    if (data.planId) setUserPlanId(data.planId) // Fallback
                    if (data.modules) {
                        setModules(data.modules)
                        if (data.modules.enabled) setSelectedModuleIds(data.modules.enabled)
                    }
                    if (data.widget) {
                        setWidget(prev => ({ ...prev, ...data.widget }))
                    }
                    if (data.knowledgeUrl) setKnowledgeUrl(data.knowledgeUrl)
                    if (data.onboarding?.completedSteps) {
                        setCompletedSteps(data.onboarding.completedSteps)

                        // Go to next incomplete step
                        const nextIncomplete = ONBOARDING_STEPS.find(
                            s => !data.onboarding.completedSteps.includes(s)
                        )
                        if (nextIncomplete) {
                            setCurrentStep(nextIncomplete)
                        }
                    }
                }
            } catch (error) {
                console.error("Error loading onboarding state:", error)
            } finally {
                setPageLoading(false)
            }
        }

        loadOnboardingState()
    }, [user, authLoading, router])

    // Helpers
    const getToken = async () => {
        if (!user) throw new Error("Not authenticated")
        return user.getIdToken()
    }

    const goToStep = (step: OnboardingStep) => {
        if (canAccessStep(step, completedSteps) || completedSteps.includes(step)) {
            setCurrentStep(step)
        }
    }

    // === STEP 1: SECTOR ===
    const handleSectorSubmit = async () => {
        if (!selectedSector) return
        setIsLoading(true)

        try {
            console.log("Submitting sector:", selectedSector)
            const token = await getToken()
            const response = await fetch("/api/onboarding/sector", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ sector: selectedSector })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to save sector")
            }

            const data = await response.json()
            setModules(data.modules)
            if (data.modules?.enabled) setSelectedModuleIds(data.modules.enabled)
            setCompletedSteps(prev => [...prev, 'sector'])
            setCurrentStep('modules')
        } catch (error: any) {
            console.error("Sector error:", error)
            toast({
                title: language === 'tr' ? 'Hata' : 'Error',
                description: error.message || (language === 'tr' ? 'Sektör kaydedilemedi.' : 'Failed to save sector.'),
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    // === STEP 2: MODULES (Just Continue) ===
    const handleModulesContinue = async () => {
        setIsLoading(true)

        try {
            const token = await getToken()
            await fetch("/api/onboarding", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ 
                    step: 'modules',
                    modules: selectedModuleIds
                })
            })

            setCompletedSteps(prev => [...prev, 'modules'])
            setCurrentStep('knowledge')
        } catch (error) {
            console.error("Modules error:", error)
        } finally {
            setIsLoading(false)
        }
    }

    // === STEP 3: KNOWLEDGE BASE ===
    const handleKnowledgeSubmit = async () => {
        if (!knowledgeUrl) return

        // If "Full Site Scan" is enabled and we haven't discovered URLs yet, trigger Sitemap Scan
        if (fullCrawl && discoveredUrls.length === 0) {
            setIsScanning(true)
            try {
                const response = await fetch("/api/admin/sitemap", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: knowledgeUrl })
                })
                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.error || "Failed to fetch sitemap")
                }
                const data = await response.json()
                if (!data.urls || data.urls.length === 0) {
                    toast({
                        title: language === 'tr' ? 'Sonuç Bulunamadı' : 'No Results Found',
                        description: language === 'tr'
                            ? 'Web sitenizde taranabilir sayfa bulunamadı.'
                            : 'No crawlable pages found on your website.',
                        variant: "destructive"
                    })
                } else {
                    setDiscoveredUrls(data.urls)
                    setSelectedUrls(data.urls)
                    toast({
                        title: language === 'tr' ? 'Tarama Tamamlandı' : 'Scan Complete',
                        description: `${data.urls.length} ${language === 'tr' ? 'sayfa bulundu.' : 'pages found.'}`
                    })
                }
            } catch (error: any) {
                console.error("Sitemap error:", error)
                toast({
                    title: language === 'tr' ? 'Tarama Hatası' : 'Scan Error',
                    description: error.message || (language === 'tr' ? 'Web sitesi taranırken bir hata oluştu.' : 'An error occurred while scanning the website.'),
                    variant: "destructive"
                })
            } finally {
                setIsScanning(false)
            }
            return
        }

        setIsLoading(true)

        try {
            const token = await getToken()

            // 1. Bulk Ingest logic with batching
            if (selectedUrls.length > 0) {
                setScanProgress(0)
                let completedCount = 0
                const BATCH_SIZE = 5

                // Helper for processing a single URL with timeout
                const processUrl = async (urlToImport: string) => {
                    const controller = new AbortController()
                    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout

                    try {
                        const docId = crypto.randomUUID()
                        const response = await fetch("/api/knowledge", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                chatbotId: user?.uid,
                                docId,
                                type: "url",
                                url: urlToImport
                            }),
                            signal: controller.signal
                        })
                        if (!response.ok) throw new Error(`Status ${response.status}`)
                    } catch (e: any) {
                        console.error(`Failed to ingest ${urlToImport}:`, e.name === 'AbortError' ? 'Timeout' : e.message)
                    } finally {
                        clearTimeout(timeoutId)
                        completedCount++
                        setScanProgress(Math.round((completedCount / selectedUrls.length) * 100))
                    }
                }

                // Process in batches
                for (let i = 0; i < selectedUrls.length; i += BATCH_SIZE) {
                    const batch = selectedUrls.slice(i, i + BATCH_SIZE)
                    // Wait for the entire batch to finish (parallel within batch)
                    await Promise.all(batch.map(url => processUrl(url)))
                }
            } else {
                // Single URL Ingestion with timeout
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 15000)

                try {
                    const docId = crypto.randomUUID()
                    await fetch("/api/knowledge", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            chatbotId: user?.uid,
                            docId,
                            type: "url",
                            url: knowledgeUrl
                        }),
                        signal: controller.signal
                    })
                } catch (e: any) {
                     console.error("Single URL ingest failed:", e)
                } finally {
                    clearTimeout(timeoutId)
                }
            }

            // 2. Mark onboarding step as done
            const response = await fetch("/api/onboarding/knowledge", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    url: knowledgeUrl,
                    fullCrawl: fullCrawl
                })
            })

            if (!response.ok) throw new Error("Failed to save knowledge base preference")

            setCompletedSteps(prev => [...prev, 'knowledge'])
            setCurrentStep('widget')
        } catch (error) {
            console.error("Knowledge error:", error)
        } finally {
            setIsLoading(false)
            setScanProgress(0)
        }
    }

    // === STEP 3: WIDGET ===
    const handleWidgetSubmit = async () => {
        if (!widget.brandName) return
        setIsLoading(true)

        try {
            const token = await getToken()
            const response = await fetch("/api/onboarding/widget", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(widget)
            })

            if (!response.ok) throw new Error("Failed to save widget")

            setCompletedSteps(prev => [...prev, 'widget'])
            setCurrentStep('launch')
        } catch (error) {
            console.error("Widget error:", error)
        } finally {
            setIsLoading(false)
        }
    }

    // === STEP 4: LAUNCH ===
    const handleComplete = async (type: 'full' | 'soft') => {
        setIsLoading(true)

        try {
            const token = await getToken()
            await fetch("/api/onboarding/complete", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ completionType: type })
            })

            router.replace("/console/chatbot")
        } catch (error) {
            console.error("Complete error:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleVerifyInstall = async () => {
        if (!verifyUrl) return
        setVerifying(true)
        setVerifyResult(null)

        try {
            const token = await getToken()
            const response = await fetch("/api/onboarding/verify-install", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ websiteUrl: verifyUrl })
            })

            const data = await response.json()
            setVerifyResult({ installed: data.installed, message: data.message })
        } catch (error) {
            setVerifyResult({ installed: false, message: "Verification failed" })
        } finally {
            setVerifying(false)
        }
    }

    const copyEmbedCode = () => {
        const code = `<script src="${window.location.origin}/widget.js" data-chatbot-id="${user?.uid}"></script>`
        navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // Loading state
    if (pageLoading || authLoading) {
        return (
            <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    const stepConfig = STEP_CONFIG[currentStep]

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950">
            {/* Header */}
            <header className="border-b bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <VionLogo variant="black" className="text-xl dark:hidden" />
                    <VionLogo variant="white" className="text-xl hidden dark:block" />

                    {/* Step Indicator with Progress */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            {ONBOARDING_STEPS.map((step, i) => {
                                const isCompleted = completedSteps.includes(step)
                                const isCurrent = step === currentStep

                                return (
                                    <div key={step} className="flex items-center">
                                        <button
                                            onClick={() => goToStep(step)}
                                            disabled={!canAccessStep(step, completedSteps) && !isCompleted}
                                            className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                                                isCompleted && "bg-green-500 text-white",
                                                isCurrent && !isCompleted && "bg-primary text-white ring-4 ring-primary/20",
                                                !isCurrent && !isCompleted && "bg-gray-200 text-gray-500 dark:bg-zinc-700"
                                            )}
                                        >
                                            {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
                                        </button>
                                        {i < ONBOARDING_STEPS.length - 1 && (
                                            <div className={cn(
                                                "w-8 h-0.5 mx-1",
                                                completedSteps.includes(step) ? "bg-green-500" : "bg-gray-200 dark:bg-zinc-700"
                                            )} />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                        {/* Progress Percentage */}
                        <div className="text-sm text-muted-foreground font-medium">
                            {getCompletionPercentage(completedSteps)}%
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-6 py-12 transition-all duration-300 ease-in-out">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">
                        {stepConfig.title[language === 'tr' ? 'tr' : 'en']}
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        {stepConfig.description[language === 'tr' ? 'tr' : 'en']}
                    </p>
                </div>

                {/* STEP 1: SECTOR */}
                {currentStep === 'sector' && (
                    <div className="space-y-6">
                        <motion.div 
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="grid grid-cols-2 md:grid-cols-4 gap-4"
                        >
                            {Object.entries(INDUSTRY_CONFIG).map(([key, config]) => {
                                const Icon = INDUSTRY_ICONS[key] || HelpCircle
                                const isSelected = selectedSector === key

                                return (
                                    <motion.button
                                        key={key}
                                        variants={itemVariants}
                                        whileHover={{ scale: 1.05, borderColor: "hsl(var(--primary))" }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setSelectedSector(key as IndustryType)}
                                        className={cn(
                                            "p-4 rounded-xl border-2 text-left transition-colors shadow-sm hover:shadow-md bg-white dark:bg-zinc-900",
                                            isSelected
                                                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                                : "border-gray-200 dark:border-zinc-800 hover:border-primary/50"
                                        )}
                                    >
                                        <Icon className={cn(
                                            "w-6 h-6 mb-2",
                                            isSelected ? "text-primary" : "text-muted-foreground"
                                        )} />
                                        <p className="font-medium">
                                            {(config as any).names?.[language] || config.label}
                                        </p>
                                    </motion.button>
                                )
                            })}
                        </motion.div>

                        <div className="flex justify-end pt-4 gap-3">
                            <Button 
                                variant="ghost" 
                                onClick={() => handleComplete('soft')}
                                className="h-12 px-6 text-base font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl"
                            >
                                {language === 'tr' ? 'Daha Sonra Tamamla' : 'Complete Later'}
                            </Button>
                            <Button
                                size="lg"
                                onClick={handleSectorSubmit}
                                disabled={!selectedSector || isLoading}
                                className="h-12 px-8 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all rounded-xl"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                                {language === 'tr' ? 'Devam Et' : 'Continue'}
                                <ChevronRight className="w-5 h-5 ml-2" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 2: MODULES */}
                {currentStep === 'modules' && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 p-3 rounded-lg flex gap-2 text-sm text-blue-800 dark:text-blue-200 mb-2">
                            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>
                                {language === 'tr'
                                    ? 'Seçtiğiniz sektöre göre en uygun modüller otomatik olarak aktif edildi.'
                                    : 'The most suitable modules have been automatically enabled based on your selected sector.'}
                            </span>
                        </div>

                        <motion.div 
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                        >
                            {getAllModules()
                                .filter(module => {
                                    if (module.status === 'coming_soon') return false
                                    return true
                                })
                                .map((module) => {
                                const Icon = MODULE_ICON_MAP[module.icon] || MessageSquare

                                // Get module access info - single source of truth
                                const access = getModuleAccess(
                                    userPlanId,
                                    module.id,
                                    (selectedSector || 'other') as any,
                                    selectedModuleIds.includes(module.id),
                                    language === 'tr' ? 'tr' : 'en',
                                    true // Always in trial/setup mode during onboarding
                                )

                                // Check current user selection
                                const isSelected = selectedModuleIds.includes(module.id)

                                // Determine if module can be selected
                                const canSelect = access.status === 'included' || access.status === 'core'

                                const handleModuleClick = () => {
                                    // If not included in plan, show pricing modal
                                    if (!canSelect && access.upgradeTarget) {
                                        setUpgradeTargetModuleId(module.id)
                                        setIsPricingModalOpen(true)
                                        return
                                    }
                                    
                                    // Toggle selection
                                    if (isSelected) {
                                        setSelectedModuleIds(prev => prev.filter(id => id !== module.id))
                                    } else {
                                        setSelectedModuleIds(prev => [...prev, module.id])
                                    }
                                }

                                return (
                                    <motion.div
                                        key={module.id}
                                        variants={itemVariants}
                                        whileHover={{ scale: 1.01 }}
                                        onClick={handleModuleClick}
                                        className={cn(
                                            "flex flex-col gap-4 p-5 rounded-xl border transition-all relative overflow-hidden bg-white dark:bg-zinc-900 cursor-pointer",
                                            isSelected
                                                ? "border-zinc-300 dark:border-zinc-700 shadow-sm ring-1 ring-black/5 dark:ring-white/5"
                                                : "border-zinc-200 dark:border-zinc-800 opacity-60 hover:opacity-80"
                                        )}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className={cn(
                                                "p-2.5 rounded-lg border",
                                                isSelected
                                                    ? "bg-zinc-50 text-zinc-900 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700"
                                                    : "bg-zinc-50 text-zinc-400 border-zinc-100 dark:bg-zinc-800/50 dark:text-zinc-600 dark:border-zinc-800"
                                            )}>
                                                <Icon className="w-5 h-5" />
                                            </div>

                                            {/* Status Indicator */}
                                            <div className="flex-shrink-0">
                                                {isSelected ? (
                                                    <div className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
                                                        <Check className="w-3.5 h-3.5 text-white dark:text-zinc-900" />
                                                    </div>
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full border-2 border-zinc-200 dark:border-zinc-800" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className={cn(
                                                    "font-semibold text-base",
                                                    isSelected ? "text-foreground" : "text-muted-foreground"
                                                )}>
                                                    {module.name[language === 'tr' ? 'tr' : 'en']}
                                                </p>
                                                
                                                {/* Labels */}
                                                {access.badge === 'included' && (
                                                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800">
                                                        {language === 'tr' ? 'Dahil' : 'Included'}
                                                    </Badge>
                                                )}
                                                
                                                {access.isSectorCompatible && (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800 text-xs">
                                                        {language === 'tr' ? 'Sektörünüze Uygun' : 'Recommended'}
                                                    </Badge>
                                                )}
                                            </div>

                                            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 min-h-[2.5rem]">
                                                {module.description[language === 'tr' ? 'tr' : 'en']}
                                            </p>

                                            {/* Upgrade Info */}
                                            {access.upgradeMessage && (
                                                <div className="mt-2">
                                                    <div className="text-xs text-muted-foreground bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700">
                                                        {access.upgradeMessage}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </motion.div>

                        <div className="flex justify-between items-center pt-4">
                            <Button 
                                variant="ghost" 
                                onClick={() => goToStep('sector')}
                                className="h-12 px-6 text-base font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors rounded-xl"
                            >
                                <ArrowLeft className="w-5 h-5 mr-2" />
                                {language === 'tr' ? 'Geri' : 'Back'}
                            </Button>
                            <div className="flex items-center gap-3">
                                <Button 
                                    variant="ghost" 
                                    onClick={() => handleComplete('soft')}
                                    className="h-12 px-6 text-base font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl"
                                >
                                    {language === 'tr' ? 'Daha Sonra Tamamla' : 'Complete Later'}
                                </Button>
                                <Button 
                                    size="lg" 
                                    onClick={handleModulesContinue} 
                                    disabled={isLoading} 
                                    className="h-12 px-8 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all rounded-xl"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                                    {language === 'tr' ? 'Devam Et' : 'Continue'}
                                    <ChevronRight className="w-5 h-5 ml-2" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )
                }

                {/* STEP 3: KNOWLEDGE BASE */}
                {currentStep === 'knowledge' && (
                    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Card className="border-none shadow-xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm ring-1 ring-border/50">
                            <CardContent className="p-8 space-y-8">
                                {/* Input Area: Only show if not scanning and no results yet */}
                                {!isScanning && discoveredUrls.length === 0 && (
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <Label className="text-base font-semibold">
                                                {language === 'tr' ? 'Web Sitesi URL' : 'Website URL'}
                                            </Label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <ExternalLink className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                </div>
                                                <Input
                                                    value={knowledgeUrl}
                                                    onChange={(e) => setKnowledgeUrl(e.target.value)}
                                                    placeholder="https://example.com"
                                                    className="pl-10 h-14 text-lg bg-white/60 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 focus:ring-4 focus:ring-primary/10 transition-all shadow-sm rounded-xl"
                                                />
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {language === 'tr'
                                                    ? 'Yapay zekanız bu adresteki içerikleri okuyarak kendini eğitecektir.'
                                                    : 'Your AI will read the content at this address to train itself.'}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10 shadow-sm">
                                            <div className="space-y-1">
                                                <Label className="text-base font-semibold flex items-center gap-2">
                                                    <TrendingUp className="w-4 h-4 text-primary" />
                                                    {language === 'tr' ? 'Tüm Siteyi Tara' : 'Scan Full Site'}
                                                </Label>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    {language === 'tr'
                                                        ? 'Web sitenizdeki tüm sayfalar otomatik olarak bulunur.'
                                                        : 'All pages on your website will be found automatically.'}
                                                </p>
                                            </div>
                                            <Switch
                                                checked={fullCrawl}
                                                onCheckedChange={setFullCrawl}
                                                className="data-[state=checked]:bg-primary"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Scanning Animation */}
                                {isScanning && (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-6 animate-pulse">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl" />
                                            <div className="relative bg-white dark:bg-zinc-900 p-6 rounded-full shadow-2xl border-4 border-primary/20">
                                                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                                            </div>
                                        </div>
                                        <div className="text-center space-y-2">
                                            <h3 className="text-xl font-bold">
                                                {language === 'tr' ? 'Web Siteniz Taranıyor...' : 'Scanning Your Website...'}
                                            </h3>
                                            <p className="text-muted-foreground max-w-xs mx-auto">
                                                {language === 'tr'
                                                    ? 'Sayfaları ve içerikleri buluyoruz, lütfen bekleyin.'
                                                    : 'We are finding pages and content, please wait.'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* URL Selection List */}
                                {!isScanning && discoveredUrls.length > 0 && (
                                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                                        <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                            <div className="space-y-0.5">
                                                <h4 className="font-bold text-sm">
                                                    {language === 'tr' ? 'Sayfalar Bulundu' : 'Pages Found'}: {discoveredUrls.length}
                                                </h4>
                                                <p className="text-xs text-muted-foreground">
                                                    {language === 'tr' ? 'Eğitilecek sayfaları seçin' : 'Select pages to train on'}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedUrls(discoveredUrls)}
                                                    className="h-8 text-xs font-semibold hover:bg-white transition-colors"
                                                >
                                                    {language === 'tr' ? 'Tümünü Seç' : 'Select All'}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedUrls([])}
                                                    className="h-8 text-xs font-semibold hover:bg-white transition-colors"
                                                >
                                                    {language === 'tr' ? 'Temizle' : 'Clear'}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 customs-scrollbar">
                                            {discoveredUrls.map((u, i) => (
                                                <div
                                                    key={i}
                                                    className={cn(
                                                        "flex items-start space-x-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer",
                                                        selectedUrls.includes(u)
                                                            ? "bg-primary/5 border-primary/30 shadow-sm"
                                                            : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-zinc-300"
                                                    )}
                                                    onClick={() => {
                                                        if (selectedUrls.includes(u)) {
                                                            setSelectedUrls(selectedUrls.filter(su => su !== u))
                                                        } else {
                                                            setSelectedUrls([...selectedUrls, u])
                                                        }
                                                    }}
                                                >
                                                    <Checkbox
                                                        id={`url-${i}`}
                                                        checked={selectedUrls.includes(u)}
                                                        className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                    />
                                                    <div className="grid gap-1.5 leading-none overflow-hidden">
                                                        <label className="text-sm font-medium leading-none cursor-pointer truncate">
                                                            {u.replace(new URL(u).origin, '') || '/'}
                                                        </label>
                                                        <span className="text-[10px] text-muted-foreground truncate opacity-70">
                                                            {u}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Ingestion Progress */}
                                        {isLoading && scanProgress > 0 && (
                                            <div className="space-y-2 pt-2">
                                                <div className="flex justify-between text-xs font-bold">
                                                    <span>{language === 'tr' ? 'İçerikler İşleniyor...' : 'Processing Content...'}</span>
                                                    <span>%{scanProgress}</span>
                                                </div>
                                                <Progress value={scanProgress} className="h-2 bg-zinc-100 dark:bg-zinc-800">
                                                    <div className="bg-primary h-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
                                                </Progress>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="flex justify-between items-center pt-2">
                             <Button
                                variant="ghost"
                                onClick={() => {
                                    if (discoveredUrls.length > 0) {
                                        setDiscoveredUrls([])
                                        setSelectedUrls([])
                                    } else {
                                        goToStep('modules')
                                    }
                                }}
                                className="h-12 px-6 text-base font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors rounded-xl"
                            >
                                <ArrowLeft className="w-5 h-5 mr-2" />
                                {language === 'tr' ? 'Geri' : 'Back'}
                            </Button>
                            <div className="flex items-center gap-3">
                                <Button 
                                    variant="ghost" 
                                    onClick={() => handleComplete('soft')}
                                    className="h-12 px-6 text-base font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl"
                                >
                                    {language === 'tr' ? 'Daha Sonra Tamamla' : 'Complete Later'}
                                </Button>
                                <Button
                                    size="lg"
                                    onClick={handleKnowledgeSubmit}
                                    disabled={!knowledgeUrl || isLoading || isScanning || (discoveredUrls.length > 0 && selectedUrls.length === 0)}
                                    className="h-12 px-8 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all rounded-xl"
                                >
                                    {isLoading || isScanning ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                                    {discoveredUrls.length > 0
                                        ? (language === 'tr' ? 'Seçilenleri Kaydet' : 'Save & Continue')
                                        : (language === 'tr' ? 'Devam Et' : 'Continue')}
                                    {!isLoading && !isScanning && <ChevronRight className="w-5 h-5 ml-2" />}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 4: WIDGET */}
                {/* STEP 4: WIDGET */}
                {/* STEP 4: WIDGET */}
                {
                    currentStep === 'widget' && (
                        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <Card className="border-none shadow-xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm ring-1 ring-border/50">
                                <CardContent className="p-8 space-y-8">
                                        <div className="grid gap-6">
                                        <div className="grid gap-3">
                                            <Label className="text-base font-semibold">
                                                {language === 'tr' ? 'Marka Adı' : 'Brand Name'}
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    value={widget.brandName}
                                                    onChange={(e) => setWidget(prev => ({ ...prev, brandName: e.target.value }))}
                                                    placeholder={language === 'tr' ? 'Örn: Vion AI' : 'Ex: Vion AI'}
                                                    className="h-12 text-base bg-white/60 dark:bg-zinc-950/50 transition-all focus:ring-2 focus:ring-primary/20"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid gap-3">
                                            <Label className="text-base font-semibold">
                                                {language === 'tr' ? 'Karşılama Mesajı' : 'Welcome Message'}
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    value={widget.welcomeMessage}
                                                    onChange={(e) => setWidget(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                                                    placeholder={language === 'tr' ? 'Merhaba! Size nasıl yardımcı olabilirim?' : 'Hello! How can I help you?'}
                                                    className="h-12 text-base bg-white/60 dark:bg-zinc-950/50 transition-all focus:ring-2 focus:ring-primary/20"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid gap-3">
                                            <Label className="text-base font-semibold flex items-center justify-between">
                                                {language === 'tr' ? 'Marka Rengi' : 'Brand Color'}
                                                <span className="text-xs font-mono text-muted-foreground bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                                                    {widget.brandColor}
                                                </span>
                                            </Label>
                                            <div className="flex gap-4 items-center p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/40 dark:bg-zinc-900/40">
                                                <div className="relative w-12 h-12 rounded-full shadow-sm ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-950 ring-zinc-100 dark:ring-zinc-800 overflow-hidden cursor-pointer hover:scale-105 transition-transform">
                                                    <div 
                                                        className="absolute inset-0 w-full h-full"
                                                        style={{ backgroundColor: widget.brandColor || '#6366f1' }}
                                                    />
                                                    <Input
                                                        type="color"
                                                        value={widget.brandColor}
                                                        onChange={(e) => setWidget(prev => ({ ...prev, brandColor: e.target.value }))}
                                                        className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] p-0 opacity-0 cursor-pointer"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <Input
                                                        value={widget.brandColor}
                                                        onChange={(e) => setWidget(prev => ({ ...prev, brandColor: e.target.value }))}
                                                        className="h-10 font-mono uppercase text-base bg-transparent border-none shadow-none focus-visible:ring-0 px-0 text-foreground/90 font-medium"
                                                        placeholder="#000000"
                                                        maxLength={7}
                                                    />
                                                    <p className="text-xs text-muted-foreground">
                                                        {language === 'tr' ? 'Değiştirmek için renge tıklayın' : 'Click color to change'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex justify-between items-center pt-2">
                                <Button 
                                    variant="ghost" 
                                    onClick={() => goToStep('knowledge')}
                                    className="h-12 px-6 text-base font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors rounded-xl"
                                >
                                    <ArrowLeft className="w-5 h-5 mr-2" />
                                    {language === 'tr' ? 'Geri' : 'Back'}
                                </Button>
                                <div className="flex items-center gap-3">
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => handleComplete('soft')}
                                        className="h-12 px-6 text-base font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl"
                                    >
                                        {language === 'tr' ? 'Daha Sonra Tamamla' : 'Complete Later'}
                                    </Button>
                                    <Button
                                        size="lg"
                                        onClick={handleWidgetSubmit}
                                        disabled={!widget.brandName || isLoading}
                                        className="h-12 px-8 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all rounded-xl"
                                    >
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                                        {language === 'tr' ? 'Devam Et' : 'Continue'}
                                        <ChevronRight className="w-5 h-5 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* STEP 4: LAUNCH */}
                {
                    currentStep === 'launch' && (
                        <div className="space-y-6">
                            {/* Embed Code */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Copy className="w-5 h-5" />
                                        {language === 'tr' ? 'Embed Kodu' : 'Embed Code'}
                                    </CardTitle>
                                    <CardDescription>
                                        {language === 'tr'
                                            ? 'Bu kodu web sitenizin </body> etiketinden önce ekleyin'
                                            : 'Add this code before the </body> tag on your website'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="relative">
                                        <pre className="p-4 rounded-lg bg-zinc-900 text-green-400 text-sm overflow-x-auto">
                                            {`<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget.js" data-chatbot-id="${user?.uid}"></script>`}
                                        </pre>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="absolute top-2 right-2"
                                            onClick={copyEmbedCode}
                                        >
                                            {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Verify Installation */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <ExternalLink className="w-5 h-5" />
                                        {language === 'tr' ? 'Kurulumu Doğrula (Opsiyonel)' : 'Verify Installation (Optional)'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex gap-2">
                                        <Input
                                            value={verifyUrl}
                                            onChange={(e) => setVerifyUrl(e.target.value)}
                                            placeholder="https://yourwebsite.com"
                                        />
                                        <Button
                                            onClick={handleVerifyInstall}
                                            disabled={verifying || !verifyUrl}
                                            className="whitespace-nowrap shrink-0"
                                        >
                                            {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : language === 'tr' ? 'Kontrol Et' : 'Check'}
                                        </Button>
                                    </div>

                                    {verifyResult && (
                                        <div className={cn(
                                            "p-3 rounded-lg text-sm",
                                            verifyResult.installed
                                                ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                                                : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                                        )}>
                                            {verifyResult.message}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <div className="flex justify-center -mt-2 mb-4">
                                <Button
                                    variant="outline"
                                    onClick={() => window.open('/chatbot-view', '_blank')}
                                    className="gap-2 w-full sm:w-auto border-dashed border-2"
                                >
                                    <MessageSquare className="w-4 h-4 text-primary" />
                                    {language === 'tr' ? 'Widget\'ı Test Et' : 'Test Widget'}
                                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                                </Button>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                <Button variant="ghost" onClick={() => goToStep('widget')} className="order-2 sm:order-1 self-start sm:self-auto">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    {language === 'tr' ? 'Geri' : 'Back'}
                                </Button>
                                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto order-1 sm:order-2">
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={() => handleComplete('soft')}
                                        disabled={isLoading}
                                        className="w-full sm:w-auto font-medium"
                                    >
                                        {language === 'tr' ? 'Sonra Tamamla' : 'Complete Later'}
                                    </Button>
                                    <Button
                                        size="lg"
                                        onClick={() => {
                                            confetti({
                                                particleCount: 100,
                                                spread: 70,
                                                origin: { y: 0.6 }
                                            })
                                            handleComplete('full')
                                        }}
                                        disabled={isLoading}
                                        className="w-full sm:w-auto font-bold shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-500 text-white"
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Rocket className="w-4 h-4 mr-2" />}
                                        {language === 'tr' ? 'Asistanı Başlat' : 'Launch Assistant'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Upgrade Modal */}
                <PricingModal
                    isOpen={isPricingModalOpen}
                    onClose={() => {
                        setIsPricingModalOpen(false)
                        setUpgradeTargetModuleId(null)
                    }}
                    currentPlanId={userPlanId}
                    targetModuleId={upgradeTargetModuleId as any}
                />
            </main>
        </div>
    )
}
