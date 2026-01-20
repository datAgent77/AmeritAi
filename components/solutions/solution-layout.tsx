"use client"

import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"

import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/context/LanguageContext"
import { ReactNode } from "react"
import { AnimatedChat } from "./animated-chat"

interface SolutionLayoutProps {
    title: string;
    subtitle: string;
    heroImage?: string; // Optional background image or pattern
    icon: ReactNode;
    features: {
        title: string;
        description: string;
        icon: ReactNode;
    }[];
    demoLink?: string;
    promptExample?: {
        user: string;
        ai: string;
    };
    conversation?: {
        role: 'user' | 'ai';
        content: { tr: string; en: string };
    }[];
    children?: ReactNode; // For extra content
}

import { PublicBreadcrumb } from "@/components/public-breadcrumb"

// ... imports remain the same ...

export function SolutionLayout({
    title,
    subtitle,
    icon,
    features,
    demoLink = "/signup",
    promptExample,
    conversation,
    children
}: SolutionLayoutProps) {
    const { t, language } = useLanguage()

    return (
        <div className="min-h-screen bg-background text-foreground font-sans relative">
            <PublicHeader />

            {/* Hero Section */}
            <section className="pt-0 pb-20 relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <PublicBreadcrumb 
                    items={[
                        { label: language === 'tr' ? 'Sektörler' : 'Industries', href: '/industries' },
                        { label: title }
                    ]} 
                />

                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border text-sm font-medium text-foreground backdrop-blur-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {icon}
                            <span>{language === 'tr' ? 'Sektörel Çözüm' : 'Industry Solution'}</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700">
                            {title}
                        </h1>

                        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 font-light leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700">
                            {subtitle}
                        </p>

                        <div className="flex flex-col sm:flex-row justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700">
                            <Link href={demoLink}>
                                <Button className="h-14 px-8 rounded-full bg-foreground text-background hover:bg-foreground/90 text-lg shadow-xl dark:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:scale-105">
                                    {language === 'tr' ? 'Hemen Başla' : 'Get Started'} <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

                {/* Animated Chat Simulation Section */}
                {(conversation || promptExample) && (
                    <section className="py-20 border-t border-border bg-muted/30 backdrop-blur-sm">
                        <div className="container mx-auto px-4">
                            <div className="max-w-4xl mx-auto">
                                <div className="text-center mb-10">
                                    <h2 className="text-3xl font-bold mb-4 text-foreground">
                                        {language === 'tr' ? 'Gerçek Zamanlı Etkileşim' : 'Real-Time Interaction'}
                                    </h2>
                                    <p className="text-muted-foreground text-lg">
                                        {language === 'tr'
                                            ? 'Müşterilerinizle nasıl etkileşime geçtiğini izleyin.'
                                            : 'See how it interacts with your customers.'}
                                    </p>
                                </div>

                                {conversation ? (
                                    <AnimatedChat conversation={conversation} />
                                ) : (
                                    // Fallback to static if no conversation data (though we added it)
                                    <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[80px] rounded-full pointer-events-none" />
                                        {promptExample && (
                                            <>
                                                <div className="flex justify-end mb-6">
                                                    <div className="bg-muted text-muted-foreground px-5 py-3 rounded-2xl rounded-tr-sm max-w-[80%]">
                                                        {promptExample.user}
                                                    </div>
                                                </div>
                                                <div className="flex justify-start">
                                                    <div className="bg-primary text-primary-foreground px-5 py-3 rounded-2xl rounded-tl-sm max-w-[80%] shadow-lg shadow-primary/20">
                                                        {promptExample.ai}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* Features Grid */}
                <section className="py-24 bg-background/80 backdrop-blur-md">
                    <div className="container mx-auto px-4">
                        <div className="grid md:grid-cols-3 gap-8">
                            {features.map((feature, i) => (
                                <div key={i} className="p-8 rounded-2xl bg-card/50 border border-border hover:border-foreground/20 transition-all hover:-translate-y-1 backdrop-blur-sm">
                                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-6 text-foreground group-hover:scale-110 transition-transform">
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-xl font-bold mb-4 text-foreground">{feature.title}</h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {children && (
                    <section className="py-20 border-t border-border bg-muted/50">
                        <div className="container mx-auto px-4">
                            {children}
                        </div>
                    </section>
                )}

                {/* Final CTA */}
                <section className="py-24 relative overflow-hidden">
                    <div className="container mx-auto px-4 text-center">
                        <h2 className="text-3xl md:text-5xl font-bold mb-8 text-foreground tracking-tight">
                            {language === 'tr' ? 'İşletmenizi Geleceğe Taşıyın' : 'Future-Proof Your Business'}
                        </h2>
                        <Link href="/signup">
                            <Button className="h-14 px-12 text-lg bg-foreground text-background hover:bg-foreground/90 rounded-full transition-all hover:scale-105 shadow-xl dark:shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                {language === 'tr' ? 'Ücretsiz Deneyin' : 'Start Free Trial'}
                            </Button>
                        </Link>
                    </div>
                </section>

            <PublicFooter />
        </div>
    )
}
