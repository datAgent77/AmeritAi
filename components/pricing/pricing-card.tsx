'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { PlanConfig, formatPlanPrice } from '@/lib/pricing-config';
import { Check, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { trackCtaClick, trackMarketingEvent, trackPricingPlanSelect } from '@/lib/marketing-tracking';

interface PricingCardProps {
    plan: PlanConfig;
    billingCycle: 'monthly' | 'annual';
    index: number;
    isRecommended?: boolean;
}

export function PricingCard({ plan, billingCycle, index, isRecommended = false }: PricingCardProps) {
    const { t, language } = useLanguage();
    const isPopular = isRecommended || plan.copy.badge === 'recommended' || plan.copy.badge === 'Önerilen' || plan.copy.badge === 'Recommended';
    const priceDisplay = formatPlanPrice(plan.planId, billingCycle, language as 'en' | 'tr');
    const isContact = plan.billing.contact;
    const selectedBilling = billingCycle === 'annual'
        ? plan.billing.annual ?? plan.billing.monthly
        : plan.billing.monthly;

    // Helper to get translated plan name
    const getPlanName = (id: string) => {
        const key = `plan${id.charAt(0).toUpperCase() + id.slice(1)}`;
        return t(key);
    };

    const planName = getPlanName(plan.planId);

    const handlePlanClick = () => {
        if (isContact) {
            trackCtaClick({
                location: 'pricing_page',
                ctaLabel: 'contact_sales',
                destination: '/contact',
                language
            });
            return;
        }

        trackPricingPlanSelect({
            planId: plan.planId,
            billingCycle,
            price: selectedBilling?.amount ?? 0,
            currency: selectedBilling?.currency ?? (language === 'tr' ? 'TRY' : 'USD'),
            location: 'pricing_page',
            language
        });
        trackMarketingEvent('begin_checkout', {
            plan_id: plan.planId,
            billing_cycle: billingCycle,
            price: selectedBilling?.amount ?? 0,
            currency: selectedBilling?.currency ?? (language === 'tr' ? 'TRY' : 'USD'),
            language,
            value: selectedBilling?.amount ?? 0
        });

        trackCtaClick({
            location: 'pricing_page',
            ctaLabel: 'plan_selected',
            destination: `/signup?plan=${plan.planId}&cycle=${billingCycle}`,
            language
        });
    };
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
                "relative flex flex-col p-5 rounded-xl border transition-all h-full",
                isPopular && "pt-6",
                isPopular 
                    ? "border-primary shadow-lg shadow-primary/10 bg-card" 
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
            )}
        >
            {/* Badge */}
            {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-800 px-2 py-1 rounded-full shadow-sm">
                        {t('recommended')}
                    </span>
                </div>
            )}

            {/* Plan Name & Description */}
            <div className="mb-4">
                <h3 className="text-lg font-bold mb-1">
                    {planName === `plan${plan.planId.charAt(0).toUpperCase() + plan.planId.slice(1)}` ? plan.displayName : planName}
                </h3>
                <p className="text-sm text-muted-foreground mb-3 h-10">{t(plan.copy.subtitle || '')}</p>
                
                {/* Price */}
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">
                        {isContact 
                            ? (language === 'tr' ? 'Özel Teklif' : 'Custom')
                            : priceDisplay.split('/')[0]}
                    </span>
                    {!isContact && priceDisplay.includes('/') && (
                        <span className="text-sm text-muted-foreground">/{priceDisplay.split('/')[1]}</span>
                    )}
                </div>
                {billingCycle === 'annual' && plan.billing.annual?.discountLabel && (
                    <p className="text-xs text-green-600 mt-1 font-medium">
                        {t(plan.billing.annual.discountLabel)}
                    </p>
                )}
            </div>

            {/* CTA Button */}
            {isContact ? (
                <Link href="/contact" className="w-full mb-4 block" onClick={handlePlanClick}>
                    <Button 
                        variant={isPopular ? "default" : "outline"}
                        className={cn("w-full", isPopular && "bg-primary hover:bg-primary/90")}
                    >
                        {t(plan.copy.ctaLabel)}
                    </Button>
                </Link>
            ) : (
                <Link 
                    href={`/signup?plan=${plan.planId}&cycle=${billingCycle}`} 
                    className="w-full mb-4 block"
                    onClick={handlePlanClick}
                >
                    <Button 
                        variant={isPopular ? "default" : "outline"}
                        className={cn("w-full", isPopular && "bg-primary hover:bg-primary/90")}
                    >
                        {t(plan.copy.ctaLabel)}
                    </Button>
                </Link>
            )}

            {/* Features List - Modal Style */}
            <div className="flex-1 space-y-2">
                {plan.highlights?.map((feature: string, i: number) => {
                    const isComingSoon = plan.highlights_meta?.coming_soon?.includes(feature);
                    
                    return (
                        <div key={i} className="flex items-start gap-2 text-sm">
                            {isComingSoon ? (
                                <Info className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                            ) : (
                                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            )}
                            <span className={cn(
                                "text-foreground",
                                isComingSoon && "text-muted-foreground/80"
                            )}>
                                {t(feature)}
                                {isComingSoon && (
                                    <span className="ml-2 text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/20">
                                        {language === 'tr' ? 'Yakında' : 'Soon'}
                                    </span>
                                )}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Knowledge Limits Section - Modal Style */}
            {plan.limits.knowledge && (
                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        {t('limitKnowledgeTitle') || 'Bilgi Tabanı Limitleri'}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <div className="bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded text-center">
                            <span className="font-semibold block">
                                {plan.limits.knowledge.websites === 'unlimited' ? (language === 'tr' ? 'Sınırsız' : 'Unlimited') : plan.limits.knowledge.websites}
                            </span>
                            <span className="text-muted-foreground text-[10px]">{t('limitWebsitesLabel') || 'Web Sitesi Tarama'}</span>
                        </div>
                        <div className="bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded text-center">
                            <span className="font-semibold block">
                                {plan.limits.knowledge.files === 'unlimited' ? (language === 'tr' ? 'Sınırsız' : 'Unlimited') : plan.limits.knowledge.files}
                            </span>
                            <span className="text-muted-foreground text-[10px]">{t('limitFilesLabel') || 'Dosya (PDF/Doc)'}</span>
                        </div>
                        <div className="col-span-2 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded text-center">
                            <span className="font-semibold block">
                                {plan.limits.knowledge.text === 'unlimited' ? (language === 'tr' ? 'Sınırsız' : 'Unlimited') : plan.limits.knowledge.text}
                            </span>
                            <span className="text-muted-foreground text-[10px]">{t('limitTextLabel') || 'Metin / Soru-Cevap'}</span>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
