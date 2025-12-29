"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    ArrowRight,
    ShoppingCart,
    Plane,
    HeartPulse,
    GraduationCap,
    Home,
    Landmark,
    UtensilsCrossed,
    Briefcase,
    Car,
    School,
    ChevronRight,
    Sparkles
} from "lucide-react"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { useLanguage } from "@/context/LanguageContext"
import { HeroBackground } from "@/components/landing/hero-background"

export default function IndustriesPage() {
    const { language } = useLanguage()

    const industries = [
        {
            id: 'ecommerce',
            icon: ShoppingCart,
            // Keeping semantic colors but making them subtle
            name: { en: 'E-commerce', tr: 'E-ticaret' },
            desc: {
                en: 'Product recommendations, stock alerts, cart recovery, discount codes',
                tr: 'Ürün önerileri, stok uyarıları, sepet kurtarma, indirim kodları'
            },
            example: {
                en: '"Only 3 left! Use code SAVE10 for 10% off"',
                tr: '"Sadece 3 adet kaldı! INDIRIM10 koduyla %10 indirim"'
            }
        },
        {
            id: 'travel',
            icon: Plane,
            name: { en: 'Travel & Tourism', tr: 'Seyahat & Turizm' },
            desc: {
                en: 'Trip planning, luggage recommendations, insurance offers, booking assistance',
                tr: 'Gezi planlama, bagaj önerileri, sigorta teklifleri, rezervasyon yardımı'
            },
            example: {
                en: '"For your 5-day trip, I recommend travel insurance"',
                tr: '"5 günlük seyahatiniz için seyahat sigortası öneriyorum"'
            }
        },
        {
            id: 'healthcare',
            icon: HeartPulse,
            name: { en: 'Healthcare', tr: 'Sağlık' },
            desc: {
                en: 'Appointment scheduling, symptom guidance, department routing',
                tr: 'Randevu planlama, belirti rehberliği, bölüm yönlendirme'
            },
            example: {
                en: '"For headaches, I recommend our Neurology department"',
                tr: '"Baş ağrısı için Nöroloji bölümümüzü öneriyorum"'
            }
        },
        {
            id: 'education',
            icon: GraduationCap,
            name: { en: 'Education', tr: 'Eğitim' },
            desc: {
                en: 'Course info, enrollment assistance, schedule management',
                tr: 'Kurs bilgisi, kayıt yardımı, program yönetimi'
            },
            example: {
                en: '"Our Python course starts next Monday"',
                tr: '"Python kursumuz önümüzdeki Pazartesi başlıyor"'
            }
        },
        {
            id: 'realestate',
            icon: Home,
            name: { en: 'Real Estate', tr: 'Emlak' },
            desc: {
                en: 'Property search, viewing appointments, price comparisons',
                tr: 'Mülk arama, görüntüleme randevuları, fiyat karşılaştırmaları'
            },
            example: {
                en: '"I found 3 apartments in your budget range"',
                tr: '"Bütçenize uygun 3 daire buldum"'
            }
        },
        {
            id: 'finance',
            icon: Landmark,
            name: { en: 'Finance & Banking', tr: 'Finans & Bankacılık' },
            desc: {
                en: 'Product comparison, loan calculations, account guidance',
                tr: 'Ürün karşılaştırma, kredi hesaplamaları, hesap rehberliği'
            },
            example: {
                en: '"Based on your needs, I recommend our savings account"',
                tr: '"İhtiyaçlarınıza göre tasarruf hesabımızı öneriyorum"'
            }
        },
        {
            id: 'restaurant',
            icon: UtensilsCrossed,
            name: { en: 'Restaurant & Food', tr: 'Restoran & Yemek' },
            desc: {
                en: 'Menu info, reservations, dietary options, order tracking',
                tr: 'Menü bilgisi, rezervasyonlar, diyet seçenekleri, sipariş takibi'
            },
            example: {
                en: '"We have vegan options. Table for 4 at 7pm?"',
                tr: '"Vegan seçeneklerimiz var. 4 kişilik masa saat 19:00?"'
            }
        },
        {
            id: 'services',
            icon: Briefcase,
            name: { en: 'Professional Services', tr: 'Profesyonel Hizmetler' },
            desc: {
                en: 'Quote requests, service explanations, booking',
                tr: 'Teklif talepleri, hizmet açıklamaları, randevu'
            },
            example: {
                en: '"For website design, our package starts at $999"',
                tr: '"Web sitesi tasarımı için paketimiz 999$\'dan başlıyor"'
            }
        },
        {
            id: 'automotive',
            icon: Car,
            name: { en: 'Automotive', tr: 'Otomotiv' },
            desc: {
                en: 'Test drive booking, vehicle comparison, service scheduling',
                tr: 'Test sürüşü randevusu, araç karşılaştırma, servis planlama'
            },
            example: {
                en: '"I can schedule a test drive for the Model X"',
                tr: '"Model X için test sürüşü ayarlayabilirim"'
            }
        },
        {
            id: 'academic',
            icon: School,
            name: { en: 'Universities & Schools', tr: 'Üniversite & Okullar' },
            desc: {
                en: 'Admission info, campus tours, program guidance',
                tr: 'Kabul bilgisi, kampüs turları, program rehberliği'
            },
            example: {
                en: '"Application deadline for Fall 2025 is March 15"',
                tr: '"2025 Güz dönemi başvuru tarihi 15 Mart"'
            }
        }
    ]

    return (
        <div className="dark min-h-screen bg-black text-white font-sans relative overflow-hidden">
            <PublicHeader transparent={true} />

            <div className="absolute top-0 left-0 w-full h-[120vh] min-h-[800px] overflow-hidden -z-10">
                <HeroBackground />
            </div>

            {/* Breadcrumb */}
            <div className="container mx-auto px-4 pt-24 pb-4 relative z-10">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Link href="/" className="hover:text-white transition-colors flex items-center gap-1">
                        <Home className="w-4 h-4" />
                        Home
                    </Link>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-white">{language === 'tr' ? 'Sektörler' : 'Industries'}</span>
                </div>
            </div>

            {/* Hero */}
            <section className="relative pt-12 pb-16 overflow-hidden border-b border-white/5">
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-4xl mx-auto text-center space-y-6 animate-in fade-in zoom-in-95 duration-700">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-zinc-400 backdrop-blur-sm">
                            <Sparkles className="w-3 h-3 text-white" />
                            <span>{language === 'tr' ? 'Sektörel Uzmanlık' : 'Industry Expertise'}</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white">
                            {language === 'tr' ? '10 Sektör, 10 Uzman AI' : '10 Industries, 10 Expert AIs'}
                        </h1>
                        <p className="text-lg text-zinc-400 max-w-2xl mx-auto font-light">
                            {language === 'tr'
                                ? 'Her sektöre özel davranış, terminoloji ve use case\'ler.'
                                : 'Industry-specific behavior, terminology, and use cases for each sector.'}
                        </p>
                    </div>
                </div>
            </section>

            {/* Industries Grid */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {industries.map((industry) => {
                            const Icon = industry.icon
                            return (
                                <div
                                    key={industry.id}
                                    className="p-8 rounded-3xl bg-zinc-900/30 border border-white/5 hover:border-white/20 hover:bg-zinc-900/50 transition-all duration-300 group backdrop-blur-sm"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/5">
                                        <Icon className="w-7 h-7 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-3 text-white">
                                        {industry.name[language as 'en' | 'tr']}
                                    </h3>
                                    <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                                        {industry.desc[language as 'en' | 'tr']}
                                    </p>
                                    <div className="text-xs text-zinc-300 bg-black/50 rounded-xl p-4 italic border border-white/5">
                                        {industry.example[language as 'en' | 'tr']}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 border-t border-white/5">
                <div className="container mx-auto px-4">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-3xl md:text-5xl font-bold mb-8 text-white tracking-tight">
                            {language === 'tr' ? 'Sektörünüz listede yok mu?' : 'Your industry not listed?'}
                        </h2>
                        <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto font-light">
                            {language === 'tr'
                                ? 'Özel sektör konfigürasyonu için bizimle iletişime geçin.'
                                : 'Contact us for custom industry configuration.'}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/signup">
                                <Button className="h-14 px-12 text-lg bg-white text-black hover:bg-zinc-200 rounded-full transition-all hover:scale-105 font-medium">
                                    {language === 'tr' ? 'Ücretsiz Başla' : 'Start Free'}
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </Link>
                            <Link href="/contact">
                                <Button variant="outline" className="h-14 px-12 text-lg border-white/20 text-white hover:bg-white hover:text-black rounded-full transition-all hover:scale-105">
                                    {language === 'tr' ? 'Bize Ulaşın' : 'Contact Us'}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <PublicFooter />
        </div>
    )
}
