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
 * - pro: 3
 * - enterprise: 4
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
    
    // Pro+ - CRM, Calendars, E-commerce, Email Marketing
    'salesforce': { 
        minSortOrder: 3, 
        minPlan: 'pro',
        displayName: { en: 'Salesforce', tr: 'Salesforce' }
    },
    'google-calendar': { 
        minSortOrder: 3, 
        minPlan: 'pro',
        displayName: { en: 'Google Calendar', tr: 'Google Calendar' }
    },
    'outlook-calendar': { 
        minSortOrder: 3, 
        minPlan: 'pro',
        displayName: { en: 'Outlook Calendar', tr: 'Outlook Calendar' }
    },
    'shopify': { 
        minSortOrder: 3, 
        minPlan: 'pro',
        displayName: { en: 'Shopify', tr: 'Shopify' }
    },
    'mailchimp': { 
        minSortOrder: 3, 
        minPlan: 'pro',
        displayName: { en: 'Mailchimp', tr: 'Mailchimp' }
    },
    'sendgrid': { 
        minSortOrder: 3, 
        minPlan: 'pro',
        displayName: { en: 'SendGrid', tr: 'SendGrid' }
    },
    'constant-contact': { 
        minSortOrder: 3, 
        minPlan: 'pro',
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
        pro: [],
        enterprise: []
    }
    
    Object.entries(INTEGRATION_ACCESS).forEach(([id, config]) => {
        groups[config.minPlan]?.push(id)
    })
    
    return groups
}
