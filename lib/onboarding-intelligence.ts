/**
 * ============================================================================
 * ONBOARDING INTELLIGENCE ENGINE
 * ============================================================================
 * 
 * Adapts onboarding messaging and defaults based on user's plan.
 * 
 * DESIGN PRINCIPLES:
 * - Guidance, not restriction
 * - No selling language
 * - No upsell CTAs
 * - Never mention prices
 * 
 * PLAN BEHAVIOR:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Starter   → Simplicity, core modules, growth mindset       │
 * │ Growth    → Customization, premium preselect, no upsell    │
 * │ Enterprise→ Flexibility, scale, minimal guidance           │
 * └─────────────────────────────────────────────────────────────┘
 */

import { SectorId, getDefaultModulesForSector, isModuleAvailableForSector } from './modules-registry';
import { getPlan, getPlanDefaultModules, isModuleIncludedInPlan, normalizePlanId } from './pricing-config';

// =============================================================================
// TYPES
// =============================================================================

export type OnboardingSource = 'register' | 'pricing' | 'direct';

export interface OnboardingContext {
    planId: string;
    sectorId: SectorId;
    trialStatus: 'active' | 'expired' | 'none';
    source: OnboardingSource;
    selectedModules?: string[];
}

export interface OnboardingConfig {
    /** Main welcome title */
    introTitle: string;
    /** Welcome description */
    introDescription: string;
    /** Optional helper text for current step */
    helperText?: string;
    /** Modules to enable by default */
    defaultModules: string[];
    /** Message shown for locked features (if any) */
    lockedMessage?: string;
    /** Step-specific guidance */
    stepGuidance: {
        sector?: string;
        modules?: string;
        widget?: string;
        launch?: string;
    };
}

// =============================================================================
// COPY LIBRARY
// =============================================================================

const COPY = {
    starter: {
        introTitle: {
            en: 'Welcome to AmeritAI',
            tr: 'AmeritAI\'a Hoş Geldiniz'
        },
        introDescription: {
            en: 'Let\'s set up your AI assistant in just a few steps.',
            tr: 'AI asistanınızı birkaç adımda kuralım.'
        },
        moduleHelper: {
            en: 'We\'ve enabled the best modules for your industry. You can explore more options as you grow.',
            tr: 'Sektörünüz için en uygun modülleri etkinleştirdik. Büyüdükçe daha fazla seçenek keşfedebilirsiniz.'
        },
        widgetHelper: {
            en: 'Customize how your AI assistant looks and sounds.',
            tr: 'AI asistanınızın görünümünü ve tonunu özelleştirin.'
        },
        launchHelper: {
            en: 'Add this code to your website to go live.',
            tr: 'Canlıya geçmek için bu kodu web sitenize ekleyin.'
        }
    },
    growth: {
        introTitle: {
            en: 'Welcome to AmeritAI Scale',
            tr: 'AmeritAI Scale\'e Hoş Geldiniz'
        },
        introDescription: {
            en: 'Let\'s set up your AI assistant with enhanced features.',
            tr: 'AI asistanınızı gelişmiş özelliklerle kuralım.'
        },
        moduleHelper: {
            en: 'You have access to advanced modules. Select the ones that fit your needs.',
            tr: 'Gelişmiş modüllere erişiminiz var. İhtiyaçlarınıza uygun olanları seçin.'
        },
        widgetHelper: {
            en: 'Customize your AI assistant with more branding options.',
            tr: 'AI asistanınızı daha fazla markalama seçeneğiyle özelleştirin.'
        },
        launchHelper: {
            en: 'Deploy your AI assistant and start growing.',
            tr: 'AI asistanınızı dağıtın ve büyümeye başlayın.'
        }
    },
    enterprise: {
        introTitle: {
            en: 'Welcome to AmeritAI Enterprise',
            tr: 'AmeritAI Kurumsal\'a Hoş Geldiniz'
        },
        introDescription: {
            en: 'Configure your AI platform for scale and flexibility.',
            tr: 'AI platformunuzu ölçek ve esneklik için yapılandırın.'
        },
        moduleHelper: {
            en: 'All modules are available. Your account manager can help with advanced configurations.',
            tr: 'Tüm modüller kullanılabilir. Hesap yöneticiniz gelişmiş yapılandırmalarda yardımcı olabilir.'
        },
        widgetHelper: {
            en: 'Customize for your enterprise brand guidelines.',
            tr: 'Kurumsal marka yönergelerinize göre özelleştirin.'
        },
        launchHelper: {
            en: 'Ready for multi-site deployment with priority support.',
            tr: 'Öncelikli destekle çoklu site dağıtımına hazır.'
        }
    },
    trial: {
        introTitle: {
            en: 'Welcome to Your Free Trial',
            tr: 'Ücretsiz Denemenize Hoş Geldiniz'
        },
        introDescription: {
            en: 'Explore AmeritAI\'s core features. Your chatbot will keep working after the trial.',
            tr: 'AmeritAI\'un temel özelliklerini keşfedin. Deneme sonrasında chatbotunuz çalışmaya devam edecek.'
        },
        lockedMessage: {
            en: 'Premium modules will be available after upgrade.',
            tr: 'Premium modüller yükseltme sonrasında kullanılabilir olacak.'
        }
    }
};

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Get personalized onboarding configuration based on context.
 */
