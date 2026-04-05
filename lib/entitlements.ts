/**
 * Entitlements System
 * 
 * Defines plan rules, tenant entitlements, and access control logic.
 * 
 * DESIGN DECISIONS:
 * - Unlimited messages on all plans (messageLimit = Infinity)
 * - 14-day free trial for all new tenants
 * - Trial includes ONLY sector defaults, premium add-ons are LOCKED (Decision A)
 * - Premium add-ons require paid plan or explicit add-on purchase
 * 
 * TRIAL POLICY (Decision A - Monetization Safe):
 * During the 14-day trial:
 * - ✅ Sector default modules are enabled
 * - ❌ Premium add-on modules are LOCKED
 * - Users can SEE premium modules but cannot USE them
 * - This encourages upgrade after trial
 */

import {
    ModuleId,
    SectorId,
    getModule,
    getDefaultModulesForSector,
    isModuleDefaultForSector,
    getCoreModules
} from './modules-registry';
import {
    getPlan as getPlanConfig,
    canSelectPremiumAddOn,
    planExists,
    isModuleIncludedInPlan,
    getModuleUpgradeTarget
} from './pricing-config';

// =============================================================================
// PLAN COMPATIBILITY
// =============================================================================

/**
 * PlanId is now a dynamic string to support unlimited plans from pricing-config.
 * Legacy exports maintained for backward compatibility.
 */
export type PlanId = string;

/**
 * @deprecated Use getPlan() from pricing-config.ts instead
 * Kept for backward compatibility
 */
export interface PlanDefinition {
    id: string;
    name: { en: string; tr: string };
    messageLimit: number;
    canAccessPremiumModules: boolean;
    maxAddOns: number;
    monthlyPrice: number;
    yearlyPrice: number;
}

/**
 * @deprecated PLANS record is deprecated.
 * Use getPlan() from pricing-config.ts for dynamic plan lookups.
 * This legacy object is kept for backward compatibility only.
 */
export const PLANS: Record<string, PlanDefinition> = {
    trial: {
        id: 'trial',
        name: { en: 'Free Trial', tr: 'Ücretsiz Deneme' },
        messageLimit: Infinity,
        canAccessPremiumModules: false,
        maxAddOns: 0,
        monthlyPrice: 0,
        yearlyPrice: 0
    },
    starter: {
        id: 'starter',
        name: { en: 'Starter', tr: 'Başlangıç' },
        messageLimit: Infinity,
        canAccessPremiumModules: false,
        maxAddOns: 0,
        monthlyPrice: 0,
        yearlyPrice: 0
    },
    pro: {
        id: 'pro',
        name: { en: 'Professional', tr: 'Profesyonel' },
        messageLimit: Infinity,
        canAccessPremiumModules: true,
        maxAddOns: 3,
        monthlyPrice: 79,
        yearlyPrice: 790
    },
    enterprise: {
        id: 'enterprise',
        name: { en: 'Enterprise', tr: 'Kurumsal' },
        messageLimit: Infinity,
        canAccessPremiumModules: true,
        maxAddOns: -1,
        monthlyPrice: 199,
        yearlyPrice: 1990
    }
};

// =============================================================================
// TRIAL CONFIGURATION
// =============================================================================

export const TRIAL_CONFIG = {
    durationDays: 14,

    /**
     * Decision A: During trial, premium add-ons are LOCKED.
     * Set to true to allow premium modules during trial (Decision B).
     */
    allowPremiumDuringTrial: false
};

// =============================================================================
// TENANT ENTITLEMENT TYPES
// =============================================================================

/**
 * Tenant Entitlement Object
 * 
 * Firestore path: users/{tenantId}
 * This structure is stored as part of the user document.
 */
export interface TenantEntitlements {
    tenantId: string;
    planId: PlanId;
    sectorId: SectorId;

    trial: {
        isActive: boolean;
        startAt: string | null;  // ISO date string
        endAt: string | null;    // ISO date string
    };

