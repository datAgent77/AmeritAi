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
    Megaphone,
    UserPlus,
    FileText,
    Settings,
    Code,
    Rocket,
    Car,
    ShieldCheck,
    Truck,
    Sparkles,
    Scale,
    Dumbbell,
    Anchor,
    Activity,
    TrendingUp,
    PieChart,
    Instagram,
    MessageCircle,
    Calendar as CalendarIcon,
    ArrowUpRight,
    Check,
    Users,
    Search,
    Utensils,
    Box,
    Mail,
    Mic,
    Scan,
    Languages,
    Star,
    Award
} from "lucide-react"
import { ORDERED_MODULES } from "@/lib/modules-registry"
import { ChatbotLoader } from "@/components/chatbot-loader"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { HeroBackground } from "@/components/landing/hero-background"
import { motion, AnimatePresence } from "framer-motion"
import { TextRotate } from "@/components/ui/text-rotate"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"


export default function LandingPage() {
    const { t, language } = useLanguage()
    const { user } = useAuth()

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
        { icon: Sparkles, label: { en: "Beauty", tr: "Güzellik" }, href: "/solutions/beauty", color: "text-pink-500" },
        { icon: Scale, label: { en: "Legal", tr: "Hukuk" }, href: "/solutions/legal", color: "text-gray-400" },
        { icon: Dumbbell, label: { en: "Fitness", tr: "Spor" }, href: "/solutions/fitness", color: "text-red-400" },
        { icon: Anchor, label: { en: "Maritime", tr: "Denizcilik" }, href: "/solutions/maritime", color: "text-cyan-400" },
    ]

    return (
        <div className="min-h-screen bg-black text-white selection:bg-purple-500/30 font-sans">
            <PublicHeader transparent={true} />

            {/* Hero Section - UPDATED MESSAGING */}
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

            {/* HOW IT WORKS SECTION */}
            <section className="py-32 bg-black border-t border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent opacity-50"></div>
                <div className="container mx-auto px-4 relative z-10">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                            {t('landingHowItWorks')}
                        </h2>
                        <p className="text-zinc-400 text-lg max-w-2xl mx-auto font-light">
                            {t('landingHowItWorksDesc')}
                        </p>
                    </div>

                    <div className="relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden lg:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-zinc-800 to-transparent"></div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative z-10">
                            {[
                                { icon: UserPlus, title: 'step1Title', desc: 'step1Desc', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                                { icon: FileText, title: 'step2Title', desc: 'step2Desc', color: 'text-purple-400', bg: 'bg-purple-500/10' },
                                { icon: Settings, title: 'step3Title', desc: 'step3Desc', color: 'text-pink-400', bg: 'bg-pink-500/10' },
                                { icon: Code, title: 'step4Title', desc: 'step4Desc', color: 'text-orange-400', bg: 'bg-orange-500/10' },
                                { icon: Rocket, title: 'step5Title', desc: 'step5Desc', color: 'text-green-400', bg: 'bg-green-500/10' },
                            ].map((step, i) => (
                                <div key={i} className="flex flex-col items-center text-center group">
                                    <div className={`w-24 h-24 rounded-2xl ${step.bg} border border-white/5 flex items-center justify-center mb-8 relative transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]`}>
                                        <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-sm font-bold text-white">
                                            {i + 1}
                                        </div>
                                        <step.icon className={`w-10 h-10 ${step.color}`} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-3">{t(step.title)}</h3>
                                    <p className="text-zinc-500 text-sm leading-relaxed max-w-[200px]">
                                        {t(step.desc)}
                                    </p>
                                </div>
                            ))}
                        </div>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {ORDERED_MODULES.filter(m => m.showOnLandingPage).map((mod) => {
                            // Map icon name to component
                            const IconComponent = {
                                ShoppingBag,
                                Eye,
                                Gamepad2,
                                Megaphone,
                                Utensils,
                                MessageSquare,
                                UserPlus,
                                Mail,
                                TrendingUp,
                                Mic,
                                Scan,
                                Languages,
                                Star,
                                Award,
                                Zap,
                                Globe,
                                BookOpen: FileText // Alias if needed
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

            {/* ANALYTICS PREVIEW - BENTO GRID */}
            <section className="py-32 bg-zinc-950/50 border-t border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />

                <div className="container mx-auto px-4 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="text-center mb-16 space-y-4"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-100 tracking-tight">
                            {t('bentoAnalyticsTitle')}
                        </h2>
                        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                            {t('bentoAnalyticsSubtitle')}
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
                        {/* Conversations Stat */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            whileHover={{ scale: 1.01 }}
                            className="md:col-span-2 p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 flex flex-col justify-between overflow-hidden relative group"
                        >
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl transition-opacity group-hover:bg-blue-500/20" />

                            <div className="relative z-10">
                                <h3 className="text-zinc-400 font-medium mb-2 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-blue-400" />
                                    {t('analyticsConversations')}
                                </h3>
                                <div className="text-5xl font-bold text-white tracking-tighter">12,482</div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs mt-4 font-semibold uppercase tracking-wider">
                                    <TrendingUp className="w-3.5 h-3.5" /> +24% {language === 'tr' ? 'geçen ay' : 'vs last month'}
                                </div>
                            </div>

                            <div className="mt-12 h-24 flex items-end gap-1.5">
                                {[40, 65, 45, 85, 50, 95, 65, 120, 85, 110, 75, 100].map((h, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ height: 0 }}
                                        whileInView={{ height: `${h}%` }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 1, delay: 0.5 + (i * 0.05) }}
                                        className="flex-1 bg-gradient-to-t from-blue-600/40 to-blue-400/20 rounded-t-[4px] hover:from-blue-500 hover:to-blue-300 transition-all cursor-pointer relative group/bar"
                                    >
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black px-1.5 py-0.5 rounded text-[10px] font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">
                                            {h}k
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Sentiment */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            whileHover={{ scale: 1.02 }}
                            className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center text-center group"
                        >
                            <div className="relative w-36 h-36 mb-6">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                                    <motion.circle
                                        cx="50" cy="50" r="42" fill="none"
                                        stroke="#22c55e" strokeWidth="10"
                                        strokeDasharray="263.89"
                                        initial={{ strokeDashoffset: 263.89 }}
                                        whileInView={{ strokeDashoffset: 263.89 * (1 - 0.82) }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
                                        strokeLinecap="round"
                                        className="drop-shadow-[0_0_12px_rgba(34,197,94,0.4)]"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        whileInView={{ opacity: 1 }}
                                        transition={{ delay: 1.5 }}
                                        className="text-3xl font-bold text-white tracking-tighter"
                                    >
                                        82%
                                    </motion.span>
                                    <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">{language === 'tr' ? 'POZİTİF' : 'POSITIVE'}</span>
                                </div>
                            </div>
                            <h3 className="text-zinc-400 font-medium tracking-tight">{t('analyticsSentiment')}</h3>
                        </motion.div>

                        {/* Efficiency */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            whileHover={{ scale: 1.02 }}
                            className="p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center text-center group"
                        >
                            <motion.div
                                whileHover={{ rotate: 12, scale: 1.1 }}
                                className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6"
                            >
                                <Zap className="w-8 h-8 text-purple-400 fill-purple-400/20 shadow-[0_0_20px_rgba(168,85,247,0.4)]" />
                            </motion.div>
                            <div className="text-4xl font-bold text-white tracking-tighter mb-1">99.4%</div>
                            <h3 className="text-zinc-400 font-medium tracking-tight">{t('analyticsEfficiency')}</h3>
                        </motion.div>

                        {/* Top Topics */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            whileHover={{ scale: 1.01 }}
                            className="md:col-span-2 p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 relative overflow-hidden group"
                        >
                            <h3 className="text-white font-semibold mb-8 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-zinc-800/50">
                                    <PieChart className="w-5 h-5 text-blue-400" />
                                </div>
                                {t('analyticsTopTopics')}
                            </h3>
                            <div className="space-y-6">
                                {[
                                    { label: language === 'tr' ? 'Ürün Bilgisi' : 'Product Info', value: '45%', color: 'bg-blue-500' },
                                    { label: language === 'tr' ? 'Fiyatlandırma' : 'Pricing', value: '28%', color: 'bg-emerald-500' },
                                    { label: language === 'tr' ? 'Kargo Durumu' : 'Shipping Status', value: '17%', color: 'bg-amber-500' },
                                    { label: language === 'tr' ? 'İadeler' : 'Returns', value: '10%', color: 'bg-rose-500' }
                                ].map((topic, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between text-sm items-center">
                                            <span className="text-zinc-300 font-medium">{topic.label}</span>
                                            <span className="text-white font-bold">{topic.value}</span>
                                        </div>
                                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                whileInView={{ width: topic.value }}
                                                viewport={{ once: true }}
                                                transition={{ duration: 1.2, delay: 0.8 + (i * 0.1), ease: "circOut" }}
                                                className={`h-full ${topic.color} rounded-full relative shadow-[0_0_10px_rgba(255,255,255,0.1)]`}
                                            >
                                                <div className="absolute inset-0 bg-white/20 blur-[2px]" />
                                            </motion.div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Real-time indicator Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.5 }}
                            whileHover={{ scale: 1.01 }}
                            className="md:col-span-2 p-8 rounded-3xl bg-gradient-to-br from-blue-600/10 to-transparent backdrop-blur-xl border border-blue-500/20 flex items-center gap-8 group"
                        >
                            <div className="relative flex-shrink-0">
                                <motion.div
                                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="w-8 h-8 bg-blue-500/40 rounded-full absolute -inset-2.5"
                                />
                                <div className="w-3 h-3 bg-blue-400 rounded-full relative shadow-[0_0_15px_rgba(96,165,250,0.8)]" />
                            </div>
                            <div>
                                <div className="text-white font-bold text-xl mb-1 flex items-center gap-2">
                                    {language === 'tr' ? 'Canlı Karar Mekanizması' : 'Live Decision Engine'}
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-widest">{language === 'tr' ? 'AKTİF' : 'ACTIVE'}</span>
                                </div>
                                <p className="text-zinc-400 leading-relaxed">
                                    {language === 'tr'
                                        ? 'Yapay zekanız her görüşmede stratejinizi gerçek zamanlı optimize eder ve en yüksek dönüşümü sağlar.'
                                        : 'Our AI engine orchestrates every interaction to maximize conversion through real-time strategic shifts.'}
                                </p>
                            </div>
                        </motion.div>
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

            {/* INTEGRATION CLOUD */}
            <section className="py-24 border-t border-white/5 relative overflow-hidden">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            {language === 'tr' ? 'Ekosisteminize Bağlanın' : 'Connect Your Ecosystem'}
                        </h2>
                        <p className="text-zinc-400 max-w-2xl mx-auto">
                            {language === 'tr'
                                ? 'Vion, mevcut araçlarınızla kusursuz bir şekilde entegre olur.'
                                : 'Vion integrates seamlessly with the tools you already use.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-6 md:gap-12">
                        {[
                            { name: 'WhatsApp', icon: MessageCircle, color: 'text-green-500' },
                            { name: 'Instagram', icon: Instagram, color: 'text-pink-500' },
                            { name: 'Shopify', icon: ShoppingBag, color: 'text-lime-500' },
                            { name: 'Zapier', icon: Zap, color: 'text-orange-500' },
                            { name: 'Google Calendar', icon: CalendarIcon, color: 'text-blue-400' }
                        ].map((item, i) => (
                            <div key={i} className="flex flex-col items-center gap-3 grayscale hover:grayscale-0 transition-all cursor-default">
                                <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center hover:bg-zinc-800 hover:border-white/10 transition-all">
                                    <item.icon className={`w-10 h-10 ${item.color}`} />
                                </div>
                                <span className="text-zinc-500 text-sm font-medium">{item.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ SECTION */}
            <section className="py-32 bg-zinc-950/30 border-t border-white/5">
                <div className="container mx-auto px-4 max-w-3xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            {t('faqTitle')}
                        </h2>
                    </div>

                    <Accordion type="single" collapsible className="w-full space-y-4">
                        {[1, 2, 3, 4, 5].map((num) => (
                            <AccordionItem key={num} value={`item-${num}`} className="border-white/5 bg-zinc-900/30 px-6 rounded-2xl overflow-hidden">
                                <AccordionTrigger className="text-white hover:no-underline text-left py-6">
                                    {t(`faqQ${num}`)}
                                </AccordionTrigger>
                                <AccordionContent className="text-zinc-400 pb-6 leading-relaxed">
                                    {t(`faqA${num}`)}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
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
        </div>
    )
}
