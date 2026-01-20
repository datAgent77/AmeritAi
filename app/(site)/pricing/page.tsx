"use client";

import { useState } from 'react';
import { HeroBackgroundModern } from '@/components/landing/hero-background-modern';
import { PublicFooter } from '@/components/public-footer';
import { getPublicPlansSorted, PRICING_SETTINGS } from '@/lib/pricing-config';
import { BillingToggle } from '@/components/pricing/billing-toggle';
import { PricingCard } from '@/components/pricing/pricing-card';
import { Check, ShieldCheck, Zap, Headphones } from 'lucide-react';

import { PublicHeader } from '@/components/public-header';

import { useLanguage } from '@/context/LanguageContext';
import { PublicBreadcrumb } from '@/components/public-breadcrumb';

export default function PricingPage() {
    const { t } = useLanguage();
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
    const plans = getPublicPlansSorted();

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-background relative selection:bg-primary/20 flex flex-col font-sans text-foreground">
            <PublicHeader />
            
            <PublicBreadcrumb 
                items={[
                    { label: t('navPricing') }
                ]} 
            />

            <main className="relative flex-1 pt-12 pb-24 px-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-8 max-w-5xl mx-auto">
                        <h1 className="text-2xl md:text-4xl font-bold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
                            {t('pricingMainTitle')} <span className="text-primary bg-clip-text">{t('pricingMainTitleHighlight')}</span>
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed">
                            {t('pricingMainSubtitle')}
                        </p>
                    </div>

                    {/* Billing Toggle */}
                    <BillingToggle 
                        billingCycle={billingCycle} 
                        onChange={setBillingCycle} 
                    />

                    {/* Pricing Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                        {plans.map((plan, index) => (
                            <PricingCard 
                                key={plan.planId} 
                                plan={plan} 
                                billingCycle={billingCycle} 
                                index={index} 
                            />
                        ))}
                    </div>

                    {/* Fair Use Policy Warning */}
                    <div className="mt-12 max-w-fit mx-auto text-center">
                        <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-sm text-muted-foreground">

                            <p className="whitespace-normal md:whitespace-nowrap">
                                {t('fairUseUnlimited')}
                                <span className="hidden md:inline opacity-70 mx-2">|</span>
                                <span className="block md:inline mt-1 md:mt-0">{t('fairUseWarning')}</span>
                            </p>
                        </div>
                    </div>

                    {/* Features / Trust */}
                    <div className="mt-24 grid md:grid-cols-3 gap-8 text-center border-t border-border/50 pt-16">
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4 text-blue-500">
                                <Zap className="w-6 h-6" />
                            </div>
                            <h3 className="font-semibold mb-2">Hızlı Kurulum</h3>
                            <p className="text-sm text-muted-foreground">Dakikalar içinde kendi verilerinizle eğitin ve sitenize ekleyin.</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center mb-4 text-green-500">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h3 className="font-semibold mb-2">Kurumsal Güvenlik</h3>
                            <p className="text-sm text-muted-foreground">Verileriniz şifrelenir ve izniniz olmadan asla kullanılmaz.</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4 text-purple-500">
                                <Headphones className="w-6 h-6" />
                            </div>
                            <h3 className="font-semibold mb-2">7/24 Destek</h3>
                            <p className="text-sm text-muted-foreground">Uzman ekibimiz her adımda yanınızda.</p>
                        </div>
                    </div>
                </div>
            </main>

            <div className="relative z-10">
                <PublicFooter />
            </div>
        </div>
    );
}
