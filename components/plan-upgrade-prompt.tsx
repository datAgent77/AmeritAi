"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Rocket, Sparkles, Star, Zap } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { getPlanConfig } from "@/lib/pricing-config"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"

interface PlanUpgradePromptProps {
    isOpen?: boolean
    onOpenChange?: (open: boolean) => void
    featureName: string
    requiredPlanId: string | null
    currentPlanId: string
    displayMode?: 'modal' | 'inline'
}

export function PlanUpgradePrompt({ 
    isOpen = true, 
    onOpenChange, 
    featureName, 
    requiredPlanId, 
    currentPlanId,
    displayMode = 'modal'
}: PlanUpgradePromptProps) {
    const { t, language } = useLanguage()
    const { user } = useAuth()
    
    // Safety check
    if (!requiredPlanId) return null

    const targetPlanConfig = getPlanConfig(requiredPlanId)
    const targetPlanName = targetPlanConfig?.displayName || requiredPlanId.charAt(0).toUpperCase() + requiredPlanId.slice(1)
    const requestedPlanId = (user as any)?.lastUpgradeRequest?.targetPlan as string | undefined
    const requestedPlanStatus = (user as any)?.lastUpgradeRequest?.status as string | undefined
    const requestedPlanConfig = requestedPlanId ? getPlanConfig(requestedPlanId) : null
    const requestedPlanName = requestedPlanConfig?.displayName || (requestedPlanId ? requestedPlanId.charAt(0).toUpperCase() + requestedPlanId.slice(1) : '')
    const hasSubmittedRequest = !!requestedPlanId && requestedPlanStatus === 'pending'
    const isRequestedPlanMatching = requestedPlanId === requiredPlanId

    // Icons mapping for visual flair
    const PlanIcon = requiredPlanId === 'enterprise' ? Sparkles : 
                     requiredPlanId === 'pro' ? Zap :
                     requiredPlanId === 'growth' ? Rocket : Star

    const handleUpgrade = () => {
        // Redirect to detailed pricing page or open contact sales
        // For now, redirect to subscription settings
        window.location.href = '/console/settings/subscription'
    }

    const infoCard = (
        <div className={cn(
            "w-full rounded-xl border bg-card p-6 shadow-sm",
            displayMode === 'inline' ? "mx-auto max-w-3xl" : ""
        )}>
            <div className={cn(
                "flex gap-4",
                displayMode === 'inline'
                    ? "flex-col items-center text-center"
                    : "items-start"
            )}>
                <div className="bg-primary/10 p-3 rounded-xl shrink-0">
                    <PlanIcon className="w-6 h-6 text-primary" />
                </div>
                <div className={cn(
                    "flex-1 space-y-4",
                    displayMode === 'inline' ? "w-full max-w-2xl" : ""
                )}>
                    <div>
                        <h3 className="text-xl font-semibold">
                            {t('upgradeRequired') || (language === 'tr' ? 'Yükseltme Gerekli' : 'Upgrade Required')}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            <span className="font-semibold text-foreground">{featureName}</span>{" "}
                            {language === 'tr'
                                ? "özelliğini kullanmak için"
                                : "requires"}{" "}
                            <span className="font-semibold text-primary">{targetPlanName}</span>
                            {language === 'tr' ? " veya üzeri bir plan gerekir." : " or higher plan."}
                        </p>
                    </div>

                    <div className={cn(
                        "bg-muted/30 p-4 rounded-lg border border-dashed space-y-2",
                        displayMode === 'inline' ? "mx-auto w-full max-w-xl" : ""
                    )}>
                        <div className={cn(
                            "flex items-center gap-2",
                            displayMode === 'inline' ? "justify-center" : "justify-between"
                        )}>
                            <span className="text-sm text-muted-foreground">{t('currentPlan')}</span>
                            <Badge variant="outline" className="uppercase">{currentPlanId}</Badge>
                        </div>
                        <div className={cn(
                            "flex items-center gap-2",
                            displayMode === 'inline' ? "justify-center" : "justify-between"
                        )}>
                            <span className="text-sm text-muted-foreground">{t('requiredPlan')}</span>
                            <Badge className="bg-primary/20 text-primary border-primary/30 uppercase hover:bg-primary/30">
                                {targetPlanName}
                            </Badge>
                        </div>
                    </div>

                    {hasSubmittedRequest && (
                        <div className={cn(
                            "rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800",
                            displayMode === 'inline' ? "mx-auto w-full max-w-xl text-center" : ""
                        )}>
                            <div className={cn(
                                "flex items-center gap-2 font-medium",
                                displayMode === 'inline' ? "justify-center" : ""
                            )}>
                                <CheckCircle2 className="h-4 w-4" />
                                {language === 'tr' ? 'Yükseltme talebiniz alındı' : 'Upgrade request received'}
                            </div>
                            <p className="mt-1 text-sm">
                                {language === 'tr'
                                    ? `Talep edilen paket: ${requestedPlanName}.`
                                    : `Requested plan: ${requestedPlanName}.`}
                            </p>
                            {!isRequestedPlanMatching && (
                                <p className="mt-1 text-xs text-green-700/80">
                                    {language === 'tr'
                                        ? `Not: Bu sayfa için önerilen minimum paket ${targetPlanName}.`
                                        : `Note: Minimum recommended plan for this page is ${targetPlanName}.`}
                                </p>
                            )}
                        </div>
                    )}

                    <div className={cn(
                        "flex flex-wrap gap-2 pt-1",
                        displayMode === 'inline' ? "justify-center" : ""
                    )}>
                        <Button
                            onClick={handleUpgrade}
                            className="min-w-[180px]"
                            variant={hasSubmittedRequest ? "outline" : "default"}
                        >
                            {hasSubmittedRequest
                                ? (language === 'tr' ? 'Planları Tekrar Gör' : 'View Plans Again')
                                : (t('upgradeNow') || (language === 'tr' ? 'Şimdi Yükselt' : 'Upgrade Now'))}
                        </Button>
                        {displayMode === 'modal' && (
                            <Button
                                variant="ghost"
                                onClick={() => onOpenChange?.(false)}
                            >
                                {t('maybeLater') || (language === 'tr' ? 'Belki Daha Sonra' : 'Maybe Later')}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )

    if (displayMode === 'inline') {
        return infoCard
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => onOpenChange?.(open)}>
            <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
                <DialogHeader className="sr-only">
                    <DialogTitle>{t('upgradeRequired') || 'Upgrade Required'}</DialogTitle>
                    <DialogDescription>{featureName}</DialogDescription>
                </DialogHeader>
                <div className="p-6">
                    {infoCard}
                </div>
            </DialogContent>
        </Dialog>
    )
}
