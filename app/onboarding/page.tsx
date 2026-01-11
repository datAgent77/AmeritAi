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
    ExternalLink, TrendingUp, Share2, Mail, Info,
    ChefHat, Sprout, Car, Shield, Truck, Sparkles, Scale, Dumbbell, Anchor
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
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
import {
    createInitialEntitlements,
    getModuleStatusForUI
} from "@/lib/entitlements"
import { UpgradeModal } from "@/components/upgrade-modal"

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

    // Upgrade Modal State
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
    const [selectedPremiumModule, setSelectedPremiumModule] = useState<{ name: string; description: string; icon?: any } | null>(null)

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
                    if (data.modules) setModules(data.modules)
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
            const token = await getToken()
            const response = await fetch("/api/onboarding/sector", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ sector: selectedSector })
            })

            if (!response.ok) throw new Error("Failed to save sector")

            const data = await response.json()
            setModules(data.modules)
            setCompletedSteps(prev => [...prev, 'sector'])
            setCurrentStep('modules')
        } catch (error) {
            console.error("Sector error:", error)
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
                body: JSON.stringify({ step: 'modules' })
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

            // 1. Bulk Ingest selected pages if any
            if (selectedUrls.length > 0) {
                setScanProgress(0)
                let successCount = 0
                for (let i = 0; i < selectedUrls.length; i++) {
                    const urlToImport = selectedUrls[i]
                    try {
                        const docId = crypto.randomUUID()
                        await fetch("/api/knowledge", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                chatbotId: user?.uid,
                                docId,
                                type: "url",
                                url: urlToImport
                            })
                        })
                        successCount++
                    } catch (e) {
                        console.error("Failed to ingest:", urlToImport, e)
                    }
                    setScanProgress(Math.round(((i + 1) / selectedUrls.length) * 100))
                }
            } else {
                // Single URL Ingestion (Fallthrough if no full crawl or no matches)
                const docId = crypto.randomUUID()
                await fetch("/api/knowledge", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chatbotId: user?.uid,
                        docId,
                        type: "url",
                        url: knowledgeUrl
                    })
                })
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
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    const stepConfig = STEP_CONFIG[currentStep]

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
            {/* Header */}
            <header className="border-b bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
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
            <main className="max-w-3xl mx-auto px-6 py-12">
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(INDUSTRY_CONFIG).map(([key, config]) => {
                                const Icon = INDUSTRY_ICONS[key] || HelpCircle
                                const isSelected = selectedSector === key

                                return (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedSector(key as IndustryType)}
                                        className={cn(
                                            "p-4 rounded-xl border-2 text-left transition-all hover:shadow-md",
                                            isSelected
                                                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                                : "border-gray-200 dark:border-zinc-700 hover:border-primary/50"
                                        )}
                                    >
                                        <Icon className={cn(
                                            "w-6 h-6 mb-2",
                                            isSelected ? "text-primary" : "text-muted-foreground"
                                        )} />
                                        <p className="font-medium">
                                            {(config as any).names?.[language] || config.label}
                                        </p>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="flex justify-end">
                            <Button
                                size="lg"
                                onClick={handleSectorSubmit}
                                disabled={!selectedSector || isLoading}
                                className="gap-2"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                {language === 'tr' ? 'Devam Et' : 'Continue'}
                                <ChevronRight className="w-4 h-4" />
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

                        <div className="grid gap-3">
                            {getAllModules().map((module) => {
                                const Icon = MODULE_ICON_MAP[module.icon] || MessageSquare

                                // Calculate status using entitlements logic
                                const tempEntitlements = createInitialEntitlements(
                                    user?.uid || 'temp',
                                    (selectedSector || 'other') as any
                                )
                                const { isEnabled, isLocked, badge, canToggle } = getModuleStatusForUI(tempEntitlements, module.id)

                                const handleModuleClick = () => {
                                    if (isLocked) {
                                        setSelectedPremiumModule({
                                            name: module.name[language === 'tr' ? 'tr' : 'en'],
                                            description: module.description[language === 'tr' ? 'tr' : 'en'],
                                            icon: Icon
                                        })
                                        setUpgradeModalOpen(true)
                                    }
                                }

                                return (
                                    <div
                                        key={module.id}
                                        onClick={handleModuleClick}
                                        className={cn(
                                            "flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden bg-white dark:bg-zinc-900",
                                            isEnabled
                                                ? "border-green-500/50 shadow-sm"
                                                : isLocked
                                                    ? "border-gray-200 dark:border-zinc-800 opacity-75 hover:opacity-100"
                                                    : "border-gray-200 dark:border-zinc-800 opacity-60"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-2.5 rounded-lg mt-0.5 border",
                                            isEnabled
                                                ? "bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30"
                                                : "bg-gray-50 text-gray-500 border-gray-100 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700"
                                        )}>
                                            <Icon className="w-5 h-5" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="font-semibold text-sm">
                                                    {module.name[language === 'tr' ? 'tr' : 'en']}
                                                </p>

                                                {/* Badges */}
                                                {badge === 'included' && (
                                                    <Badge variant="secondary" className="gap-1 bg-green-50 text-green-700 hover:bg-green-100 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        {language === 'tr' ? 'Aktif' : 'Active'}
                                                    </Badge>
                                                )}
                                                {badge === 'premium' && (
                                                    <Badge variant="outline" className="gap-1 text-violet-600 border-violet-200 bg-violet-50 dark:bg-violet-900/10 dark:text-violet-400 dark:border-violet-800">
                                                        <Lock className="w-3 h-3" />
                                                        Premium
                                                    </Badge>
                                                )}
                                            </div>

                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {module.description[language === 'tr' ? 'tr' : 'en']}
                                            </p>

                                            {/* Premium Price Display */}
                                            {isLocked && module.isPremium && module.price > 0 && (
                                                <div className="mt-2 text-sm font-semibold text-violet-600 dark:text-violet-400">
                                                    ${module.price}{t('month') || '/mo'}
                                                </div>
                                            )}

                                            {/* Lock Hint */}
                                            {isLocked && (
                                                <div className="flex items-center gap-1.5 mt-2 text-xs text-violet-600 dark:text-violet-500 font-medium">
                                                    <Lock className="w-3 h-3" />
                                                    <span>
                                                        {language === 'tr'
                                                            ? 'Bu modül Premium pakete dahildir'
                                                            : 'This module requires Premium plan'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Status Indicator */}
                                        <div className="flex-shrink-0 mt-1">
                                            {isEnabled ? (
                                                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            ) : (
                                                <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-zinc-700" />
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="flex justify-between">
                            <Button variant="ghost" onClick={() => goToStep('sector')}>
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                {language === 'tr' ? 'Geri' : 'Back'}
                            </Button>
                            <Button size="lg" onClick={handleModulesContinue} disabled={isLoading} className="gap-2">
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                {language === 'tr' ? 'Devam Et' : 'Continue'}
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )
                }

                {/* STEP 3: KNOWLEDGE BASE */}
                {currentStep === 'knowledge' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Card className="border-none shadow-xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
                            <CardContent className="pt-6 space-y-6">
                                {/* Input Area: Only show if not scanning and no results yet */}
                                {!isScanning && discoveredUrls.length === 0 && (
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <Label className="text-base font-semibold">
                                                {language === 'tr' ? 'Web Sitesi URL' : 'Website URL'}
                                            </Label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <ExternalLink className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                </div>
                                                <Input
                                                    value={knowledgeUrl}
                                                    onChange={(e) => setKnowledgeUrl(e.target.value)}
                                                    placeholder="https://example.com"
                                                    className="pl-10 h-12 text-base border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground italic">
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
                                                        ? 'Web sitenizdeki tüm sayfalar otomatik olarak bulunur ve seçiminize sunulur.'
                                                        : 'All pages on your website will be found and presented for your selection.'}
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
                                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
                                        <div className="flex items-center justify-between bg-zinc-100/50 dark:bg-zinc-800/50 p-3 rounded-lg">
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

                        <div className="flex justify-between items-center bg-white/30 dark:bg-zinc-900/30 p-2 rounded-2xl backdrop-blur-sm">
                            <Button
                                variant="ghost"
                                size="lg"
                                onClick={() => {
                                    if (discoveredUrls.length > 0) {
                                        setDiscoveredUrls([])
                                        setSelectedUrls([])
                                    } else {
                                        goToStep('modules')
                                    }
                                }}
                                className="font-semibold text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                {language === 'tr' ? 'Geri' : 'Back'}
                            </Button>
                            <Button
                                size="lg"
                                onClick={handleKnowledgeSubmit}
                                disabled={!knowledgeUrl || isLoading || isScanning || (discoveredUrls.length > 0 && selectedUrls.length === 0)}
                                className="px-8 font-bold gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-white bg-primary hover:bg-primary/90"
                            >
                                {isLoading || isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                                {discoveredUrls.length > 0
                                    ? (language === 'tr' ? 'Seçilenleri Kaydet ve Devam Et' : 'Save & Continue')
                                    : (language === 'tr' ? 'Devam Et' : 'Continue')}
                                {!isLoading && !isScanning && <ChevronRight className="w-5 h-5" />}
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 4: WIDGET */}
                {
                    currentStep === 'widget' && (
                        <div className="space-y-6">
                            <Card>
                                <CardContent className="pt-6 space-y-4">
                                    <div className="space-y-2">
                                        <Label>{language === 'tr' ? 'Marka Adı' : 'Brand Name'}</Label>
                                        <Input
                                            value={widget.brandName}
                                            onChange={(e) => setWidget(prev => ({ ...prev, brandName: e.target.value }))}
                                            placeholder={language === 'tr' ? 'Şirket adınız' : 'Your company name'}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{language === 'tr' ? 'Karşılama Mesajı' : 'Welcome Message'}</Label>
                                        <Input
                                            value={widget.welcomeMessage}
                                            onChange={(e) => setWidget(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{language === 'tr' ? 'Marka Rengi' : 'Brand Color'}</Label>
                                        <div className="flex gap-3">
                                            <Input
                                                type="color"
                                                value={widget.brandColor}
                                                onChange={(e) => setWidget(prev => ({ ...prev, brandColor: e.target.value }))}
                                                className="w-14 h-10 p-1 cursor-pointer"
                                            />
                                            <Input
                                                value={widget.brandColor}
                                                onChange={(e) => setWidget(prev => ({ ...prev, brandColor: e.target.value }))}
                                                className="flex-1"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex justify-between">
                                <Button variant="ghost" onClick={() => goToStep('knowledge')}>
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    {language === 'tr' ? 'Geri' : 'Back'}
                                </Button>
                                <Button
                                    size="lg"
                                    onClick={handleWidgetSubmit}
                                    disabled={!widget.brandName || isLoading}
                                    className="gap-2"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    {language === 'tr' ? 'Devam Et' : 'Continue'}
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
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
                                        onClick={() => handleComplete('full')}
                                        disabled={isLoading}
                                        className="w-full sm:w-auto font-bold shadow-lg shadow-primary/20"
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Rocket className="w-4 h-4 mr-2" />}
                                        {language === 'tr' ? 'Panele Git' : 'Go to Console'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Upgrade Modal */}
                <UpgradeModal
                    isOpen={upgradeModalOpen}
                    onClose={() => setUpgradeModalOpen(false)}
                    moduleName={selectedPremiumModule?.name || ''}
                    description={selectedPremiumModule?.description || ''}
                    icon={selectedPremiumModule?.icon}
                />
            </main>
        </div>
    )
}
