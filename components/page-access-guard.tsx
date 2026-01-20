"use client"

import { usePageAccess } from "@/lib/hooks/use-page-access"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { PlanUpgradePrompt } from "@/components/plan-upgrade-prompt"
import { useState, useEffect } from "react"

interface PageAccessGuardProps {
    /**
     * Unique page identifier matching PAGE_ACCESS_CONFIG keys
     * e.g., 'reports', 'integrations'
     */
    pageId: string
    
    /**
     * Content to render if user has access
     */
    children: React.ReactNode
}

/**
 * Guard component that checks page access based on user's plan.
 * Shows upgrade prompt if user doesn't have access.
 */
export function PageAccessGuard({ pageId, children }: PageAccessGuardProps) {
    const { hasAccess, requiredPlanId, pageName } = usePageAccess(pageId)
    const { language } = useLanguage()
    const { planId: currentPlanId } = useAuth()
    const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
    
    // Show upgrade prompt when access is denied
    useEffect(() => {
        if (!hasAccess) {
            setShowUpgradePrompt(true)
        }
    }, [hasAccess])
    
    // If user has access, render children
    if (hasAccess) {
        return <>{children}</>
    }
    
    // If user doesn't have access, show upgrade prompt
    const featureName = pageName 
        ? pageName[language as 'en' | 'tr'] 
        : pageId
    
    return (
        <div className="flex items-center justify-center min-h-[60vh] p-8">
            <PlanUpgradePrompt
                isOpen={showUpgradePrompt}
                onOpenChange={setShowUpgradePrompt}
                currentPlanId={currentPlanId}
                requiredPlanId={requiredPlanId}
                featureName={featureName}
            />
            
            {/* Fallback message when modal is closed */}
            {!showUpgradePrompt && (
                <div className="text-center space-y-4">
                    <h2 className="text-xl font-semibold text-foreground">
                        {language === 'tr' 
                            ? 'Bu özellik mevcut planınızda bulunmuyor' 
                            : 'This feature is not available in your plan'}
                    </h2>
                    <p className="text-muted-foreground max-w-md">
                        {language === 'tr'
                            ? `${featureName} özelliğine erişmek için planınızı yükseltin.`
                            : `Upgrade your plan to access ${featureName}.`}
                    </p>
                    <button 
                        onClick={() => setShowUpgradePrompt(true)}
                        className="text-primary underline hover:no-underline"
                    >
                        {language === 'tr' ? 'Planları Görüntüle' : 'View Plans'}
                    </button>
                </div>
            )}
        </div>
    )
}
