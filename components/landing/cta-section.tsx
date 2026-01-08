"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"

export function CTASection() {
    const { t, language } = useLanguage()

    return (
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
    )
}
