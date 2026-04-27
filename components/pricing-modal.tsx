"use client"

import { useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle
} from '@/components/ui/dialog'
import { getPublicPlansSorted, getPlan, formatPlanPrice, PlanConfig } from '@/lib/pricing-config'
import { BillingToggle } from '@/components/pricing/billing-toggle'
import { ModuleId } from '@/lib/modules-registry'
import { cn } from '@/lib/utils'
import { Check, Crown, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface PricingModalProps {
    isOpen: boolean
    onClose: () => void
    currentPlanId?: string
    targetModuleId?: ModuleId
}

export function PricingModal({
    isOpen,
    onClose,
    currentPlanId = 'starter',
    targetModuleId
}: PricingModalProps) {
    const { t, language } = useLanguage()
    const router = useRouter()
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
    const [isLoading, setIsLoading] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [requestedPlanId, setRequestedPlanId] = useState<string | null>(null)
    const { user } = useAuth()
    const { toast } = useToast()

    const allPlans = getPublicPlansSorted()
    const currentPlan = getPlan(currentPlanId)
    const currentSortOrder = currentPlan?.sortOrder ?? 0

    const handleUpgrade = async (planId: string) => {
        if (!user) {
            toast({
                variant: "destructive",
                title: language === 'tr' ? 'Hata' : 'Error',
                description: language === 'tr' ? 'Lütfen önce giriş yapın' : 'Please login first'
            })
            return
        }

        setIsLoading(true)
        setRequestedPlanId(planId)
        try {
            const token = await user.getIdToken()
            const response = await fetch('/api/upgrade-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    targetPlan: planId
                })
            })

            const data = await response.json()

            if (response.ok) {
                setShowSuccess(true)
            } else {
                toast({
                    variant: "destructive",
                    title: language === 'tr' ? 'Hata' : 'Error',
                    description: data.error || 'Bir hata oluştu'
                })
            }
        } catch (error) {
            console.error('Upgrade request error:', error)
            toast({
                variant: "destructive",
                title: language === 'tr' ? 'Hata' : 'Error',
                description: language === 'tr' ? 'İstek gönderilemedi' : 'Failed to send request'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleContact = () => {
        router.push('/contact')
        onClose()
    }

    // Get plan display name
    const getPlanDisplayName = (plan: PlanConfig) => {
        const key = `plan${plan.planId.charAt(0).toUpperCase() + plan.planId.slice(1)}`
        const translated = t(key)
        return translated !== key ? translated : plan.displayName
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[1400px] sm:max-w-[1400px] max-h-[90vh] p-0 overflow-hidden flex flex-col">
                {showSuccess ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px]">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 className="w-10 h-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            {language === 'tr' ? 'Talebiniz Alındı! 🚀' : 'Request Received!'}
                        </h2>
                        <p className="text-gray-500 max-w-md mb-8 text-lg">
                            {language === 'tr' 
                                ? 'Plan yükseltme talebiniz başarıyla bize ulaştı. Müşteri temsilcilerimiz en kısa sürede sizinle iletişime geçerek süreci tamamlayacaktır.' 
                                : 'Your upgrade request has been received successfully. Our customer representatives will contact you shortly to complete the process.'}
                        </p>
                        {requestedPlanId && (
                            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-800">
                                <span className="font-medium">
                                    {language === 'tr' ? 'Talep Edilen Paket:' : 'Requested Plan:'}
                                </span>
                                <span className="uppercase font-semibold">
                                    {(() => {
                                        const planConfig = getPlan(requestedPlanId)
                                        return planConfig ? getPlanDisplayName(planConfig) : requestedPlanId
                                    })()}
                                </span>
                            </div>
                        )}
                        <Button onClick={onClose} size="lg" className="min-w-[150px]">
                            {language === 'tr' ? 'Tamam, Anlaşıldı' : 'Got it'}
                        </Button>
                    </div>
                ) : (
                    <>
                        <DialogHeader className="px-6 pt-6 pb-4">
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                {language === 'tr' ? 'Planı Yükselt' : 'Upgrade Plan'}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="p-6 space-y-6 overflow-y-auto w-full" style={{ width: '100%' }}>
                    {/* Billing Toggle */}
                    <div className="flex justify-center items-end">
                        <BillingToggle 
                            billingCycle={billingCycle} 
                            onChange={setBillingCycle} 
                        />
                    </div>

                    {/* Plans - Horizontal Scroll */}
                    <div className="flex gap-4 overflow-visible pb-4 -mx-2 px-2 snap-x">
                        {allPlans.map((plan) => {
                            const isCurrentPlan = plan.planId === currentPlanId
                            const isUpgrade = plan.sortOrder > currentSortOrder
                            const isContact = plan.billing.contact
                            const price = formatPlanPrice(plan.planId, billingCycle, language as 'en' | 'tr')
                            const isPopular = plan.copy.badge === 'recommended' || plan.copy.badge === 'Önerilen'

                            return (
                                <div 
                                    key={plan.planId}
                                    className={cn(
                                        "relative flex flex-col p-5 rounded-xl border transition-all min-w-[260px] flex-1 snap-center",
                                        (isCurrentPlan || isPopular) && "pt-6",
                                        isCurrentPlan 
                                            ? "border-primary/50 bg-primary/5" 
                                            : isPopular
                                                ? "border-primary shadow-lg shadow-primary/10"
                                                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                                    )}
                                    style={isCurrentPlan ? { borderColor: 'rgba(228, 228, 231, 1)' } : undefined}
                                >
                                    {/* Badges - Above the card */}
                                    {isCurrentPlan && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                                            <span className="text-xs font-semibold text-white bg-primary px-2 py-1 rounded-full shadow-sm" style={{ backgroundColor: 'rgba(161, 161, 170, 1)' }}>
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
                                        <p className="text-sm text-muted-foreground mb-3">{t(plan.copy.subtitle || '')}</p>
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
                                            disabled={isCurrentPlan || (!!currentPlan && plan.sortOrder < currentSortOrder) || isLoading}
                                            onClick={() => isContact ? handleContact() : handleUpgrade(plan.planId)}
                                        >
                                            {isLoading && !isContact && !isCurrentPlan ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : null}
                                            
                                            {isCurrentPlan 
                                                ? (language === 'tr' ? 'Mevcut Planınız' : 'Your Plan')
                                                : isContact
                                                    ? (language === 'tr' ? 'İletişime Geç' : 'Contact Sales')
                                                    : (currentPlan && plan.sortOrder < currentSortOrder)
                                                        ? getPlanDisplayName(plan)
                                                        : (language === 'tr' ? 'Planı Yükselt' : 'Upgrade')}
                                        </Button>

                                    {/* Features List */}
                                    <div className="flex-1 space-y-2">
                                        {plan.highlights?.map((feature, i) => (
                                            <div key={i} className="flex items-start gap-2 text-sm">
                                                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                                <span className="text-muted-foreground">{t(feature)}</span>
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
                                                    <span className="text-muted-foreground text-[10px]">{t('limitWebsitesLabel') || 'Website'}</span>
                                                </div>
                                                <div className="bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded text-center">
                                                    <span className="font-semibold block">
                                                        {plan.limits.knowledge.files === 'unlimited' ? '∞' : plan.limits.knowledge.files}
                                                    </span>
                                                    <span className="text-muted-foreground text-[10px]">{t('limitFilesLabel') || 'Dosya'}</span>
                                                </div>
                                                <div className="col-span-2 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded text-center">
                                                    <span className="font-semibold block">
                                                        {plan.limits.knowledge.text === 'unlimited' ? '∞' : plan.limits.knowledge.text}
                                                    </span>
                                                    <span className="text-muted-foreground text-[10px]">{t('limitTextLabel') || 'Metin / Soru-Cevap'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Footer Note - Fixed at bottom */}
                <div className="px-6 pb-4 pt-3 border-t border-border/50">
                    <p className="text-xs text-center text-muted-foreground">
                        {t('fairUseUnlimited')}{' '}
                        <span className="opacity-70">|</span>{' '}
                        {t('fairUseWarning')}
                    </p>
                </div>
                </>
                )}
            </DialogContent>
        </Dialog>
    )
}
