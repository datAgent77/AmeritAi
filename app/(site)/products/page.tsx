"use client"

import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { useLanguage } from "@/context/LanguageContext"
import { getAllModules } from "@/lib/modules-registry"
import { PublicBreadcrumb } from "@/components/public-breadcrumb"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Globe } from "lucide-react"
import Link from "next/link"

// Reuse the icon mapping logic (ideally refactor this to a shared file)
import {
    ShoppingBag, Plane, Home, Code2, Briefcase, HeartPulse, GraduationCap, School, Banknote, ChefHat, Sprout,
    Eye, Gamepad2, Megaphone, ScanBarcode, MessageSquare, BookOpen, UserPlus, Mic, TrendingUp, Share2, Mail, Utensils, Star, Award, Zap, Languages, Scan, CalendarDays
} from "lucide-react"

const iconMapping: Record<string, any> = {
    'MessageSquare': MessageSquare,
    'BookOpen': BookOpen,
    'ShoppingBag': ShoppingBag,
    'UserPlus': UserPlus,
    'Mic': Mic,
    'TrendingUp': TrendingUp,
    'Share2': Share2,
    'Mail': Mail,
    'Utensils': Utensils,
    'Star': Star,
    'Award': Award,
    'Zap': Zap,
    'Languages': Languages,
    'Gamepad2': Gamepad2,
    'Scan': Scan,
    'CalendarDays': CalendarDays
}

export default function ModulesPage() {
    const { language } = useLanguage()
    const modules = getAllModules().filter(m => m.status === 'ready')

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <PublicHeader />

            {/* Hero */}
            <section className="pt-0 pb-12 md:pb-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-background pointer-events-none" />
                
                <PublicBreadcrumb 
                    items={[
                        { label: language === 'tr' ? 'Yetenekler' : 'Skills' }
                    ]} 
                />

                <div className="container mx-auto px-4 relative z-10 text-center pt-12 md:pt-20">
                    <Badge variant="outline" className="mb-6 border-primary/20 text-primary">
                        {language === 'tr' ? 'Tüm Yetenekler' : 'All Skills'}
                    </Badge>
                    <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight text-foreground">
                        {language === 'tr' ? 'İşletmeniz İçin Güçlü Çözümler' : 'Powerful Solutions for Your Business'}
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        {language === 'tr'
                            ? 'Vion platformunun sunduğu tüm yapay zeka modüllerini keşfedin.'
                            : 'Explore all AI modules offered by the Vion platform.'}
                    </p>
                </div>
            </section>

            {/* Modules Grid */}
            <section className="py-12 md:py-20 bg-muted/30">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {modules.map((module) => {
                            const IconComponent = iconMapping[module.icon] || Globe
                            return (
                                <Link key={module.id} href={`/products/${module.id}`} className="group relative p-8 rounded-2xl bg-card border border-border hover:border-primary/50 hover:bg-muted/50 transition-all duration-300 hover:translate-y-[-4px]">
                                    <div className="absolute top-8 right-8 text-muted-foreground group-hover:text-primary transition-colors">
                                        <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                                    </div>

                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <IconComponent className="w-6 h-6" />
                                    </div>

                                    <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors">
                                        {language === 'tr' ? module.name.tr : module.name.en}
                                    </h3>

                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                        {language === 'tr' ? module.description.tr : module.description.en}
                                    </p>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </section>

            <PublicFooter />
        </div>
    )
}
