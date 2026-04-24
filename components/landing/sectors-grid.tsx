"use client"

import Link from "next/link"
import { useLanguage } from "@/context/LanguageContext"
import {
    ShoppingBag, Plane, Home, Code2, Briefcase, HeartPulse, GraduationCap,
    School, Banknote, ChefHat, Sprout, Car, ShieldCheck, Truck, Sparkles,
    Scale, Dumbbell, Anchor, Factory
} from "lucide-react"

export function SectorsGrid() {
    const { language } = useLanguage()

    const sectors = [
        { icon: ShoppingBag, label: { en: "E-Commerce", tr: "E-Ticaret" }, href: "/solutions/ecommerce", color: "text-blue-400" },
        { icon: Plane, label: { en: "Travel", tr: "Seyahat" }, href: "/solutions/booking", color: "text-sky-400" },
        { icon: Home, label: { en: "Real Estate", tr: "Emlak" }, href: "/solutions/real-estate", color: "text-indigo-400" },
        { icon: Code2, label: { en: "SaaS", tr: "Yazılım" }, href: "/solutions/saas", color: "text-cyan-400" },
        { icon: Briefcase, label: { en: "Service", tr: "Hizmet" }, href: "/solutions/service", color: "text-orange-400" },
        { icon: HeartPulse, label: { en: "Healthcare", tr: "Sağlık" }, href: "/solutions/healthcare", color: "text-red-500" },
        { icon: GraduationCap, label: { en: "Education", tr: "Eğitim" }, href: "/solutions/education", color: "text-pink-400" },
        { icon: School, label: { en: "Academic", tr: "Akademik" }, href: "/solutions/academic", color: "text-amber-400" },
        { icon: Banknote, label: { en: "Banking & Finance", tr: "Bankacılık" }, href: "/solutions/finance", color: "text-emerald-500" },
        { icon: ChefHat, label: { en: "Restaurant", tr: "Restoran" }, href: "/solutions/restaurant", color: "text-orange-500" },
        { icon: Sprout, label: { en: "Agriculture", tr: "Tarım" }, href: "/solutions/agriculture", color: "text-green-500" },
        { icon: Car, label: { en: "Automotive", tr: "Otomotiv" }, href: "/solutions/automotive", color: "text-slate-400" },
        { icon: ShieldCheck, label: { en: "Insurance", tr: "Sigorta" }, href: "/solutions/insurance", color: "text-blue-500" },
        { icon: Truck, label: { en: "Logistics", tr: "Lojistik" }, href: "/solutions/logistics", color: "text-yellow-500" },
        { icon: Scale, label: { en: "Legal", tr: "Hukuk" }, href: "/solutions/legal", color: "text-gray-400" },
        { icon: Dumbbell, label: { en: "Fitness", tr: "Spor" }, href: "/solutions/fitness", color: "text-red-400" },
        { icon: Anchor, label: { en: "Maritime", tr: "Denizcilik" }, href: "/solutions/maritime", color: "text-cyan-400" },
        { icon: Factory, label: { en: "Manufacturing", tr: "Üretim" }, href: "/solutions/manufacturing", color: "text-stone-400" },
    ]

    return (
        <section className="py-24 bg-muted/30">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                        {language === 'tr' ? "Her Sektör İçin Özelleşmiş Zeka" : "Specialized Intelligence for Every Industry"}
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        {language === 'tr'
                            ? "İşletmeniz ne olursa olsun, Vion o sektörün uzmanı gibi davranır. Size özel bağlam, ton ve hedefler."
                            : "Whatever your business, Vion acts like an expert in that field. Custom context, tone, and goals."}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4 overflow-visible md:grid-cols-4 lg:grid-cols-6">
                    {sectors.map((sector, i) => (
                        <Link key={i} href={sector.href} className="group min-w-0">
                            <div className="bg-card border border-border hover:border-foreground/20 rounded-xl p-6 text-center transition-[background-color,border-color,box-shadow] hover:bg-accent hover:shadow-md">
                                <div className="mb-4 flex items-center justify-center text-foreground group-hover:scale-110 transition-transform duration-300">
                                    <sector.icon className="w-8 h-8" />
                                </div>
                                <h3 className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                                    {language === 'tr' ? sector.label.tr : sector.label.en}
                                </h3>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    )
}
