"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { VionLogo } from "@/components/vion-logo"
import { Globe, ChevronDown, Menu, ArrowRight } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"
import { getAllModules } from "@/lib/modules-registry"
import { trackCtaClick } from "@/lib/marketing-tracking"

import {
    ShoppingBag, Plane, Home, Code2, Briefcase, HeartPulse, GraduationCap, School, Banknote, ChefHat, Sprout,
    Eye, Gamepad2, Megaphone, ScanBarcode, MessageSquare, BookOpen, UserPlus, Mic, TrendingUp, Share2, Mail, Utensils, Star, Award, Zap, Languages, Scan, CalendarDays, Sun, Moon,
    Car, ShieldCheck, Truck, Factory
} from "lucide-react"
import { useTheme } from "next-themes"

// Icon Mapping for Dynamic Modules
const iconMapping: Record<string, any> = {
    'MessageSquare': MessageSquare,
    'BookOpen': BookOpen,
    'ShoppingBag': ShoppingBag,
    'UserPlus': UserPlus,
    'Mic': Mic,
    'TrendingUp': TrendingUp,
    'Share2': Share2,
    'Mail': Mail,
    'Utensils': Utensils,
    'Star': Star,
    'Award': Award,
    'Zap': Zap,
    'Languages': Languages,
    'Gamepad2': Gamepad2,
    'Scan': Scan,
    'CalendarDays': CalendarDays
}

interface PublicHeaderProps {
    transparent?: boolean
}

