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
    planExists
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
 * 
 * Example JSON:
 * {
 *   "tenantId": "abc123",
 *   "planId": "trial",
 *   "sectorId": "ecommerce",
 *   "trial": {
 *     "isActive": true,
 *     "startAt": "2024-12-27T10:00:00Z",
 *     "endAt": "2025-01-10T10:00:00Z"
 *   },
 *   "modules": {
 *     "enabled": ["generalAssistant", "knowledgeEducation", "salesCatalog", "leadCollection"],
 *     "addOns": []
 *   },
 *   "createdAt": "2024-12-27T10:00:00Z",
 *   "updatedAt": "2024-12-27T10:00:00Z"
 * }
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

    // Check sector support
    if (mod.supportedSectors.length > 0 &&
        !mod.supportedSectors.includes(entitlements.sectorId)) {
        return {
            moduleId,
            status: 'not_supported',
            reason: `Not available for ${entitlements.sectorId} sector`
        };
    }

    // If already in enabled list
    if (entitlements.modules.enabled.includes(moduleId)) {
        return { moduleId, status: 'enabled' };
    }

    // Check if it's a sector default (free to enable)
    if (isModuleDefaultForSector(moduleId, entitlements.sectorId)) {
        return { moduleId, status: 'available' };
    }

    // It's a premium module - check access
    if (mod.isPremium) {
        // Check if user has this add-on
        if (entitlements.modules.addOns.includes(moduleId)) {
            return { moduleId, status: 'available' };
        }

        // Check if plan allows premium
        if (!canAccessPremiumModules(entitlements)) {
            return {
                moduleId,
                status: 'premium_locked',
                reason: 'Premium module requires upgrade',
                upgradeHint: getUpgradeHint(moduleId)
            };
        }

        // Plan allows premium but needs add-on
        const plan = getPlan(entitlements.planId);
        const currentAddOns = entitlements.modules.addOns.length;

        if (plan.maxAddOns !== -1 && currentAddOns >= plan.maxAddOns) {
            return {
                moduleId,
                status: 'addon_required',
                reason: 'Add-on limit reached',
                upgradeHint: 'Upgrade to Enterprise for unlimited add-ons'
            };
        }

        return {
            moduleId,
            status: 'addon_required',
            reason: 'Requires add-on purchase',
            upgradeHint: getUpgradeHint(moduleId)
        };
    }

    // Non-premium, non-default module - available to enable
    return { moduleId, status: 'available' };
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
export function getUpgradeHint(moduleId: ModuleId): string {
    const mod = getModule(moduleId);

    if (!mod) return 'Upgrade required';

    if (mod.isPremium) {
        return 'Premium modül - Pro planına yükseltin';
    }

    return 'Bu modül için plan yükseltmesi gerekli';
}

/**
 * Create initial entitlements for a new tenant
 */
export function createInitialEntitlements(
    tenantId: string,
    sectorId: SectorId
): TenantEntitlements {
    const now = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_CONFIG.durationDays * 24 * 60 * 60 * 1000);

    const defaultModules = getDefaultModulesForSector(sectorId);

    return {
        tenantId,
        planId: 'trial',
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
    badge: 'included' | 'premium' | 'addon' | null;
    canToggle: boolean;
} {
    const access = canEnableModule(entitlements, moduleId);

    return {
        isEnabled: access.status === 'enabled',
        isLocked: access.status === 'premium_locked' || access.status === 'addon_required',
        badge: access.status === 'premium_locked' ? 'premium'
            : access.status === 'addon_required' ? 'addon'
                : access.status === 'enabled' || access.status === 'available' ? 'included'
                    : null,
        canToggle: access.status === 'enabled' || access.status === 'available'
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
