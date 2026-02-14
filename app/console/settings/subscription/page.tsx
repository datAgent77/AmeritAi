"use client"

import { useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { getPublicPlansSorted, formatPlanPrice, PlanConfig } from '@/lib/pricing-config'
import { BillingToggle } from '@/components/pricing/billing-toggle'
import { Check, Loader2, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

export default function SubscriptionPage() {
    const { t, language } = useLanguage()
    const { planId: authPlanId, user } = useAuth()
    const { toast } = useToast()
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
    const [submittingPlanId, setSubmittingPlanId] = useState<string | null>(null)
    const [requestedPlanId, setRequestedPlanId] = useState<string | null>(null)

    const allPlans = getPublicPlansSorted()
    const currentPlanId = authPlanId || 'starter'
    const currentPlanConfig = allPlans.find(p => p.planId === currentPlanId)
    const profileRequestedPlanId = ((user as any)?.lastUpgradeRequest?.status === 'pending'
        ? (user as any)?.lastUpgradeRequest?.targetPlan
        : null) as string | null
    const effectiveRequestedPlanId = requestedPlanId || profileRequestedPlanId

    // Get plan display name
    const getPlanDisplayName = (plan: PlanConfig) => {
        const key = `plan${plan.planId.charAt(0).toUpperCase() + plan.planId.slice(1)}`
        const translated = t(key)
        return translated !== key ? translated : plan.displayName
    }

    const getPlanNameById = (planId: string) => {
        const plan = allPlans.find((p) => p.planId === planId)
        if (!plan) return planId.toUpperCase()
        return getPlanDisplayName(plan)
    }

    const handleUpgrade = async (planId: string) => {
        if (!user) {
            toast({
                variant: "destructive",
                title: language === 'tr' ? 'Hata' : 'Error',
                description: language === 'tr' ? 'Lütfen önce giriş yapın.' : 'Please log in first.'
            })
            return
        }

        if (submittingPlanId) return

        setSubmittingPlanId(planId)
        try {
            const token = await user.getIdToken()
            const response = await fetch('/api/upgrade-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ targetPlan: planId })
            })

            const payload = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(payload?.error || 'Request failed')
            }

            setRequestedPlanId(planId)
            toast({
                title: language === 'tr' ? 'Talebiniz Alındı' : 'Request Received',
                description: language === 'tr'
                    ? `${getPlanNameById(planId)} paketi için yükseltme talebiniz alındı.`
                    : `Your upgrade request for ${getPlanNameById(planId)} has been received.`
            })
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: language === 'tr' ? 'Hata' : 'Error',
                description: error?.message || (language === 'tr' ? 'Talep gönderilemedi.' : 'Failed to send request.')
            })
        } finally {
            setSubmittingPlanId(null)
        }
    }

    const handleContact = () => {
        window.location.href = '/contact'
    }

    return (
        <div className="space-y-6 max-w-[1200px] mx-auto">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-2xl font-bold">
                    {language === 'tr' ? 'Planınızı Yönetin' : 'Manage Your Plan'}
                </h1>
                <p className="text-muted-foreground mt-1">
                    {language === 'tr' 
                        ? 'Mevcut planınızı görüntüleyin veya yükseltin.'
                        : 'View or upgrade your current plan.'}
                </p>
            </div>

            {effectiveRequestedPlanId && (
                <div className="mx-auto max-w-xl rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800">
                    <div className="font-medium">
                        {language === 'tr' ? 'Yükseltme talebi gönderildi.' : 'Upgrade request submitted.'}
                    </div>
                    <div className="text-sm mt-1">
                        {language === 'tr'
                            ? `Talep edilen paket: ${getPlanNameById(effectiveRequestedPlanId)}`
                            : `Requested plan: ${getPlanNameById(effectiveRequestedPlanId)}`}
                    </div>
                </div>
            )}

            {/* Billing Toggle */}
            <div className="flex justify-center">
                <BillingToggle 
                    billingCycle={billingCycle} 
                    onChange={setBillingCycle} 
                />
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {allPlans.map((plan) => {
                    const isCurrentPlan = plan.planId === currentPlanId
                    const isContact = plan.billing.contact
                    const price = formatPlanPrice(plan.planId, billingCycle, language as 'en' | 'tr')
                    const isPopular = plan.copy.badge === 'recommended' || plan.copy.badge === 'Önerilen'
                    const isUnlimitedMsg = (feature: string) => 
                        feature === 'featureUnlimitedMessages' || 
                        feature.includes('Sınırsız Mesajlaşma') || 
                        feature.includes('Unlimited Messaging')

                    return (
                        <div 
                            key={plan.planId}
                            className={cn(
                                "relative flex flex-col p-5 rounded-xl border transition-all",
                                (isCurrentPlan || isPopular) && "pt-6",
                                isCurrentPlan 
                                    ? "border-primary/50 bg-primary/5" 
                                    : isPopular
                                        ? "border-primary shadow-lg shadow-primary/10"
                                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                            )}
                        >
                            {/* Badges */}
                            {isCurrentPlan && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                                    <span className="text-xs font-semibold text-white bg-zinc-500 px-2 py-1 rounded-full shadow-sm">
                                        {language === 'tr' ? 'Mevcut Plan' : 'Current'}
                                    </span>
                                </div>
                            )}
                            {isPopular && !isCurrentPlan && (
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
                                variant={isCurrentPlan ? "outline" : isPopular ? "default" : "outline"}
                                className={cn(
                                    "w-full mb-4",
                                    isPopular && !isCurrentPlan && "bg-primary hover:bg-primary/90"
                                )}
                                disabled={
                                    isCurrentPlan ||
                                    (!!currentPlanConfig && plan.sortOrder < currentPlanConfig.sortOrder) ||
                                    !!submittingPlanId
                                }
                                onClick={() => isContact ? handleContact() : handleUpgrade(plan.planId)}
                            >
                                {submittingPlanId === plan.planId && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {isCurrentPlan 
                                    ? (language === 'tr' ? 'Mevcut Planınız' : 'Your Plan')
                                    : isContact
                                        ? (language === 'tr' ? 'İletişime Geç' : 'Contact Sales')
                                        : (currentPlanConfig && plan.sortOrder < currentPlanConfig.sortOrder)
                                            ? getPlanDisplayName(plan)
                                            : (language === 'tr' ? 'Planı Yükselt' : 'Upgrade')}
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
                                            {t(feature)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Limits Section */}
                            {plan.limits.knowledge && (
                                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        {t('limitKnowledgeTitle') || 'Bilgi Tabanı Limitleri'}
                                    </p>
                                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                                        <div className="bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded text-center">
                                            <span className="font-semibold block">
                                                {plan.limits.knowledge.websites === 'unlimited' ? '∞' : plan.limits.knowledge.websites}
                                            </span>
                                            <span className="text-muted-foreground text-[10px]">{t('limitWebsitesLabel') || 'Web Sitesi'}</span>
                                        </div>
                                        <div className="bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded text-center">
                                            <span className="font-semibold block">
                                                {plan.limits.knowledge.files === 'unlimited' ? '∞' : plan.limits.knowledge.files}
                                            </span>
                                            <span className="text-muted-foreground text-[10px]">{t('limitFilesLabel') || 'Dosya'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Footer Note */}
            <div className="text-center pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                    {t('fairUseUnlimited')}{' '}
                    <span className="opacity-70">|</span>{' '}
                    {t('fairUseWarning')}
                </p>
            </div>
        </div>
    )
}
