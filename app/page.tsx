"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    ArrowRight,
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
    CheckCircle2,
    Zap,
    MessageSquare,
    Shield,
    Globe,
    BarChart3,
    Eye,
    Gamepad2,
    Megaphone
} from "lucide-react"
import { ChatbotLoader } from "@/components/chatbot-loader"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { HeroBackground } from "@/components/landing/hero-background"

export default function LandingPage() {
    const { t, language } = useLanguage()
    const { user } = useAuth()

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
        { icon: Sprout, label: { en: "Agriculture", tr: "Tarım (Yeni)" }, href: "/solutions/agriculture", color: "text-green-500" },
    ]

    return (
        <div className="min-h-screen bg-black text-white selection:bg-purple-500/30 font-sans">
            <PublicHeader transparent={true} />

            {/* Hero Section - UPDATED MESSAGING */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden border-b border-white/5">
                <HeroBackground />

                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-4xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-zinc-400 backdrop-blur-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            {language === 'tr' ? 'Satış Odaklı AI Platformu' : 'Sales-Focused AI Platform'}
                        </div>

                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-tight">
                            {language === 'tr'
                                ? <>Cevaplamaz, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Yönlendirir.</span></>
                                : <>Don&apos;t just Answer, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Convert.</span></>}
                        </h1>

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
                            <Link href="/industries">
                                <Button variant="outline" className="h-14 px-8 text-lg text-white border-white/20 hover:bg-white/10 rounded-full">
                                    {language === 'tr' ? 'Tüm Sektörler' : 'All Industries'}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTORS GRID - NEW */}
            <section className="py-24 bg-zinc-950/50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                            {language === 'tr' ? "Her Sektör İçin Özelleşmiş Zeka" : "Specialized Intelligence for Every Industry"}
                        </h2>
                        <p className="text-zinc-400 max-w-2xl mx-auto">
                            {language === 'tr'
                                ? "İşletmeniz ne olursa olsun, Vion o sektörün uzmanı gibi davranır. Size özel bağlam, ton ve hedefler."
                                : "Whatever your business, Vion acts like an expert in that field. Custom context, tone, and goals."}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {sectors.map((sector, i) => (
                            <Link key={i} href={sector.href} className="group">
                                <div className="bg-zinc-900/50 border border-white/5 hover:border-white/20 rounded-xl p-6 text-center transition-all hover:-translate-y-1 hover:bg-zinc-900">
                                    <div className={`w-10 h-10 mx-auto mb-3 rounded-lg bg-black flex items-center justify-center ${sector.color}`}>
                                        <sector.icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
                                        {language === 'tr' ? sector.label.tr : sector.label.en}
                                    </h3>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* MODULES & FEATURES */}
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Personal Shopper */}
                        <div className="p-8 rounded-3xl bg-zinc-900/30 border border-white/10 hover:border-white/20 transition-all group">
                            <ShoppingBag className="w-10 h-10 text-pink-400 mb-6" />
                            <h3 className="text-2xl font-bold mb-3 text-white">
                                {language === 'tr' ? 'Kişisel Alışveriş Asistanı' : 'Personal Shopper'}
                            </h3>
                            <p className="text-zinc-400 mb-6 leading-relaxed">
                                {language === 'tr'
                                    ? 'Müşterinin stilini anlar, beden önerisi yapar ve kombinler sunar.'
                                    : 'Understands customer style, suggests sizes, and offers outfit combinations.'}
                            </p>
                            <Link href="/products/personal-shopper" className="text-sm font-medium text-white hover:text-pink-400 transition-colors flex items-center gap-1">
                                {language === 'tr' ? 'Detaylar' : 'Learn More'} <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {/* Visual Diagnosis */}
                        <div className="p-8 rounded-3xl bg-zinc-900/30 border border-white/10 hover:border-white/20 transition-all group">
                            <Eye className="w-10 h-10 text-indigo-400 mb-6" />
                            <h3 className="text-2xl font-bold mb-3 text-white">
                                {language === 'tr' ? 'Görsel Tanı (Vision)' : 'Visual Diagnosis'}
                            </h3>
                            <p className="text-zinc-400 mb-6 leading-relaxed">
                                {language === 'tr'
                                    ? 'Müşterileriniz fotoğraf göndersin, AI sorunu anında görüp çözüm üretsin.'
                                    : 'Let customers upload photos, AI instantly sees the issue and suggests a solution.'}
                            </p>
                            <Link href="/products/visual-diagnosis" className="text-sm font-medium text-white hover:text-indigo-400 transition-colors flex items-center gap-1">
                                {language === 'tr' ? 'Detaylar' : 'Learn More'} <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {/* Gamification */}
                        <div className="p-8 rounded-3xl bg-zinc-900/30 border border-white/10 hover:border-white/20 transition-all group">
                            <Gamepad2 className="w-10 h-10 text-purple-400 mb-6" />
                            <h3 className="text-2xl font-bold mb-3 text-white">
                                {language === 'tr' ? 'Oyunlaştırma & Çark' : 'Gamification & Spin'}
                            </h3>
                            <p className="text-zinc-400 mb-6 leading-relaxed">
                                {language === 'tr'
                                    ? 'Sıkıcı formlar yerine eğlenceli oyunlarla lead toplayın ve dağıtın.'
                                    : 'Collect leads using fun games instead of boring forms.'}
                            </p>
                            <Link href="/products/gamification" className="text-sm font-medium text-white hover:text-purple-400 transition-colors flex items-center gap-1">
                                {language === 'tr' ? 'Detaylar' : 'Learn More'} <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                        {/* Campaign Manager */}
                        <div className="p-8 rounded-3xl bg-zinc-900/30 border border-white/10 hover:border-white/20 transition-all group flex flex-col md:flex-row gap-6 items-start">
                            <div className="bg-red-500/10 p-4 rounded-2xl">
                                <Megaphone className="w-8 h-8 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2 text-white">
                                    {language === 'tr' ? 'Akıllı Kampanya Yöneticisi' : 'Smart Campaign Manager'}
                                </h3>
                                <p className="text-zinc-400 mb-4 leading-relaxed text-sm">
                                    {language === 'tr'
                                        ? 'Hava durumu, saat veya stok durumuna göre anlık değişen kampanyalar kurgulayın.'
                                        : 'Create dynamic campaigns that change based on weather, time, or stock status.'}
                                </p>
                                <Link href="/products/campaign-manager" className="text-sm font-medium text-white hover:text-red-400 transition-colors flex items-center gap-1">
                                    {language === 'tr' ? 'İncele' : 'View'} <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                        </div>

                        {/* Restaurant Menu */}
                        <div className="p-8 rounded-3xl bg-zinc-900/30 border border-white/10 hover:border-white/20 transition-all group flex flex-col md:flex-row gap-6 items-start">
                            <div className="bg-orange-500/10 p-4 rounded-2xl">
                                <ChefHat className="w-8 h-8 text-orange-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2 text-white">
                                    {language === 'tr' ? 'Dijital Akıllı Menü' : 'Digital Smart Menu'}
                                </h3>
                                <p className="text-zinc-400 mb-4 leading-relaxed text-sm">
                                    {language === 'tr'
                                        ? 'Otomatik çeviri, alerjen filtresi ve garson gibi satış yapabilen QR menü.'
                                        : 'Auto-translation, allergen filter, and a QR menu that sells like a waiter.'}
                                </p>
                                <Link href="/products/restaurant-menu" className="text-sm font-medium text-white hover:text-orange-400 transition-colors flex items-center gap-1">
                                    {language === 'tr' ? 'İncele' : 'View'} <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid - Minimalist */}
            <section className="py-24 bg-zinc-950">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-3 gap-12">
                        {[
                            {
                                icon: Globe,
                                titleKey: 'landingGlobalReach',
                                descKey: 'landingGlobalReachDesc'
                            },
                            {
                                icon: Shield,
                                titleKey: 'landingEnterpriseSecurity',
                                descKey: 'landingEnterpriseSecurityDesc'
                            },
                            {
                                icon: CheckCircle2,
                                titleKey: 'landingTeamCollab',
                                descKey: 'landingTeamCollabDesc'
                            }
                        ].map((feature, i) => (
                            <div key={i} className="group">
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-6 text-white group-hover:bg-white group-hover:text-black transition-colors duration-300">
                                    <feature.icon className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-semibold mb-3 text-white">{t(feature.titleKey)}</h3>
                                <p className="text-zinc-500 leading-relaxed font-light">{t(feature.descKey)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section - Stark Monochrome */}
            <section className="py-32 relative overflow-hidden border-t border-white/5">
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <h2 className="text-4xl md:text-6xl font-bold mb-8 text-white tracking-tight">
                        {language === 'tr' ? 'Satışlarınızı Otomatize Edin' : 'Automate Your Sales'}
                    </h2>
                    <p className="text-xl text-zinc-500 mb-10 max-w-2xl mx-auto font-light">
                        {language === 'tr'
                            ? 'Vion ile 5 dakika içinde kendi yapay zeka asistanınızı oluşturun. Kredi kartı gerekmez.'
                            : 'Create your AI assistant in 5 minutes with Vion. No credit card required.'}
                    </p>
                    <Link href="/signup">
                        <Button className="h-14 px-12 text-lg bg-white text-black hover:bg-zinc-200 rounded-full transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                            {t('landingCreateAccount')}
                        </Button>
                    </Link>
                </div>
            </section>

            <PublicFooter />
            <ChatbotLoader chatbotId="qqv4HRZyAuUwsApyYxoBEgTs4hC2" />
        </div>
    )
}
