
import { useAuth } from "@/context/AuthContext"
import { getModuleUpgradeTarget, getPlanConfig } from "@/lib/pricing-config"

export type AccessReason = 'granted' | 'trial_expired' | 'not_included' | 'plan_limit'

interface UseFeatureAccessResult {
    hasAccess: boolean
    reason: AccessReason
    requiredPlan: string | null
    upgradeTarget: string | null
}

export function useFeatureAccess(featureId: string): UseFeatureAccessResult {
    const { 
        planId, 
        isTrialExpired, 
        isPaidPlan, 
        planConfig 
    } = useAuth()

    // 1. Check Trial Expiration
    // If trial expired and not on a paid plan, block everything except core features if necessary
    // But currently user wants full block. We will handle full block in layout.
    // Here we handle feature specific block.
    if (isTrialExpired && !isPaidPlan) {
        return {
            hasAccess: false,
            reason: 'trial_expired',
            requiredPlan: null,
            upgradeTarget: null
        }
    }

    // 2. Check if feature is included in the plan
    if (!planConfig) {
        // Fallback safely if no plan config
        return {
            hasAccess: false,
            reason: 'not_included',
            requiredPlan: null,
            upgradeTarget: null
        }
    }

    const { included = [] } = planConfig.modules

    // 'all' keyword support for Enterprise
    if (included.includes('all')) {
        return {
            hasAccess: true,
            reason: 'granted',
            requiredPlan: null,
            upgradeTarget: null
        }
    }

    const isIncluded = included.includes(featureId)

    if (isIncluded) {
        return {
            hasAccess: true,
            reason: 'granted',
            requiredPlan: null,
            upgradeTarget: null
        }
    }

    // 3. Feature not included - Determine upgrade target
    const targetPlan = getModuleUpgradeTarget(planId, featureId)

    return {
        hasAccess: false,
        reason: 'not_included',
        requiredPlan: targetPlan, // e.g. 'pro'
        upgradeTarget: targetPlan
    }
}
