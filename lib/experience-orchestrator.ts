/**
 * ============================================================================
 * EXPERIENCE ORCHESTRATOR
 * ============================================================================
 * 
 * Single decision layer that composes all intelligence engines.
 * UI components should call this orchestrator, not individual engines.
 * 
 * RESPONSIBILITIES:
 * - Compose onboarding, upgrade, and empty-state intelligence
 * - Return a single structured experience object
 * - Ensure no conflicting UI states
 * 
 * RULES:
 * - NO new business logic (only orchestration)
 * - UI must never contain decision logic
 * - TypeScript-only, UI-agnostic
 */

import {
    getOnboardingConfig,
    getWelcomeMessage,
    isModuleLockedInOnboarding,
    OnboardingContext,
    OnboardingConfig
} from './onboarding-intelligence';

import {
    getUpgradePrompt,
    shouldShowUpgradeBanner,
    getModuleUpgradePrompt,
    markPromptShown,
    UpgradeContext,
    UpgradePrompt
} from './upgrade-intelligence';

import {
    getEmptyState,
    EmptyStateContext,
    EmptyStateConfig,
    EmptyStateModule
} from './empty-state-intelligence';

import { SectorId } from './modules-registry';

// =============================================================================
// TYPES
// =============================================================================

export type OnboardingStatus = 'pending' | 'in_progress' | 'completed_soft' | 'completed';
export type TrialStatus = 'active' | 'expired' | 'none';

export interface UserContext {
    userId: string;
    planId: string;
    sectorId: SectorId;
    onboardingStatus: OnboardingStatus;
    trialStatus: TrialStatus;
    daysLeftInTrial: number;
    userActionCount: number;
}

export interface PageContext {
    moduleId?: EmptyStateModule;
    hasData?: boolean;
    clickedModuleId?: string;
}

export interface ExperienceState {
    /** Onboarding UI state */
    onboarding: {
        shouldShow: boolean;
        config?: OnboardingConfig;
    };

    /** Upgrade banner state */
    upgradeBanner: {
        shouldShow: boolean;
        prompt?: UpgradePrompt;
    };

    /** Upgrade modal state (for module clicks) */
    upgradeModal: {
        shouldShow: boolean;
        prompt?: UpgradePrompt;
    };

    /** Empty state for current page */
    emptyState: {
        shouldShow: boolean;
        config?: EmptyStateConfig;
    };

    /** Overall page readiness */
    isReady: boolean;
}

// =============================================================================
// MAIN ORCHESTRATOR
// =============================================================================

/**
 * Get complete experience state for a page.
 * Call this once per page load/navigation.
 */
export function getExperienceState(
    user: UserContext,
    page: PageContext = {},
    lang: 'en' | 'tr' = 'tr'
): ExperienceState {
    const state: ExperienceState = {
        onboarding: { shouldShow: false },
        upgradeBanner: { shouldShow: false },
        upgradeModal: { shouldShow: false },
        emptyState: { shouldShow: false },
        isReady: true
    };

    // 1. Check onboarding first (highest priority)
    if (shouldShowOnboarding(user)) {
        const onboardingContext = buildOnboardingContext(user);
        state.onboarding = {
            shouldShow: true,
            config: getOnboardingConfig(onboardingContext, lang)
        };
        // If onboarding is active, skip other checks
        return state;
    }

    // 2. Check upgrade banner (for trial users)
    const bannerPrompt = getUpgradeBannerState(user, lang);
    if (bannerPrompt) {
        state.upgradeBanner = {
            shouldShow: true,
            prompt: bannerPrompt
        };
    }

    // 3. Check upgrade modal (for premium module clicks)
    if (page.clickedModuleId) {
        const modalPrompt = getUpgradeModalState(user, page.clickedModuleId, lang);
        if (modalPrompt.shouldShow) {
            state.upgradeModal = {
                shouldShow: true,
                prompt: modalPrompt
            };
        }
    }

    // 4. Check empty state (if module specified and no data)
    if (page.moduleId && page.hasData === false) {
        const emptyStateConfig = getEmptyStateForPage(user, page, lang);
        state.emptyState = {
            shouldShow: true,
            config: emptyStateConfig
        };
    }

    return state;
}

