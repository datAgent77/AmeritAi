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

import {
    ShoppingBag, Plane, Home, Code2, Briefcase, HeartPulse, GraduationCap, School, Banknote, ChefHat, Sprout,
    Eye, Gamepad2, Megaphone, ScanBarcode, MessageSquare, BookOpen, UserPlus, Mic, TrendingUp, Share2, Mail, Utensils, Star, Award, Zap, Languages, Scan, CalendarDays
} from "lucide-react"

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
    const { user } = useAuth()
    const [isScrolled, setIsScrolled] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

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
        { icon: Banknote, label: { en: "Finance", tr: "Finans & Sigorta" }, href: "/solutions/finance", color: "text-emerald-500" },
        { icon: ChefHat, label: { en: "Restaurant", tr: "Restoran & Kafe" }, href: "/solutions/restaurant", color: "text-orange-500" },
        { icon: Sprout, label: { en: "Agriculture", tr: "Tarım & Hayvancılık" }, href: "/solutions/agriculture", color: "text-green-500" },
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
        { title: { en: "Help Center (FAQ)", tr: "Yardım Merkezi (SSS)" }, href: "/resources/faq", desc: { en: "Common questions", tr: "Sıkça sorulan sorular" } },
        { title: { en: "Academy", tr: "Akademi" }, href: "/resources/education", desc: { en: "Guides and tutorials", tr: "Rehberler ve eğitimler" } },
    ]
    // ----------------------

    return (
        <nav className={cn(
            "fixed top-0 w-full z-50 border-b transition-all duration-300",
            isScrolled || !transparent
                ? "border-white/10 bg-black/80 backdrop-blur-xl supports-[backdrop-filter]:bg-black/50 shadow-lg shadow-black/5"
                : "border-transparent bg-transparent supports-[backdrop-filter]:bg-transparent"
        )}>
            <div className="container mx-auto px-4 h-20 flex items-center justify-between md:justify-start">

                {/* Logo */}
                <div className="flex items-center gap-2 mr-12">
                    <Link href="/" onClick={() => setIsOpen(false)}>
                        <VionLogo />
                    </Link>
                </div>

                {/* Desktop Nav - MEGA MENUS */}
                <div className="hidden lg:flex items-center gap-1 text-sm font-medium text-zinc-400">

                    {/* 1. SOLUTIONS DROPDOWN */}
                    <div className="group relative px-4 py-8">
                        <button className="flex items-center gap-1 hover:text-white transition-colors group-hover:text-white">
                            {language === 'tr' ? 'Sektörler' : 'Industries'} <ChevronDown className="w-3 h-3 transition-transform group-hover:rotate-180" />
                        </button>
                        <div className="absolute top-full left-0 w-[600px] bg-[#0A0A0C] border border-white/10 rounded-xl p-6 shadow-2xl shadow-black/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all translate-y-2 group-hover:translate-y-0 grid grid-cols-2 gap-4 z-50">
                            {solutions.map((item, i) => (
                                <Link key={i} href={item.href} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group/item">
                                    <div className={`p-2 rounded-md bg-white/5 ${item.color} group-hover/item:bg-white/10 transition-colors`}>
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-zinc-300 group-hover/item:text-white text-sm">
                                        {language === 'tr' ? item.label.tr : item.label.en}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* 2. MODULES DROPDOWN */}
                    <div className="group relative px-4 py-8">
                        <button className="flex items-center gap-1 hover:text-white transition-colors group-hover:text-white">
                            {language === 'tr' ? 'Modüller' : 'Modules'} <ChevronDown className="w-3 h-3 transition-transform group-hover:rotate-180" />
                        </button>
                        <div className="absolute top-full left-0 w-[900px] bg-[#0A0A0C] border border-white/10 rounded-xl p-6 shadow-2xl shadow-black/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all translate-y-2 group-hover:translate-y-0 z-50">
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                {getAllModules().slice(0, 6).map((module) => {
                                    const IconComponent = iconMapping[module.icon] || Globe
                                    return (
                                        <Link key={module.id} href={`/products/${module.id}`} className="flex items-start gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors group/item">
                                            <div className="p-2 rounded-md bg-white/5 text-zinc-400 group-hover/item:text-blue-400 group-hover/item:bg-white/10 transition-colors shrink-0">
                                                <IconComponent className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-zinc-200 font-medium group-hover/item:text-white transition-colors mb-1">
                                                    {language === 'tr' ? module.name.tr : module.name.en}
                                                </div>
                                                <div className="text-zinc-500 text-xs leading-relaxed line-clamp-2">
                                                    {language === 'tr' ? module.description.tr : module.description.en}
                                                </div>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                            <div className="pt-4 border-t border-white/10 text-center">
                                <Link href="/products" className="inline-flex items-center text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                                    {language === 'tr' ? 'Tüm Modülleri Gör' : 'View All Modules'} <ArrowRight className="ml-1 w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* 3. RESOURCES DROPDOWN */}
                    <div className="group relative px-4 py-8">
                        <button className="flex items-center gap-1 hover:text-white transition-colors group-hover:text-white">
                            {language === 'tr' ? 'Kaynaklar' : 'Resources'} <ChevronDown className="w-3 h-3 transition-transform group-hover:rotate-180" />
                        </button>
                        <div className="absolute top-full left-0 w-[400px] bg-[#0A0A0C] border border-white/10 rounded-xl p-4 shadow-2xl shadow-black/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all translate-y-2 group-hover:translate-y-0 grid gap-2 z-50">
                            {resources.map((item, i) => (
                                <Link key={i} href={item.href} className="flex flex-col p-3 rounded-lg hover:bg-white/5 transition-colors group/item">
                                    <span className="text-white font-medium mb-1 group-hover/item:text-blue-400 transition-colors">
                                        {language === 'tr' ? item.title.tr : item.title.en}
                                    </span>
                                    <span className="text-zinc-500 text-xs">
                                        {language === 'tr' ? item.desc.tr : item.desc.en}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <Link href="/pricing" className="px-4 py-8 hover:text-white transition-colors">
                        {t('landingPricing')}
                    </Link>
                    <Link href="/why-us" className="px-4 py-8 hover:text-white transition-colors">
                        {language === 'tr' ? 'Neden Biz?' : 'Why Us?'}
                    </Link>
                    <Link href="/contact" className="px-4 py-8 hover:text-white transition-colors">
                        {language === 'tr' ? 'İletişim' : 'Contact'}
                    </Link>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-4 ml-auto">
                    {/* Language Selector */}
                    <div className="hidden md:flex">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/5 gap-1 h-9">
                                    <Globe className="w-4 h-4" />
                                    <span className="uppercase">{language}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-black border-white/10">
                                <DropdownMenuItem onClick={() => setLanguage('en')} className="text-white hover:bg-white/10 cursor-pointer">
                                    English
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setLanguage('tr')} className="text-white hover:bg-white/10 cursor-pointer">
                                    Türkçe
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Auth Buttons */}
                    <div className="hidden md:flex items-center gap-3">
                        {user ? (
                            <Link href="/platform">
                                <Button className="bg-white text-black hover:bg-white/90 font-medium shadow-lg shadow-white/10 h-9 rounded-full px-6">
                                    {language === 'tr' ? 'Panele Git' : 'Go to Console'}
                                </Button>
                            </Link>
                        ) : (
                            <>
                                <Link href="/login">
                                    <Button variant="ghost" className="text-sm font-medium text-white hover:bg-white/10 h-9 rounded-full px-4">
                                        {t('login')}
                                    </Button>
                                </Link>
                                <Link href="/signup">
                                    <Button className="bg-white text-black hover:bg-white/90 font-medium shadow-lg shadow-white/10 h-9 rounded-full px-5 text-sm">
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
                                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                                    <Menu className="w-6 h-6" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="bg-zinc-950 border-l border-white/10 text-white w-[300px] p-0 flex flex-col overflow-y-auto">
                                <SheetHeader className="p-6 border-b border-white/5">
                                    <SheetTitle className="text-left text-white flex items-center justify-between">
                                        <VionLogo />
                                        <button onClick={() => setLanguage(language === 'en' ? 'tr' : 'en')} className="text-xs border border-white/20 rounded px-2 py-1 uppercase hover:bg-white/10">
                                            {language}
                                        </button>
                                    </SheetTitle>
                                </SheetHeader>

                                <div className="p-6 space-y-6">
                                    {/* Mobile Solutions */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                            {language === 'tr' ? 'Sektörler' : 'Industries'}
                                        </h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {solutions.map((item, i) => (
                                                <Link key={i} href={item.href} onClick={() => setIsOpen(false)} className="flex items-center gap-3 py-2 text-zinc-300 hover:text-white">
                                                    <item.icon className="w-4 h-4 text-zinc-500" />
                                                    {language === 'tr' ? item.label.tr : item.label.en}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Mobile Modules */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                            {language === 'tr' ? 'Modüller' : 'Modules'}
                                        </h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {getAllModules().map((module) => {
                                                const IconComponent = iconMapping[module.icon] || Globe
                                                return (
                                                    <Link key={module.id} href={`/products/${module.id}`} onClick={() => setIsOpen(false)} className="flex items-center gap-3 py-2 text-zinc-300 hover:text-white">
                                                        <IconComponent className="w-4 h-4 text-zinc-500" />
                                                        {language === 'tr' ? module.name.tr : module.name.en}
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Mobile Resources */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                            {language === 'tr' ? 'Kaynaklar' : 'Resources'}
                                        </h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {resources.map((item, i) => (
                                                <Link key={i} href={item.href} onClick={() => setIsOpen(false)} className="py-2 text-zinc-300 hover:text-white">
                                                    {language === 'tr' ? item.title.tr : item.title.en}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/10">
                                        {user ? (
                                            <Link href="/platform" onClick={() => setIsOpen(false)}>
                                                <Button className="w-full bg-white text-black hover:bg-zinc-200">
                                                    {language === 'tr' ? 'Panele Git' : 'Go to Console'}
                                                </Button>
                                            </Link>
                                        ) : (
                                            <div className="flex flex-col gap-3">
                                                <Link href="/login" onClick={() => setIsOpen(false)}>
                                                    <Button variant="outline" className="w-full border-white/10 text-white bg-transparent">
                                                        {t('login')}
                                                    </Button>
                                                </Link>
                                                <Link href="/signup" onClick={() => setIsOpen(false)}>
                                                    <Button className="w-full bg-white text-black hover:bg-zinc-200">
                                                        {t('landingGetStarted')}
                                                    </Button>
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
        </nav>
    )
}
