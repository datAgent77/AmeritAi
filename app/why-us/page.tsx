"use client"

import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check, X, Rocket, Globe, Zap, Shield, BarChart3, Users, Clock } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export default function WhyUsPage() {
    const { language } = useLanguage()

    return (
        <div className="min-h-screen bg-black text-white font-sans flex flex-col">
            <PublicHeader />

            <main className="flex-1 flex flex-col">
                {/* Hero Section */}
                <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
                    <div className="absolute top-0 center w-full h-full bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />

                    <div className="container mx-auto px-4 relative z-10 text-center">
                        <Badge variant="outline" className="mb-6 border-blue-500/30 text-blue-300">
                            {language === 'tr' ? 'Neden Vion?' : 'Why Vion?'}
                        </Badge>
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 leading-tight">
                            {language === 'tr'
                                ? 'İşletmenizi Geleceğe Taşıyan Güç'
                                : 'The Power That Drives Your Business Forward'}
                        </h1>
                        <p className="text-xl text-zinc-400 max-w-3xl mx-auto mb-10 leading-relaxed">
                            {language === 'tr'
                                ? 'Sadece bir yazılım değil, büyüme ortağınız. Geleneksel yöntemlerin ötesine geçin, yapay zeka destekli, ölçeklenebilir ve tam entegre çözümlerle tanışın.'
                                : 'Not just software, but your growth partner. Go beyond traditional methods, meet AI-powered, scalable, and fully integrated solutions.'}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/contact">
                                <Button className="h-12 px-8 rounded-full bg-white text-black hover:bg-zinc-200 text-base font-medium">
                                    {language === 'tr' ? 'Bizimle Tanışın' : 'Meet Us'}
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Comparison Section */}
                <section className="py-20 bg-zinc-900/30 border-y border-white/5">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">
                                {language === 'tr' ? 'Farkı Keşfedin' : 'Discover the Difference'}
                            </h2>
                            <p className="text-zinc-400">
                                {language === 'tr' ? 'Geleneksel çözümler vs Vion Ekosistemi' : 'Traditional Solutions vs Vion Ecosystem'}
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            {/* Traditional Way */}
                            <div className="p-8 rounded-2xl bg-zinc-900/50 border border-white/5 opacity-70 hover:opacity-100 transition-opacity">
                                <h3 className="text-xl font-semibold mb-6 text-zinc-400">
                                    {language === 'tr' ? 'Geleneksel Ajanslar' : 'Traditional Agencies'}
                                </h3>
                                <ul className="space-y-4">
                                    <li className="flex items-start gap-3 text-zinc-500">
                                        <X className="w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                                        <span>{language === 'tr' ? 'Yüksek maliyetli projeler' : 'High project costs'}</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-zinc-500">
                                        <X className="w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                                        <span>{language === 'tr' ? 'Uzun teslim süreleri' : 'Long delivery times'}</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-zinc-500">
                                        <X className="w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                                        <span>{language === 'tr' ? 'Manuel süreç yönetimi' : 'Manual process management'}</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Vion Way - Highlighted */}
                            <div className="p-8 rounded-2xl bg-black border border-blue-500/30 relative transform md:-translate-y-4 shadow-2xl shadow-blue-900/20">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                    VION
                                </div>
                                <h3 className="text-2xl font-bold mb-6 text-white text-center">
                                    {language === 'tr' ? 'Vion Ekosistemi' : 'Vion Ecosystem'}
                                </h3>
                                <ul className="space-y-4">
                                    <li className="flex items-start gap-3 text-zinc-300">
                                        <Check className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                        <span>{language === 'tr' ? 'Uygun maliyetli abonelik' : 'Cost-effective subscription'}</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-zinc-300">
                                        <Check className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                        <span>{language === 'tr' ? 'Dakikalar içinde kurulum' : 'Setup in minutes'}</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-zinc-300">
                                        <Check className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                        <span>{language === 'tr' ? 'Tam otomatize AI sistemleri' : 'Fully automated AI systems'}</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-zinc-300">
                                        <Check className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                        <span>{language === 'tr' ? 'Sürekli güncellenen teknoloji' : 'Constantly updated technology'}</span>
                                    </li>
                                </ul>
                                <div className="mt-8 text-center">
                                    <Link href="/pricing">
                                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                            {language === 'tr' ? 'Planları İncele' : 'View Plans'}
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            {/* SaaS Way */}
                            <div className="p-8 rounded-2xl bg-zinc-900/50 border border-white/5 opacity-70 hover:opacity-100 transition-opacity">
                                <h3 className="text-xl font-semibold mb-6 text-zinc-400">
                                    {language === 'tr' ? 'Standart Yazılımlar' : 'Standard Software'}
                                </h3>
                                <ul className="space-y-4">
                                    <li className="flex items-start gap-3 text-zinc-500">
                                        <X className="w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                                        <span>{language === 'tr' ? 'Karmaşık arayüzler' : 'Complex interfaces'}</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-zinc-500">
                                        <X className="w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                                        <span>{language === 'tr' ? 'Yetersiz destek' : 'Insufficient support'}</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-zinc-500">
                                        <X className="w-5 h-5 text-red-500/50 shrink-0 mt-0.5" />
                                        <span>{language === 'tr' ? 'Esnek olmayan yapı' : 'Inflexible structure'}</span>
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

                {/* Trust / Video / CTA Section */}
                <section className="py-20 border-t border-white/10 bg-[#0A0A0C]">
                    <div className="container mx-auto px-4 text-center">
                        <h2 className="text-3xl font-bold mb-8">
                            {language === 'tr' ? 'Başarı Hikayenizi Birlikte Yazalım' : 'Let\'s Write Your Success Story Together'}
                        </h2>
                        <div className="flex flex-wrap justify-center gap-12 text-zinc-500 font-bold text-xl items-center opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                            {/* Placeholder Logos */}
                            <span>ACME Corp</span>
                            <span>Global Tech</span>
                            <span>Future Systems</span>
                            <span>NextGen Inc</span>
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
        <div className="p-6 rounded-2xl bg-zinc-900/30 border border-white/5 hover:border-blue-500/30 transition-colors group">
            <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                <Icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">{language === 'tr' ? title.tr : title.en}</h3>
            <p className="text-zinc-400 leading-relaxed text-sm">
                {language === 'tr' ? desc.tr : desc.en}
            </p>
        </div>
    )
}
