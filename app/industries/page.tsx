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
    Sprout,
    Car,
    ShieldCheck,
    Truck,
    Sparkles,
    Scale,
    Dumbbell,
    Anchor,
    Factory
} from "lucide-react"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { useLanguage } from "@/context/LanguageContext"
import { HeroBackgroundModern } from "@/components/landing/hero-background-modern"

export default function IndustriesPage() {
    const { t, language } = useLanguage()

    const sectors = [
        {
            icon: ShoppingBag,
            label: { en: "E-Commerce", tr: "E-Ticaret" },
            descKey: "sectorDesc_ecommerce",
            href: "/solutions/ecommerce",
            color: "text-blue-400"
        },
        {
            icon: Plane,
            label: { en: "Travel", tr: "Seyahat" },
            descKey: "sectorDesc_travel",
            href: "/solutions/booking",
            color: "text-sky-400"
        },
        {
            icon: Home,
            label: { en: "Real Estate", tr: "Emlak" },
            descKey: "sectorDesc_realestate",
            href: "/solutions/real-estate",
            color: "text-indigo-400"
        },
        {
            icon: Code2,
            label: { en: "SaaS", tr: "Yazılım" },
            descKey: "sectorDesc_saas",
            href: "/solutions/saas",
            color: "text-cyan-400"
        },
        {
            icon: Briefcase,
            label: { en: "Service", tr: "Hizmet" },
            descKey: "sectorDesc_service",
            href: "/solutions/service",
            color: "text-orange-400"
        },
        {
            icon: HeartPulse,
            label: { en: "Healthcare", tr: "Sağlık" },
            descKey: "sectorDesc_healthcare",
            href: "/solutions/healthcare",
            color: "text-red-500"
        },
        {
            icon: GraduationCap,
            label: { en: "Education", tr: "Eğitim" },
            descKey: "sectorDesc_education",
            href: "/solutions/education",
            color: "text-pink-400"
        },
        {
            icon: School,
            label: { en: "Academic", tr: "Akademik" },
            descKey: "sectorDesc_academic",
            href: "/solutions/academic",
            color: "text-amber-400"
        },
        {
            icon: Banknote,
            label: { en: "Banking & Finance", tr: "Bankacılık ve Finans" },
            descKey: "sectorDesc_finance",
            href: "/solutions/finance",
            color: "text-emerald-500"
        },
        {
            icon: ChefHat,
            label: { en: "Restaurant", tr: "Restoran" },
            descKey: "sectorDesc_restaurant",
            href: "/solutions/restaurant",
            color: "text-orange-500"
        },
        {
            icon: Sprout,
            label: { en: "Agriculture", tr: "Tarım" },
            descKey: "sectorDesc_agriculture",
            href: "/solutions/agriculture",
            color: "text-green-500"
        },
        {
            icon: Car,
            label: { en: "Automotive", tr: "Otomotiv" },
            descKey: "sectorDesc_automotive",
            href: "/solutions/automotive",
            color: "text-slate-400"
        },
        {
            icon: ShieldCheck,
            label: { en: "Insurance", tr: "Sigorta" },
            descKey: "sectorDesc_insurance",
            href: "/solutions/insurance",
            color: "text-blue-500"
        },
        {
            icon: Truck,
            label: { en: "Logistics", tr: "Lojistik" },
            descKey: "sectorDesc_logistics",
            href: "/solutions/logistics",
            color: "text-yellow-500"
        },
        {
            icon: Sparkles,
            label: { en: "Beauty & Wellness", tr: "Güzellik & Wellness" },
            descKey: "sectorDesc_beauty",
            href: "/solutions/beauty",
            color: "text-pink-500"
        },
        {
            icon: Scale,
            label: { en: "Legal", tr: "Hukuk" },
            descKey: "sectorDesc_legal",
            href: "/solutions/legal",
            color: "text-gray-400"
        },
        {
            icon: Dumbbell,
            label: { en: "Sports & Fitness", tr: "Spor & Fitness" },
            descKey: "sectorDesc_fitness",
            href: "/solutions/fitness",
            color: "text-red-400"
        },
        {
            icon: Anchor,
            label: { en: "Maritime", tr: "Denizcilik" },
            descKey: "sectorDesc_maritime",
            href: "/solutions/maritime",
            color: "text-cyan-400"
        },
        {
            icon: Factory,
            label: { en: "Manufacturing", tr: "Üretim" },
            descKey: "sectorDesc_manufacturing",
            href: "/solutions/manufacturing",
            color: "text-stone-400"
        },
    ]

    return (
        <div className="min-h-screen bg-black text-white selection:bg-purple-500/30 font-sans relative overflow-x-hidden">
            {/* BACKGROUND ANIMATION - Fixed to cover full screen behind everything */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <HeroBackgroundModern />
            </div>

            <div className="relative z-10">
                <PublicHeader transparent={true} />

                {/* Hero Section */}
                <section className="relative pt-32 pb-16 md:pt-48 md:pb-24">
                    <div className="container mx-auto px-4 text-center">
                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight text-white mb-6">
                            {t('industriesPageTitle')}
                        </h1>
                        <p className="text-xl md:text-2xl text-zinc-400 max-w-3xl mx-auto leading-relaxed font-light">
                            {t('industriesPageDesc')}
                        </p>
                    </div>
                </section>

                {/* Sectors Grid */}
                <section className="pb-24 pt-8">
                    <div className="container mx-auto px-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {sectors.map((sector, i) => (
                                <Link key={i} href={sector.href} className="group h-full">
                                    <div className="h-full bg-zinc-900/40 backdrop-blur-sm border border-white/5 hover:border-white/20 rounded-2xl p-8 transition-all hover:-translate-y-1 hover:bg-zinc-900/60 flex flex-col items-start text-left">
                                        <div className={`w-14 h-14 mb-6 rounded-xl bg-white/5 flex items-center justify-center ${sector.color} shadow-lg shadow-black/20 group-hover:scale-110 transition-transform duration-300`}>
                                            <sector.icon className="w-7 h-7" />
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
                                            {language === 'tr' ? sector.label.tr : sector.label.en}
                                        </h3>
                                        <p className="text-zinc-400 leading-relaxed text-sm md:text-base">
                                            {t(sector.descKey)}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

                <PublicFooter />
            </div>
        </div>
    )
}
