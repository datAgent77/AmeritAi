"use client"

import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"
import { ArrowRight, MessageSquare, Shield, Zap } from "lucide-react"
import Link from "next/link"

export default function PricingPage() {
    const { language } = useLanguage()

    return (
        <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
            <PublicHeader />

            <main className="flex-1 flex flex-col relative overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/2" />

                {/* Hero Section */}
                <div className="container mx-auto px-4 flex-1 flex flex-col items-center justify-center text-center py-24 md:py-32 relative z-10">

                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-border text-sm text-muted-foreground mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        {language === 'tr' ? 'Özel Çözümler' : 'Custom Solutions'}
                    </div>

                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 max-w-4xl leading-tight text-foreground">
                        {language === 'tr'
                            ? 'İşletmeniz İçin En Uygun Planı Oluşturalım'
                            : 'Let\'s Built the Perfect Plan for Your Business'}
                    </h1>

                    <p className="text-xl text-muted-foreground max-w-2xl mb-12 leading-relaxed">
                        {language === 'tr'
                            ? 'Her işletmenin ihtiyaçları farklıdır. Size özel ölçeklenebilir çözümler ve avantajlı fiyatlar için satış ekibimizle görüşün.'
                            : 'Every business is unique. Contact our sales team for scalable solutions and custom pricing tailored to your needs.'}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <Link href="/contact" className="w-full sm:w-auto">
                            <Button className="w-full sm:w-auto h-12 px-8 rounded-full bg-foreground text-background hover:bg-foreground/90 text-base font-medium transition-transform hover:scale-105 shadow-xl">
                                {language === 'tr' ? 'İletişime Geçin' : 'Contact Sales'}
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </Link>

                    </div>

                    {/* Trust Indicators */}
                    <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-16 border-t border-border pt-12">
                        <div className="flex flex-col items-center gap-3">
                            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
                                <Zap className="w-6 h-6" />
                            </div>
                            <h3 className="font-semibold text-foreground">{language === 'tr' ? 'Hızlı Kurulum' : 'Fast Setup'}</h3>
                            <p className="text-sm text-muted-foreground">{language === 'tr' ? 'Dakikalar içinde başlayın' : 'Get started in minutes'}</p>
                        </div>
                        <div className="flex flex-col items-center gap-3">
                            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600 dark:text-purple-400">
                                <Shield className="w-6 h-6" />
                            </div>
                            <h3 className="font-semibold text-foreground">{language === 'tr' ? 'Kurumsal Güvenlik' : 'Enterprise Security'}</h3>
                            <p className="text-sm text-muted-foreground">{language === 'tr' ? 'Verileriniz güvende' : 'Your data is secure'}</p>
                        </div>
                        <div className="flex flex-col items-center gap-3">
                            <div className="p-3 bg-green-500/10 rounded-xl text-green-600 dark:text-green-400">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <h3 className="font-semibold text-foreground">{language === 'tr' ? '7/24 Destek' : '24/7 Support'}</h3>
                            <p className="text-sm text-muted-foreground">{language === 'tr' ? 'Her an yanınızdayız' : 'Always here to help'}</p>
                        </div>
                    </div>

                </div>
            </main>

            <PublicFooter />
        </div>
    )
}
