"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { useEffect, useState } from "react"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { useLanguage } from "@/context/LanguageContext"
import { HeroBackgroundLiquidEther } from "@/components/landing/hero-background-liquid-ether"
import { getAttributionContext, trackCtaClick } from "@/lib/marketing-tracking"

import { HeroVisual } from "@/components/landing/hero-visual"
import { SkillsTicker } from "@/components/landing/skills-ticker"

// Modular Components - Dynamic Imports for Performance
import dynamic from 'next/dynamic'

const SectorsGrid = dynamic(() => import("@/components/landing/sectors-grid").then(mod => mod.SectorsGrid))
const HowItWorks = dynamic(() => import("@/components/landing/how-it-works").then(mod => mod.HowItWorks))
const ModulesShowcase = dynamic(() => import("@/components/landing/modules-showcase").then(mod => mod.ModulesShowcase))
const AnalyticsPreview = dynamic(() => import("@/components/landing/analytics-preview").then(mod => mod.AnalyticsPreview))
const FeaturesGrid = dynamic(() => import("@/components/landing/features-grid").then(mod => mod.FeaturesGrid))
const IntegrationCloud = dynamic(() => import("@/components/landing/integration-cloud").then(mod => mod.IntegrationCloud))
const FAQSection = dynamic(() => import("@/components/landing/faq-section").then(mod => mod.FAQSection))
const CTASection = dynamic(() => import("@/components/landing/cta-section").then(mod => mod.CTASection))
const LiveDemoSection = dynamic(() => import("@/components/landing/live-demo-section").then(mod => mod.LiveDemoSection))

export default function LandingPage() {
    const { language } = useLanguage()
    const adsPricingPromptEnabled = process.env.NEXT_PUBLIC_ADS_PRICING_PROMPT_ENABLED !== "false"
    const [showAdsPricingLink, setShowAdsPricingLink] = useState(false)

    useEffect(() => {
        const attribution = getAttributionContext()
        setShowAdsPricingLink(attribution?.traffic_segment === "ads_google")
    }, [])

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-purple-500/30 font-sans overflow-x-hidden">
            <PublicHeader transparent={true} />

            {/* Hero Section */}
            <section className="relative pt-32 pb-24 md:pt-40 md:pb-36 overflow-hidden">
                <HeroBackgroundLiquidEther />

                <div className="container mx-auto px-4 relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                        {/* Text Content */}
                        <div className="flex-1 text-center lg:text-left space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-secondary text-xs font-medium text-secondary-foreground/80 backdrop-blur-sm mx-auto lg:mx-0">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                {language === 'tr' ? 'Yapay Zeka Destekli İşletme Asistanı' : 'AI-Powered Business Assistant'}
                            </div>

                            <div className="space-y-4">
                                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
                                    {language === 'tr' ? (
                                        <>
                                            Ziyaretçiyi Müşteriye<br />
                                            <span className="text-foreground">
                                                Dönüştüren AI
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            The AI That Converts<br />
                                            <span className="text-foreground">
                                                Visitors to Customers
                                            </span>
                                        </>
                                    )}
                                </h1>
                                
                                <p className="text-lg md:text-xl text-muted-foreground/80 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light">
                                    {language === 'tr'
                                        ? "AmeritAI, web sitenize gelen ziyaretçileri karşılar, sorularını yanıtlar ve onları müşteriye dönüştürür. Kodlama gerekmez."
                                        : "AmeritAI welcomes visitors to your website, answers their questions, and converts them into customers. No coding required."}
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                                <Link
                                    href="/signup"
                                    className="w-full sm:w-auto"
                                    onClick={() =>
                                        trackCtaClick({
                                            location: "home_hero",
                                            ctaLabel: "start_for_free",
                                            destination: "/signup",
                                            language
                                        })
                                    }
                                >
                                    <Button size="lg" className="w-full h-14 px-8 text-lg rounded-full font-medium shadow-lg shadow-cyan-500/20 hover:scale-105 transition-transform bg-foreground text-background hover:bg-foreground/90">
                                        {language === 'tr' ? 'Ücretsiz Başlayın' : 'Start for Free'}
                                        <ArrowRight className="ml-2 w-5 h-5" />
                                    </Button>
                                </Link>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="w-full sm:w-auto h-14 px-8 text-lg rounded-full border-muted-foreground/20 hover:bg-secondary/50 backdrop-blur-sm"
                                    onClick={() => {
                                        trackCtaClick({
                                            location: "home_hero",
                                            ctaLabel: "live_demo",
                                            destination: "widget_open",
                                            language
                                        })
                                        // Widget lazy-loads on interaction, so retry for a short window.
                                        const w = window as any
                                        const startedAt = Date.now()

                                        const openAndActivate = () => {
                                            const api = w.UserexWidget
                                            if (api?.openAndFocus) {
                                                api.openAndFocus()
                                                return
                                            }
                                            if (api?.open) {
                                                api.open()
                                                api.focusInput?.()
                                                setTimeout(() => api.focusInput?.(), 120)
                                                return
                                            }
                                            if (Date.now() - startedAt < 5000) {
                                                setTimeout(openAndActivate, 150)
                                            }
                                        }

                                        openAndActivate()
                                    }}
                                >
                                    {language === 'tr' ? 'Canlı Demo' : 'Live Demo'}
                                </Button>
                            </div>

                            {adsPricingPromptEnabled && showAdsPricingLink && (
                                <div className="flex justify-center lg:justify-start -mt-1">
                                    <Link
                                        href="/pricing"
                                        className="inline-flex items-center gap-2 text-sm md:text-base font-medium text-foreground/90 underline underline-offset-4 decoration-primary/60 hover:text-foreground"
                                        onClick={() =>
                                            trackCtaClick({
                                                location: "home_hero_ads",
                                                ctaLabel: "review_pricing",
                                                destination: "/pricing",
                                                language,
                                                metadata: { link_variant: "ads_secondary_pricing_v1" },
                                            })
                                        }
                                    >
                                        {language === "tr" ? "Fiyatlandırmayı İncele" : "Review Pricing"}
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            )}

                            <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    <span>{language === 'tr' ? 'Kredi kartı gerekmez' : 'No credit card required'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    <span>{language === 'tr' ? '14 gün ücretsiz deneme' : '14-day free trial'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Visual Content */}
                        <div className="flex-1 w-full max-w-[500px] lg:max-w-none">
                            <HeroVisual />
                        </div>
                    </div>
                </div>

                {/* Skills Ticker - Integrated into Hero */}
                <div className="absolute bottom-0 w-full z-20">
                     <SkillsTicker />
                </div>
            </section>

            <SectorsGrid />
            <ModulesShowcase />
            <HowItWorks />
            <LiveDemoSection />
            <AnalyticsPreview />
            <FeaturesGrid />
            <IntegrationCloud />
            <FAQSection />
            <CTASection />

            <PublicFooter />
        </div>
    )
}
