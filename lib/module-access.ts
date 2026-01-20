/**
 * Module Access - Simplified Module Access Control
 * 
 * Single source of truth for module access logic.
 * Replaces multiple scattered functions with one simple function.
 */

import { ModuleId, SectorId, getModule, isModuleDefaultForSector } from './modules-registry'
import { 
    isModuleIncludedInPlan, 
    getModuleUpgradeTarget, 
    getPlan 
} from './pricing-config'

export interface ModuleAccess {
    // Status
    status: 'core' | 'included' | 'upgrade_required'
    
    // Badge info
    badge: 'core' | 'included' | 'trial' | null
    
    // Toggle state
    canToggle: boolean
    isLocked: boolean
    
    // Upgrade info
    upgradeTarget: string | null
    upgradeMessage: string | null
    
    // Sector compatibility (informational only)
    isSectorCompatible: boolean
    
    // Module info
    isCore: boolean
    isComingSoon: boolean
}

import { TRIAL_CONFIG } from './entitlements'

// ...

/**
 * Get module access information - Single source of truth
 * 
 * @param planId - User's current plan ID
 * @param moduleId - Module ID to check
 * @param sectorId - User's sector ID (for informational badge)
 * @param isEnabled - Whether module is currently enabled (optional)
 * @param lang - Language for messages (optional, defaults to 'tr')
 * @param isTrial - Whether the user is in trial mode (optional, defaults to false)
 */
export function getModuleAccess(
    planId: string,
    moduleId: ModuleId,
    sectorId: SectorId,
    isEnabled: boolean = false,
    lang: 'en' | 'tr' = 'tr',
    isTrial: boolean = false
): ModuleAccess {
    const mod = getModule(moduleId)
    
    // Module not found
    if (!mod) {
        return {
            status: 'upgrade_required',
            badge: null,
            canToggle: false,
            isLocked: true,
            upgradeTarget: null,
            upgradeMessage: lang === 'tr' ? 'Modül bulunamadı' : 'Module not found',
            isSectorCompatible: false,
            isCore: false,
            isComingSoon: false
        }
    }
    
    // Core modules
    if (mod.isCore) {
        return {
            status: 'core',
            badge: 'core',
            canToggle: false, // Core modules cannot be toggled
            isLocked: false,
            upgradeTarget: null,
            upgradeMessage: null,
            isSectorCompatible: mod.supportedSectors.length === 0 || 
                mod.supportedSectors.includes(sectorId),
            isCore: true,
            isComingSoon: mod.status === 'coming_soon'
        }
    }
    
    // Coming soon modules
    if (mod.status === 'coming_soon') {
        return {
            status: 'upgrade_required',
            badge: null,
            canToggle: false,
            isLocked: true,
            upgradeTarget: null,
            upgradeMessage: lang === 'tr' ? 'Yakında gelecek' : 'Coming soon',
            isSectorCompatible: mod.supportedSectors.length === 0 || 
                mod.supportedSectors.includes(sectorId),
            isCore: false,
            isComingSoon: true
        }
    }
    
    // Check if module is included in plan
    const isIncludedInPlan = isModuleIncludedInPlan(planId, moduleId)
    const isTrialOverride = isTrial && TRIAL_CONFIG.allowPremiumDuringTrial
    const hasAccess = isIncludedInPlan || isTrialOverride
    
    // Module is included in plan (or trial override)
    if (hasAccess) {
        return {
            status: 'included',
            badge: isTrialOverride && !isIncludedInPlan && mod.isPremium ? 'trial' : 'included',
            canToggle: true,
            isLocked: false,
            upgradeTarget: null,
            upgradeMessage: null,
            isSectorCompatible: mod.supportedSectors.length === 0 || 
                mod.supportedSectors.includes(sectorId),
            isCore: false,
            isComingSoon: false
        }
    }
    
    // Module is NOT included in plan - need upgrade
    const upgradeTarget = getModuleUpgradeTarget(planId, moduleId)
    const targetPlan = upgradeTarget ? getPlan(upgradeTarget) : null
    
    const upgradeMessage = upgradeTarget && targetPlan
        ? lang === 'tr'
            ? `${targetPlan.displayName} planına geçerek bu modüle erişin`
            : `Upgrade to ${targetPlan.displayName} to access this module`
        : lang === 'tr'
            ? 'Bu modül için plan yükseltmesi gerekli'
            : 'Plan upgrade required for this module'
    
    return {
        status: 'upgrade_required',
        badge: null,
        canToggle: false,
        isLocked: true,
        upgradeTarget,
        upgradeMessage,
        isSectorCompatible: mod.supportedSectors.length === 0 || 
            mod.supportedSectors.includes(sectorId),
        isCore: false,
        isComingSoon: false
    }
}

/**
 * Helper: Check if module is included in plan (simple wrapper)
 */
export function isModuleIncluded(planId: string, moduleId: ModuleId): boolean {
    return isModuleIncludedInPlan(planId, moduleId)
}

/**
 * Helper: Get upgrade target plan ID (simple wrapper)
 */
export function getUpgradeTarget(planId: string, moduleId: ModuleId): string | null {
    return getModuleUpgradeTarget(planId, moduleId)
}
