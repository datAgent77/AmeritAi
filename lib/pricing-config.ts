/**
 * ============================================================================
 * PRICING CONFIGURATION v2.0
 * ============================================================================
 * 
 * Flexible pricing system supporting unlimited plans, multi-currency,
 * and scenario-based A/B testing.
 * 
 * HOW TO ADD A NEW PLAN (30 seconds):
 * 1. Add a new PlanConfig object to SCENARIO_A (or active scenario)
 * 2. Set unique planId, sortOrder, and availability
 * 3. Define billing, limits, modules, and copy
 * 4. Done - no other files need changes
 * 
 * HOW TO SWITCH PRICING SCENARIO:
 * Change ACTIVE_PRICING_SCENARIO from 'A' to 'B' or 'C'
 */

import { ModuleId } from './modules-registry';

// =============================================================================
// TYPES
// =============================================================================

export type Currency = 'TRY' | 'USD' | 'EUR';
export type BillingCycle = 'monthly' | 'annual';
export type PlanAvailability = 'public' | 'hidden' | 'legacy';
export type LimitValue = number | 'unlimited';

export interface BillingOption {
    amount: number;
    currency: Currency;
    discountLabel?: string; // e.g., "2 ay ücretsiz"
}

export interface PlanBilling {
    monthly?: BillingOption;
    annual?: BillingOption;
    contact?: boolean; // If true, show "Contact Sales" instead of price
}

export interface PlanLimits {
    maxPremiumAddOns: LimitValue;
    messageLimit: LimitValue;
    // Future: maxUsers, maxWebsites, etc.
}

export interface PlanModules {
    /** Modules included with this plan */
    included: string[];
    /** Subset of included that are enabled by default */
    defaultEnabled: string[];
    /** Premium modules user may select (if plan allows add-ons) */
    premiumEligible: string[];
}

export interface PlanCopy {
    badge?: string;           // "Önerilen", "En Popüler"
    subtitle?: string;        // Short description
    ctaLabel: string;         // Primary button text
    secondaryCtaLabel?: string;
    footnote?: string;        // Small print below CTA
}

export interface PlanConfig {
    planId: string;
    displayName: string;
    sortOrder: number;
    availability: PlanAvailability;
    billing: PlanBilling;
    limits: PlanLimits;
    modules: PlanModules;
    copy: PlanCopy;

    /** Trial duration in days (only for trial-type plans) */
    trialDays?: number;

    /** Feature highlights for pricing page */
    highlights?: string[];
}

// =============================================================================
// PRICING SCENARIOS
// =============================================================================

/**
 * SCENARIO A: Current Production Pricing
 * - Starter: Free
 * - Pro: ₺799/mo
 * - Enterprise: Contact
 */
