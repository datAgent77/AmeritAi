"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Rocket, ShieldAlert, Sparkles, Star, Zap } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { getPlanConfig } from "@/lib/pricing-config"

interface PlanUpgradePromptProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    featureName: string
    requiredPlanId: string | null
    currentPlanId: string
}

export function PlanUpgradePrompt({ 
    isOpen, 
    onOpenChange, 
    featureName, 
    requiredPlanId, 
    currentPlanId 
}: PlanUpgradePromptProps) {
    const { t } = useLanguage()
    
    // Safety check
    if (!requiredPlanId) return null

    const targetPlanConfig = getPlanConfig(requiredPlanId)
    const targetPlanName = targetPlanConfig?.displayName || requiredPlanId.charAt(0).toUpperCase() + requiredPlanId.slice(1)

    // Icons mapping for visual flair
    const PlanIcon = requiredPlanId === 'enterprise' ? Sparkles : 
                     requiredPlanId === 'pro' ? Zap :
                     requiredPlanId === 'growth' ? Rocket : Star

    const handleUpgrade = () => {
        // Redirect to detailed pricing page or open contact sales
        // For now, redirect to subscription settings
        window.location.href = '/console/settings/subscription'
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4">
                        <PlanIcon className="w-8 h-8 text-primary" />
                    </div>
                    <DialogTitle className="text-center text-xl">
                        {t('upgradeRequired') || 'Plan Yükseltme Gerekli'}
                    </DialogTitle>
                    <DialogDescription className="text-center pt-2">
                        <span className="font-semibold text-foreground">{featureName}</span> özelliğini kullanmak için <span className="font-semibold text-primary">{targetPlanName}</span> veya üzeri bir plana geçmeniz gerekmektedir.
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-muted/30 p-4 rounded-lg my-2 border border-dashed">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">{t('currentPlan')}</span>
                        <Badge variant="outline" className="uppercase">{currentPlanId}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('requiredPlan')}</span>
                        <Badge className="bg-primary/20 text-primary border-primary/30 uppercase hover:bg-primary/30">
                            {targetPlanName}
                        </Badge>
                    </div>
                </div>

                <DialogFooter className="flex-col gap-2 sm:gap-0 mt-4">
                    <Button onClick={handleUpgrade} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium shadow-lg shadow-indigo-500/20">
                        {t('upgradeNow') || 'Hemen Yükselt'}
                    </Button>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full mt-2">
                        {t('maybeLater') || 'Belki Daha Sonra'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
