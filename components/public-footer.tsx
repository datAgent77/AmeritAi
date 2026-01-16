"use client"

import Link from "next/link"
import { VionLogo } from "@/components/vion-logo"
import { useLanguage } from "@/context/LanguageContext"
import { Twitter, Linkedin, Github, Instagram } from "lucide-react"

export function PublicFooter() {
    const { t } = useLanguage()

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
            { label: t('footerWhyUs'), href: "/why-us" },
            { label: t('footerLogin'), href: "/login" },
            { label: t('footerSignup'), href: "/signup" },
        ]
    }

    return (
        <footer className="border-t border-white/10 bg-black pt-16 pb-8">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-12">
                    {/* Brand Column */}
                    <div className="col-span-2 lg:col-span-2 flex flex-col gap-4">
                        <Link href="/" className="flex items-center gap-2">
                            <VionLogo />
                        </Link>
                        <p className="text-sm text-gray-400 max-w-sm mt-2 leading-relaxed">
                            {t('footerDesc')}
                        </p>
                        <div className="flex items-center gap-4 mt-4">
                            <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                                <Twitter size={20} />
                            </Link>
                            <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                                <Linkedin size={20} />
                            </Link>
                            <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                                <Github size={20} />
                            </Link>
                            <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                                <Instagram size={20} />
                            </Link>
                        </div>
                    </div>

                    {/* Links Columns */}
                    <div className="col-span-1">
                        <h4 className="font-semibold text-white mb-4">{t('footerProduct')}</h4>
                        <ul className="space-y-3">
                            {footerLinks.product.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="col-span-1">
                        <h4 className="font-semibold text-white mb-4">{t('footerSolutions')}</h4>
                        <ul className="space-y-3">
                            {footerLinks.solutions.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="col-span-1">
                        <h4 className="font-semibold text-white mb-4">{t('footerResources')}</h4>
                        <ul className="space-y-3">
                            {footerLinks.resources.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="col-span-1">
                        <h4 className="font-semibold text-white mb-4">{t('footerCompany')}</h4>
                        <ul className="space-y-3">
                            {footerLinks.company.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-500">
                        {new Date().getFullYear()} Vion AI. {t('footerRights')}
                    </p>
                    <div className="flex gap-6 text-sm text-gray-500">
                        <Link href="/privacy" className="hover:text-white transition-colors">
                            {t('footerPrivacy')}
                        </Link>
                        <Link href="/terms" className="hover:text-white transition-colors">
                            {t('footerTerms')}
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