const SCENARIO_A: PlanConfig[] = [
    {
        planId: 'trial',
        displayName: 'Ücretsiz Deneme',
        sortOrder: 0,
        availability: 'hidden', // Auto-assigned, not shown on pricing page
        billing: {
            monthly: { amount: 0, currency: 'TRY' }
        },
        limits: {
            maxPremiumAddOns: 0,
            messageLimit: 'unlimited'
        },
        modules: {
            included: [],
            defaultEnabled: [],
            premiumEligible: []
        },
        copy: {
            ctaLabel: 'Ücretsiz Dene',
            subtitle: 'Tüm temel özellikleri 14 gün boyunca deneyin'
        },
        trialDays: 14,
        highlights: ['Tüm temel modüller', '14 gün erişim', 'Kredi kartı gerekmez']
    },
    {
        planId: 'starter',
        displayName: 'Başlangıç',
        sortOrder: 1,
        availability: 'public',
        billing: {
            monthly: { amount: 0, currency: 'TRY' }
        },
        limits: {
            maxPremiumAddOns: 0,
            messageLimit: 'unlimited'
        },
        modules: {
            included: ['generalAssistant', 'knowledgeEducation', 'leadCollection'],
            defaultEnabled: ['generalAssistant', 'knowledgeEducation'],
            premiumEligible: []
        },
        copy: {
            ctaLabel: 'Ücretsiz Başla',
            subtitle: 'Küçük işletmeler için ideal'
        },
        highlights: ['Sınırsız mesaj', 'Sektöre özel modüller', 'E-posta desteği']
    },
    {
        planId: 'pro',
        displayName: 'Profesyonel',
        sortOrder: 2,
        availability: 'public',
        billing: {
            monthly: { amount: 799, currency: 'TRY' },
            annual: { amount: 6990, currency: 'TRY', discountLabel: '2 ay ücretsiz' }
        },
        limits: {
            maxPremiumAddOns: 3,
            messageLimit: 'unlimited'
        },
        modules: {
            included: ['generalAssistant', 'knowledgeEducation', 'leadCollection', 'salesCatalog'],
            defaultEnabled: ['generalAssistant', 'knowledgeEducation', 'leadCollection'],
            premiumEligible: ['voiceAppointments', 'aiCopywriter', 'salesOptimization', 'socialMediaSharing', 'emailMarketing']
        },
        copy: {
            badge: 'Önerilen',
            ctaLabel: '14 Gün Ücretsiz Dene',
            subtitle: 'Büyüyen işletmeler için güçlü AI araçları'
        },
        highlights: ['Starter\'daki her şey', '3 premium modül', 'Öncelikli destek', 'Canlı destek']
    },
    {
        planId: 'enterprise',
        displayName: 'Kurumsal',
        sortOrder: 3,
        availability: 'public',
        billing: {
            contact: true
        },
        limits: {
            maxPremiumAddOns: 'unlimited',
            messageLimit: 'unlimited'
        },
        modules: {
            included: ['generalAssistant', 'knowledgeEducation', 'leadCollection', 'salesCatalog', 'voiceAppointments', 'aiCopywriter', 'salesOptimization', 'socialMediaSharing', 'emailMarketing'],
            defaultEnabled: ['generalAssistant', 'knowledgeEducation', 'leadCollection'],
            premiumEligible: []
        },
        copy: {
            ctaLabel: 'Bizimle İletişime Geçin',
            subtitle: 'Büyük kurumlar için özel çözümler'
        },
        highlights: ['Tüm modüller dahil', 'Özel hesap yöneticisi', 'SLA garantisi', 'Özel entegrasyonlar']
    }
];

/**
 * SCENARIO B: Premium Starter Pricing
 * - Starter: ₺299/mo
 * - Pro: ₺1499/mo
 */
const SCENARIO_B: PlanConfig[] = [
    {
        planId: 'trial',
        displayName: 'Ücretsiz Deneme',
        sortOrder: 0,
        availability: 'hidden',
        billing: { monthly: { amount: 0, currency: 'TRY' } },
        limits: { maxPremiumAddOns: 0, messageLimit: 'unlimited' },
        modules: { included: [], defaultEnabled: [], premiumEligible: [] },
        copy: { ctaLabel: 'Ücretsiz Dene' },
        trialDays: 14
    },
    {
        planId: 'starter',
        displayName: 'Başlangıç',
        sortOrder: 1,
        availability: 'public',
        billing: {
            monthly: { amount: 299, currency: 'TRY' },
            annual: { amount: 2990, currency: 'TRY', discountLabel: '2 ay ücretsiz' }
        },
        limits: { maxPremiumAddOns: 1, messageLimit: 'unlimited' },
        modules: {
            included: ['generalAssistant', 'knowledgeEducation', 'leadCollection'],
            defaultEnabled: ['generalAssistant', 'knowledgeEducation'],
            premiumEligible: ['voiceAppointments', 'aiCopywriter']
        },
        copy: { ctaLabel: 'Planı Seç', subtitle: 'Küçük işletmeler için ideal' }
    },
    {
        planId: 'pro',
        displayName: 'Profesyonel',
        sortOrder: 2,
        availability: 'public',
        billing: {
            monthly: { amount: 1499, currency: 'TRY' },
            annual: { amount: 14990, currency: 'TRY', discountLabel: '2 ay ücretsiz' }
        },
        limits: { maxPremiumAddOns: 5, messageLimit: 'unlimited' },
        modules: {
            included: ['generalAssistant', 'knowledgeEducation', 'leadCollection', 'salesCatalog'],
            defaultEnabled: ['generalAssistant', 'knowledgeEducation', 'leadCollection'],
            premiumEligible: ['voiceAppointments', 'aiCopywriter', 'salesOptimization', 'socialMediaSharing', 'emailMarketing']
        },
        copy: { badge: 'Önerilen', ctaLabel: 'Planı Seç', subtitle: 'Büyüyen işletmeler için' }
    },
    {
        planId: 'enterprise',
        displayName: 'Kurumsal',
        sortOrder: 3,
        availability: 'public',
        billing: { contact: true },
        limits: { maxPremiumAddOns: 'unlimited', messageLimit: 'unlimited' },
        modules: {
            included: ['generalAssistant', 'knowledgeEducation', 'leadCollection', 'salesCatalog', 'voiceAppointments', 'aiCopywriter', 'salesOptimization', 'socialMediaSharing', 'emailMarketing'],
            defaultEnabled: ['generalAssistant', 'knowledgeEducation', 'leadCollection'],
            premiumEligible: []
        },
        copy: { ctaLabel: 'Bizimle İletişime Geçin' }
    }
];

