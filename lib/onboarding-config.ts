/**
 * Onboarding Configuration
 * Types, steps, and validation for mandatory onboarding wizard
 */

import { z } from "zod";

// =============================================================================
// TYPES
// =============================================================================

export type OnboardingStatus =
    | 'not_started'      // Default after registration
    | 'in_progress'      // User started but not finished
    | 'completed'        // All steps done with verification
    | 'completed_soft'   // Completed via "later" option - shows banner
    | 'skipped';         // Admin override (rare)

export type OnboardingStep =
    | 'sector'           // Step 1: Select industry (mandatory)
    | 'plan'             // Step 2: Select plan (mandatory)
    | 'knowledge'        // Step 3: Add website URL (mandatory)
    | 'widget'           // Step 4: Brand setup (mandatory)
    | 'launch';          // Step 5: Copy snippet + optional verify

export const ONBOARDING_STEPS: OnboardingStep[] = [
    'sector',
    'plan',
    'knowledge',
    'widget',
    'launch'
];

export const STEP_INDEX: Record<OnboardingStep, number> = {
    sector: 0,
    plan: 1,
    knowledge: 2,
    widget: 3,
    launch: 4
};

// Steps that MUST be completed (not skippable)
export const MANDATORY_STEPS: OnboardingStep[] = ['sector', 'plan', 'knowledge', 'widget'];

// =============================================================================
// STEP CONFIGURATION
// =============================================================================

export interface StepConfig {
    id: OnboardingStep;
    title: { en: string; tr: string };
    description: { en: string; tr: string };
    isMandatory: boolean;
}

export const STEP_CONFIG: Record<OnboardingStep, StepConfig> = {
    sector: {
        id: 'sector',
        title: { en: 'Choose Your Industry', tr: 'Sektörünüzü Seçin' },
        description: {
            en: 'Select your industry to get AI optimized for your business',
            tr: 'İşletmenize özel AI özelliklerini almak için sektörünüzü seçin'
        },
        isMandatory: true
    },
    plan: {
        id: 'plan',
        title: { en: 'Choose Your Plan', tr: 'Planınızı Seçin' },
        description: {
            en: 'Select a plan that fits your business needs',
            tr: 'İşletmenizin ihtiyaçlarına uygun bir plan seçin'
        },
        isMandatory: true
    },

    knowledge: {
        id: 'knowledge',
        title: { en: 'Train Your AI', tr: 'Yapay Zekanızı Eğitin' },
        description: {
            en: 'Add your website URL to train your chatbot',
            tr: 'Chatbot\'unuzu eğitmek için web sitenizin adresini ekleyin'
        },
        isMandatory: true
    },
    widget: {
        id: 'widget',
        title: { en: 'Customize Your Widget', tr: 'Widget\'ınızı Özelleştirin' },
        description: {
            en: 'Set up your brand colors and welcome message',
            tr: 'Marka renklerinizi ve karşılama mesajınızı ayarlayın'
        },
        isMandatory: true
    },
    launch: {
        id: 'launch',
        title: { en: 'Launch Your Chatbot', tr: 'Chatbot\'unuzu Başlatın' },
        description: {
            en: 'Copy the embed code and add it to your website',
            tr: 'Embed kodunu kopyalayın ve web sitenize ekleyin'
        },
        isMandatory: false
    }
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

export const SectorSchema = z.object({
    sector: z.enum([
        'ecommerce', 'booking', 'real_estate', 'saas',
        'service', 'healthcare', 'education', 'academic',
        'finance', 'other'
    ])
});

export const WidgetSchema = z.object({
    brandName: z.string().min(1, "Brand name is required").max(100),
    welcomeMessage: z.string().min(1, "Welcome message is required").max(500),
    brandColor: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Invalid color format"),
    position: z.enum(['bottom-right', 'bottom-left']).default('bottom-right')
});

export const VerifyInstallSchema = z.object({
    websiteUrl: z.string().url("Invalid URL").refine(
        url => url.startsWith("https://") || url.startsWith("http://"),
        "URL must start with http:// or https://"
    )
});

export const CompleteSchema = z.object({
    completionType: z.enum(['full', 'soft']) // 'full' = verified, 'soft' = complete later
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if user can access a specific step based on completed steps
 */
export function canAccessStep(
    targetStep: OnboardingStep,
    completedSteps: OnboardingStep[]
): boolean {
    const targetIndex = STEP_INDEX[targetStep];

    // First step is always accessible
    if (targetIndex === 0) return true;

    // For other steps, all previous mandatory steps must be completed
    for (let i = 0; i < targetIndex; i++) {
        const step = ONBOARDING_STEPS[i];
        if (MANDATORY_STEPS.includes(step) && !completedSteps.includes(step)) {
            return false;
        }
    }

    // Also require the immediate previous step to be completed
    const previousStep = ONBOARDING_STEPS[targetIndex - 1];
    return completedSteps.includes(previousStep);
}

/**
 * Get the next step to navigate to
 */
export function getNextStep(currentStep: OnboardingStep): OnboardingStep | null {
    const currentIndex = STEP_INDEX[currentStep];
    if (currentIndex >= ONBOARDING_STEPS.length - 1) return null;
    return ONBOARDING_STEPS[currentIndex + 1];
}

/**
 * Get the previous step
 */
export function getPreviousStep(currentStep: OnboardingStep): OnboardingStep | null {
    const currentIndex = STEP_INDEX[currentStep];
    if (currentIndex <= 0) return null;
    return ONBOARDING_STEPS[currentIndex - 1];
}

/**
 * Check if all mandatory steps are completed
 */
export function areMandatoryStepsComplete(completedSteps: OnboardingStep[]): boolean {
    return MANDATORY_STEPS.every(step => completedSteps.includes(step));
}

/**
 * Get completion percentage
 */
export function getCompletionPercentage(completedSteps: OnboardingStep[]): number {
    return Math.round((completedSteps.length / ONBOARDING_STEPS.length) * 100);
}

// =============================================================================
// ONBOARDING DATA INTERFACE
// =============================================================================

export interface OnboardingData {
    status: OnboardingStatus;
    currentStep: number;
    completedSteps: OnboardingStep[];
    startedAt: string | null;
    completedAt: string | null;
}

export const DEFAULT_ONBOARDING: OnboardingData = {
    status: 'not_started',
    currentStep: 0,
    completedSteps: [],
    startedAt: null,
    completedAt: null
};

// =============================================================================
// MODULE STATE INTERFACE
// =============================================================================

export interface ModuleState {
    isEnabled: boolean;
    isPremium: boolean;
    lockedReason: 'upgrade_required' | 'not_available' | null;
}

export type ModulesConfig = Record<string, ModuleState>;
