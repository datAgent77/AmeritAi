"use client"

import { useEffect, useState } from "react"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { useLanguage } from "@/context/LanguageContext"
import { getModule, ModuleDefinition } from "@/lib/modules-registry"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Check, Globe, Zap, Shield, BarChart } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"

// Map string icons to Lucide components (need to duplicate map or export it)
// Ideally this component should be shared. For now, creating a local helper or importing if possible.
// Since we used a local map in header, let's create a robust display here.
import {
    ShoppingBag, Plane, Home, Code2, Briefcase, HeartPulse, GraduationCap, School, Banknote, ChefHat, Sprout,
    Eye, Gamepad2, Megaphone, ScanBarcode, MessageSquare, BookOpen, UserPlus, Mic, TrendingUp, Share2, Mail, Utensils, Star, Award, Languages, Scan, CalendarDays
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

export default function ModuleDetailPage({ params }: { params: { slug: string } }) {
    const { t, language } = useLanguage()
    const [module, setModule] = useState<ModuleDefinition | null>(null)

    useEffect(() => {
        // params.slug corresponds to moduleId
        // The getModule function expects strict ModuleId type, but we pass string. 
        // We cast or check.
        const mod = getModule(params.slug as any)
        if (mod) {
            setModule(mod)
        }
    }, [params.slug])

    if (!module) {
        // If we are strictly statically generating, we might want to return notFound() here or generic loading
        // But since this is client component for now (simplest for registry access without serialization issues), just return generic loading or 404
        // Actually, we should probably handle checking immediate on render if possible, but params is prop.
        // Let's assume loading or not found.
        return (
            <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Module Loading...</h1>
                    <Link href="/" className="text-zinc-500 hover:text-white">Return Home</Link>
                </div>
            </div>
        )
    }

    const IconComponent = iconMapping[module.icon] || Globe

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            <PublicHeader />

            {/* Hero Section */}
            <section className="pt-40 pb-20 relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-900/5 pointer-events-none" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="container mx-auto px-4 relative z-10">
                    <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-8 animate-in fade-in zoom-in duration-700">
                            <IconComponent className="w-12 h-12 text-blue-400" />
                        </div>

                        <Badge variant="outline" className="mb-6 border-blue-500/30 text-blue-300">
                            {module.isCore ? (language === 'tr' ? 'Çekirdek Modül' : 'Core Module') : (language === 'tr' ? 'Eklenti Modül' : 'Add-on Module')}
                        </Badge>

                        <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
                            {language === 'tr' ? module.name.tr : module.name.en}
                        </h1>

                        <p className="text-xl text-zinc-400 mb-10 leading-relaxed">
                            {language === 'tr' ? module.description.tr : module.description.en}
                        </p>

                        <div className="flex gap-4">
                            <Link href="/signup">
                                <Button className="h-12 px-8 rounded-full bg-white text-black hover:bg-zinc-200 text-base font-medium">
                                    {language === 'tr' ? 'Hemen Başla' : 'Get Started Now'}
                                </Button>
                            </Link>

                        </div>
                    </div>
                </div>
            </section>

            {/* Features / Details Grid */}
            <section className="py-20 bg-zinc-900/30">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold mb-12 text-center">
                        {language === 'tr' ? 'Modül Özellikleri & Avantajları' : 'Module Features & Benefits'}
                    </h2>

                    <div className="grid md:grid-cols-3 gap-8">
                        {module.features ? (
                            module.features.map((feature, idx) => {
                                const FeatureIcon = iconMapping[feature.icon] || Zap
                                return (
                                    <div key={idx} className="p-6 rounded-2xl bg-black border border-white/10 flex flex-col items-center text-center hover:border-blue-500/30 transition-colors">
                                        <div className="p-3 bg-blue-500/10 rounded-lg mb-4 text-blue-400">
                                            <FeatureIcon className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-xl font-bold mb-3">{language === 'tr' ? feature.title.tr : feature.title.en}</h3>
                                        <p className="text-zinc-400">{language === 'tr' ? feature.description.tr : feature.description.en}</p>
                                    </div>
                                )
                            })
                        ) : (
                            // Fallback generics if data missing
                            <>
                                <div className="p-6 rounded-2xl bg-black border border-white/10 flex flex-col items-center text-center">
                                    <div className="p-3 bg-green-500/10 rounded-lg mb-4 text-green-400"><Zap className="w-6 h-6" /></div>
                                    <h3 className="text-xl font-bold mb-3">{language === 'tr' ? 'Hızlı Kurulum' : 'Fast Setup'}</h3>
                                    <p className="text-zinc-400">{language === 'tr' ? 'Dakikalar içinde aktif edin ve kullanmaya başlayın.' : 'Activate in minutes and start using immediately.'}</p>
                                </div>
                                <div className="p-6 rounded-2xl bg-black border border-white/10 flex flex-col items-center text-center">
                                    <div className="p-3 bg-purple-500/10 rounded-lg mb-4 text-purple-400"><Shield className="w-6 h-6" /></div>
                                    <h3 className="text-xl font-bold mb-3">{language === 'tr' ? 'Güvenli Altyapı' : 'Secure Infrastructure'}</h3>
                                    <p className="text-zinc-400">{language === 'tr' ? 'Verileriniz en son güvenlik standartlarıyla korunur.' : 'Your data is protected with the latest security standards.'}</p>
                                </div>
                                <div className="p-6 rounded-2xl bg-black border border-white/10 flex flex-col items-center text-center">
                                    <div className="p-3 bg-orange-500/10 rounded-lg mb-4 text-orange-400"><BarChart className="w-6 h-6" /></div>
                                    <h3 className="text-xl font-bold mb-3">{language === 'tr' ? 'Detaylı Raporlama' : 'Detailed Reporting'}</h3>
                                    <p className="text-zinc-400">{language === 'tr' ? 'Performans ve kullanım metriklerini anlık takip edin.' : 'Track performance and usage metrics in real-time.'}</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Benefits List */}
                    {module.benefits && module.benefits.length > 0 && (
                        <div className="mt-16 max-w-4xl mx-auto">
                            <h3 className="text-2xl font-bold mb-8 text-center">{language === 'tr' ? 'Neden Bu Modülü Seçmelisiniz?' : 'Why Choose This Module?'}</h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                {module.benefits.map((benefit, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5">
                                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                                            <Check className="w-4 h-4 text-green-400" />
                                        </div>
                                        <span className="text-zinc-200">{language === 'tr' ? benefit.tr : benefit.en}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Sector Availability */}
            <section className="py-20">
                <div className="container mx-auto px-4 max-w-4xl text-center">
                    <h2 className="text-2xl font-bold mb-8">
                        {language === 'tr' ? 'Desteklenen Sektörler' : 'Supported Sectors'}
                    </h2>
                    <div className="flex flex-wrap justify-center gap-3">
                        {module.supportedSectors.length === 0 ? (
                            <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 px-4 py-2">
                                {language === 'tr' ? 'Tüm Sektörler' : 'All Sectors'}
                            </Badge>
                        ) : (
                            module.supportedSectors.map(sector => (
                                <Badge key={sector} variant="secondary" className="bg-zinc-800 text-zinc-300 px-4 py-2 capitalize">
                                    {sector}
                                </Badge>
                            ))
                        )}
                    </div>
                </div>
            </section>

            <PublicFooter />
        </div>
    )
}
