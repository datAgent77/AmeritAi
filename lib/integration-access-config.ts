/**
 * Integration Access Configuration
 * Defines which subscription plans have access to each integration method
 */

export interface IntegrationAccessConfig {
    minSortOrder: number
    minPlan: string
    displayName: { en: string; tr: string }
}

/**
 * Integration access map
 * Key: integration ID (matches integration-page.tsx)
 * Value: minimum plan required
 *
 * Plan sort orders:
 * - starter: 1
 * - growth: 2
 * - enterprise: 3
 */
export const INTEGRATION_ACCESS: Record<string, IntegrationAccessConfig> = {
    // Starter (All plans) - Basic web integrations
    'website': {
        minSortOrder: 1,
        minPlan: 'starter',
        displayName: { en: 'Website Widget', tr: 'Web Sitesi Widget' }
    },
    'iframe': {
        minSortOrder: 1,
        minPlan: 'starter',
        displayName: { en: 'iFrame Embed', tr: 'iFrame Gömme' }
    },
    'direct-link': {
        minSortOrder: 1,
        minPlan: 'starter',
        displayName: { en: 'Direct Link', tr: 'Doğrudan Bağlantı' }
    },
    'wordpress': {
        minSortOrder: 1,
        minPlan: 'starter',
        displayName: { en: 'WordPress', tr: 'WordPress' }
    },
    'mobile-app-api': {
        minSortOrder: 2,
        minPlan: 'growth',
        displayName: { en: 'Mobile App / API', tr: 'Mobile App / API' }
    },
    'ticket-webhook': {
        minSortOrder: 2,
        minPlan: 'growth',
        displayName: { en: 'Ticket Webhook', tr: 'Ticket Webhook' }
    },

    // Growth+ - Messaging platforms
    'telegram': {
        minSortOrder: 2,
        minPlan: 'growth',
        displayName: { en: 'Telegram', tr: 'Telegram' }
    },
    'meta-channels': {
        minSortOrder: 2,
        minPlan: 'growth',
        displayName: { en: 'Meta Channels', tr: 'Meta Kanallari' }
    },
    'whatsapp': {
        minSortOrder: 2,
        minPlan: 'growth',
        displayName: { en: 'WhatsApp Business', tr: 'WhatsApp Business' }
    },
    'instagram': {
        minSortOrder: 2,
        minPlan: 'growth',
        displayName: { en: 'Instagram DM', tr: 'Instagram DM' }
    },
    'slack': {
        minSortOrder: 2,
        minPlan: 'growth',
        displayName: { en: 'Slack', tr: 'Slack' }
    },

    // Growth+ - CRM, Calendars, E-commerce, Email Marketing
    'salesforce': {
        minSortOrder: 2,
        minPlan: 'growth',
        displayName: { en: 'Salesforce', tr: 'Salesforce' }
    },
    'google-calendar': {
        minSortOrder: 2,
        minPlan: 'growth',
        displayName: { en: 'Google Calendar', tr: 'Google Calendar' }
    },
    'outlook-calendar': {
        minSortOrder: 2,
        minPlan: 'growth',
        displayName: { en: 'Outlook Calendar', tr: 'Outlook Calendar' }
    },
    'shopify': {
        minSortOrder: 2,
        minPlan: 'growth',
        displayName: { en: 'Shopify', tr: 'Shopify' }
    },
    'ikas': {
        minSortOrder: 2,
        minPlan: 'growth',
        displayName: { en: 'İkas', tr: 'İkas' }
    },
    'ideasoft': {
        minSortOrder: 2,
        minPlan: 'growth',
        displayName: { en: 'IdeaSoft', tr: 'IdeaSoft' }
    },
    'ticimax': {
        minSortOrder: 2,
        minPlan: 'growth',
        displayName: { en: 'Ticimax', tr: 'Ticimax' }
    },
    'tsoft': {
        minSortOrder: 2,
        minPlan: 'growth',
        displayName: { en: 'T-Soft', tr: 'T-Soft' }
    },
    'woocommerce': {
        minSortOrder: 2,
        minPlan: 'growth',
        displayName: { en: 'WooCommerce', tr: 'WooCommerce' }
    },
    'mailchimp': {
        minSortOrder: 2,
        minPlan: 'growth',
        displayName: { en: 'Mailchimp', tr: 'Mailchimp' }
    },
    'sendgrid': {
        minSortOrder: 2,
        minPlan: 'growth',
        displayName: { en: 'SendGrid', tr: 'SendGrid' }
    },
    'constant-contact': {
        minSortOrder: 2,
        minPlan: 'growth',
        displayName: { en: 'Constant Contact', tr: 'Constant Contact' }
    },
}

/**
 * Check if user has access to a specific integration
 */
export function hasIntegrationAccess(integrationId: string, userPlanSortOrder: number): boolean {
    const config = INTEGRATION_ACCESS[integrationId]
    if (!config) return true // Unknown integration = allow access
    return userPlanSortOrder >= config.minSortOrder
}

/**
 * Get the minimum plan required for an integration
 */
export function getIntegrationMinPlan(integrationId: string): string | null {
    return INTEGRATION_ACCESS[integrationId]?.minPlan || null
}

/**
 * Get all integrations grouped by plan requirement
 */
export function getIntegrationsByPlan() {
    const groups: Record<string, string[]> = {
        starter: [],
        growth: [],
        enterprise: []
    }

    Object.entries(INTEGRATION_ACCESS).forEach(([id, config]) => {
        groups[config.minPlan]?.push(id)
    })

    return groups
}
