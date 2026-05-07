"use client"

import React, { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Check, Info, Sparkles, Building2, Rocket } from "lucide-react"
import { ContactSalesForm } from "./contact-sales-form"
import { getPublicPlansSorted, formatPlanPrice, getPlanHighlightsSorted, isPreferredPlanBadge, normalizePlanId } from "@/lib/pricing-config"
import { useLanguage } from "@/context/LanguageContext"
import { cn } from "@/lib/utils"

interface PricingModalProps {
    isOpen: boolean
    onClose: () => void
    currentPlan?: string
}

const PLAN_ICONS: Record<string, any> = {
    starter: Rocket,
    growth: Sparkles,
    enterprise: Building2
}

export function PricingModal({ isOpen, onClose, currentPlan = "starter" }: PricingModalProps) {
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
    const { language, t } = useLanguage()
    const lang = language === "tr" ? "tr" : "en"
    const plans = useMemo(() => getPublicPlansSorted(), [])
    const normalizedCurrentPlan = normalizePlanId(currentPlan)

    const getPlanName = (planId: string, fallback: string) => {
        const key = `plan${planId.charAt(0).toUpperCase() + planId.slice(1)}`
        const translated = t(key)
        return translated !== key ? translated : fallback
    }

    if (selectedPlan) {
        const selected = plans.find((p) => p.planId === selectedPlan)
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {language === "tr" ? "Satış ile İletişim" : "Contact Sales"} - {getPlanName(selectedPlan, selected?.displayName || selectedPlan)}
                        </DialogTitle>
                        <DialogDescription>
                            {language === "tr"
                                ? "Yükseltme talebi için aşağıdaki formu doldurun."
                                : "Complete the form below to request an upgrade."}
                        </DialogDescription>
                    </DialogHeader>
                    <ContactSalesForm
                        planId={selectedPlan}
                        onBack={() => setSelectedPlan(null)}
                        onSuccess={onClose}
                    />
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-5xl w-full p-0 overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader className="text-center px-8 pt-8 pb-4 shrink-0 border-b">
                    <DialogTitle className="text-3xl font-bold">
                        {language === "tr" ? "Basit ve Şeffaf Fiyatlandırma" : "Simple, Transparent Pricing"}
                    </DialogTitle>
                    <DialogDescription className="text-lg">
                        {language === "tr" ? "Büyümenize uygun planı seçin." : "Choose the plan that fits your growth."}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => {
                        const Icon = PLAN_ICONS[plan.planId] || Sparkles
                        const isPopular = isPreferredPlanBadge(plan.copy.badge)
                        const isContact = plan.billing.contact
                        const price = formatPlanPrice(plan.planId, "monthly", lang)
                        const translatedSubtitle = t(plan.copy.subtitle || "")
                        const subtitle = translatedSubtitle !== (plan.copy.subtitle || "") ? translatedSubtitle : (plan.copy.subtitle || "")

                        return (
                            <div
                                key={plan.planId}
                                className={cn(
                                    "relative rounded-2xl border p-6 flex flex-col shadow-lg shadow-slate-900/5",
                                    isPopular
                                        ? "border-primary shadow-xl ring-2 ring-primary/30 bg-white dark:bg-zinc-900"
                                        : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/70"
                                )}
                            >
                                {isPopular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium shadow-sm">
                                        {t("preferredPlanTag") || (language === "tr" ? "Tercih Edilen" : "Preferred")}
                                    </div>
                                )}

                                <div className="flex items-center gap-3 mb-4">
                                    <div className={cn("p-2 rounded-lg", isPopular ? "bg-primary/10 text-primary" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300")}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{getPlanName(plan.planId, plan.displayName)}</h3>
                                        <p className="text-sm text-muted-foreground">{subtitle}</p>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <span className="text-4xl font-bold tracking-tight">
                                        {isContact ? (language === "tr" ? "Özel Teklif" : "Custom Quote") : price.split("/")[0]}
                                    </span>
                                    {!isContact && price.includes("/") && (
                                        <span className="text-muted-foreground font-medium ml-1">/{price.split("/")[1]}</span>
                                    )}
                                </div>

                                <div className="space-y-3 flex-1 mb-8">
                                    {getPlanHighlightsSorted(plan).map((feature, i) => {
                                        const isComingSoon = plan.highlights_meta?.coming_soon?.includes(feature)
                                        const isCustomModuleDevelopment = feature === "featureCustomModuleDevelopment"
                                        const translatedFeature = t(feature) !== feature ? t(feature) : feature
                                        return (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "flex items-start gap-3 text-sm",
                                                    isCustomModuleDevelopment && "rounded-lg border border-primary/20 bg-primary/5 px-2 py-1.5"
                                                )}
                                            >
                                                {isCustomModuleDevelopment ? (
                                                    <Sparkles className="w-5 h-5 flex-shrink-0 text-primary" />
                                                ) : isComingSoon ? (
                                                    <Info className="w-5 h-5 flex-shrink-0 text-amber-500" />
                                                ) : (
                                                    <Check className="w-5 h-5 flex-shrink-0 text-green-600" />
                                                )}
                                                <span className={cn(isComingSoon && "text-muted-foreground", isCustomModuleDevelopment && "font-semibold text-primary")}>
                                                    {translatedFeature}
                                                    {isComingSoon && (
                                                        <span className="ml-2 text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20">
                                                            {language === "tr" ? "Yakında" : "Soon"}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>

                                <button
                                    onClick={() => {
                                        if (plan.planId === normalizedCurrentPlan) return
                                        setSelectedPlan(plan.planId)
                                    }}
                                    disabled={plan.planId === normalizedCurrentPlan}
                                    className={cn(
                                        "w-full py-3 px-4 rounded-xl font-medium transition-all",
                                        plan.planId === normalizedCurrentPlan
                                            ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-500 cursor-default"
                                            : isPopular
                                                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg"
                                                : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                    )}
                                >
                                    {plan.planId === normalizedCurrentPlan
                                        ? (language === "tr" ? "Mevcut Plan" : "Current Plan")
                                        : isContact
                                            ? (language === "tr" ? "İletişime Geç" : "Contact Sales")
                                            : (language === "tr" ? "Planı Yükselt" : "Upgrade Plan")}
                                </button>
                            </div>
                        )
                    })}
                    </div>
                </div>

                <div className="px-8 py-6 shrink-0 border-t bg-muted/20">
                    <p className="text-xs text-center text-muted-foreground">
                        {t("fairUseUnlimited")} <span className="opacity-70">|</span> {t("fairUseWarning")}
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}
