/**
 * ============================================================================
 * EXPERIENCE UI ADAPTER
 * ============================================================================
 * 
 * Glue layer that converts ExperienceState → Single UI Action
 * 
 * WHY PRIORITY MATTERS:
 * ─────────────────────
 * 1. ONBOARDING: Must complete before anything else. Incomplete onboarding
 *    means user hasn't configured their chatbot - nothing else makes sense.
 * 
 * 2. UPGRADE BANNER: Trial users need gentle reminders. But banners are
 *    passive - they don't block workflow, just inform.
 * 
 * 3. UPGRADE MODAL: Premium module clicks need immediate response.
 *    User explicitly asked for something locked - educate them.
 * 
 * 4. EMPTY STATE: Last priority because it's contextual to the current
 *    page. Only show if no higher-priority action is needed.
 * 
 * 5. NONE: Everything is fine, render normally.
 * 
 * RULES:
 * - UI must NOT contain business logic
 * - One and ONLY one action can be returned
 * - Exhaustive switch, no fallthrough
 */

import { ExperienceState } from './experience-orchestrator';

// =============================================================================
// TYPES
// =============================================================================

/**
 * All possible UI experience actions.
 * Only ONE can be active at a time.
 */
export type UIExperienceActionType =
    | 'redirect-to-onboarding'  // User needs to complete onboarding
    | 'show-onboarding'         // Show onboarding UI in current context
    | 'show-upgrade-banner'     // Show upgrade banner (passive)
    | 'open-upgrade-modal'      // Open upgrade modal (active)
    | 'show-empty-state'        // Render empty state for page
    | 'none';                   // No special action needed

/**
 * UI Experience Action with typed payload.
 */
export type UIExperienceAction =
    | { type: 'redirect-to-onboarding'; redirectUrl: string }
    | { type: 'show-onboarding'; config: NonNullable<ExperienceState['onboarding']['config']> }
    | { type: 'show-upgrade-banner'; prompt: NonNullable<ExperienceState['upgradeBanner']['prompt']> }
    | { type: 'open-upgrade-modal'; prompt: NonNullable<ExperienceState['upgradeModal']['prompt']> }
    | { type: 'show-empty-state'; config: NonNullable<ExperienceState['emptyState']['config']> }
    | { type: 'none' };

// =============================================================================
// MAIN ADAPTER FUNCTION
// =============================================================================

/**
 * Convert ExperienceState into a single UI action.
 * 
 * This function enforces strict priority order.
 * UI components should use this, not raw ExperienceState.
 * 
 * @param state - The experience state from getExperienceState()
 * @returns A single UI action to perform
 */
export function getUIExperienceAction(state: ExperienceState): UIExperienceAction {
    // Priority 0: Not ready → Redirect to onboarding
    // This catches edge cases where user somehow bypassed onboarding
    if (!state.isReady) {
        return {
            type: 'redirect-to-onboarding',
            redirectUrl: '/onboarding'
        };
    }

    // Priority 1: Onboarding blocks everything
    // User must complete setup before using the product
    if (state.onboarding.shouldShow && state.onboarding.config) {
        return {
            type: 'show-onboarding',
            config: state.onboarding.config
        };
    }

    // Priority 2: Upgrade banner for trial users
    // Passive reminder, doesn't block interaction
    if (state.upgradeBanner.shouldShow && state.upgradeBanner.prompt) {
        return {
            type: 'show-upgrade-banner',
            prompt: state.upgradeBanner.prompt
        };
    }

    // Priority 3: Upgrade modal for premium clicks
    // User explicitly clicked something locked - respond immediately
    if (state.upgradeModal.shouldShow && state.upgradeModal.prompt) {
        return {
            type: 'open-upgrade-modal',
            prompt: state.upgradeModal.prompt
        };
    }

    // Priority 4: Empty state for current page
    // Only show if no higher-priority action needed
    if (state.emptyState.shouldShow && state.emptyState.config) {
        return {
            type: 'show-empty-state',
            config: state.emptyState.config
        };
    }

    // Priority 5: Nothing special needed
    // Render the page normally
    return { type: 'none' };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if the action requires a redirect.
 */
export function isRedirectAction(action: UIExperienceAction): action is { type: 'redirect-to-onboarding'; redirectUrl: string } {
    return action.type === 'redirect-to-onboarding';
}

/**
 * Check if the action requires showing a modal.
 */
export function isModalAction(action: UIExperienceAction): action is { type: 'open-upgrade-modal'; prompt: any } {
    return action.type === 'open-upgrade-modal';
}

/**
 * Check if the action requires showing a banner.
 */
export function isBannerAction(action: UIExperienceAction): action is { type: 'show-upgrade-banner'; prompt: any } {
    return action.type === 'show-upgrade-banner';
}

/**
 * Check if the action requires showing an empty state.
 */
export function isEmptyStateAction(action: UIExperienceAction): action is { type: 'show-empty-state'; config: any } {
    return action.type === 'show-empty-state';
}

/**
 * Check if no action is needed.
 */
export function isNoAction(action: UIExperienceAction): action is { type: 'none' } {
    return action.type === 'none';
}

/**
 * Get action type as string (for debugging/logging).
 */
export function getActionTypeLabel(action: UIExperienceAction): string {
    return action.type;
}
