"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"
import { trackCtaClick } from "@/lib/marketing-tracking"

export function CTASection() {
    const { t, language } = useLanguage()

    return (
        <section className="py-32 relative overflow-hidden border-t border-border bg-background">
            <div className="container mx-auto px-4 relative z-10 text-center">
                <h2 className="text-4xl md:text-6xl font-bold mb-8 text-foreground tracking-tight">
                    {language === 'tr' ? 'Satışlarınızı Otomatize Edin' : 'Automate Your Sales'}
                </h2>
                <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto font-light">
                    {language === 'tr'
                        ? 'Vion ile 5 dakika içinde kendi yapay zeka asistanınızı oluşturun. Kredi kartı gerekmez.'
                        : 'Create your AI assistant in 5 minutes with Vion. No credit card required.'}
                </p>
                <Link
                    href="/signup"
                    onClick={() =>
                        trackCtaClick({
                            location: "cta_section",
                            ctaLabel: "create_account",
                            destination: "/signup",
                            language
                        })
                    }
                >
                    <Button className="h-14 px-12 text-lg bg-foreground text-background hover:bg-foreground/90 rounded-full transition-all hover:scale-105 shadow-xl">
                        {t('landingCreateAccount')}
                    </Button>
                </Link>
            </div>
        </section>
    )
}
