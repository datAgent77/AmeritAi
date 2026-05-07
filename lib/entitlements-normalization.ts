/**
 * ============================================================================
 * ENTITLEMENTS NORMALIZATION
 * ============================================================================
 * 
 * Utilities for normalizing legacy entitlements data to the new schema.
 * Ensures backward compatibility with existing tenants.
 */

import { TenantEntitlements, PlanId } from './entitlements';
import { SectorId, ModuleId, getDefaultModulesForSector } from './modules-registry';
import { planExists } from './pricing-config';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Legacy entitlements format (what might exist in old Firestore docs)
 */
export interface LegacyEntitlements {
    plan?: string;
    industry?: string;
    sector?: string;
    sectorId?: string;
    modules?: {
        enabled?: string[];
        fromIndustry?: string[];
        additional?: string[];
        addOns?: string[];
    };
    trial?: {
        isActive?: boolean;
        startAt?: string | null;
        endAt?: string | null;
    };
    subscriptionStatus?: string;
    trialEndsAt?: string;
}

// =============================================================================
// NORMALIZATION FUNCTIONS
// =============================================================================

/**
 * Normalize planId from various legacy formats
 */
export function normalizePlanId(rawPlanId: any): string {
    if (typeof rawPlanId !== 'string') return 'starter';

    const normalized = rawPlanId.toLowerCase().trim();

    // Map legacy plan names to new PlanIds
    const planMap: Record<string, string> = {
        'free': 'starter',
        'basic': 'starter',
        'professional': 'growth',
        'premium': 'growth',
        'business': 'enterprise',
        'trial': 'trial',
        'starter': 'starter',
        'growth': 'growth',
        'pro': 'growth',
        'enterprise': 'enterprise'
    };

    const mapped = planMap[normalized];

    // 1. If mapped found and valid
    if (mapped && planExists(mapped)) {
        return mapped;
    }

    // 2. If raw normalized value is a valid plan
    if (planExists(normalized)) {
        return normalized;
    }

    // Fallback to starter if unknown
    return 'starter';
}

/**
 * Normalize sectorId from various legacy formats
 */
export function normalizeSectorId(raw: any): SectorId {
    if (typeof raw !== 'string') return 'ecommerce';

    const normalized = raw.toLowerCase().trim();

    // Map legacy industry names to SectorId
    const sectorMap: Record<string, SectorId> = {
        // E-commerce variations
        'e-commerce': 'ecommerce',
        'ecommerce': 'ecommerce',
        'e_commerce': 'ecommerce',

        // Real estate variations
        'realestate': 'real_estate',
        'real_estate': 'real_estate',
        'real-estate': 'real_estate',
        'property': 'real_estate',

        // Healthcare variations
        'healthcare': 'healthcare',
        'health': 'healthcare',
        'medical': 'healthcare',

        // Education variations
        'education': 'education',
        'edu': 'education',
        'school': 'education',
        'academic': 'academic',

        // Finance variations
        'finance': 'finance',
        'banking': 'finance',
        'fintech': 'finance',

        // Restaurant variations
        'hospitality': 'restaurant',
        'hotel': 'restaurant',
        'restaurant': 'restaurant',

        // Technology/SaaS variations
        'technology': 'saas',
        'tech': 'saas',
        'software': 'saas',
        'saas': 'saas',

        // Booking/Travel
        'booking': 'booking',
        'travel': 'booking',

        // Service
        'service': 'service',

        // Agriculture
        'agriculture': 'agriculture',
        'farming': 'agriculture',
        'tarim': 'agriculture',

        // Automotive
        'automotive': 'automotive',
        'auto': 'automotive',
        'otomotiv': 'automotive',

        // Insurance
        'insurance': 'insurance',
        'sigorta': 'insurance',

        // Logistics
        'logistics': 'logistics',
        'shipping': 'logistics',
        'lojistik': 'logistics',

        // Beauty & Wellness
        'beauty': 'beauty',
        'wellness': 'beauty',
        'spa': 'beauty',
        'guzellik': 'beauty',

        // Legal
        'legal': 'legal',
        'law': 'legal',
        'hukuk': 'legal',

        // Fitness
        'fitness': 'fitness',
        'gym': 'fitness',
        'sports': 'fitness',
        'spor': 'fitness',

        // Maritime
        'maritime': 'maritime',
        'denizcilik': 'maritime',
        'marine': 'maritime',
        'naval': 'maritime',

        // Other
        'other': 'other'
    };

    return sectorMap[normalized] || 'other';
}

