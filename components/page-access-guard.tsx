"use client"

import { usePageAccess } from "@/lib/hooks/use-page-access"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { PlanUpgradePrompt } from "@/components/plan-upgrade-prompt"

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
    
    // If user has access, render children
    if (hasAccess) {
        return <>{children}</>
    }
    
    // If user doesn't have access, show upgrade prompt
    const featureName = pageName 
        ? pageName[language as 'en' | 'tr'] 
        : pageId
    
    return (
        <div className="mx-auto flex min-h-[70vh] w-full max-w-[1200px] items-center justify-center px-6 py-8 lg:px-8">
            <PlanUpgradePrompt
                currentPlanId={currentPlanId}
                requiredPlanId={requiredPlanId}
                featureName={featureName}
                displayMode="inline"
            />
        </div>
    )
}