    modules: {
        /**
         * Currently enabled modules (sector defaults + manually enabled).
         */
        enabled: ModuleId[];

        /**
         * Premium add-ons purchased or granted to this tenant.
         * Only applicable for Pro+ plans.
         */
        addOns: ModuleId[];
    };

    createdAt: string;
    updatedAt: string;
}

// =============================================================================
// MODULE ACCESS RESULT
// =============================================================================

export type ModuleAccessStatus =
    | 'enabled'           // Module is active and usable
    | 'available'         // Can be enabled (free for sector)
    | 'premium_locked'    // Needs upgrade or add-on purchase
    | 'not_supported'     // Not available for this sector
    | 'addon_required';   // On paid plan but needs add-on

export interface ModuleAccessResult {
    moduleId: ModuleId;
    status: ModuleAccessStatus;
    reason?: string;
    upgradeHint?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if trial is currently active
 */
export function isTrialActive(entitlements: TenantEntitlements, now: Date = new Date()): boolean {
    if (!entitlements.trial.isActive) return false;
    if (!entitlements.trial.endAt) return false;

    const endDate = new Date(entitlements.trial.endAt);
    return now < endDate;
}

/**
 * Get days remaining in trial
 */
export function getTrialDaysRemaining(entitlements: TenantEntitlements, now: Date = new Date()): number {
    if (!isTrialActive(entitlements, now)) return 0;
    if (!entitlements.trial.endAt) return 0;

    const endDate = new Date(entitlements.trial.endAt);
    const diffMs = endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Get plan definition - now proxies to pricing-config
 * Falls back to legacy PLANS for backward compatibility
 */
export function getPlan(planId: string): PlanDefinition {
    // Try pricing-config first
    const pricingPlan = getPlanConfig(planId);
    if (pricingPlan) {
        // Convert to legacy format
        const maxAddOns = pricingPlan.limits.maxPremiumAddOns === 'unlimited'
            ? -1
            : pricingPlan.limits.maxPremiumAddOns;

        return {
            id: pricingPlan.planId,
            name: { en: pricingPlan.displayName, tr: pricingPlan.displayName },
            messageLimit: pricingPlan.limits.messageLimit === 'unlimited' ? Infinity : pricingPlan.limits.messageLimit,
            canAccessPremiumModules: maxAddOns !== 0,
            maxAddOns,
            monthlyPrice: pricingPlan.billing.monthly?.amount || 0,
            yearlyPrice: pricingPlan.billing.annual?.amount || 0
        };
    }

    // Fallback to legacy PLANS
    return PLANS[planId] || PLANS.trial;
}

/**
 * Check if tenant can access premium modules
 */
export function canAccessPremiumModules(entitlements: TenantEntitlements): boolean {
    const plan = getPlan(entitlements.planId);

    // During trial, check trial policy
    if (isTrialActive(entitlements)) {
        return TRIAL_CONFIG.allowPremiumDuringTrial;
    }

    return plan.canAccessPremiumModules;
}

/**
 * Check if a specific module can be enabled
 */
export function canEnableModule(
    entitlements: TenantEntitlements,
    moduleId: ModuleId
): ModuleAccessResult {
    const mod = getModule(moduleId);

    if (!mod) {
        return {
            moduleId,
            status: 'not_supported',
            reason: 'Module not found in registry'
        };
    }

    // Core modules are always enabled
    if (mod.isCore) {
        return { moduleId, status: 'enabled' };
    }

    // Check if module is included in current plan OR if user is in Trial Mode
    const isIncludedInterms = isModuleIncludedInPlan(entitlements.planId, moduleId);
    const isTrialOverride = isTrialActive(entitlements) && TRIAL_CONFIG.allowPremiumDuringTrial;
    const isHasAccess = isIncludedInterms || isTrialOverride;
    
    // If already in enabled list and user has access, it's enabled
    if (entitlements.modules.enabled.includes(moduleId) && isHasAccess) {
        return { moduleId, status: 'enabled' };
    }

    // If module is included in plan (or trial)
    if (isHasAccess) {
        return { moduleId, status: 'available' };
    }

    // Module is NOT included in plan - check upgrade path
    const plan = getPlan(entitlements.planId);

    if (plan.canAccessPremiumModules && mod.isPremium && !entitlements.modules.addOns.includes(moduleId)) {
        return {
            moduleId,
            status: 'addon_required',
            reason: 'Module available as add-on for current plan',
            upgradeHint: `Add this module to your ${plan.name.en} plan`
        };
    }

    const upgradeTarget = getModuleUpgradeTarget(entitlements.planId, moduleId);

    if (upgradeTarget) {
        const targetPlan = getPlan(upgradeTarget);
        const upgradeHint = targetPlan
            ? `Upgrade to ${targetPlan.name.en} to unlock this module`
            : 'Upgrade required';

        return {
            moduleId,
            status: 'premium_locked',
            reason: 'Module not included in current plan',
            upgradeHint
        };
    }

    // Fallback: module not found in any plan
    return {
        moduleId,
        status: 'premium_locked',
        reason: 'Module not available',
        upgradeHint: 'Contact support for more information'
    };
}

/**
 * Get all effectively enabled modules for a tenant
 * Combines sector defaults + manually enabled + add-ons
 */
export function getEffectiveEnabledModules(
    entitlements: TenantEntitlements
): ModuleId[] {
    const sectorDefaults = getDefaultModulesForSector(entitlements.sectorId);
    const coreModuleIds = getCoreModules().map(m => m.id);
    const manuallyEnabled = entitlements.modules.enabled;
    const addOns = entitlements.modules.addOns;

    // Combine all sources and deduplicate
    const allModules = new Set<ModuleId>([
        ...coreModuleIds,
        ...sectorDefaults,
        ...manuallyEnabled
    ]);

    // Add add-ons only if plan allows
    if (canAccessPremiumModules(entitlements)) {
        addOns.forEach(m => allModules.add(m));
    }

    return Array.from(allModules);
}

/**
 * Get upgrade hint for a module
 */
export function getUpgradeHint(moduleId: ModuleId, locale: 'en' | 'tr' = 'tr'): string {
    const mod = getModule(moduleId);

    if (!mod) return locale === 'tr' ? 'Yükseltme gerekli' : 'Upgrade required';

    if (mod.isPremium) {
        return locale === 'tr'
            ? 'Premium modül - Pro planına yükseltin'
            : 'Premium module - Upgrade to Pro plan';
    }

    return locale === 'tr'
        ? 'Bu modül için plan yükseltmesi gerekli'
        : 'Plan upgrade required for this module';
}

/**
 * Create initial entitlements for a new tenant
 */
export function createInitialEntitlements(
    tenantId: string,
    sectorId: SectorId,
    targetPlanId: PlanId = 'trial'
): TenantEntitlements {
    const now = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_CONFIG.durationDays * 24 * 60 * 60 * 1000);

    const defaultModules = getDefaultModulesForSector(sectorId);

    return {
        tenantId,
        planId: targetPlanId,
        sectorId,
        trial: {
            isActive: true,
            startAt: now.toISOString(),
            endAt: trialEnd.toISOString()
        },
        modules: {
            enabled: defaultModules,
            addOns: []
        },
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
    };
}

/**
 * Get module status for UI display
 */
export function getModuleStatusForUI(
    entitlements: TenantEntitlements,
    moduleId: ModuleId
): {
    isEnabled: boolean;
    isLocked: boolean;
    badge: 'included' | 'premium' | 'addon' | 'trial' | null;
    canToggle: boolean;
    upgradeTarget?: string | null;
} {
    const access = canEnableModule(entitlements, moduleId);
    const mod = getModule(moduleId);
    const isIncludedInPlan = isModuleIncludedInPlan(entitlements.planId, moduleId);
    const isTrialOverride = isTrialActive(entitlements) && TRIAL_CONFIG.allowPremiumDuringTrial;
    const upgradeTarget = (isIncludedInPlan || isTrialOverride) ? null : getModuleUpgradeTarget(entitlements.planId, moduleId);

    // Determine badge
    let badge: 'included' | 'premium' | 'addon' | 'trial' | null = null;
    
    if (mod?.isCore) {
        // Core modules don't show badge
        badge = null;
    } else if (isIncludedInPlan) {
        badge = 'included';
    } else if (isTrialOverride && mod?.isPremium) {
        badge = 'trial';
    } else if (access.status === 'premium_locked' || mod?.isPremium) {
        badge = 'premium';
    }

    return {
        isEnabled: access.status === 'enabled',
        isLocked: access.status === 'premium_locked' || access.status === 'addon_required',
        badge,
        canToggle: access.status === 'enabled' || access.status === 'available',
        upgradeTarget
    };
}

/**
 * Get module display status for UI (with more details)
 */
export function getModuleDisplayStatus(
    entitlements: TenantEntitlements,
    moduleId: ModuleId
): {
    type: 'core' | 'included' | 'premium' | 'coming_soon';
    badge: string;
    canToggle: boolean;
    isLocked: boolean;
    upgradeTarget: string | null;
    price?: number;
    isSectorCompatible: boolean;
} {
    const mod = getModule(moduleId);
    if (!mod) {
        return {
            type: 'premium',
            badge: 'Premium',
            canToggle: false,
            isLocked: true,
            upgradeTarget: null,
            isSectorCompatible: false
        };
    }

    // Core module
    if (mod.isCore) {
        return {
            type: 'core',
            badge: 'Temel',
            canToggle: false,
            isLocked: false,
            upgradeTarget: null,
            isSectorCompatible: mod.supportedSectors.length === 0 || 
                mod.supportedSectors.includes(entitlements.sectorId)
        };
    }

    // Coming soon
    if (mod.status === 'coming_soon') {
        return {
            type: 'coming_soon',
            badge: 'Yakında',
            canToggle: false,
            isLocked: true,
            upgradeTarget: null,
            isSectorCompatible: mod.supportedSectors.length === 0 || 
                mod.supportedSectors.includes(entitlements.sectorId)
        };
    }

    // Check if included in plan
    const isIncludedInPlan = isModuleIncludedInPlan(entitlements.planId, moduleId);
    const upgradeTarget = isIncludedInPlan ? null : getModuleUpgradeTarget(entitlements.planId, moduleId);
    const isSectorCompatible = mod.supportedSectors.length === 0 || 
        mod.supportedSectors.includes(entitlements.sectorId);

    // Included in plan
    if (isIncludedInPlan) {
        const access = canEnableModule(entitlements, moduleId);
        return {
            type: 'included',
            badge: 'Dahil',
            canToggle: access.status === 'enabled' || access.status === 'available',
            isLocked: false,
            upgradeTarget: null,
            isSectorCompatible
        };
    }

    // Premium (not included in plan)
    return {
        type: 'premium',
        badge: 'Premium',
        canToggle: entitlements.modules.enabled.includes(moduleId), // Only if already enabled
        isLocked: !entitlements.modules.enabled.includes(moduleId),
        upgradeTarget,
        price: mod.price,
        isSectorCompatible
    };
}

// =============================================================================
// FIRESTORE SCHEMA DOCUMENTATION
// =============================================================================

/**
 * Firestore Schema: users/{userId}
 * 
 * This entitlements system integrates with the existing user document.
 * Add these fields to the user document:
 * 
 * {
 *   // ... existing fields ...
 *   
 *   // NEW: Entitlements (can coexist with legacy fields)
 *   "entitlements": {
 *     "planId": "trial",
 *     "sectorId": "ecommerce",
 *     "trial": {
 *       "isActive": true,
 *       "startAt": "2024-12-27T10:00:00Z",
 *       "endAt": "2025-01-10T10:00:00Z"
 *     },
 *     "modules": {
 *       "enabled": ["generalAssistant", "salesCatalog"],
 *       "addOns": []
 *     }
 *   }
 * }
 * 
 * Migration note: Legacy module fields (enableChatbot, etc.) 
 * should be kept for backward compatibility until fully migrated.
 */
