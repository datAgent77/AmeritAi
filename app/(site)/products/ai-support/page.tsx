"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    ArrowRight,
    Bot,
    Clock,
    Users,
    Brain,
    HeartHandshake,
    Target,
    ChevronRight,
    Home,
    Mic,
    Calendar,
    Palette,
    Code,
    BarChart3,
    Languages,
    Smartphone,
    Zap
} from "lucide-react"

import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { useLanguage } from "@/context/LanguageContext"
import { HeroBackgroundGradient } from "@/components/landing/hero-background-gradient"

type SupportedLanguage = 'en' | 'tr'

export default function AiSupportPage() {
    const { language: globalLanguage } = useLanguage()
    const language = (globalLanguage === 'tr' ? 'tr' : 'en') as SupportedLanguage

    const content = {
        en: {
            heroTitle: "AI Customer Support That Never Sleeps",
            heroSubtitle: "Deploy an intelligent chatbot that learns from your data, speaks 50+ languages, and resolves 80% of customer queries instantly — 24/7, 365 days a year.",
            startFree: "Start Free Trial",

            featuresTitle: "Everything You Need for Exceptional Customer Support",
            featuresSubtitle: "Our AI chatbot is packed with powerful features designed to delight your customers and save your team hours every day.",

            feature1Title: "24/7 Instant Responses",
            feature1Desc: "Your customers get immediate answers any time of day or night.",
            feature2Title: "Learns From Your Data",
            feature2Desc: "Train your bot with documents, URLs, Q&As, and files.",
            feature3Title: "50+ Languages",
            feature3Desc: "Automatically detect and respond in your customer's language.",
            feature4Title: "Lead Generation",
            feature4Desc: "Capture visitor information and qualify leads automatically.",
            feature5Title: "Human Handoff",
            feature5Desc: "Seamlessly transfer complex queries to human agents when needed.",
            feature6Title: "Custom Branding",
            feature6Desc: "Match your brand identity with customizable colors and logos.",
            feature7Title: "Easy Integration",
            feature7Desc: "Add to any website with a simple script tag.",
            feature8Title: "Analytics Dashboard",
            feature8Desc: "Track conversations, response times, and customer satisfaction.",
            feature9Title: "Mobile Optimized",
            feature9Desc: "Perfect experience on any device. Responsive design.",
            feature10Title: "Voice Interaction",
            feature10Desc: "Speak to your chatbot naturally with human-like latency.",
            feature11Title: "Appointment Booking",
            feature11Desc: "Allow customers to book calls directly within the chat.",

            howItWorksTitle: "Get Started in 3 Simple Steps",
            step1Title: "1. Train Your Bot",
            step1Desc: "Upload your documents, paste URLs, or add Q&A pairs.",
            step2Title: "2. Customize & Brand",
            step2Desc: "Match your brand colors and configure the widget behavior.",
            step3Title: "3. Deploy & Grow",
            step3Desc: "Copy one line of code to your website.",

            ctaTitle: "Ready to Transform Your Customer Support?",
            ctaSubtitle: "Join thousands of businesses using Vion to deliver exceptional customer experiences.",
            ctaButton: "Start Your Free Trial",
            noCreditCard: "No credit card required • 14-day free trial",
        },
        tr: {
            heroTitle: "Hiç Uyumayan AI Müşteri Desteği",
            heroSubtitle: "Verilerinizden öğrenen, 50+ dil konuşan ve müşteri sorgularının %80'ini anında çözen akıllı bir chatbot dağıtın — 7/24, yılın 365 günü.",
            startFree: "Ücretsiz Deneyin",

            featuresTitle: "Olağanüstü Müşteri Desteği İçin İhtiyacınız Olan Her Şey",
            featuresSubtitle: "AI chatbotumuz, müşterilerinizi memnun etmek ve ekibinize her gün saatler kazandırmak için tasarlanmış güçlü özelliklerle donatılmıştır.",

            feature1Title: "7/24 Anında Yanıtlar",
            feature1Desc: "Müşterileriniz günün veya gecenin herhangi bir saatinde anında cevap alır.",
            feature2Title: "Verilerinizden Öğrenir",
            feature2Desc: "Botunuzu belgeler, URL'ler, Soru-Cevaplar ve dosyalarla eğitin.",
            feature3Title: "50+ Dil Desteği",
            feature3Desc: "Müşterinizin dilini otomatik olarak algılayın ve yanıt verin.",
            feature4Title: "Lead Oluşturma",
            feature4Desc: "Ziyaretçi bilgilerini yakalayın ve leadleri otomatik olarak nitelendirin.",
            feature5Title: "İnsan Temsilciye Aktarım",
            feature5Desc: "Karmaşık sorguları gerektiğinde insan temsilcilere sorunsuzca aktarın.",
            feature6Title: "Özel Markalama",
            feature6Desc: "Özelleştirilebilir renkler ve logolarla marka kimliğinizi eşleştirin.",
            feature7Title: "Kolay Entegrasyon",
            feature7Desc: "Basit bir script etiketiyle herhangi bir web sitesine ekleyin.",
            feature8Title: "Analitik Paneli",
            feature8Desc: "Konuşmaları ve müşteri memnuniyetini takıp edin.",
            feature9Title: "Mobil Optimize",
            feature9Desc: "Her cihazda mükemmel deneyim sağlayan duyarlı tasarım.",
            feature10Title: "Sesli Etkileşim",
            feature10Desc: "Chatbotunuzla doğal bir şekilde konuşun.",
            feature11Title: "Randevu Alma",
            feature11Desc: "Müşterilerin doğrudan sohbetten randevu planlamasına izin verin.",

            howItWorksTitle: "3 Basit Adımda Başlayın",
            step1Title: "1. Botunuzu Eğitin",
            step1Desc: "Belgelerinizi yükleyin, URL'leri yapıştırın veya Soru-Cevap ekleyin.",
            step2Title: "2. Özelleştirin & Markalaştırın",
            step2Desc: "Marka renklerinizi eşleştirin ve widget davranışını yapılandırın.",
            step3Title: "3. Dağıtın & Büyüyün",
            step3Desc: "Web sitenize tek satır kod kopyalayın.",

            ctaTitle: "Müşteri Desteğinizi Dönüştürmeye Hazır mısınız?",
            ctaSubtitle: "Olağanüstü müşteri deneyimleri sunmak için Vion kullanan binlerce işletmeye katılın.",
            ctaButton: "Ücretsiz Denemenizi Başlatın",
            noCreditCard: "Kredi kartı gerekmez • 14 günlük ücretsiz deneme",
        }
    }

    const t = content[language]

    const features = [
        { icon: Clock, title: t.feature1Title, desc: t.feature1Desc },
        { icon: Brain, title: t.feature2Title, desc: t.feature2Desc },
        { icon: Languages, title: t.feature3Title, desc: t.feature3Desc },
        { icon: Target, title: t.feature4Title, desc: t.feature4Desc },
        { icon: HeartHandshake, title: t.feature5Title, desc: t.feature5Desc },
        { icon: Palette, title: t.feature6Title, desc: t.feature6Desc },
        { icon: Code, title: t.feature7Title, desc: t.feature7Desc },
        { icon: BarChart3, title: t.feature8Title, desc: t.feature8Desc },
        { icon: Smartphone, title: t.feature9Title, desc: t.feature9Desc },
        { icon: Mic, title: t.feature10Title, desc: t.feature10Desc },
        { icon: Calendar, title: t.feature11Title, desc: t.feature11Desc },
    ]

    return (
        <div className="min-h-screen bg-black text-white selection:bg-white/20 font-sans relative overflow-hidden">
            <PublicHeader />

            {/* Breadcrumb */}
            <div className="container mx-auto px-4 pt-24 pb-4 relative z-10">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Link href="/" className="hover:text-white transition-colors flex items-center gap-1">
                        <Home className="w-4 h-4" />
                        Home
                    </Link>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-white">Products</span>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-zinc-300">AI Support</span>
                </div>
            </div>

            {/* Hero Section */}
            <section className="relative pt-12 pb-20 md:pt-24 md:pb-28 overflow-hidden border-b border-white/5">
                <HeroBackgroundGradient />
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-4xl mx-auto text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                            <Bot className="w-5 h-5 text-white" />
                            <span className="text-zinc-200 font-medium text-sm">AI Customer Support</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-tight">
                            {t.heroTitle}
                        </h1>
                        <p className="text-xl md:text-2xl text-zinc-400 max-w-3xl mx-auto leading-relaxed font-light">
                            {t.heroSubtitle}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            <Link href="/signup">
                                <Button className="h-14 px-10 text-lg bg-white text-black hover:bg-zinc-200 transition-all rounded-full font-medium">
                                    {t.startFree}
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 relative">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                            {t.featuresTitle}
                        </h2>
                        <p className="text-zinc-400 text-lg max-w-2xl mx-auto font-light">
                            {t.featuresSubtitle}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, i) => (
                            <div key={i} className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-8 hover:bg-white/10 transition-all duration-300 hover:border-white/10">
                                <div className="relative z-10 space-y-4">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-black/50 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                                        <feature.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                                    <p className="text-zinc-400 text-sm leading-relaxed">
                                        {feature.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it Works */}
            <section className="py-24 border-t border-white/5 relative z-10">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-24">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white tracking-tight">{t.howItWorksTitle}</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent dashed" />

                        <div className="text-center space-y-6 relative group">
                            <div className="w-24 h-24 rounded-full bg-black border border-white/10 flex items-center justify-center mx-auto z-10 relative group-hover:border-white/30 transition-colors">
                                <Brain className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-white">{t.step1Title}</h3>
                            <p className="text-zinc-500 leading-relaxed max-w-xs mx-auto">{t.step1Desc}</p>
                        </div>
                        <div className="text-center space-y-6 relative group">
                            <div className="w-24 h-24 rounded-full bg-black border border-white/10 flex items-center justify-center mx-auto z-10 relative group-hover:border-white/30 transition-colors">
                                <Palette className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-white">{t.step2Title}</h3>
                            <p className="text-zinc-500 leading-relaxed max-w-xs mx-auto">{t.step2Desc}</p>
                        </div>
                        <div className="text-center space-y-6 relative group">
                            <div className="w-24 h-24 rounded-full bg-black border border-white/10 flex items-center justify-center mx-auto z-10 relative group-hover:border-white/30 transition-colors">
                                <Zap className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-white">{t.step3Title}</h3>
                            <p className="text-zinc-500 leading-relaxed max-w-xs mx-auto">{t.step3Desc}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 relative overflow-hidden border-t border-white/5">
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white tracking-tight">
                            {t.ctaTitle}
                        </h2>
                        <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto font-light">
                            {t.ctaSubtitle}
                        </p>
                        <Link href="/signup">
                            <Button className="h-14 px-12 text-lg bg-white text-black hover:bg-zinc-200 shadow-xl transition-all hover:scale-105 rounded-full font-medium">
                                {t.ctaButton}
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                        <p className="text-sm text-zinc-500 mt-6">{t.noCreditCard}</p>
                    </div>
                </div>
            </section>

            <div className="relative z-10">
                <PublicFooter />
            </div>
        </div>
    )
}
