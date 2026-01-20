"use client"

import { useAuth } from "@/context/AuthContext"
import { getPlan } from "@/lib/pricing-config"

/**
 * Page access configuration
 * Maps page IDs to minimum required plan (by sortOrder)
 */
const PAGE_ACCESS_CONFIG: Record<string, {
    minSortOrder: number
    minPlanId: string
    pageName: { en: string; tr: string }
}> = {
    // Growth+ pages (sortOrder >= 2)
    analytics: {
        minSortOrder: 2,
        minPlanId: 'growth',
        pageName: { en: 'Advanced Reporting', tr: 'Gelişmiş Raporlama' }
    },
    // Note: 'integration' page is accessible to all plans
    // Individual integration methods are restricted in integration-page.tsx
    // Add more pages as needed
}

export interface PageAccessResult {
    hasAccess: boolean
    requiredPlanId: string | null
    pageName: { en: string; tr: string } | null
    currentPlanSortOrder: number
    requiredSortOrder: number
}

/**
 * Hook to check if current user has access to a specific page
 * @param pageId - Unique identifier for the page
 * @returns PageAccessResult with access status and upgrade info
 */
export function usePageAccess(pageId: string): PageAccessResult {
    const { planId, role } = useAuth()
    
    // Super Admin always has access
    if (role === 'SUPER_ADMIN') {
        return {
            hasAccess: true,
            requiredPlanId: null,
            pageName: null,
            currentPlanSortOrder: 999,
            requiredSortOrder: 0
        }
    }
    
    const pageConfig = PAGE_ACCESS_CONFIG[pageId]
    
    // If page not in config, allow access by default
    if (!pageConfig) {
        return {
            hasAccess: true,
            requiredPlanId: null,
            pageName: null,
            currentPlanSortOrder: 0,
            requiredSortOrder: 0
        }
    }
    
    const currentPlan = getPlan(planId)
    const currentSortOrder = currentPlan?.sortOrder ?? 1 // Default to Starter level
    
    const hasAccess = currentSortOrder >= pageConfig.minSortOrder
    
    return {
        hasAccess,
        requiredPlanId: hasAccess ? null : pageConfig.minPlanId,
        pageName: hasAccess ? null : pageConfig.pageName,
        currentPlanSortOrder: currentSortOrder,
        requiredSortOrder: pageConfig.minSortOrder
    }
}

/**
 * Get page access config for external use (e.g., sidebar menu filtering)
 */
export function getPageAccessConfig() {
    return PAGE_ACCESS_CONFIG
}
