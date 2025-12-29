
"use client"

import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { HeroBackground } from "@/components/landing/hero-background"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/context/LanguageContext"
import { ReactNode } from "react"

interface SolutionLayoutProps {
    title: string;
    subtitle: string;
    heroImage?: string; // Optional background image or pattern
    icon: ReactNode;
    features: {
        title: string;
        description: string;
        icon: ReactNode;
    }[];
    demoLink?: string;
    promptExample?: {
        user: string;
        ai: string;
    };
    children?: ReactNode; // For extra content
}

export function SolutionLayout({
    title,
    subtitle,
    icon,
    features,
    demoLink = "/signup",
    promptExample,
    children
}: SolutionLayoutProps) {
    const { t, language } = useLanguage()

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30">
            <PublicHeader />

            {/* Hero Section */}
            <section className="pt-32 pb-20 relative overflow-hidden">
                <HeroBackground />

                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-white backdrop-blur-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {icon}
                            <span>{language === 'tr' ? 'Sektörel Çözüm' : 'Industry Solution'}</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700">
                            {title}
                        </h1>

                        <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto mb-10 font-light leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700">
                            {subtitle}
                        </p>

                        <div className="flex flex-col sm:flex-row justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700">
                            <Link href={demoLink}>
                                <Button className="h-14 px-8 rounded-full bg-white text-black hover:bg-zinc-200 text-lg shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:scale-105">
                                    {language === 'tr' ? 'Hemen Başla' : 'Get Started'} <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </Link>
                            <Link href="/contact">
                                <Button variant="outline" className="h-14 px-8 rounded-full border-white/20 text-white hover:bg-white/10 text-lg">
                                    {language === 'tr' ? 'Demoyu Gör' : 'View Demo'}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Live Chat Example Section - Showing "Context Aware" behavior */}
            {promptExample && (
                <section className="py-20 border-t border-white/5 bg-zinc-900/30">
                    <div className="container mx-auto px-4">
                        <div className="max-w-3xl mx-auto">
                            <div className="text-center mb-10">
                                <h2 className="text-2xl font-bold mb-2 text-white">
                                    {language === 'tr' ? 'Bağlama Duyarlı Zeka' : 'Context-Aware Intelligence'}
                                </h2>
                                <p className="text-zinc-400">
                                    {language === 'tr'
                                        ? 'Genel cevaplar değil, işletme hedeflerinize uygun yanıtlar.'
                                        : 'Not generic answers, but responses aligned with your business goals.'}
                                </p>
                            </div>

                            <div className="bg-black border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[80px] rounded-full pointer-events-none" />

                                {/* User Message */}
                                <div className="flex justify-end mb-6">
                                    <div className="bg-zinc-800 text-zinc-200 px-5 py-3 rounded-2xl rounded-tr-sm max-w-[80%]">
                                        {promptExample.user}
                                    </div>
                                </div>

                                {/* AI Message */}
                                <div className="flex justify-start">
                                    <div className="bg-blue-600 text-white px-5 py-3 rounded-2xl rounded-tl-sm max-w-[80%] shadow-lg shadow-blue-900/20">
                                        {promptExample.ai}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Features Grid */}
            <section className="py-24 bg-zinc-950">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-3 gap-8">
                        {features.map((feature, i) => (
                            <div key={i} className="p-8 rounded-2xl bg-black border border-white/10 hover:border-white/20 transition-all hover:-translate-y-1">
                                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-4 text-white">{feature.title}</h3>
                                <p className="text-zinc-400 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {children && (
                <section className="py-20 border-t border-white/5">
                    <div className="container mx-auto px-4">
                        {children}
                    </div>
                </section>
            )}

            {/* Final CTA */}
            <section className="py-24 relative overflow-hidden">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-5xl font-bold mb-8 text-white tracking-tight">
                        {language === 'tr' ? 'İşletmenizi Geleceğe Taşıyın' : 'Future-Proof Your Business'}
                    </h2>
                    <Link href="/signup">
                        <Button className="h-14 px-12 text-lg bg-white text-black hover:bg-zinc-200 rounded-full transition-all hover:scale-105">
                            {language === 'tr' ? 'Ücretsiz Deneyin' : 'Start Free Trial'}
                        </Button>
                    </Link>
                </div>
            </section>

            <PublicFooter />
        </div>
    )
}