export function PublicHeader({ transparent = false }: PublicHeaderProps) {
    const { t, language, setLanguage } = useLanguage()
    const { resolvedTheme, setTheme } = useTheme()
    const { user } = useAuth()
    const [isScrolled, setIsScrolled] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const languageLabels: Record<string, string> = {
        en: "English",
        tr: "Türkçe"
    }

    // --- MEGA MENU DATA ---
    const solutions = [
        { icon: ShoppingBag, label: { en: "E-Commerce", tr: "E-Ticaret" }, href: "/solutions/ecommerce", color: "text-blue-400" },
        { icon: Plane, label: { en: "Travel & Booking", tr: "Seyahat & Rezervasyon" }, href: "/solutions/booking", color: "text-sky-400" },
        { icon: Home, label: { en: "Real Estate", tr: "Emlak" }, href: "/solutions/real-estate", color: "text-indigo-400" },
        { icon: Code2, label: { en: "SaaS / Software", tr: "Yazılım & SaaS" }, href: "/solutions/saas", color: "text-cyan-400" },
        { icon: Briefcase, label: { en: "Service & Agency", tr: "Hizmet & Ajans" }, href: "/solutions/service", color: "text-orange-400" },
        { icon: HeartPulse, label: { en: "Healthcare", tr: "Sağlık" }, href: "/solutions/healthcare", color: "text-red-500" },
        { icon: GraduationCap, label: { en: "Education", tr: "Online Eğitim" }, href: "/solutions/education", color: "text-pink-400" },
        { icon: School, label: { en: "Academic", tr: "Okul & Üniversite" }, href: "/solutions/academic", color: "text-amber-400" },
        { icon: Banknote, label: { en: "Banking & Finance", tr: "Bankacılık ve Finans" }, href: "/solutions/finance", color: "text-emerald-500" },
        { icon: ChefHat, label: { en: "Restaurant", tr: "Restoran & Kafe" }, href: "/solutions/restaurant", color: "text-orange-500" },
        { icon: Sprout, label: { en: "Agriculture", tr: "Tarım & Hayvancılık" }, href: "/solutions/agriculture", color: "text-green-500" },
        { icon: Car, label: { en: "Automotive", tr: "Otomotiv" }, href: "/solutions/automotive", color: "text-slate-400" },
        { icon: ShieldCheck, label: { en: "Insurance", tr: "Sigorta" }, href: "/solutions/insurance", color: "text-blue-500" },
        { icon: Truck, label: { en: "Logistics", tr: "Lojistik" }, href: "/solutions/logistics", color: "text-yellow-500" },
        { icon: Factory, label: { en: "Manufacturing", tr: "Üretim" }, href: "/solutions/manufacturing", color: "text-stone-400" },
    ]

    const products = [
        { icon: ShoppingBag, label: { en: "Personal Shopper", tr: "Kişisel Alışveriş Asistanı" }, href: "/products/personal-shopper" },
        { icon: ChefHat, label: { en: "Smart Menu", tr: "Akıllı Menü Modülü" }, href: "/products/restaurant-menu" },
        { icon: Eye, label: { en: "Visual Diagnosis", tr: "Görsel Tanı (Vision)" }, href: "/products/visual-diagnosis" },
        { icon: Gamepad2, label: { en: "Gamification", tr: "Oyunlaştırma & Lead" }, href: "/products/gamification" },
        { icon: Megaphone, label: { en: "Campaign Manager", tr: "Kampanya Yöneticisi" }, href: "/products/campaign-manager" },
    ]

    const resources = [
        { title: { en: "Blog", tr: "Blog" }, href: "/blog", desc: { en: "Industry insights and news", tr: "Sektörel haberler ve içgörüler" } },
        { title: { en: "Help Center (FAQ)", tr: "Yardım Merkezi (SSS)" }, href: "/resources/faq", desc: { en: "Common questions", tr: "Sıkça sorulan sorular" } }
    ]
    // ----------------------

    const [activeAccordion, setActiveAccordion] = useState<string | null>(null)

    const toggleAccordion = (id: string) => {
        setActiveAccordion(activeAccordion === id ? null : id)
    }

    return (
        <nav className={cn(
            "fixed top-0 w-full z-50 border-b transition-all duration-300",
            isScrolled || !transparent
                ? "border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50 shadow-sm"
                : "border-transparent bg-transparent supports-[backdrop-filter]:bg-transparent"
        )}>
            <div className="container mx-auto px-4 h-20 flex items-center justify-between md:justify-start">

                {/* Logo */}
                <div className="flex items-center gap-2 mr-12">
                    <Link href="/" onClick={() => setIsOpen(false)}>
                        <div className="dark:hidden">
                            <VionLogo variant="black" />
                        </div>
                        <div className="hidden dark:block">
                            <VionLogo variant="white" />
                        </div>
                    </Link>
                </div>

                {/* Desktop Nav - MEGA MENUS */}
                <div className="hidden lg:flex items-center gap-1 text-sm font-medium text-muted-foreground">

                    {/* 1. SOLUTIONS DROPDOWN */}
                    <div className="group relative px-4 py-8">
                        <button className="flex items-center gap-1 hover:text-foreground transition-colors group-hover:text-foreground">
                            {language === 'tr' ? 'Sektörler' : 'Industries'} <ChevronDown className="w-3 h-3 transition-transform group-hover:rotate-180" />
                        </button>
                        <div className="absolute top-full left-0 w-[900px] bg-popover border border-border rounded-xl p-6 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all translate-y-2 group-hover:translate-y-0 z-50">
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                {solutions.map((item, i) => (
                                    <Link key={i} href={item.href} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors group/item">
                                        <div className="p-2 rounded-md bg-transparent text-foreground group-hover/item:text-foreground transition-colors">
                                            <item.icon className="w-4 h-4" />
                                        </div>
                                        <span className="text-muted-foreground group-hover/item:text-foreground text-sm">
                                            {language === 'tr' ? item.label.tr : item.label.en}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                            <div className="pt-4 border-t border-border text-center">
                                <Link href="/industries" className="inline-flex items-center text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                                    {language === 'tr' ? 'Tüm Sektörleri Gör' : 'View All Industries'} <ArrowRight className="ml-1 w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* 2. MODULES DROPDOWN */}
                    <div className="group relative px-4 py-8">
                        <button className="flex items-center gap-1 hover:text-foreground transition-colors group-hover:text-foreground">
                            {language === 'tr' ? 'Skills' : 'Skills'} <ChevronDown className="w-3 h-3 transition-transform group-hover:rotate-180" />
                        </button>
                        <div className="absolute top-full left-0 w-[900px] bg-popover border border-border rounded-xl p-6 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all translate-y-2 group-hover:translate-y-0 z-50">
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                {getAllModules().slice(0, 6).map((module) => {
                                    const IconComponent = iconMapping[module.icon] || Globe
                                    return (
                                        <Link key={module.id} href={`/products/${module.id}`} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted transition-colors group/item">
                                            <div className="p-2 rounded-md bg-muted/50 text-muted-foreground group-hover/item:text-blue-400 group-hover/item:bg-muted transition-colors shrink-0">
                                                <IconComponent className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-foreground/80 font-medium group-hover/item:text-foreground transition-colors mb-1">
                                                    {language === 'tr' ? module.name.tr : module.name.en}
                                                </div>
                                                <div className="text-muted-foreground text-xs leading-relaxed line-clamp-2">
                                                    {language === 'tr' ? module.description.tr : module.description.en}
                                                </div>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                            <div className="pt-4 border-t border-border text-center">
                                <Link href="/products" className="inline-flex items-center text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                                    {language === 'tr' ? 'Tüm Skills\'leri Gör' : 'View All Skills'} <ArrowRight className="ml-1 w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* 3. RESOURCES DROPDOWN */}
                    <div className="group relative px-4 py-8">
                        <button className="flex items-center gap-1 hover:text-foreground transition-colors group-hover:text-foreground">
                            {language === 'tr' ? 'Kaynaklar' : 'Resources'} <ChevronDown className="w-3 h-3 transition-transform group-hover:rotate-180" />
                        </button>
                        <div className="absolute top-full left-0 w-[400px] bg-popover border border-border rounded-xl p-4 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all translate-y-2 group-hover:translate-y-0 grid gap-2 z-50">
                            {resources.map((item, i) => (
                                <Link key={i} href={item.href} className="flex flex-col p-3 rounded-lg hover:bg-muted transition-colors group/item">
                                    <span className="text-foreground font-medium mb-1 group-hover/item:text-blue-400 transition-colors">
                                        {language === 'tr' ? item.title.tr : item.title.en}
                                    </span>
                                    <span className="text-muted-foreground text-xs">
                                        {language === 'tr' ? item.desc.tr : item.desc.en}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <Link
                        href="/pricing"
                        className="px-4 py-8 hover:text-foreground transition-colors"
                        onClick={() =>
                            trackCtaClick({
                                location: "header_desktop",
                                ctaLabel: "pricing_nav",
                                destination: "/pricing",
                                language,
                                metadata: { link_variant: "header_pricing_nav_v1" },
                            })
                        }
                    >
                        {t('landingPricing')}
                    </Link>
                    <Link
                        href="/demo"
                        className="px-4 py-8 hover:text-foreground transition-colors"
                        onClick={() =>
                            trackCtaClick({
                                location: "header_desktop",
                                ctaLabel: "demo_nav",
                                destination: "/demo",
                                language
                            })
                        }
                    >
                        Demo
                    </Link>
                    <Link href="/why-us" className="px-4 py-8 hover:text-foreground transition-colors">
                        {language === 'tr' ? 'Neden Biz?' : 'Why Us?'}
                    </Link>
                    <Link href="/contact" className="px-4 py-8 hover:text-foreground transition-colors">
                        {language === 'tr' ? 'İletişim' : 'Contact'}
                    </Link>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-4 ml-auto">
                    {/* Language Selector */}
                    <div className="hidden md:flex">
                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted gap-1 h-9">
                                    <Globe className="w-4 h-4" />
                                    <span className="uppercase">{language}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border-border">
                                <DropdownMenuItem onClick={() => setLanguage('en')} className="text-foreground hover:bg-muted cursor-pointer">
                                    English
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setLanguage('tr')} className="text-foreground hover:bg-muted cursor-pointer">
                                    Türkçe
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Theme Toggle */}
                    <div className="hidden md:flex">
                        {mounted && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                                className="rounded-full w-10 h-10 text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                                {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                                <span className="sr-only">Toggle theme</span>
                            </Button>
                        )}
                    </div>

                    {/* Auth Buttons */}
                    <div className="hidden md:flex items-center gap-3">
                        {user ? (
                            <Link
                                href="/platform"
                                onClick={() =>
                                    trackCtaClick({
                                        location: "header_desktop",
                                        ctaLabel: "go_to_console",
                                        destination: "/platform",
                                        language
                                    })
                                }
                            >
                                <Button className="bg-foreground text-background hover:bg-foreground/90 font-medium shadow-lg h-9 rounded-full px-6">
                                    {language === 'tr' ? 'Panele Git' : 'Go to Console'}
                                </Button>
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    onClick={() =>
                                        trackCtaClick({
                                            location: "header_desktop",
                                            ctaLabel: "login",
                                            destination: "/login",
                                            language
                                        })
                                    }
                                >
                                    <Button variant="ghost" className="text-sm font-medium text-foreground hover:text-foreground hover:bg-muted h-9 rounded-full px-4">
                                        {t('login')}
                                    </Button>
                                </Link>
                                <Link
                                    href="/signup"
                                    onClick={() =>
                                        trackCtaClick({
                                            location: "header_desktop",
                                            ctaLabel: "get_started",
                                            destination: "/signup",
                                            language
                                        })
                                    }
                                >
                                    <Button className="bg-foreground text-background hover:bg-foreground/90 font-medium shadow-lg h-9 rounded-full px-5 text-sm">
                                        {t('landingGetStarted')}
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Hamburger Menu */}
                    <div className="lg:hidden">
                        <Sheet open={isOpen} onOpenChange={setIsOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-foreground hover:bg-muted">
                                    <Menu className="w-6 h-6" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="bg-background border-l border-border text-foreground w-[300px] p-0 flex flex-col overflow-y-auto">
                                <SheetHeader className="p-6 border-b border-border">
                                    <SheetTitle className="text-left text-foreground flex items-center justify-between">
                                        <div className="dark:hidden">
                                            <VionLogo variant="black" />
                                        </div>
                                        <div className="hidden dark:block">
                                            <VionLogo variant="white" />
                                        </div>
                                        <button onClick={() => setLanguage(language === 'en' ? 'tr' : 'en')} className="text-xs border border-border rounded px-2 py-1 uppercase hover:bg-muted mr-8">
                                            {language}
                                        </button>
                                    </SheetTitle>
                                </SheetHeader>

                                {/* Authentication Buttons (Top) */}
                                <div className="p-4 bg-muted/50 border-b border-border">
                                    {!user ? (
                                        <div className="flex gap-2">
                                            <Link
                                                href="/login"
                                                onClick={() => {
                                                    trackCtaClick({
                                                        location: "header_mobile",
                                                        ctaLabel: "login",
                                                        destination: "/login",
                                                        language
                                                    })
                                                    setIsOpen(false)
                                                }}
                                                className="flex-1"
                                            >
                                                <Button variant="outline" className="w-full border-border text-foreground bg-transparent hover:bg-muted h-9">
                                                    {t('login')}
                                                </Button>
                                            </Link>
                                            <Link
                                                href="/signup"
                                                onClick={() => {
                                                    trackCtaClick({
                                                        location: "header_mobile",
                                                        ctaLabel: "get_started",
                                                        destination: "/signup",
                                                        language
                                                    })
                                                    setIsOpen(false)
                                                }}
                                                className="flex-1"
                                            >
                                                <Button className="w-full bg-foreground text-background hover:bg-muted-foreground/20 h-9">
                                                    {t('landingGetStarted')}
                                                </Button>
                                            </Link>
                                        </div>
                                    ) : (
                                        <Link
                                            href="/platform"
                                            onClick={() => {
                                                trackCtaClick({
                                                    location: "header_mobile",
                                                    ctaLabel: "go_to_console",
                                                    destination: "/platform",
                                                    language
                                                })
                                                setIsOpen(false)
                                            }}
                                        >
                                            <Button className="w-full bg-foreground text-background hover:bg-muted-foreground/20">
                                                {language === 'tr' ? 'Panele Git' : 'Go to Console'}
                                            </Button>
                                        </Link>
                                    )}
                                </div>

                                <div className="flex-1 px-4 py-6 space-y-1">
                                    {/* Mobile Solutions Accordion */}
                                    <div className="border-b border-border">
                                        <button
                                            onClick={() => toggleAccordion('solutions')}
                                            className="flex items-center justify-between w-full py-3 text-sm font-medium text-foreground"
                                        >
                                            {language === 'tr' ? 'Sektörler' : 'Industries'}
                                            <ChevronDown className={cn("w-4 h-4 transition-transform", activeAccordion === 'solutions' ? "rotate-180" : "")} />
                                        </button>
                                        <div className={cn("grid gap-1 overflow-hidden transition-all duration-300", activeAccordion === 'solutions' ? "max-h-[500px] pb-3" : "max-h-0")}>
                                            {solutions.map((item, i) => (
                                                <Link key={i} href={item.href} onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-2 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted">
                                                    <item.icon className="w-4 h-4 text-muted-foreground" />
                                                    {language === 'tr' ? item.label.tr : item.label.en}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Mobile Modules Accordion */}
                                    <div className="border-b border-border">
                                        <button
                                            onClick={() => toggleAccordion('modules')}
                                            className="flex items-center justify-between w-full py-3 text-sm font-medium text-foreground"
                                        >
                                            {language === 'tr' ? 'Skills' : 'Skills'}
                                            <ChevronDown className={cn("w-4 h-4 transition-transform", activeAccordion === 'modules' ? "rotate-180" : "")} />
                                        </button>
                                        <div className={cn("grid gap-1 overflow-hidden transition-all duration-300", activeAccordion === 'modules' ? "max-h-[500px] pb-3" : "max-h-0")}>
                                            {getAllModules().map((module) => {
                                                const IconComponent = iconMapping[module.icon] || Globe
                                                return (
                                                    <Link key={module.id} href={`/products/${module.id}`} onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-2 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted">
                                                        <IconComponent className="w-4 h-4 text-muted-foreground" />
                                                        {language === 'tr' ? module.name.tr : module.name.en}
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Mobile Resources Accordion */}
                                    <div className="border-b border-border">
                                        <button
                                            onClick={() => toggleAccordion('resources')}
                                            className="flex items-center justify-between w-full py-3 text-sm font-medium text-foreground"
                                        >
                                            {language === 'tr' ? 'Kaynaklar' : 'Resources'}
                                            <ChevronDown className={cn("w-4 h-4 transition-transform", activeAccordion === 'resources' ? "rotate-180" : "")} />
                                        </button>
                                        <div className={cn("grid gap-1 overflow-hidden transition-all duration-300", activeAccordion === 'resources' ? "max-h-[300px] pb-3" : "max-h-0")}>
                                            {resources.map((item, i) => (
                                                <Link key={i} href={item.href} onClick={() => setIsOpen(false)} className="flex flex-col px-2 py-2 rounded-md hover:bg-muted">
                                                    <span className="text-sm text-muted-foreground group-hover/item:text-foreground transition-colors">{language === 'tr' ? item.title.tr : item.title.en}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Direct Links */}
                                    <Link
                                        href="/pricing"
                                        onClick={() => {
                                            trackCtaClick({
                                                location: "header_mobile",
                                                ctaLabel: "pricing_nav",
                                                destination: "/pricing",
                                                language,
                                                metadata: { link_variant: "header_pricing_nav_v1" },
                                            })
                                            setIsOpen(false)
                                        }}
                                        className="flex items-center justify-between w-full py-3 text-sm font-medium text-foreground border-b border-border"
                                    >
                                        {t('landingPricing')}
                                    </Link>
                                    <Link
                                        href="/demo"
                                        onClick={() => {
                                            trackCtaClick({
                                                location: "header_mobile",
                                                ctaLabel: "demo_nav",
                                                destination: "/demo",
                                                language
                                            })
                                            setIsOpen(false)
                                        }}
                                        className="flex items-center justify-between w-full py-3 text-sm font-medium text-foreground border-b border-border"
                                    >
                                        Demo
                                    </Link>
                                    <Link href="/why-us" onClick={() => setIsOpen(false)} className="flex items-center justify-between w-full py-3 text-sm font-medium text-foreground border-b border-border">
                                        {language === 'tr' ? 'Neden Biz?' : 'Why Us?'}
                                    </Link>
                                    <Link href="/contact" onClick={() => setIsOpen(false)} className="flex items-center justify-between w-full py-3 text-sm font-medium text-foreground">
                                        {language === 'tr' ? 'İletişim' : 'Contact'}
                                    </Link>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
        </nav>
    )
}