export function getOnboardingConfig(context: OnboardingContext, lang: 'en' | 'tr' = 'tr'): OnboardingConfig {
    const plan = getPlan(context.planId);
    const planType = getPlanType(context.planId);
    const isTrialActive = context.trialStatus === 'active';

    // Get sector-based default modules
    const sectorDefaults = getDefaultModulesForSector(context.sectorId);

    // Get plan-specific copy
    const copy = isTrialActive && planType === 'starter'
        ? { ...COPY.starter, ...COPY.trial }
        : COPY[planType];

    // Build default modules based on plan
    const defaultModules = buildDefaultModules(context, planType);

    return {
        introTitle: copy.introTitle[lang],
        introDescription: copy.introDescription[lang],
        helperText: undefined, // Set per-step
        defaultModules,
        lockedMessage: isTrialActive ? COPY.trial.lockedMessage[lang] : undefined,
        stepGuidance: {
            sector: getSectorGuidance(planType, lang),
            modules: copy.moduleHelper?.[lang],
            widget: copy.widgetHelper?.[lang],
            launch: copy.launchHelper?.[lang]
        }
    };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

type PlanType = 'starter' | 'growth' | 'enterprise';

function getPlanType(planId: string): PlanType {
    return normalizePlanId(planId);
}

function buildDefaultModules(context: OnboardingContext, planType: PlanType): string[] {
    const plan = getPlan(context.planId);

    // Sector defaults are only seeded when the plan actually includes them.
    // This prevents enabling premium/out-of-plan modules by default
    // (e.g. Starter + restaurant should NOT auto-enable the premium digitalWaiter).
    const sectorDefaults = getDefaultModulesForSector(context.sectorId)
        .filter(moduleId => isModuleIncludedInPlan(context.planId, moduleId));

    if (!plan) {
        // Plan not found: fall back to sector defaults, still filtered for sector compatibility.
        return getDefaultModulesForSector(context.sectorId)
            .filter(moduleId => isModuleAvailableForSector(moduleId, context.sectorId));
    }

    // Use the plan's curated default-enabled set (NOT the full `included` list).
    // `included` only means "available in this plan"; `defaultEnabled` is what should be ON.
    const planDefaults = getPlanDefaultModules(context.planId);

    // Combine plan defaults + in-plan sector defaults, dedupe, then drop anything
    // that the tenant's sector does not support.
    return Array.from(new Set<string>([...planDefaults, ...sectorDefaults]))
        .filter(moduleId => isModuleAvailableForSector(moduleId as any, context.sectorId));
}

function getSectorGuidance(planType: PlanType, lang: 'en' | 'tr'): string {
    const guidance = {
        starter: {
            en: 'Select your industry to get the most relevant AI features.',
            tr: 'En uygun AI özelliklerini almak için sektörünüzü seçin.'
        },
        growth: {
            en: 'Your industry helps us provide better AI recommendations.',
            tr: 'Sektörünüz daha iyi AI önerileri sunmamıza yardımcı olur.'
        },
        enterprise: {
            en: 'Configure for your primary business vertical.',
            tr: 'Ana iş alanınız için yapılandırın.'
        }
    };

    return guidance[planType][lang];
}

// =============================================================================
// STEP-SPECIFIC HELPERS
// =============================================================================

/**
 * Get guidance text for a specific onboarding step.
 */
export function getStepGuidance(
    context: OnboardingContext,
    step: 'sector' | 'modules' | 'widget' | 'launch',
    lang: 'en' | 'tr' = 'tr'
): string {
    const config = getOnboardingConfig(context, lang);
    return config.stepGuidance[step] || '';
}

/**
 * Get intro messaging for the onboarding welcome screen.
 */
export function getWelcomeMessage(
    context: OnboardingContext,
    lang: 'en' | 'tr' = 'tr'
): { title: string; description: string } {
    const config = getOnboardingConfig(context, lang);
    return {
        title: config.introTitle,
        description: config.introDescription
    };
}

/**
 * Get default modules to pre-select based on plan and sector.
 */
export function getDefaultModulesForPlan(
    planId: string,
    sectorId: SectorId
): string[] {
    const planType = getPlanType(planId);
    return buildDefaultModules({ planId, sectorId, trialStatus: 'none', source: 'direct' }, planType);
}

/**
 * Check if a module should be locked in the onboarding UI.
 */
export function isModuleLockedInOnboarding(
    context: OnboardingContext,
    moduleId: string
): boolean {
    const planType = getPlanType(context.planId);
    const sectorDefaults = getDefaultModulesForSector(context.sectorId);

    // Starter/trial: Lock anything not in sector defaults
    if (planType === 'starter' && context.trialStatus === 'active') {
        return !sectorDefaults.includes(moduleId as any);
    }

    // Scale/Enterprise: Nothing locked
    return false;
}
