/**
 * Plan Tanımları
 * Fiyatlandırma planları ve özellikleri
 */

export type PlanId = 'starter' | 'growth' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'trial' | 'active' | 'cancelled' | 'expired' | 'past_due';

export interface PlanFeatures {
    maxMessages: number;        // -1 = sınırsız
    maxSessions: number;        // -1 = sınırsız
    industryModules: boolean;   // Sektör bazlı modüller dahil mi
    additionalModules: number;  // Ek modül sayısı (-1 = hepsi dahil)
    customBranding: boolean;    // Logo/renk özelleştirme
    prioritySupport: boolean;   // Öncelikli destek
    apiAccess: boolean;         // API erişimi
    whiteLabel: boolean;        // White-label seçeneği
    analytics: 'basic' | 'advanced' | 'enterprise';
    integrations: string[];     // Aktif entegrasyonlar
}

export interface PlanDefinition {
    id: PlanId;
    name: {
        en: string;
        tr: string;
    };
    description: {
        en: string;
        tr: string;
    };
    monthlyPrice: number;
    yearlyPrice: number;  // Yıllık ödeme (genelde 2 ay indirimli)
    trialDays: number;
    popular?: boolean;    // UI'da "En Popüler" badge'i
    features: PlanFeatures;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
    starter: {
        id: 'starter',
        name: { en: 'Starter', tr: 'Başlangıç' },
        description: {
            en: 'Perfect for small businesses and testing',
            tr: 'Küçük işletmeler ve test için ideal'
        },
        monthlyPrice: 0,
        yearlyPrice: 0,
        trialDays: 14,
        features: {
            maxMessages: 500,
            maxSessions: 100,
            industryModules: true,
            additionalModules: 0,
            customBranding: false,
            prioritySupport: false,
            apiAccess: false,
            whiteLabel: false,
            analytics: 'basic',
            integrations: ['web']
        }
    },
    growth: {
        id: 'growth',
        name: { en: 'Scale', tr: 'Scale' },
        description: {
            en: 'For growing businesses with advanced needs',
            tr: 'Gelişen işletmeler için gelişmiş özellikler'
        },
        monthlyPrice: 79,
        yearlyPrice: 790, // ~2 ay ücretsiz
        trialDays: 0,
        popular: true,
        features: {
            maxMessages: 5000,
            maxSessions: 1000,
            industryModules: true,
            additionalModules: 2,
            customBranding: true,
            prioritySupport: false,
            apiAccess: true,
            whiteLabel: false,
            analytics: 'advanced',
            integrations: ['web', 'whatsapp', 'telegram']
        }
    },
    enterprise: {
        id: 'enterprise',
        name: { en: 'Enterprise', tr: 'Kurumsal' },
        description: {
            en: 'For large organizations with custom requirements',
            tr: 'Özel gereksinimli büyük organizasyonlar için'
        },
        monthlyPrice: 199,
        yearlyPrice: 1990,
        trialDays: 0,
        features: {
            maxMessages: -1, // Sınırsız
            maxSessions: -1,
            industryModules: true,
            additionalModules: -1, // Tüm modüller dahil
            customBranding: true,
            prioritySupport: true,
            apiAccess: true,
            whiteLabel: true,
            analytics: 'enterprise',
            integrations: ['web', 'whatsapp', 'telegram', 'slack', 'api']
        }
    }
};

/**
 * Plan ID'sine göre plan bilgisini döndürür
 */
export function getPlan(planId: PlanId): PlanDefinition {
    return PLANS[planId] || PLANS.starter;
}

/**
 * Planın belirli bir özelliğe sahip olup olmadığını kontrol eder
 */
export function hasFeature(planId: PlanId, feature: keyof PlanFeatures): boolean {
    const plan = getPlan(planId);
    const value = plan.features[feature];

    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value !== 'basic';
    if (Array.isArray(value)) return value.length > 0;

    return false;
}

/**
 * Planın ek modül ekleyip ekleyemeyeceğini kontrol eder
 */
export function canAddAdditionalModule(planId: PlanId, currentAdditionalCount: number): boolean {
    const plan = getPlan(planId);
    const limit = plan.features.additionalModules;

    if (limit === -1) return true; // Sınırsız
    return currentAdditionalCount < limit;
}

/**
 * Fiyatı formatlar
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
    if (price === 0) return 'Free';

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0
    }).format(price);
}

/**
 * Yıllık tasarrufu hesaplar
 */
export function calculateYearlySavings(planId: PlanId): number {
    const plan = getPlan(planId);
    const monthlyTotal = plan.monthlyPrice * 12;
    return monthlyTotal - plan.yearlyPrice;
}

/**
 * Tüm planları karşılaştırma için döndürür
 */
export function getPlansForComparison(): PlanDefinition[] {
    return [PLANS.starter, PLANS.growth, PLANS.enterprise];
}