// =============================================================================
// COMPONENT HELPERS
// =============================================================================

/**
 * Check if onboarding should be shown.
 */
function shouldShowOnboarding(user: UserContext): boolean {
    return user.onboardingStatus === 'pending' || user.onboardingStatus === 'in_progress';
}

/**
 * Build onboarding context from user context.
 */
function buildOnboardingContext(user: UserContext): OnboardingContext {
    return {
        planId: user.planId,
        sectorId: user.sectorId,
        trialStatus: user.trialStatus,
        source: 'direct'
    };
}

/**
 * Get upgrade banner state.
 */
function getUpgradeBannerState(user: UserContext, lang: 'en' | 'tr'): UpgradePrompt | null {
    const upgradeContext: Omit<UpgradeContext, 'source'> = {
        planId: user.planId,
        trialStatus: user.trialStatus,
        daysLeftInTrial: user.daysLeftInTrial,
        lastEvents: []
    };

    return shouldShowUpgradeBanner(upgradeContext);
}

/**
 * Get upgrade modal state for a clicked module.
 */
function getUpgradeModalState(
    user: UserContext,
    moduleId: string,
    lang: 'en' | 'tr'
): UpgradePrompt {
    // Check if module is locked for this user
    const onboardingContext = buildOnboardingContext(user);
    const isLocked = isModuleLockedInOnboarding(onboardingContext, moduleId);

    if (!isLocked) {
        return {
            shouldShow: false,
            reason: 'none',
            title: '',
            description: '',
            ctaLabel: '',
            priority: 0
        };
    }

    return getModuleUpgradePrompt(moduleId, lang);
}

/**
 * Get empty state config for current page.
 */
function getEmptyStateForPage(
    user: UserContext,
    page: PageContext,
    lang: 'en' | 'tr'
): EmptyStateConfig {
    const emptyContext: EmptyStateContext = {
        planId: user.planId,
        moduleId: page.moduleId || 'dashboard',
        isTrial: user.trialStatus === 'active',
        hasData: page.hasData ?? false,
        userActionCount: user.userActionCount
    };

    return getEmptyState(emptyContext, lang);
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Quick check if user needs onboarding redirect.
 */
export function needsOnboardingRedirect(user: UserContext): boolean {
    return user.onboardingStatus === 'pending';
}

/**
 * Get onboarding welcome message.
 */
export function getOnboardingWelcome(
    user: UserContext,
    lang: 'en' | 'tr' = 'tr'
): { title: string; description: string } {
    const context = buildOnboardingContext(user);
    return getWelcomeMessage(context, lang);
}

/**
 * Check if a module is locked for the current user.
 */
export function isModuleLocked(user: UserContext, moduleId: string): boolean {
    const context = buildOnboardingContext(user);
    return isModuleLockedInOnboarding(context, moduleId);
}

/**
 * Handle premium module click.
 * Returns upgrade prompt and marks prompt as shown.
 */
export function handlePremiumModuleClick(
    user: UserContext,
    moduleId: string,
    lang: 'en' | 'tr' = 'tr'
): UpgradePrompt {
    const prompt = getModuleUpgradePrompt(moduleId, lang);
    if (prompt.shouldShow) {
        markPromptShown();
    }
    return prompt;
}

/**
 * Get empty state for dashboard.
 */
export function getDashboardState(
    user: UserContext,
    hasData: boolean,
    lang: 'en' | 'tr' = 'tr'
): ExperienceState {
    return getExperienceState(user, { moduleId: 'dashboard', hasData }, lang);
}

/**
 * Get experience state for a specific module page.
 */
export function getModulePageState(
    user: UserContext,
    moduleId: EmptyStateModule,
    hasData: boolean,
    lang: 'en' | 'tr' = 'tr'
): ExperienceState {
    return getExperienceState(user, { moduleId, hasData }, lang);
}
