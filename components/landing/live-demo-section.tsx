import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Loader2, CheckCircle, ArrowRight, Zap, TrendingUp, AlertCircle, Search, Globe, ChevronRight } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import Link from "next/link"

type RoiSimulationResult = {
    missedLeadsPerDay: number
    projectedRevenuePerMonth: number
    projectedRevenueLow: number
    projectedRevenueHigh: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function normalizeUrlForSimulation(rawUrl: string): string {
    const trimmed = rawUrl.trim().toLowerCase()
    const withProtocol = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`

    try {
        const parsed = new URL(withProtocol)
        return `${parsed.hostname}${parsed.pathname}`.replace(/\/+$/, "")
    } catch {
        return trimmed
    }
}

function hashString(input: string): number {
    let hash = 0
    for (let i = 0; i < input.length; i += 1) {
        hash = (hash * 31 + input.charCodeAt(i)) >>> 0
    }
    return hash
}

function simulateRoiFromUrl(rawUrl: string): RoiSimulationResult {
    const normalized = normalizeUrlForSimulation(rawUrl)
    const hash = hashString(normalized)

    const isEcommerce = /(shop|store|product|cart|market)/.test(normalized)
    const isSaas = /(saas|software|app|platform|cloud)/.test(normalized)
    const isHospitality = /(hotel|restaurant|cafe|clinic|dental|spa)/.test(normalized)

    const avgDealValue = isHospitality ? 45 : isSaas ? 220 : isEcommerce ? 95 : 130
    const closeRate = isHospitality ? 0.24 : isSaas ? 0.09 : isEcommerce ? 0.15 : 0.12
    const captureRate = isHospitality ? 0.2 : 0.17

    const depthFactor = normalized.split("/").filter(Boolean).length
    const lengthFactor = clamp(Math.floor(normalized.length / 8), 0, 8)
    const randomFactor = 8 + (hash % 24)

    const missedLeadsPerDay = clamp(randomFactor + depthFactor + lengthFactor, 8, 64)
    const projectedRevenueRaw = missedLeadsPerDay * 30 * captureRate * closeRate * avgDealValue
    const volatility = 0.88 + ((hash % 37) / 100) // 0.88 - 1.24
    const projectedRevenuePerMonth = Math.round((projectedRevenueRaw * volatility) / 50) * 50

    const projectedRevenueLow = Math.round(projectedRevenuePerMonth * 0.82)
    const projectedRevenueHigh = Math.round(projectedRevenuePerMonth * 1.18)

    return {
        missedLeadsPerDay,
        projectedRevenuePerMonth: clamp(projectedRevenuePerMonth, 450, 25000),
        projectedRevenueLow: clamp(projectedRevenueLow, 350, 22000),
        projectedRevenueHigh: clamp(projectedRevenueHigh, 550, 30000),
    }
}

function formatUsd(value: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(value)
}

export function LiveDemoSection() {
    const { t } = useLanguage()
    const [url, setUrl] = useState("")
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'complete'>('idle')
    const [progress, setProgress] = useState(0)
    const [scanStep, setScanStep] = useState(0)
    const [roiResult, setRoiResult] = useState<RoiSimulationResult | null>(null)

    const scanSteps = [
        t('connecting') || "Connecting to site...",
        t('analyzingPage') || "Analyzing page structure...",
        t('checkingFlow') || "Checking navigation flow...",
        t('identifyingBottlenecks') || "Identifying conversion bottlenecks...",
        t('calculatingRoi') || "Calculating potential ROI..."
    ]

    const handleAnalyze = (e: React.FormEvent) => {
        e.preventDefault()
        if (!url) return

        setRoiResult(simulateRoiFromUrl(url))
        setStatus('analyzing')
        setProgress(0)
        setScanStep(0)
    }

    useEffect(() => {
        if (status === 'analyzing') {
            const interval = setInterval(() => {
                setProgress(prev => {
                    const newProgress = prev + 1.5
                    if (newProgress >= 100) {
                        clearInterval(interval)
                        setStatus('complete')
                        return 100
                    }
                    // Update scan text based on progress
                    const stepIndex = Math.floor((newProgress / 100) * scanSteps.length)
                    setScanStep(Math.min(stepIndex, scanSteps.length - 1))
                    return newProgress
                })
            }, 50)
            return () => clearInterval(interval)
        }
    }, [status, scanSteps.length])

    return (
        <section className="py-32 relative overflow-hidden bg-gradient-to-b from-background via-muted/30 to-background border-t border-border/40">
            {/* Ambient Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="max-w-4xl mx-auto text-center mb-16 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                         <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-500 mb-6">
                            <Zap className="w-3 h-3" />
                            <span>{t('instantAnalysis') || "Instant Analysis"}</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70 tracking-tight mb-4">
                            {t('seePotentialRoi') || "See Your Potential ROI in Seconds"}
                        </h2>
                        <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto">
                            {t('enterUrlValues') || "Enter your website URL to simulate how AmeritAI can transform your visitor experience and boost conversions."}
                        </p>
                    </motion.div>
                </div>

                <div className="max-w-2xl mx-auto">
                    <Card className="p-2 pl-6 rounded-full dark:bg-black/40 backdrop-blur-xl border border-border/50 shadow-2xl overflow-hidden relative group">
                        <form onSubmit={handleAnalyze} className="flex items-center gap-2">
                            <Globe className="w-5 h-5 text-muted-foreground shrink-0" />
                            <Input 
                                placeholder="example.com" 
                                className="border-none shadow-none bg-transparent h-12 text-lg focus-visible:ring-0 px-2 min-w-0"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                disabled={status === 'analyzing'}
                            />
                            <div className="pr-2">
                                <Button 
                                    size="lg" 
                                    className="rounded-full h-10 px-6 font-medium bg-foreground text-background hover:bg-foreground/90 transition-all shrink-0 whitespace-nowrap min-w-[100px]"
                                    disabled={status === 'analyzing' || !url}
                                >
                                    {status === 'analyzing' ? <Loader2 className="w-4 h-4 animate-spin" /> : (t('analyze') || "Analyze")}
                                </Button>
                            </div>
                        
                            {/* Progress Bar Line */}
                            {status === 'analyzing' && (
                                <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
                            )}
                        </form>
                    </Card>

                    {/* Scanning Status */}
                    <AnimatePresence mode="wait">
                        {status === 'analyzing' && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mt-8 flex flex-col items-center gap-3"
                            >
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-2 border-foreground/10 flex items-center justify-center">
                                        <Search className="w-6 h-6 text-foreground/50 animate-pulse" />
                                    </div>
                                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500" strokeDasharray="200" strokeDashoffset={200 - (progress * 2)} strokeLinecap="round" />
                                    </svg>
                                </div>
                                <p className="text-sm font-medium text-foreground/70 tabular-nums">
                                    {scanSteps[scanStep]} <span className="text-muted-foreground ml-2">{Math.round(progress)}%</span>
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Results Card */}
                    <AnimatePresence>
                        {status === 'complete' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                                className="mt-12"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-border shadow-lg relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-5">
                                            <AlertCircle className="w-24 h-24" />
                                        </div>
                                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t('missedOpportunities') || "Missed Opportunities"}</h3>
                                        <div className="text-4xl font-bold text-foreground mb-1">
                                            {roiResult?.missedLeadsPerDay ?? 12}
                                            <span className="text-xl text-muted-foreground font-normal">+</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {t('potentialLeadsLost') || "Potential leads leaving your site daily without engagement."}
                                        </p>
                                    </Card>

                                    <Card className="p-6 bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-green-500/20 shadow-lg relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-5">
                                            <TrendingUp className="w-24 h-24 text-green-500" />
                                        </div>
                                        <h3 className="text-sm font-semibold text-green-600 uppercase tracking-wider mb-2">{t('projectedGrowth') || "Projected Growth"}</h3>
                                        <div className="text-4xl font-bold text-green-700 mb-1">
                                            {formatUsd(roiResult?.projectedRevenuePerMonth ?? 2450)}
                                            <span className="text-xl font-normal text-green-600/80">/mo</span>
                                        </div>
                                        <p className="text-sm text-green-700/80 leading-relaxed">
                                            {roiResult
                                                ? `${formatUsd(roiResult.projectedRevenueLow)} - ${formatUsd(roiResult.projectedRevenueHigh)} • ${t('estimatedRevenue') || "Estimated revenue increase with active AI engagement."}`
                                                : (t('estimatedRevenue') || "Estimated revenue increase with active AI engagement.")}
                                        </p>
                                    </Card>

                                    <Card className="md:col-span-2 p-8 bg-foreground text-background border-none relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                                        
                                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div>
                                                <h3 className="text-2xl font-bold mb-2">{t('readyToCapture') || "Ready to capture this value?"}</h3>
                                                <p className="text-white/70 text-lg">
                                                    {t('activateTrial') || "Activate your 14-day free trial and see real results."}
                                                </p>
                                            </div>
                                            <Link href="/signup">
                                                <Button size="lg" className="bg-white text-black hover:bg-white/90 font-semibold rounded-full px-8 h-12 shadow-xl hover:scale-105 transition-transform whitespace-nowrap w-auto min-w-fit">
                                                    {t('startFreeTrial') || "Start Free Trial"} <ArrowRight className="ml-2 w-4 h-4 shrink-0" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </Card>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    )
}