/**
 * SCENARIO C: USD International Pricing
 * - Starter: Free
 * - Pro: $79/mo
 */
const SCENARIO_C: PlanConfig[] = [
    {
        planId: 'trial',
        displayName: 'Free Trial',
        sortOrder: 0,
        availability: 'hidden',
        billing: { monthly: { amount: 0, currency: 'USD' } },
        limits: { maxPremiumAddOns: 0, messageLimit: 'unlimited' },
        modules: { included: [], defaultEnabled: [], premiumEligible: [] },
        copy: { ctaLabel: 'Start Free Trial' },
        trialDays: 14
    },
    {
        planId: 'starter',
        displayName: 'Starter',
        sortOrder: 1,
        availability: 'public',
        billing: { monthly: { amount: 0, currency: 'USD' } },
        limits: { maxPremiumAddOns: 0, messageLimit: 'unlimited' },
        modules: {
            included: ['generalAssistant', 'knowledgeEducation', 'leadCollection'],
            defaultEnabled: ['generalAssistant', 'knowledgeEducation'],
            premiumEligible: []
        },
        copy: { ctaLabel: 'Get Started Free', subtitle: 'Perfect for small businesses' }
    },
    {
        planId: 'pro',
        displayName: 'Professional',
        sortOrder: 2,
        availability: 'public',
        billing: {
            monthly: { amount: 79, currency: 'USD' },
            annual: { amount: 790, currency: 'USD', discountLabel: '2 months free' }
        },
        limits: { maxPremiumAddOns: 3, messageLimit: 'unlimited' },
        modules: {
            included: ['generalAssistant', 'knowledgeEducation', 'leadCollection', 'salesCatalog'],
            defaultEnabled: ['generalAssistant', 'knowledgeEducation', 'leadCollection'],
            premiumEligible: ['voiceAppointments', 'aiCopywriter', 'salesOptimization', 'socialMediaSharing', 'emailMarketing']
        },
        copy: { badge: 'Recommended', ctaLabel: 'Start 14-Day Trial', subtitle: 'For growing businesses' }
    },
    {
        planId: 'enterprise',
        displayName: 'Enterprise',
        sortOrder: 3,
        availability: 'public',
        billing: { contact: true },
        limits: { maxPremiumAddOns: 'unlimited', messageLimit: 'unlimited' },
        modules: {
            included: ['generalAssistant', 'knowledgeEducation', 'leadCollection', 'salesCatalog', 'voiceAppointments', 'aiCopywriter', 'salesOptimization', 'socialMediaSharing', 'emailMarketing'],
            defaultEnabled: ['generalAssistant', 'knowledgeEducation', 'leadCollection'],
            premiumEligible: []
        },
        copy: { ctaLabel: 'Contact Sales' }
    }
];

// =============================================================================
// ACTIVE SCENARIO SELECTOR
// =============================================================================

/**
 * Change this to switch pricing scenarios.
 * Options: 'A' | 'B' | 'C'
 */
export const ACTIVE_PRICING_SCENARIO: 'A' | 'B' | 'C' = 'A';

const SCENARIOS = {
    A: SCENARIO_A,
    B: SCENARIO_B,
    C: SCENARIO_C
};

/**
 * Active pricing configuration based on selected scenario
 */
export const PRICING_PLANS: PlanConfig[] = SCENARIOS[ACTIVE_PRICING_SCENARIO];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all plans in current scenario
 */
export function getAllPlans(): PlanConfig[] {
    return PRICING_PLANS;
}

/**
 * Get publicly visible plans, sorted by sortOrder
 */
