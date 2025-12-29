/**
 * ============================================================================
 * UPGRADE INTELLIGENCE ENGINE
 * ============================================================================
 * 
 * Context-aware decision engine for upgrade prompts.
 * Decides WHEN, WHY, and WHAT message to show.
 * 
 * DESIGN PRINCIPLES:
 * - Helpful, not salesy
 * - Educational, not urgent
 * - Never block core features
 * - Never show twice in same session
 * 
 * DECISION TREE:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ 1. Already shown this session?  → No prompt                 │
 * │ 2. Trial expired?               → Gentle reminder           │
 * │ 3. Trial ≤3 days left?          → Soft trial warning        │
 * │ 4. Premium module clicked?      → Module-specific value     │
 * │ 5. Starter + priced viewed 2x?  → Explore upgrade           │
 * │ 6. Otherwise                    → No prompt                 │
 * └─────────────────────────────────────────────────────────────┘
 */

import { TrackingEventName } from './event-tracking';
import { getModule, ModuleId } from './modules-registry';

// =============================================================================
// TYPES
// =============================================================================

export type TrialStatus = 'active' | 'expired' | 'none';

export type UpgradeReason =
    | 'trial_expiring'
    | 'trial_expired'
    | 'premium_module'
    | 'plan_limit'
    | 'explore'
    | 'none';

export type PromptSource =
    | 'pricing'
    | 'onboarding'
    | 'console'
    | 'banner'
    | 'module_click';

export interface UpgradeContext {
    planId: string;
    trialStatus: TrialStatus;
    daysLeftInTrial: number;
    lastEvents: TrackingEventName[];
    clickedModuleId?: string;
    source: PromptSource;
    sessionPromptCount?: number;
}

export interface UpgradePrompt {
    shouldShow: boolean;
    reason: UpgradeReason;
    title: string;
    description: string;
    ctaLabel: string;
    priority: number; // Higher = more important
}

// =============================================================================
// SESSION STATE
// =============================================================================

let sessionPromptShown = false;
let sessionPromptCount = 0;

/**
 * Mark that a prompt was shown this session
 */
export function markPromptShown(): void {
    sessionPromptShown = true;
    sessionPromptCount++;
}

/**
 * Reset session state (for testing or new sessions)
 */
export function resetSessionState(): void {
    sessionPromptShown = false;
    sessionPromptCount = 0;
}

/**
 * Get current session prompt count
 */
export function getSessionPromptCount(): number {
    return sessionPromptCount;
}

// =============================================================================
// COPY LIBRARY
// =============================================================================

const COPY = {
    trial_expiring: {
        title: {
            en: 'Your trial ends soon',
            tr: 'Deneme süreniz yakında bitiyor'
        },
        description: {
            en: 'You have {days} days left. Your chatbot will keep working, but premium features will be locked.',
            tr: 'Kalan süreniz: {days} gün. Chatbotunuz çalışmaya devam edecek, ancak premium özellikler kilitlenecek.'
        },
        cta: {
            en: 'View Plans',
            tr: 'Planları Gör'
        }
    },
    trial_expired: {
        title: {
            en: 'Your trial has ended',
            tr: 'Deneme süreniz sona erdi'
        },
        description: {
            en: 'Your chatbot is still working. Upgrade to unlock premium features.',
            tr: 'Chatbotunuz çalışmaya devam ediyor. Premium özellikleri açmak için yükseltin.'
        },
        cta: {
            en: 'Upgrade Now',
            tr: 'Şimdi Yükselt'
        }
    },
    premium_module: {
        title: {
            en: 'Unlock {module}',
            tr: '{module} modülünü açın'
        },
        description: {
            en: 'This feature helps you {benefit}. Available in Pro plan.',
            tr: 'Bu özellik {benefit} sağlar. Pro planında mevcut.'
        },
        cta: {
            en: 'Learn More',
            tr: 'Daha Fazla Bilgi'
        }
    },
    explore: {
        title: {
            en: 'Ready to grow?',
            tr: 'Büyümeye hazır mısınız?'
        },
        description: {
            en: 'Unlock powerful AI tools to boost your sales and engagement.',
            tr: 'Satışlarınızı ve etkileşiminizi artıracak güçlü AI araçlarını keşfedin.'
        },
        cta: {
            en: 'Explore Pro',
            tr: 'Pro\'yu Keşfet'
        }
    }
};

