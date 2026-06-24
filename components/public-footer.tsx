"use client"

import Link from "next/link"
import { VionLogo } from "@/components/vion-logo"
import { useLanguage } from "@/context/LanguageContext"
import { Twitter, Linkedin, Github, Instagram, Lock } from "lucide-react"

export function PublicFooter() {
    const { t } = useLanguage()

    const footerLinks = {
        product: [
            { label: t('allModules') || "Modules", href: "/products" },
            { label: t('landingPersonalShopper'), href: "/products/personal-shopper" },
            { label: t('modules.visualDiagnosis'), href: "/products/visual-diagnosis" },
            { label: t('modules.restaurantMenu') || "Smart Menu", href: "/products/restaurant-menu" },
            { label: t('modules.gamification'), href: "/products/gamification" },
            { label: t('modules.campaignManager'), href: "/products/campaign-manager" },
        ],
        solutions: [
            { label: t('footerEcommerce'), href: "/solutions/ecommerce" },
            { label: t('footerRealEstate'), href: "/solutions/real-estate" },
            { label: t('footerSaas'), href: "/solutions/saas" },
            { label: t('footerTravel'), href: "/solutions/booking" }, // Changed from travel to booking
            { label: t('allIndustries'), href: "/industries" },
        ],
        resources: [
            { label: t('footerBlog'), href: "/blog" },
            { label: t('footerFaq'), href: "/resources/faq" },
            // Removed /resources/education as it doesn't exist.
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
                            <div className="dark:hidden">
                                <VionLogo variant="black" />
                            </div>
                            <div className="hidden dark:block">
                                <VionLogo variant="white" />
                            </div>
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
                    {/* Payments */}
                    <div className="flex flex-wrap items-center justify-start gap-2">
                        <Lock size={14} className="text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                            {t('footerSecurePayments') || 'Secure payments powered by'}{" "}
                            <span className="font-semibold text-foreground">Stripe</span>
                        </span>
                    </div>

                    {/* Links Row */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-muted-foreground">
                            {new Date().getFullYear()} AmeritAI. {t('footerRights')}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm text-muted-foreground">
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