export function getPublicPlansSorted(): PlanConfig[] {
    return PRICING_PLANS
        .filter(p => p.availability === 'public')
        .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Get a single plan by ID
 */
export function getPlan(planId: string): PlanConfig | undefined {
    return PRICING_PLANS.find(p => p.planId === planId);
}

/**
 * Check if plan exists
 */
export function planExists(planId: string): boolean {
    return PRICING_PLANS.some(p => p.planId === planId);
}

/**
 * Check if plan requires contact (no numeric price)
 */
export function isContactPlan(planId: string): boolean {
    const plan = getPlan(planId);
    return plan?.billing.contact === true;
}

/**
 * Format plan price for display
 */
export function formatPlanPrice(
    planId: string,
    billingCycle: BillingCycle = 'monthly',
    lang: 'en' | 'tr' = 'tr'
): string {
    const plan = getPlan(planId);
    if (!plan) return '';

    // Contact plan
    if (plan.billing.contact) {
        return lang === 'tr' ? 'Özel Teklif' : 'Custom Quote';
    }

    const billing = billingCycle === 'annual' ? plan.billing.annual : plan.billing.monthly;
    if (!billing) {
        // Fallback to monthly if annual not available
        const fallback = plan.billing.monthly;
        if (!fallback) return lang === 'tr' ? 'Fiyat yok' : 'No price';
        return formatAmount(fallback.amount, fallback.currency, billingCycle, lang);
    }

    return formatAmount(billing.amount, billing.currency, billingCycle, lang);
}

/**
 * Format amount with currency symbol
 */
function formatAmount(
    amount: number,
    currency: Currency,
    cycle: BillingCycle,
    lang: 'en' | 'tr'
): string {
    if (amount === 0) {
        return lang === 'tr' ? 'Ücretsiz' : 'Free';
    }

    const symbols: Record<Currency, string> = {
        TRY: '₺',
        USD: '$',
        EUR: '€'
    };

    const intervals: Record<BillingCycle, { en: string; tr: string }> = {
        monthly: { en: '/mo', tr: '/ay' },
        annual: { en: '/yr', tr: '/yıl' }
    };

    return `${symbols[currency]}${amount.toLocaleString()}${intervals[cycle][lang]}`;
}

/**
 * Get modules included in a plan
 */
export function getPlanIncludedModules(planId: string): string[] {
    const plan = getPlan(planId);
    return plan?.modules.included || [];
}

/**
 * Get modules enabled by default in a plan
 */
export function getPlanDefaultModules(planId: string): string[] {
    const plan = getPlan(planId);
    return plan?.modules.defaultEnabled || [];
}

/**
 * Get premium modules user can select in this plan
 */
export function getPlanPremiumEligible(planId: string): string[] {
    const plan = getPlan(planId);
    return plan?.modules.premiumEligible || [];
}

/**
 * Check if user can select another premium add-on
 */
export function canSelectPremiumAddOn(
    planId: string,
    currentCount: number
): { allowed: boolean; reason?: string } {
    const plan = getPlan(planId);
    if (!plan) {
        return { allowed: false, reason: 'Plan not found' };
    }

    const max = plan.limits.maxPremiumAddOns;

    if (max === 0) {
        return { allowed: false, reason: 'Bu plan premium modül içermez' };
    }

    if (max === 'unlimited') {
        return { allowed: true };
    }

    if (currentCount >= max) {
        return { allowed: false, reason: `Maksimum ${max} premium modül seçebilirsiniz` };
    }

    return { allowed: true };
}

/**
 * Get plan CTA label
 */
export function getPlanCTA(planId: string): string {
    const plan = getPlan(planId);
    return plan?.copy.ctaLabel || 'Get Started';
}

/**
 * Get plan badge (if any)
 */
export function getPlanBadge(planId: string): string | undefined {
    const plan = getPlan(planId);
    return plan?.copy.badge;
}

/**
 * Get trial days for a plan (0 if not a trial plan)
 */
export function getPlanTrialDays(planId: string): number {
    const plan = getPlan(planId);
    return plan?.trialDays || 0;
}

/**
 * Check if plan has annual billing option
 */
export function hasAnnualBilling(planId: string): boolean {
    const plan = getPlan(planId);
    return !!plan?.billing.annual;
}

/**
 * Get annual discount label (if any)
 */
export function getAnnualDiscountLabel(planId: string): string | undefined {
    const plan = getPlan(planId);
    return plan?.billing.annual?.discountLabel;
}

// =============================================================================
// GLOBAL SETTINGS
// =============================================================================

export const PRICING_SETTINGS = {
    defaultBillingCycle: 'monthly' as BillingCycle,
    showAnnualToggle: true,
    contactEmail: 'enterprise@vion.ai',

    unlimitedMessagesNote: {
        en: 'Unlimited messages on all plans',
        tr: 'Tüm planlarda sınırsız mesaj'
    }
};