// Module-specific benefits
const MODULE_BENEFITS: Record<string, { en: string; tr: string }> = {
    voiceAppointments: {
        en: 'handle voice calls and schedule appointments automatically',
        tr: 'sesli aramaları ve randevuları otomatik yönetmenizi'
    },
    aiCopywriter: {
        en: 'generate marketing copy and product descriptions',
        tr: 'pazarlama metinleri ve ürün açıklamaları oluşturmanızı'
    },
    salesOptimization: {
        en: 'optimize your sales funnel with AI insights',
        tr: 'AI önerileriyle satış huninizi optimize etmenizi'
    },
    emailMarketing: {
        en: 'automate email campaigns and follow-ups',
        tr: 'e-posta kampanyalarını ve takipleri otomatikleştirmenizi'
    }
};

// =============================================================================
// MAIN DECISION FUNCTION
// =============================================================================

/**
 * Get upgrade prompt based on user context.
 * Returns shouldShow: false if no prompt is appropriate.
 */
export function getUpgradePrompt(context: UpgradeContext, lang: 'en' | 'tr' = 'tr'): UpgradePrompt {
    // RULE 1: Never show more than once per session
    if (sessionPromptShown && context.source !== 'module_click') {
        return noPrompt();
    }

    // RULE 2: Trial expired → Gentle reminder
    if (context.trialStatus === 'expired') {
        return buildPrompt('trial_expired', lang, { priority: 8 });
    }

    // RULE 3: Trial expiring (≤3 days) → Soft warning
    if (context.trialStatus === 'active' && context.daysLeftInTrial <= 3) {
        return buildPrompt('trial_expiring', lang, {
            priority: 7,
            replacements: { days: context.daysLeftInTrial.toString() }
        });
    }

    // RULE 4: Premium module clicked → Module-specific value
    if (context.clickedModuleId && context.source === 'module_click') {
        return buildModulePrompt(context.clickedModuleId, lang);
    }

    // RULE 5: Starter plan + pricing viewed multiple times → Explore
    if (context.planId === 'starter' && hasPricingViewedMultiple(context.lastEvents)) {
        return buildPrompt('explore', lang, { priority: 4 });
    }

    // Default: No prompt
    return noPrompt();
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function noPrompt(): UpgradePrompt {
    return {
        shouldShow: false,
        reason: 'none',
        title: '',
        description: '',
        ctaLabel: '',
        priority: 0
    };
}

function buildPrompt(
    reason: 'trial_expiring' | 'trial_expired' | 'explore',
    lang: 'en' | 'tr',
    options: { priority: number; replacements?: Record<string, string> } = { priority: 5 }
): UpgradePrompt {
    const copy = COPY[reason];
    let description = copy.description[lang];

    // Apply replacements
    if (options.replacements) {
        Object.entries(options.replacements).forEach(([key, value]) => {
            description = description.replace(`{${key}}`, value);
        });
    }

    return {
        shouldShow: true,
        reason,
        title: copy.title[lang],
        description,
        ctaLabel: copy.cta[lang],
        priority: options.priority
    };
}

function buildModulePrompt(moduleId: string, lang: 'en' | 'tr'): UpgradePrompt {
    const mod = getModule(moduleId as ModuleId);
    const moduleName = mod?.name[lang] || moduleId;
    const benefit = MODULE_BENEFITS[moduleId]?.[lang] ||
        (lang === 'tr' ? 'işletmenizi geliştirmenizi' : 'grow your business');

    const copy = COPY.premium_module;
    const title = copy.title[lang].replace('{module}', moduleName);
    const description = copy.description[lang].replace('{benefit}', benefit);

    return {
        shouldShow: true,
        reason: 'premium_module',
        title,
        description,
        ctaLabel: copy.cta[lang],
        priority: 6
    };
}

function hasPricingViewedMultiple(events: TrackingEventName[]): boolean {
    const pricingViews = events.filter(e => e === 'pricing_viewed');
    return pricingViews.length >= 2;
}

// =============================================================================
// CONTEXT-SPECIFIC HELPERS
// =============================================================================

/**
 * Should we show the upgrade banner?
 * Returns prompt or null if no banner should show.
 */
export function shouldShowUpgradeBanner(context: Omit<UpgradeContext, 'source'>): UpgradePrompt | null {
    const prompt = getUpgradePrompt({ ...context, source: 'banner' });

    // Only show banner for trial scenarios, not module clicks
    if (prompt.shouldShow && (prompt.reason === 'trial_expiring' || prompt.reason === 'trial_expired')) {
        return prompt;
    }

    return null;
}

/**
 * Get prompt for upgrade modal (module-specific)
 */
export function getModuleUpgradePrompt(moduleId: string, lang: 'en' | 'tr' = 'tr'): UpgradePrompt {
    return buildModulePrompt(moduleId, lang);
}

/**
 * Check if user should see any upgrade messaging
 * Used for gating logic without showing UI
 */
export function isUpgradeCandidate(context: UpgradeContext): boolean {
    const prompt = getUpgradePrompt(context);
    return prompt.shouldShow;
}
