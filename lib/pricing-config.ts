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

/**
 * Single-point currency display rules.
 * - Turkish UI -> TRY
 * - English UI -> USD
 * Prices are converted with fixed FX rates and rounded to whole numbers.
 */
export const PRICING_CURRENCY_DISPLAY = {
    targetByLang: {
        tr: 'TRY',
        en: 'USD'
    } as const,
    // "1 USD = 40 TRY" fixed rate (can be updated from one place).
    perUsd: {
        USD: 1,
        TRY: 40,
        EUR: 0.92
    } as const
};

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
    knowledge?: {
        websites: number | 'unlimited' | string;
        files: number | 'unlimited';
        text: number | 'unlimited';
    };
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
    
    /** Meta data for highlights (e.g. coming soon features) */
    highlights_meta?: {
        coming_soon?: string[];
    };
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
            premiumEligible: ['voiceAppointments', 'aiCopywriter', 'salesOptimization', 'emailMarketing']
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
            included: ['generalAssistant', 'knowledgeEducation', 'leadCollection', 'salesCatalog', 'voiceAppointments', 'aiCopywriter', 'salesOptimization', 'emailMarketing'],
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
            premiumEligible: ['voiceAppointments', 'aiCopywriter', 'salesOptimization', 'emailMarketing']
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
            included: ['generalAssistant', 'knowledgeEducation', 'leadCollection', 'salesCatalog', 'voiceAppointments', 'aiCopywriter', 'salesOptimization', 'emailMarketing'],
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
            premiumEligible: ['voiceAppointments', 'aiCopywriter', 'salesOptimization', 'emailMarketing']
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
            included: ['generalAssistant', 'knowledgeEducation', 'leadCollection', 'salesCatalog', 'voiceAppointments', 'aiCopywriter', 'salesOptimization', 'emailMarketing'],
            defaultEnabled: ['generalAssistant', 'knowledgeEducation', 'leadCollection'],
            premiumEligible: []
        },
        copy: { ctaLabel: 'Contact Sales' }
    }
];

/**
 * SCENARIO D: Vion AI New Pricing (USD)
 * - Starter: $19/mo (1,000 AI messages)
 * - Growth: $49/mo (5,000 AI messages)
 * - Pro: $99/mo (Unlimited)
 * - Enterprise: Contact
 */
const SCENARIO_D: PlanConfig[] = [
    {
        planId: 'starter',
        displayName: 'Starter',
        sortOrder: 1,
        availability: 'public',
        billing: {
            monthly: { amount: 19, currency: 'USD' },
            annual: { amount: 190, currency: 'USD', discountLabel: '2 months free' }
        },
        limits: {
            maxPremiumAddOns: 0,
            messageLimit: 1000,
            // Custom limits for knowledge base
            knowledge: { websites: '1', files: 1, text: 3 }
        } as any, // Using 'any' to bypass strict type check for now or update interface later
        modules: {
            included: [
                'generalChatbot',
                'knowledgeBase',
                'leadCollection',
                'proactiveMessaging'
                // 'liveChat' implied as core feature
            ],
            defaultEnabled: ['generalChatbot', 'leadCollection'],
            premiumEligible: []
        },
        copy: {
            ctaLabel: 'ctaTryFree',
            subtitle: 'planStarterDesc'
        },
        highlights: [
            'featureMessagesStarter',
            'featureGeneralAssistant',
            'featureLiveSupport',
            'featureLeadCollection',
            'featureKnowledgeBase',
            'featureCustomizableWidget'
        ],
        trialDays: 14
    },
    {
        planId: 'growth',
        displayName: 'Growth',
        sortOrder: 2,
        availability: 'public',
        billing: {
            monthly: { amount: 49, currency: 'USD' },
            annual: { amount: 490, currency: 'USD', discountLabel: 'billingDiscountBadge' }
        },
        limits: {
            maxPremiumAddOns: 0,
            messageLimit: 5000,
            knowledge: { websites: '1', files: 10, text: 20 }
        } as any,
        modules: {
            included: [
                'generalChatbot', 'knowledgeBase', 'leadCollection', 'proactiveMessaging',
                'productCatalog', 'digitalWaiter'
            ],
            defaultEnabled: ['generalChatbot', 'productCatalog'],
            premiumEligible: []
        },
        copy: {
            ctaLabel: 'ctaTryFree',
            subtitle: 'planGrowthDesc'
        },
        highlights: [
            'featureMessagesGrowth',
            'featureEverythingInStarter',
            'featureProductCatalog',
            'featureDigitalWaiter',
            'featureMultiChannel',
            'featureKnowledgeBase',
            'featureAdvancedReporting',
            'featureCustomizableWidget'
        ],
        trialDays: 14,
        highlights_meta: {
            coming_soon: ['Kampanya Sihirbazı']
        }
    },
    {
        planId: 'pro',
        displayName: 'Pro',
        sortOrder: 3,
        availability: 'public',
        billing: {
            monthly: { amount: 99, currency: 'USD' },
            annual: { amount: 990, currency: 'USD', discountLabel: 'billingDiscountBadge' }
        },
        limits: {
            maxPremiumAddOns: 0,
            messageLimit: 'unlimited',
            knowledge: { websites: '1', files: 100, text: 'unlimited' }
        } as any,
        modules: {
            included: [
                'generalChatbot', 'knowledgeBase', 'leadCollection', 'proactiveMessaging',
                'productCatalog', 'digitalWaiter',
                'salesOptimization', 'visualDiagnosis',
                'dynamicContext'
            ],
            defaultEnabled: ['generalChatbot', 'salesOptimization'],
            premiumEligible: []
        },
        copy: {
            badge: 'recommended',
            ctaLabel: 'ctaTryFree',
            subtitle: 'planProDesc'
        },
        highlights: [
            'featureUnlimitedMessagesNote',
            'featureEverythingInGrowth',
            'featureSalesOptimization',
            'featureVisualDiagnosis',
            'featurePrioritySupport',
            'featureKnowledgeBase',
            'featureAdvancedReporting',
            'featureCustomizableWidget'
        ],
        trialDays: 14,
        highlights_meta: {
            coming_soon: ['Oyunlaştırma', 'Sesli Asistan', 'White Label', 'Takım Yönetimi']
        }
    },
    {
        planId: 'enterprise',
        displayName: 'Enterprise',
        sortOrder: 4,
        availability: 'public',
        billing: { contact: true },
        limits: {
            maxPremiumAddOns: 'unlimited',
            messageLimit: 'unlimited',
            knowledge: { websites: 'unlimited', files: 'unlimited', text: 'unlimited' }
        } as any,
        modules: {
            included: ['all'],
            defaultEnabled: [],
            premiumEligible: []
        },
        copy: {
            ctaLabel: 'ctaContactUs',
            subtitle: 'planEnterpriseDesc'
        },
        highlights: [
            'featureUnlimitedMessagesNote',
            'featureAllFeaturesUnlimited',
            'featureCustomIntegration',
            'featureSlaGuarantee',
            'featurePrioritySupport',
            'featureWhiteLabel',
            'featureAdvancedReporting',
            'featureCustomizableWidget'
        ]
    }
];

