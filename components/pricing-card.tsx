"use client"

import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Check, Lock, Sparkles, ArrowRight, MessageSquare,
    BookOpen, UserPlus, ShoppingBag, Mic, PenTool,
    TrendingUp, Share2, Mail
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
    getPlan,
    formatPlanPrice,
    isContactPlan,
    hasAnnualBilling,
    getAnnualDiscountLabel,
    BillingCycle,
    PRICING_SETTINGS
} from "@/lib/pricing-config"
import { getModule } from "@/lib/modules-registry"
import { trackPlanCTAClick } from "@/lib/event-tracking"
import Link from "next/link"

// Module icon mapping
const MODULE_ICONS: Record<string, any> = {
    generalAssistant: MessageSquare,
    knowledgeEducation: BookOpen,
    leadCollection: UserPlus,
    salesCatalog: ShoppingBag,
    voiceAppointments: Mic,
    aiCopywriter: PenTool,
    salesOptimization: TrendingUp,

    emailMarketing: Mail
}

interface PricingCardProps {
    planId: string
    billingCycle?: BillingCycle
    isHighlighted?: boolean
}

export function PricingCard({ planId, billingCycle = 'monthly', isHighlighted = false }: PricingCardProps) {
    const { language } = useLanguage()
    const plan = getPlan(planId)

    if (!plan) return null

    const isContact = isContactPlan(planId)
    const price = formatPlanPrice(planId, billingCycle, language === 'tr' ? 'tr' : 'en')
    const annualDiscount = getAnnualDiscountLabel(planId)
    const showAnnualDiscount = billingCycle === 'annual' && annualDiscount

    // Determine CTA action
    const ctaHref = isContact
        ? `mailto:${PRICING_SETTINGS.contactEmail}?subject=Enterprise Plan Inquiry`
        : `/register?plan=${planId}`

    return (
        <Card className={cn(
            "relative flex flex-col h-full transition-all duration-300",
            isHighlighted
                ? "border-2 border-indigo-500 shadow-xl shadow-indigo-500/10 scale-[1.02]"
                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
        )}>
            {/* Badge */}
            {plan.copy.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-500 text-white text-xs font-semibold shadow-lg">
                        <Sparkles className="w-3 h-3" />
                        {plan.copy.badge}
                    </span>
                </div>
            )}

            <CardHeader className={cn("pb-4", plan.copy.badge && "pt-8")}>
                <CardTitle className="text-xl font-bold">{plan.displayName}</CardTitle>
                {plan.copy.subtitle && (
                    <CardDescription className="text-sm text-muted-foreground">
                        {plan.copy.subtitle}
                    </CardDescription>
                )}
            </CardHeader>

            <CardContent className="flex-1 space-y-6">
                {/* Price */}
                <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold tracking-tight">
                            {price}
                        </span>
                    </div>
                    {showAnnualDiscount && (
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                            {annualDiscount}
                        </p>
                    )}
                </div>

                {/* Features */}
                <div className="space-y-3">
                    {/* Core Features */}
                    <div className="space-y-2">
                        {/* Unlimited messages */}
                        <div className="flex items-center gap-2 text-sm">
                            <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <span>{language === 'tr' ? 'Sınırsız mesaj' : 'Unlimited messages'}</span>
                        </div>

                        {/* Included modules */}
                        {plan.modules.included.slice(0, 4).map(moduleId => {
                            const mod = getModule(moduleId as any)
                            const Icon = MODULE_ICONS[moduleId] || MessageSquare

                            return (
                                <div key={moduleId} className="flex items-center gap-2 text-sm">
                                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <span>{mod?.name[language === 'tr' ? 'tr' : 'en'] || moduleId}</span>
                                </div>
                            )
                        })}

                        {/* Show "+X more" if more than 4 modules */}
                        {plan.modules.included.length > 4 && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs">+</span>
                                </div>
                                <span>
                                    {plan.modules.included.length - 4} {language === 'tr' ? 'modül daha' : 'more modules'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Premium eligibility */}
                    {plan.modules.premiumEligible.length > 0 && (
                        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
                            <p className="text-xs text-muted-foreground mb-2">
                                {language === 'tr'
                                    ? `${plan.limits.maxPremiumAddOns === 'unlimited' ? 'Sınırsız' : plan.limits.maxPremiumAddOns} premium modül seçebilirsiniz:`
                                    : `Choose ${plan.limits.maxPremiumAddOns === 'unlimited' ? 'unlimited' : plan.limits.maxPremiumAddOns} premium modules:`
                                }
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {plan.modules.premiumEligible.slice(0, 5).map(moduleId => {
                                    const mod = getModule(moduleId as any)
                                    return (
                                        <span
                                            key={moduleId}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border border-violet-200/50 dark:border-violet-800/50"
                                        >
                                            <Lock className="w-2.5 h-2.5" />
                                            {mod?.name[language === 'tr' ? 'tr' : 'en'] || moduleId}
                                        </span>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* No premium access indicator */}
                    {plan.limits.maxPremiumAddOns === 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                <Lock className="w-3 h-3 text-zinc-400" />
                            </div>
                            <span>{language === 'tr' ? 'Premium modüller kilitli' : 'Premium modules locked'}</span>
                        </div>
                    )}
                </div>
            </CardContent>

            <CardFooter className="pt-4">
                <Link
                    href={ctaHref}
                    onClick={() => trackPlanCTAClick(planId, 'pricing_page')}
                    className={cn(
                        "w-full inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium h-11 px-4 transition-colors",
                        isHighlighted
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                            : isContact
                                ? "bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900"
                                : "border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                >
                    {plan.copy.ctaLabel}
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </CardFooter>
        </Card>
    )
}
