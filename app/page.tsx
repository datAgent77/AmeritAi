"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { useLanguage } from "@/context/LanguageContext"
import { HeroBackground } from "@/components/landing/hero-background"
import { TextRotate } from "@/components/ui/text-rotate"

// Modular Components
import { SectorsGrid } from "@/components/landing/sectors-grid"
import { HowItWorks } from "@/components/landing/how-it-works"
import { ModulesShowcase } from "@/components/landing/modules-showcase"
import { AnalyticsPreview } from "@/components/landing/analytics-preview"
import { FeaturesGrid } from "@/components/landing/features-grid"
import { IntegrationCloud } from "@/components/landing/integration-cloud"
import { FAQSection } from "@/components/landing/faq-section"
import { CTASection } from "@/components/landing/cta-section"

export default function LandingPage() {
    const { language } = useLanguage()

    const slogans = {
        tr: [
            "Ziyaretçileri Müşteriye Dönüştürür.",
            "Her Dili Konuşan Satış Temsilciniz.",
            "Satışları ve Randevuları Otomatize Eder.",
            "Soruları Yanıtlar, Güven Verir."
        ],
        en: [
            "Converts Visitors into Customers.",
            "Your Multilingual Sales Representative.",
            "Automates Sales and Appointments.",
            "Answers Questions, Builds Trust."
        ]
    }

    return (
        <div className="min-h-screen bg-black text-white selection:bg-purple-500/30 font-sans">
            <PublicHeader transparent={true} />

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
                <HeroBackground />

                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-4xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-zinc-400 backdrop-blur-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            {language === 'tr' ? 'Yeni Nesil Satış ve Destek Asistanı' : 'Next-Gen Sales & Support Assistant'}
                        </div>

                        <div className="h-[120px] md:h-[180px] flex items-center justify-center">
                            <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight text-white leading-tight min-h-[80px] flex flex-col items-center justify-center">
                                <TextRotate
                                    texts={language === 'tr' ? slogans.tr : slogans.en}
                                    duration={6000}
                                />
                            </h1>
                        </div>

                        <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto leading-relaxed font-light">
                            {language === 'tr'
                                ? "Vion, müşteri sorularını cevaplayan değil, işletme hedeflerine (satış, randevu, lead) göre hareket eden akıllı bir AI asistandır."
                                : "Vion is not just a chatbot that answers questions, but an intelligent AI assistant that acts based on your business goals (sales, leads, appointments)."}
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                            <Link href="/signup">
                                <Button className="h-14 px-8 text-lg bg-white text-black hover:bg-zinc-200 transition-all rounded-full font-medium shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:scale-105">
                                    {language === 'tr' ? 'Ücretsiz Başlayın' : 'Start for Free'}
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <SectorsGrid />
            <HowItWorks />
            <ModulesShowcase />
            <AnalyticsPreview />
            <FeaturesGrid />
            <IntegrationCloud />
            <FAQSection />
            <CTASection />

            <PublicFooter />
        </div>
    )
}
