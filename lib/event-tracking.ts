/**
 * ============================================================================
 * EVENT TRACKING LAYER
 * ============================================================================
 * 
 * Lightweight, vendor-agnostic event tracking for upgrade & pricing flows.
 * 
 * DESIGN:
 * - Fail silently (never block UX)
 * - Console logging in dev, ready for PostHog/Segment/Mixpanel
 * - Easily replaceable with any analytics vendor
 * 
 * USAGE:
 * import { trackEvent } from '@/lib/event-tracking'
 * trackEvent('upgrade_intent', { source: 'banner', moduleId: 'voiceAppointments' })
 */

// =============================================================================
// EVENT TYPES
// =============================================================================

export type TrackingEventName =
    | 'pricing_viewed'
    | 'billing_toggle_changed'
    | 'plan_cta_clicked'
    | 'premium_module_clicked'
    | 'upgrade_intent'
    | 'upgrade_modal_opened'
    | 'upgrade_modal_dismissed'
    | 'onboarding_step_completed'
    | 'trial_warning_shown'
    | 'trial_expired';

export type EventSource =
    | 'pricing_page'
    | 'onboarding'
    | 'module_click'
    | 'banner'
    | 'console'
    | 'modal'
    | 'settings'
    | 'unknown';

export interface EventPayload {
    userId?: string;
    tenantId?: string;
    planId?: string;
    source: EventSource;
    moduleId?: string;
    billingCycle?: 'monthly' | 'annual';
    targetPlanId?: string;
    [key: string]: any;
}

interface TrackedEvent {
    name: TrackingEventName;
    payload: EventPayload;
    timestamp: string;
    sessionId: string;
    url: string;
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

let sessionId: string | null = null;

function getSessionId(): string {
    if (typeof window === 'undefined') return 'server';

    if (!sessionId) {
        sessionId = sessionStorage.getItem('vion_session_id');
        if (!sessionId) {
            sessionId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            sessionStorage.setItem('vion_session_id', sessionId);
        }
    }
    return sessionId;
}

// =============================================================================
// GLOBAL CONTEXT
// =============================================================================

let globalContext: Partial<EventPayload> = {};

export function setTrackingContext(context: Partial<EventPayload>): void {
    globalContext = { ...globalContext, ...context };
}

export function clearTrackingContext(): void {
    globalContext = {};
}

// =============================================================================
// CORE TRACKING FUNCTION
// =============================================================================

export function trackEvent(
    eventName: TrackingEventName,
    payload: Partial<EventPayload> = {}
): void {
    try {
        const event: TrackedEvent = {
            name: eventName,
            payload: {
                source: 'unknown',
                ...globalContext,
                ...payload
            },
            timestamp: new Date().toISOString(),
            sessionId: getSessionId(),
            url: typeof window !== 'undefined' ? window.location.pathname : ''
        };

        // Development: Console logging
        if (process.env.NODE_ENV === 'development') {
            console.log(
                `%c[Event] ${eventName}`,
                'color: #8b5cf6; font-weight: bold;',
                event.payload
            );
        }

        // TODO: Production - send to PostHog/Segment/Firestore
        // if (process.env.NODE_ENV === 'production') {
        //     posthog.capture(eventName, event.payload);
        // }

    } catch (error) {
        // Fail silently
        if (process.env.NODE_ENV === 'development') {
            console.warn('[Event] Failed:', eventName, error);
        }
    }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

export function trackPricingViewed(billingCycle: 'monthly' | 'annual' = 'monthly'): void {
    trackEvent('pricing_viewed', { source: 'pricing_page', billingCycle });
}

export function trackBillingToggle(newCycle: 'monthly' | 'annual'): void {
    trackEvent('billing_toggle_changed', { source: 'pricing_page', billingCycle: newCycle });
}

export function trackPlanCTAClick(planId: string, source: EventSource = 'pricing_page'): void {
    trackEvent('plan_cta_clicked', { source, targetPlanId: planId });
}

export function trackPremiumModuleClick(moduleId: string, source: EventSource = 'module_click'): void {
    trackEvent('premium_module_clicked', { source, moduleId });
}

export function trackUpgradeIntent(moduleId?: string, source: EventSource = 'modal'): void {
    trackEvent('upgrade_intent', { source, moduleId });
}

export function trackUpgradeModalOpened(moduleId: string, source: EventSource = 'onboarding'): void {
    trackEvent('upgrade_modal_opened', { source, moduleId });
}

export function trackUpgradeModalDismissed(moduleId: string): void {
    trackEvent('upgrade_modal_dismissed', { source: 'modal', moduleId });
}
