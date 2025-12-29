"use client"

import Link from "next/link"
import Image from "next/image"
import { VionLogo } from "@/components/vion-logo"
import { useLanguage } from "@/context/LanguageContext"

export function PublicFooter() {
    const { t } = useLanguage()

    return (
        <footer className="border-t border-white/10 py-12 bg-black">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <VionLogo />
                    </div>
                    <p className="text-sm text-gray-500 text-center md:text-left">
                        © 2025 Vion AI. {t('landingAllRights')}
                    </p>
                    <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                        <Link href="/privacy" className="hover:text-white transition-colors">{t('landingPrivacy')}</Link>
                        <Link href="/terms" className="hover:text-white transition-colors">{t('landingTerms')}</Link>
                        <Link href="/contact" className="hover:text-white transition-colors">{t('landingContact')}</Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
