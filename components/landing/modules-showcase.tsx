"use client"

import Link from "next/link"
import { useLanguage } from "@/context/LanguageContext"
import { ORDERED_MODULES } from "@/lib/modules-registry"
import { Button } from "@/components/ui/button"
import {
    ShoppingBag, Eye, Gamepad2, Megaphone, Utensils, MessageSquare,
    UserPlus, Mail, TrendingUp, Mic, Scan, Languages, Star, Award,
    Zap, Globe, FileText, Box, ArrowRight
} from "lucide-react"

export function ModulesShowcase() {
    const { t, language } = useLanguage()

    return (
        <section className="py-32 relative border-t border-white/5">
            <div className="container mx-auto px-4">
                <div className="text-center mb-24 space-y-4">
                    <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                        {t('landingAiSupport') || "Powerful AI Modules"}
                    </h2>
                    <p className="text-zinc-400 text-lg max-w-2xl mx-auto font-light">
                        {t('landingAiSupportDesc') || "Transform your customer experience with our advanced modules."}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {ORDERED_MODULES.filter(m => m && m.showOnLandingPage).map((mod) => {
                        // Map icon name to component
                        const IconComponent = {
                            ShoppingBag, Eye, Gamepad2, Megaphone, Utensils, MessageSquare,
                            UserPlus, Mail, TrendingUp, Mic, Scan, Languages, Star, Award,
                            Zap, Globe, BookOpen: FileText
                        }[mod.icon] || Box;

                        const statusColor = {
                            ready: 'text-green-400',
                            beta: 'text-blue-400',
                            coming_soon: 'text-zinc-500'
                        }[mod.status];

                        return (
                            <div key={mod.id} className="group relative p-8 rounded-3xl bg-zinc-900/30 border border-white/5 hover:border-white/10 transition-all duration-500 overflow-hidden">
                                {/* Glass reflection effect */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-500">
                                            <IconComponent className="w-8 h-8 text-white" />
                                        </div>
                                        <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full bg-white/5 border border-white/10 ${statusColor}`}>
                                            {mod.status.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-bold mb-3 text-white group-hover:text-purple-400 transition-colors">
                                        {mod.name[language === 'tr' ? 'tr' : 'en']}
                                    </h3>

                                    <p className="text-zinc-400 text-sm leading-relaxed mb-6 line-clamp-2">
                                        {mod.description[language === 'tr' ? 'tr' : 'en']}
                                    </p>

                                    <Link
                                        href={`/products/${mod.id}`}
                                        className="inline-flex items-center text-sm font-medium text-zinc-300 hover:text-white transition-colors gap-2"
                                    >
                                        {language === 'tr' ? 'İncele' : 'Learn More'}
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-center mt-12">
                    <Link href="/products">
                        <Button className="h-12 px-8 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all group backdrop-blur-sm">
                            {t('viewAllModules')}
                            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    )
}
