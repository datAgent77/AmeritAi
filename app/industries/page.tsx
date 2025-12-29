"use client"

import Link from "next/link"
import {
    ShoppingBag,
    Plane,
    Home,
    Code2,
    Briefcase,
    HeartPulse,
    GraduationCap,
    School,
    Banknote,
    ChefHat,
    Sprout
} from "lucide-react"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { useLanguage } from "@/context/LanguageContext"
import { HeroBackground } from "@/components/landing/hero-background"

export default function IndustriesPage() {
    const { t, language } = useLanguage()

    const sectors = [
        { icon: ShoppingBag, label: { en: "E-Commerce", tr: "E-Ticaret" }, href: "/solutions/ecommerce", color: "text-blue-400" },
        { icon: Plane, label: { en: "Travel", tr: "Seyahat" }, href: "/solutions/booking", color: "text-sky-400" },
        { icon: Home, label: { en: "Real Estate", tr: "Emlak" }, href: "/solutions/real-estate", color: "text-indigo-400" },
        { icon: Code2, label: { en: "SaaS", tr: "Yazılım" }, href: "/solutions/saas", color: "text-cyan-400" },
        { icon: Briefcase, label: { en: "Service", tr: "Hizmet" }, href: "/solutions/service", color: "text-orange-400" },
        { icon: HeartPulse, label: { en: "Healthcare", tr: "Sağlık" }, href: "/solutions/healthcare", color: "text-red-500" },
        { icon: GraduationCap, label: { en: "Education", tr: "Eğitim" }, href: "/solutions/education", color: "text-pink-400" },
        { icon: School, label: { en: "Academic", tr: "Akademik" }, href: "/solutions/academic", color: "text-amber-400" },
        { icon: Banknote, label: { en: "Finance", tr: "Finans" }, href: "/solutions/finance", color: "text-emerald-500" },
        { icon: ChefHat, label: { en: "Restaurant", tr: "Restoran" }, href: "/solutions/restaurant", color: "text-orange-500" },
        { icon: Sprout, label: { en: "Agriculture", tr: "Tarım" }, href: "/solutions/agriculture", color: "text-green-500" },
    ]

    return (
        <div className="min-h-screen bg-black text-white selection:bg-purple-500/30 font-sans">
            <PublicHeader transparent={true} />

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-16 overflow-hidden border-b border-white/5">
                <HeroBackground />
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
                        {t('industriesPageTitle')}
                    </h1>
                    <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed font-light">
                        {t('industriesPageDesc')}
                    </p>
                </div>
            </section>

            {/* Sectors Grid */}
            <section className="py-20 bg-zinc-950/50">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {sectors.map((sector, i) => (
                            <Link key={i} href={sector.href} className="group">
                                <div className="bg-zinc-900/50 border border-white/5 hover:border-white/20 rounded-xl p-6 text-center transition-all hover:-translate-y-1 hover:bg-zinc-900 h-full flex flex-col items-center justify-center">
                                    <div className={`w-12 h-12 mb-4 rounded-lg bg-black flex items-center justify-center ${sector.color} shadow-lg shadow-white/5`}>
                                        <sector.icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-sm md:text-base font-medium text-zinc-300 group-hover:text-white transition-colors">
                                        {language === 'tr' ? sector.label.tr : sector.label.en}
                                    </h3>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <PublicFooter />
        </div>
    )
}
