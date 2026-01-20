"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, Lock, Zap } from "lucide-react"
import { motion } from "framer-motion"
import { useLanguage } from "@/context/LanguageContext"
import { useRouter } from "next/navigation"
import { getPublicPlansSorted, formatPlanPrice, PlanConfig } from "@/lib/pricing-config"
import { BillingToggle } from "@/components/pricing/billing-toggle"
import { cn } from "@/lib/utils"

export function TrialExpiredOverlay() {
    const { t, language } = useLanguage()
    const router = useRouter()
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

    const allPlans = getPublicPlansSorted()

    // Get plan display name
    const getPlanDisplayName = (plan: PlanConfig) => {
        const key = `plan${plan.planId.charAt(0).toUpperCase() + plan.planId.slice(1)}`
        const translated = t(key)
        return translated !== key ? translated : plan.displayName
    }

    const handleUpgrade = (planId: string) => {
        router.push('/console/settings/subscription')
    }

    const handleContact = () => {
        window.location.href = '/contact'
    }

    const isUnlimitedMsg = (feature: string) => 
        feature === 'featureUnlimitedMessages' || 
        feature.includes('Sınırsız Mesajlaşma') || 
        feature.includes('Unlimited Messaging')

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md p-4 animate-in fade-in duration-500 overflow-y-auto">
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:20px_20px]" />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
                className="relative w-full max-w-5xl mx-auto py-8"
            >
                {/* Header */}
                <div className="text-center mb-8 space-y-4">
                    <div className="mx-auto w-20 h-[50px] rounded-full flex items-center justify-center gap-0">
                        <Lock className="w-8 h-8 text-black" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        {language === 'tr' ? 'Deneme Süreniz Sona Erdi' : 'Your Trial Has Expired'}
                    </h1>
                    <p className="text-lg text-muted-foreground whitespace-nowrap">
                        {language === 'tr' 
                            ? "Vion'un tüm özelliklerine erişmeye devam etmek için lütfen bir abonelik planı seçin."
                            : "Please select a subscription plan to continue accessing all Vion features."}
                    </p>
                </div>

                {/* Billing Toggle */}
                <div className="flex justify-center mb-0">
                    <BillingToggle 
                        billingCycle={billingCycle} 
                        onChange={setBillingCycle} 
                    />
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {allPlans.map((plan) => {
                        const isContact = plan.billing.contact
                        const price = formatPlanPrice(plan.planId, billingCycle, language as 'en' | 'tr')
                        const isPopular = plan.copy.badge === 'recommended' || plan.copy.badge === 'Önerilen'

                        return (
                            <div 
                                key={plan.planId}
                                className={cn(
                                    "relative flex flex-col p-5 rounded-xl border transition-all bg-white dark:bg-zinc-900",
                                    isPopular && "pt-6",
                                    isPopular
                                        ? "border-primary shadow-lg shadow-primary/10"
                                        : "border-zinc-200 dark:border-zinc-800"
                                )}
                            >
                                {/* Önerilen Badge */}
                                {isPopular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                                        <span className="text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-800 px-2 py-1 rounded-full shadow-sm">
                                            {language === 'tr' ? 'Önerilen' : 'Recommended'}
                                        </span>
                                    </div>
                                )}

                                {/* Plan Name & Price */}
                                <div className="mb-4">
                                    <h3 className="text-lg font-bold mb-1">{getPlanDisplayName(plan)}</h3>
                                    <p className="text-sm text-muted-foreground mb-3 h-10">{t(plan.copy.subtitle || '')}</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-bold">
                                            {isContact 
                                                ? (language === 'tr' ? 'Özel Teklif' : 'Custom')
                                                : price.split('/')[0]}
                                        </span>
                                        {!isContact && price.includes('/') && (
                                            <span className="text-sm text-muted-foreground">/{price.split('/')[1]}</span>
                                        )}
                                    </div>
                                    {billingCycle === 'annual' && plan.billing.annual?.discountLabel && (
                                        <p className="text-xs text-green-600 mt-1 font-medium">
                                            {t(plan.billing.annual.discountLabel)}
                                        </p>
                                    )}
                                </div>

                                {/* CTA Button */}
                                <Button 
                                    variant={isPopular ? "default" : "outline"}
                                    className={cn(
                                        "w-full mb-4",
                                        isPopular && "bg-primary hover:bg-primary/90"
                                    )}
                                    onClick={() => isContact ? handleContact() : handleUpgrade(plan.planId)}
                                >
                                    {isContact
                                        ? (language === 'tr' ? 'İletişime Geç' : 'Contact Sales')
                                        : (language === 'tr' ? 'Planı Seç' : 'Select Plan')}
                                </Button>

                                {/* Features List */}
                                <div className="flex-1 space-y-2">
                                    {plan.highlights?.map((feature, i) => (
                                        <div key={i} className="flex items-start gap-2 text-sm">
                                            {isUnlimitedMsg(feature) ? (
                                                <Zap className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
                                            ) : (
                                                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                            )}
                                            <span className={cn(
                                                "text-muted-foreground",
                                                isUnlimitedMsg(feature) && "font-semibold text-foreground"
                                            )}>
                                                {t(feature) !== feature ? t(feature) : feature}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Footer - Fair Use Policy */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-muted-foreground">
                        {language === 'tr' 
                            ? 'Tüm paketlerde mesajlaşma sınırsızdır. | Sadece sistem güvenliği için aylık 50.000 mesaj üzeri kullanımlar incelenir.'
                            : 'All plans include unlimited messaging. | For system security, usage over 50,000 messages/month is monitored.'}
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