/**
 * Normalize module IDs array
 */
export function normalizeModuleIds(raw: any): ModuleId[] {
    if (!Array.isArray(raw)) return [];

    return raw
        .filter(m => typeof m === 'string')
        .map(m => m.trim())
        .filter(m => m.length > 0) as ModuleId[];
}

/**
 * Normalize full entitlements object from legacy format
 */
export function normalizeEntitlements(
    tenantId: string,
    legacyData: LegacyEntitlements
): TenantEntitlements {
    const now = new Date().toISOString();

    // Normalize basic fields
    const planId = normalizePlanId(legacyData.plan);
    const sectorId = normalizeSectorId(
        legacyData.sectorId || legacyData.sector || legacyData.industry
    );

    // Normalize modules
    const enabledModules = normalizeModuleIds(
        legacyData.modules?.enabled ||
        legacyData.modules?.fromIndustry ||
        []
    );

    const addOnModules = normalizeModuleIds(
        legacyData.modules?.addOns ||
        legacyData.modules?.additional ||
        []
    );

    // If no modules specified, use sector defaults
    const finalEnabled = enabledModules.length > 0
        ? enabledModules
        : getDefaultModulesForSector(sectorId);

    // Normalize trial
    let trialIsActive = false;
    let trialStartAt: string | null = null;
    let trialEndAt: string | null = null;

    if (legacyData.trial) {
        trialIsActive = !!legacyData.trial.isActive;
        trialStartAt = legacyData.trial.startAt || null;
        trialEndAt = legacyData.trial.endAt || null;
    } else if (legacyData.subscriptionStatus === 'trial' && legacyData.trialEndsAt) {
        // Legacy format
        trialIsActive = true;
        trialEndAt = legacyData.trialEndsAt;
        trialStartAt = legacyData.trialEndsAt
            ? new Date(new Date(legacyData.trialEndsAt).getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
            : null;
    }

    return {
        tenantId,
        planId,
        sectorId,
        trial: {
            isActive: trialIsActive,
            startAt: trialStartAt,
            endAt: trialEndAt
        },
        modules: {
            enabled: finalEnabled,
            addOns: addOnModules
        },
        createdAt: now,
        updatedAt: now
    };
}

/**
 * Safely extract entitlements from Firestore document
 */
export function extractEntitlementsFromDoc(
    docId: string,
    docData: any
): TenantEntitlements {
    // If entitlements field exists and is valid, use it
    if (docData.entitlements && typeof docData.entitlements === 'object') {
        return {
            tenantId: docId,
            planId: normalizePlanId(docData.entitlements.planId),
            sectorId: normalizeSectorId(docData.entitlements.sectorId),
            trial: docData.entitlements.trial || { isActive: false, startAt: null, endAt: null },
            modules: {
                enabled: normalizeModuleIds(docData.entitlements.modules?.enabled || []),
                addOns: normalizeModuleIds(docData.entitlements.modules?.addOns || [])
            },
            createdAt: docData.entitlements.createdAt || new Date().toISOString(),
            updatedAt: docData.entitlements.updatedAt || new Date().toISOString()
        };
    }

    // Otherwise, extract from legacy fields
    return normalizeEntitlements(docId, {
        plan: docData.plan || docData.planId,
        industry: docData.industry,
        sector: docData.sector,
        sectorId: docData.sectorId,
        modules: docData.modules,
        trial: docData.trial,
        subscriptionStatus: docData.subscriptionStatus,
        trialEndsAt: docData.trialEndsAt
    });
}
