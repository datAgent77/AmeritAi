"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
    ChevronDown,
    ArrowLeft,
    ChevronRight,
    Home,
    Eye,
    ScanLine,
    CheckSquare,
    FileText,
    TrendingUp,
    Zap,
    Layout,
    Globe,
    ArrowRight
} from "lucide-react"

import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { useLanguage } from "@/context/LanguageContext"
import { ChatbotLoader } from "@/components/chatbot-loader"

export default function UiUxAuditorPage() {
    const { t, language } = useLanguage()

    // Features data
    const features = [
        { icon: CheckSquare, title: t('uiuxFeature1Title'), desc: t('uiuxFeature1Desc'), bgClass: "bg-blue-500/20", iconClass: "text-blue-400" },
        { icon: ScanLine, title: t('uiuxFeature2Title'), desc: t('uiuxFeature2Desc'), bgClass: "bg-green-500/20", iconClass: "text-green-400" },
        { icon: FileText, title: t('uiuxFeature3Title'), desc: t('uiuxFeature3Desc'), bgClass: "bg-purple-500/20", iconClass: "text-purple-400" },
        { icon: Eye, title: t('uiuxFeature4Title'), desc: t('uiuxFeature4Desc'), bgClass: "bg-orange-500/20", iconClass: "text-orange-400" },
    ]

    return (
        <div className="min-h-screen bg-black text-white selection:bg-white/20">
            <PublicHeader />

            {/* Breadcrumb */}
            <div className="container mx-auto px-4 pt-24 pb-4 relative z-10">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link href="/" className="hover:text-white transition-colors flex items-center gap-1">
                        <Home className="w-4 h-4" />
                        {language === 'tr' ? 'Ana Sayfa' : 'Home'}
                    </Link>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-white">Products</span>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-indigo-400">UI/UX Auditor</span>
                </div>
            </div>

            {/* Hero Section */}
            <main className="pb-20">
                <div className="container mx-auto px-4">
                    <div className="grid lg:grid-cols-2 gap-12 items-center mb-24 pt-12">
                        <div className="space-y-8">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium">
                                <Eye className="w-4 h-4" />
                                <span>{t('uiuxBadge')}</span>
                            </div>

                            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
                                {t('uiuxHeroTitle')}
                            </h1>

                            <p className="text-xl text-gray-400 leading-relaxed max-w-xl">
                                {t('uiuxHeroSubtitle')}
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <Link href="/signup">
                                    <Button className="h-12 px-8 text-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 w-full sm:w-auto transition-all hover:scale-105 rounded-full">
                                        {t('startFree')}
                                        <ArrowRight className="ml-2 w-5 h-5" />
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {/* Hero Visual */}
                        <div className="relative">
                            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-3xl blur-2xl opacity-50" />
                            <div className="relative bg-black/40 border border-white/10 rounded-2xl p-2 backdrop-blur-sm overflow-hidden aspect-video flex items-center justify-center group">
                                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />

                                {/* Abstract UI Analysis Visualization */}
                                <div className="relative w-3/4 h-3/4 bg-neutral-900/80 rounded-xl border border-white/5 shadow-2xl overflow-hidden flex flex-col p-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/50" />
                                        <div className="h-2 w-32 bg-white/10 rounded-full ml-4" />
                                    </div>
                                    <div className="flex-1 grid grid-cols-12 gap-4">
                                        <div className="col-span-3 bg-white/5 rounded-lg animate-pulse" />
                                        <div className="col-span-9 space-y-4">
                                            <div className="h-32 bg-white/5 rounded-lg relative overflow-hidden">
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <ScanLine className="w-12 h-12 text-indigo-500/50" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="h-20 bg-white/5 rounded-lg" />
                                                <div className="h-20 bg-white/5 rounded-lg" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Analysis Overlays */}
                                    <div className="absolute top-1/4 right-10 bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded text-xs font-mono flex items-center gap-2">
                                        <CheckSquare className="w-3 h-3" />
                                        WCAG 2.1 Pass
                                    </div>
                                    <div className="absolute bottom-1/3 left-10 bg-orange-500/20 text-orange-400 border border-orange-500/30 px-3 py-1 rounded text-xs font-mono flex items-center gap-2">
                                        <Eye className="w-3 h-3" />
                                        Contrast Issue
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-32">
                        {features.map((feature, idx) => (
                            <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 group">
                                <div className={`w-12 h-12 rounded-xl ${feature.bgClass} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                    <feature.icon className={`w-6 h-6 ${feature.iconClass}`} />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-gray-400 leading-relaxed">
                                    {feature.desc}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* How it Works / Process */}
                    <div className="mb-32">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('howItWorksTitle')}</h2>
                            <p className="text-gray-400">{t('howItWorksSubtitle') || (language === 'tr' ? 'Sitenizi dakikalar içinde analiz edin ve iyileştirin.' : 'Analyze and improve your site in minutes.')}</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8 relative">
                            {/* Connector Line */}
                            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-y-1/2 z-0" />

                            {[
                                { step: "1", title: t('uiuxStep1Title'), desc: t('uiuxStep1Desc'), icon: Globe },
                                { step: "2", title: t('uiuxStep2Title'), desc: t('uiuxStep2Desc'), icon: Zap },
                                { step: "3", title: t('uiuxStep3Title'), desc: t('uiuxStep3Desc'), icon: Layout }
                            ].map((item, i) => (
                                <div key={i} className="relative z-10 flex flex-col items-center text-center">
                                    <div className="w-16 h-16 rounded-full bg-black border-4 border-neutral-800 flex items-center justify-center text-2xl font-bold mb-6 shadow-xl relative group">
                                        <span className="relative z-10">{item.step}</span>
                                        <div className="absolute inset-0 bg-white/10 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                                    <p className="text-gray-400 max-w-xs">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CTA Section */}
                    <div className="bg-gradient-to-b from-white/5 to-transparent border border-white/10 rounded-3xl p-12 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />
                        <div className="relative z-10 max-w-2xl mx-auto">
                            <h2 className="text-3xl md:text-4xl font-bold mb-6">
                                {t('ctaTitle')}
                            </h2>
                            <p className="text-xl text-gray-400 mb-8">
                                {t('ctaSubtitle')}
                            </p>
                            <Link href="/signup">
                                <Button size="lg" className="h-14 px-10 text-lg bg-white text-black hover:bg-white/90 font-medium shadow-xl shadow-white/5 transition-all hover:scale-105 rounded-full">
                                    {t('ctaButton')}
                                </Button>
                            </Link>
                            <p className="mt-6 text-sm text-gray-500">
                                {t('noCreditCard')}
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    )
}