// =============================================================================
// ACTIVE SCENARIO SELECTOR
// =============================================================================

/**
 * Change this to switch pricing scenarios.
 * Options: 'A' | 'B' | 'C' | 'D'
 */
export const ACTIVE_PRICING_SCENARIO: 'A' | 'B' | 'C' | 'D' = 'D';

const SCENARIOS = {
    A: SCENARIO_A,
    B: SCENARIO_B,
    C: SCENARIO_C,
    D: SCENARIO_D
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

// Alias for getPlan - used in AuthContext
export const getPlanConfig = getPlan;

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

    let effectiveCycle: BillingCycle = billingCycle;
    let billing = billingCycle === 'annual' ? plan.billing.annual : plan.billing.monthly;
    if (!billing) {
        // Fallback to monthly if annual not available
        const fallback = plan.billing.monthly;
        if (!fallback) return lang === 'tr' ? 'Fiyat yok' : 'No price';
        billing = fallback;
        effectiveCycle = 'monthly';
    }

    const targetCurrency = PRICING_CURRENCY_DISPLAY.targetByLang[lang] || 'USD';
    const convertedAmount = convertAndRoundAmount(
        billing.amount,
        billing.currency,
        targetCurrency
    );

    return formatAmount(convertedAmount, targetCurrency, effectiveCycle, lang);
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

    const locale = lang === 'tr' ? 'tr-TR' : 'en-US';
    return `${symbols[currency]}${amount.toLocaleString(locale, { maximumFractionDigits: 0 })}${intervals[cycle][lang]}`;
}

function convertAndRoundAmount(amount: number, from: Currency, to: Currency): number {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    if (from === to) return Math.round(amount);

    const perUsd = PRICING_CURRENCY_DISPLAY.perUsd;
    const fromPerUsd = perUsd[from];
    const toPerUsd = perUsd[to];

    // Convert via USD base: amount(from) -> USD -> target.
    const amountInUsd = amount / fromPerUsd;
    const converted = amountInUsd * toPerUsd;

    // User requested rounded values.
    return Math.round(converted);
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

/**
 * Check if a module is included in a plan
 */
export function isModuleIncludedInPlan(planId: string, moduleId: string): boolean {
    const plan = getPlan(planId);
    if (!plan) return false;
    
    // Enterprise plan includes all modules
    if (plan.modules.included.includes('all')) {
        return true;
    }
    
    return plan.modules.included.includes(moduleId);
}

/**
 * Find which plan includes a module (for upgrade targeting)
 * Returns the plan ID that includes the module, or null if not found
 */
export function getModuleUpgradeTarget(
    currentPlanId: string,
    moduleId: string
): string | null {
    const plans = ['starter', 'growth', 'pro', 'enterprise'];
    const currentPlanIndex = plans.indexOf(currentPlanId);
    
    // If current plan is enterprise, no upgrade needed
    if (currentPlanIndex === plans.length - 1) {
        return null;
    }
    
    // Check each plan from current plan + 1 to enterprise
    for (let i = currentPlanIndex + 1; i < plans.length; i++) {
        const targetPlanId = plans[i];
        const targetPlan = getPlan(targetPlanId);
        
        if (!targetPlan) continue;
        
        // Enterprise includes all modules
        if (targetPlan.modules.included.includes('all')) {
            return targetPlanId;
        }
        
        // Check if module is included in this plan
        if (targetPlan.modules.included.includes(moduleId)) {
            return targetPlanId;
        }
    }
    
    // Module not found in any plan, return enterprise as fallback
    return 'enterprise';
}

/**
 * Get upgrade message for a module
 */
export function getModuleUpgradeMessage(
    currentPlanId: string,
    moduleId: string,
    lang: 'en' | 'tr' = 'tr'
): string {
    const targetPlan = getModuleUpgradeTarget(currentPlanId, moduleId);
    
    if (!targetPlan) {
        return lang === 'tr' 
            ? 'Bu modül mevcut planınızda dahil değil'
            : 'This module is not included in your current plan';
    }
    
    const plan = getPlan(targetPlan);
    const planName = plan?.displayName || targetPlan;
    
    return lang === 'tr'
        ? `${planName} planına geçerek bu modüle erişin`
        : `Upgrade to ${planName} to access this module`;
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
