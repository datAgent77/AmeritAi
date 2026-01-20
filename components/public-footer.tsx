"use client"

import Link from "next/link"
import { VionLogo } from "@/components/vion-logo"
import { useLanguage } from "@/context/LanguageContext"
import { Twitter, Linkedin, Github, Instagram, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export function PublicFooter() {
    const { t } = useLanguage()
    const { theme, setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const footerLinks = {
        product: [
            { label: t('footerFeatures'), href: "/#features" },
            { label: "AI Chatbot", href: "/products/ai-support" },
            { label: t('landingPersonalShopper'), href: "/products/personal-shopper" },
            { label: t('modules.visualDiagnosis'), href: "/products/visual-diagnosis" },
            { label: t('footerPricing'), href: "/pricing" },
        ],
        solutions: [
            { label: t('footerEcommerce'), href: "/solutions/ecommerce" },
            { label: t('footerRealEstate'), href: "/solutions/real-estate" },
            { label: t('footerSaas'), href: "/solutions/saas" },
            { label: t('footerTravel'), href: "/solutions/travel" },
            { label: t('allIndustries'), href: "/industries" },
        ],
        resources: [
            { label: t('footerBlog'), href: "/blog" },
            { label: t('footerFaq'), href: "/resources/faq" },
            { label: t('footerHelp'), href: "/resources/education" },
            { label: t('footerContact'), href: "/contact" },
        ],
        company: [
            { label: t('footerAbout'), href: "/about" },
            { label: t('footerWhyUs'), href: "/why-us" },
            { label: t('footerLogin'), href: "/login" },
            { label: t('footerSignup'), href: "/signup" },
        ],
        legal: [
            { label: t('footerPrivacy'), href: "/privacy" },
            { label: t('footerTerms'), href: "/terms" },
            { label: t('footerDistanceSales'), href: "/distance-sales" },
        ]
    }

    return (
        <footer className="border-t border-border bg-background pt-16 pb-8 transition-colors duration-300">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-12">
                    {/* Brand Column */}
                    <div className="col-span-2 lg:col-span-2 flex flex-col gap-4">
                        <Link href="/" className="flex items-center gap-2">
                            {mounted ? (
                                <VionLogo variant={resolvedTheme === 'dark' ? 'white' : 'black'} />
                            ) : (
                                <div className="h-7 w-24 bg-muted/20 animate-pulse rounded" />
                            )}
                        </Link>
                        <p className="text-sm text-muted-foreground max-w-sm mt-2 leading-relaxed">
                            {t('footerDesc')}
                        </p>
                        <div className="flex items-center gap-4 mt-4">
                            <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                                <Twitter size={20} />
                            </Link>
                            <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                                <Linkedin size={20} />
                            </Link>
                            <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                                <Github size={20} />
                            </Link>
                            <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                                <Instagram size={20} />
                            </Link>
                        </div>
                    </div>

                    {/* Links Columns */}
                    <div className="col-span-1">
                        <h4 className="font-semibold text-foreground mb-4">{t('footerProduct')}</h4>
                        <ul className="space-y-3">
                            {footerLinks.product.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="col-span-1">
                        <h4 className="font-semibold text-foreground mb-4">{t('footerSolutions')}</h4>
                        <ul className="space-y-3">
                            {footerLinks.solutions.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="col-span-1">
                        <h4 className="font-semibold text-foreground mb-4">{t('footerResources')}</h4>
                        <ul className="space-y-3">
                            {footerLinks.resources.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="col-span-1">
                        <h4 className="font-semibold text-foreground mb-4">{t('footerCompany')}</h4>
                        <ul className="space-y-3">
                            {footerLinks.company.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-border pt-8 space-y-6">
                    {/* Payment Logos */}
                    <div className="flex flex-wrap items-center justify-center gap-6">
                        <span className="text-xs text-muted-foreground">Güvenli Ödeme:</span>
                        <div className="flex items-center gap-6">
                            {/* Visa */}
                            <div className="flex items-center justify-center h-8 px-3 bg-white rounded">
                                <span className="text-[#1A1F71] font-bold text-xl italic tracking-tight">VISA</span>
                            </div>
                            {/* MasterCard */}
                            <div className="flex items-center gap-0.5">
                                <div className="w-6 h-6 rounded-full bg-[#EB001B]" />
                                <div className="w-6 h-6 rounded-full bg-[#F79E1B] -ml-3" />
                            </div>
                            {/* iyzico */}
                            <div className="flex items-center">
                                <span className="text-foreground font-semibold text-lg">iy</span>
                                <span className="text-[#00C853] font-semibold text-lg">zico</span>
                            </div>
                        </div>
                    </div>

                    {/* Links Row */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-muted-foreground">
                            {new Date().getFullYear()} Vion AI. {t('footerRights')}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm text-muted-foreground">
                            {mounted && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                                    className="rounded-full w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                >
                                    {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                                    <span className="sr-only">Toggle theme</span>
                                </Button>
                            )}
                            <Link href="/about" className="hover:text-foreground transition-colors">
                                {t('footerAbout')}
                            </Link>
                            <Link href="/privacy" className="hover:text-foreground transition-colors">
                                {t('footerPrivacy')}
                            </Link>
                            <Link href="/terms" className="hover:text-foreground transition-colors">
                                {t('footerTerms')}
                            </Link>
                            <Link href="/distance-sales" className="hover:text-foreground transition-colors">
                                {t('footerDistanceSales')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
