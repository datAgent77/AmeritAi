"use client"

import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import Image from "next/image"
import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check, X, Rocket, Globe, Zap, Shield, BarChart3, Users, Clock, Brain, Puzzle, Lock, Activity } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { PublicBreadcrumb } from "@/components/public-breadcrumb"

export default function WhyUsPage() {
    const { language } = useLanguage()

    return (
        <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
            <PublicHeader />

            <main className="flex-1 flex flex-col">
                {/* Hero Section */}
                <section className="relative pt-0 pb-20 md:pb-32 overflow-hidden">
                    <div className="absolute top-0 center w-full h-full bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />

                    <PublicBreadcrumb 
                        items={[
                            { label: language === 'tr' ? 'Neden AmeritAI?' : 'Why AmeritAI?' }
                        ]} 
                    />

                    <div className="container mx-auto px-4 relative z-10 text-center">
                        <Badge variant="outline" className="mb-6 border-blue-500/30 text-blue-600 dark:text-blue-300">
                            {language === 'tr' ? 'Neden AmeritAI?' : 'Why AmeritAI?'}
                        </Badge>
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 leading-tight text-foreground">
                            {language === 'tr'
                                ? 'İşletmenizi Geleceğe Taşıyan Güç'
                                : 'The Power That Drives Your Business Forward'}
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
                            {language === 'tr'
                                ? 'Sadece bir yazılım değil, büyüme ortağınız. Geleneksel yöntemlerin ötesine geçin, yapay zeka destekli, ölçeklenebilir ve tam entegre çözümlerle tanışın.'
                                : 'Not just software, but your growth partner. Go beyond traditional methods, meet AI-powered, scalable, and fully integrated solutions.'}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/contact">
                                <Button className="h-12 px-8 rounded-full bg-foreground text-background hover:bg-foreground/90 text-base font-medium">
                                    {language === 'tr' ? 'Bizimle Tanışın' : 'Meet Us'}
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Stats Section */}
                <section className="py-12 border-y border-border bg-muted/20">
                    <div className="container mx-auto px-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                            {[
                                { value: "99.9%", label: { tr: "Uptime Garantisi", en: "Uptime Guarantee" } },
                                { value: "<50ms", label: { tr: "Ortalama Yanıt Hızı", en: "Avg. Response Time" } },
                                { value: "10x", label: { tr: "Daha Hızlı Entegrasyon", en: "Faster Integration" } },
                                { value: "24/7", label: { tr: "Teknik Destek", en: "Technical Support" } },
                            ].map((stat, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="text-4xl md:text-5xl font-bold text-foreground tracking-tighter">{stat.value}</div>
                                    <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{language === 'tr' ? stat.label.tr : stat.label.en}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Value Propositions (Deep Dive) */}
                <section className="py-24">
                    <div className="container mx-auto px-4 space-y-24">
                        {/* Feature 1 */}
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div className="order-2 md:order-1 relative">
                                <div className="relative aspect-square overflow-hidden rounded-xl border border-border shadow-2xl">
                                    <Image 
                                        src="/images/why-us-ai-context.png" 
                                        alt="AI Context Awareness" 
                                        fill 
                                        className="object-cover"
                                    />
                                </div>
                            </div>
                            <div className="order-1 md:order-2 space-y-6">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-foreground text-sm font-medium">
                                    <Zap className="w-4 h-4" />
                                    {language === 'tr' ? 'Yapay Zeka' : 'Artificial Intelligence'}
                                </div>
                                <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                                    {language === 'tr' ? 'Bağlamı Anlayan Teknoloji' : 'Context-Aware Technology'}
                                </h2>
                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    {language === 'tr'
                                        ? 'AmeritAI, sadece kelimeleri değil, niyetleri anlar. Müşterilerinizle gerçekleştirdiğiniz her etkileşim, bir sonraki görüşmeyi daha akıllı hale getirir. Statik chatbotlar yerine öğrenen bir asistan ile çalışın.'
                                        : 'AmeritAI understands intentions, not just words. Every interaction with your customers makes the next conversation smarter. Work with a learning assistant instead of static chatbots.'}
                                </p>
                                <ul className="space-y-3">
                                    {[
                                        { tr: "Doğal Dil İşleme (NLP)", en: "Natural Language Processing (NLP)" },
                                        { tr: "Duygu Analizi", en: "Sentiment Analysis" },
                                        { tr: "Kişiselleştirilmiş Yanıtlar", en: "Personalized Responses" }
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-foreground">
                                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                                <Check className="w-3.5 h-3.5 text-foreground" />
                                            </div>
                                            {language === 'tr' ? item.tr : item.en}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div className="space-y-6">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-foreground text-sm font-medium">
                                    <Puzzle className="w-4 h-4" />
                                    {language === 'tr' ? 'Entegrasyon' : 'Integration'}
                                </div>
                                <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                                    {language === 'tr' ? 'Mevcut Sistemlerinizle Uyumlu' : 'Compatible with Your Existing Systems'}
                                </h2>
                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    {language === 'tr'
                                        ? 'CRM, E-ticaret veya Destek yazılımlarınızı değiştirmek zorunda değilsiniz. AmeritAI, kullandığınız araçlara saniyeler içinde entegre olur ve verilerinizi tek bir merkezden yönetmenizi sağlar.'
                                        : 'You don\'t have to change your CRM, E-commerce, or Support software. AmeritAI integrates with your tools in seconds and lets you manage your data from a single center.'}
                                </p>
                                <ul className="space-y-3">
                                    {[
                                        { tr: "Tek Tıkla Kurulum", en: "One-Click Setup" },
                                        { tr: "API Öncelikli Mimari", en: "API-First Architecture" },
                                        { tr: "Sürekli Senkronizasyon", en: "Continuous Synchronization" }
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-foreground">
                                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                                <Check className="w-3.5 h-3.5 text-foreground" />
                                            </div>
                                            {language === 'tr' ? item.tr : item.en}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="relative">
                                <div className="relative aspect-square overflow-hidden rounded-xl border border-border shadow-2xl">
                                    <Image 
                                        src="/images/why-us-integration.png" 
                                        alt="System Integration" 
                                        fill 
                                        className="object-cover"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Comparison Section (Simplified) */}
                <section className="py-24 relative overflow-hidden bg-muted/20">
                    <div className="container mx-auto px-4 relative z-10">
                        <div className="text-center mb-16 max-w-2xl mx-auto">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground tracking-tight">
                                {language === 'tr' ? 'Modern İşletmeler İçin Tasarlandı' : 'Designed for Modern Businesses'}
                            </h2>
                            <p className="text-lg text-muted-foreground">
                                {language === 'tr' ? 'Geleneksel yöntemlerin kısıtlamalarından kurtulun.' : 'Break free from the limitations of traditional methods.'}
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-start">
                            {/* Traditional Way */}
                            <div className="p-8 rounded-2xl bg-card/40 border border-border hover:bg-card/60 transition-colors">
                                <h3 className="text-lg font-semibold mb-6 text-muted-foreground">
                                    {language === 'tr' ? 'Geleneksel Ajanslar' : 'Traditional Agencies'}
                                </h3>
                                <ul className="space-y-4">
                                    <li className="flex items-start gap-3 text-muted-foreground text-sm">
                                        <X className="w-4 h-4 text-red-500/70 shrink-0 mt-0.5" />
                                        <span>{language === 'tr' ? 'Yüksek Başlangıç Paliyeti' : 'High Upfront Cost'}</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-muted-foreground text-sm">
                                        <X className="w-4 h-4 text-red-500/70 shrink-0 mt-0.5" />
                                        <span>{language === 'tr' ? 'Haftalar Süren Kurulum' : 'Weeks of Setup'}</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-muted-foreground text-sm">
                                        <X className="w-4 h-4 text-red-500/70 shrink-0 mt-0.5" />
                                        <span>{language === 'tr' ? 'Manuel Bakım Gerektirir' : 'Requires Manual Maintenance'}</span>
                                    </li>
                                </ul>
                            </div>

                            {/* AmeritAI Way - Highlighted (Subtle) */}
                            <div className="p-8 rounded-2xl bg-card border-2 border-primary shadow-lg relative z-10 md:-mt-4">
                                <h3 className="text-2xl font-bold mb-6 text-foreground">
                                    {language === 'tr' ? 'AmeritAI Ekosistemi' : 'AmeritAI Ecosystem'}
                                </h3>
                                <ul className="space-y-5 mb-8">
                                    {[
                                        { tr: 'Şeffaf Abonelik Modeli', en: 'Transparent Subscription' },
                                        { tr: 'Anında Aktivasyon', en: 'Instant Activation' },
                                        { tr: 'Otonom AI Güncellemeleri', en: 'Autonomous AI Updates' },
                                        { tr: '7/24 Öncelikli Destek', en: '24/7 Priority Support' }
                                    ].map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                                <Check className="w-3 h-3 text-primary" />
                                            </div>
                                            <span className="text-base font-medium text-foreground">{language === 'tr' ? feature.tr : feature.en}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link href="/pricing" className="block">
                                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium h-11">
                                        {language === 'tr' ? 'Hemen Başlayın' : 'Get Started Now'}
                                    </Button>
                                </Link>
                            </div>

                            {/* SaaS Way */}
                            <div className="p-8 rounded-2xl bg-card/40 border border-border hover:bg-card/60 transition-colors">
                                <h3 className="text-lg font-semibold mb-6 text-muted-foreground">
                                    {language === 'tr' ? 'Standart Yazılımlar' : 'Standard Software'}
                                </h3>
                                <ul className="space-y-4">
                                    <li className="flex items-start gap-3 text-muted-foreground text-sm">
                                        <X className="w-4 h-4 text-red-500/70 shrink-0 mt-0.5" />
                                        <span>{language === 'tr' ? 'Gizli Ücretler' : 'Hidden Fees'}</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-muted-foreground text-sm">
                                        <X className="w-4 h-4 text-red-500/70 shrink-0 mt-0.5" />
                                        <span>{language === 'tr' ? 'Sınırlı Özelleştirme' : 'Limited Customization'}</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-muted-foreground text-sm">
                                        <X className="w-4 h-4 text-red-500/70 shrink-0 mt-0.5" />
                                        <span>{language === 'tr' ? 'Eski Arayüzler' : 'Outdated Interfaces'}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="py-24">
                    <div className="container mx-auto px-4">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <FeatureCard
                                icon={Rocket}
                                title={{ tr: "Hızlı Ölçeklenme", en: "Fast Scaling" }}
                                desc={{ tr: "İşletmeniz büyüdükçe altyapınız da sorunsuz büyür.", en: "As your business grows, your infrastructure grows seamlessly." }}
                            />
                            <FeatureCard
                                icon={Globe}
                                title={{ tr: "Global Erişim", en: "Global Reach" }}
                                desc={{ tr: "Çoklu dil ve para birimi desteği ile sınırları kaldırın.", en: "Remove borders with multi-language and currency support." }}
                            />
                            <FeatureCard
                                icon={Zap}
                                title={{ tr: "Yüksek Performans", en: "High Performance" }}
                                desc={{ tr: "En son teknolojilerle donatılmış, ışık hızında deneyim.", en: "Light-speed experience equipped with the latest technologies." }}
                            />
                            <FeatureCard
                                icon={Shield}
                                title={{ tr: "Güvenlik", en: "Security" }}
                                desc={{ tr: "Verileriniz endüstri standardı protokollerle korunur.", en: "Your data is protected by industry-standard protocols." }}
                            />
                            <FeatureCard
                                icon={Users}
                                title={{ tr: "Müşteri Odaklı", en: "Customer Centric" }}
                                desc={{ tr: "Müşteri deneyimini merkeze alan tasarımlar.", en: "Designs that put customer experience at the center." }}
                            />
                            <FeatureCard
                                icon={BarChart3}
                                title={{ tr: "Veri Analitiği", en: "Data Analytics" }}
                                desc={{ tr: "Kararlarınızı verilere dayalı alın.", en: "Make your decisions based on data." }}
                            />
                        </div>
                    </div>
                </section>


            </main>
            <PublicFooter />
        </div>
    )
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any, title: { tr: string, en: string }, desc: { tr: string, en: string } }) {
    const { language } = useLanguage()
    return (
        <div className="p-6 rounded-2xl bg-card border border-border hover:border-blue-500/30 transition-colors group">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-500/20 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                <Icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-foreground">{language === 'tr' ? title.tr : title.en}</h3>
            <p className="text-muted-foreground leading-relaxed text-sm">
                {language === 'tr' ? desc.tr : desc.en}
            </p>
        </div>
    )
}
