/**
 * Feature Consistency Checker
 * 
 * Ensures that features displayed on the website match the actual
 * available features in MODULES_REGISTRY. Only 'ready' status modules
 * should be shown on public-facing pages.
 */

import { getAllModules, getModule as getModuleFromRegistry, ModuleId, MODULES_REGISTRY } from './modules-registry'

// Re-export getModule for convenience
export const getModule = getModuleFromRegistry

/**
 * Get all available (ready) features
 */
export function getAvailableFeatures(): ModuleId[] {
    return getAllModules()
        .filter(m => m.status === 'ready')
        .map(m => m.id)
}

/**
 * Check if a feature is available (ready status)
 */
export function isFeatureAvailable(featureId: string): boolean {
    const moduleData = getModule(featureId as ModuleId)
    return moduleData?.status === 'ready' || false
}

/**
 * Get all ready modules for public display
 */
export function getReadyModules() {
    return getAllModules().filter(m => m.status === 'ready')
}

/**
 * Get modules that should be shown on landing page
 */
export function getLandingPageModules() {
    return getAllModules()
        .filter(m => m.status === 'ready' && m.showOnLandingPage)
}

/**
 * Validate that a feature exists and is ready
 */
export function validateFeature(featureId: string): {
    exists: boolean
    isReady: boolean
    module: ReturnType<typeof getModule> | null
} {
    const moduleData = getModule(featureId as ModuleId)
    return {
        exists: !!moduleData,
        isReady: moduleData?.status === 'ready' || false,
        module: moduleData
    }
}

/**
 * Get feature name by ID (for comparison tables)
 */
export function getFeatureName(featureId: string, language: 'en' | 'tr' = 'tr'): string | null {
    const moduleData = getModule(featureId as ModuleId)
    if (!moduleData) return null
    return language === 'tr' ? moduleData.name.tr : moduleData.name.en
}

/**
 * Map feature names to module IDs for comparison tables
 */
export function getFeatureModuleMapping(): Record<string, ModuleId | null> {
    return {
        'Sales Optimization': 'salesOptimization',
        'Industry-Specific AI': 'generalChatbot', // Core feature
        'Brand Customization': 'generalChatbot', // Part of widget settings
        'XML Feed Sync': 'productCatalog',
        'Stock Alerts': 'productCatalog',
        'Cart Recovery': 'salesOptimization',
        'Appointment System': 'appointments',
        'Live Chat (Takeover)': 'generalChatbot', // Core feature
        'AI Training Resources': 'knowledgeBase',
        'Lead Collection': 'leadCollection',
        'Omnichannel': 'generalChatbot', // Core feature
        'Satış Optimizasyonu': 'salesOptimization',
        'Sektöre Özel AI': 'generalChatbot',
        'Marka Özelleştirme': 'generalChatbot',
        'Stok Uyarıları': 'productCatalog',
        'Sepet Kurtarma': 'salesOptimization',
        'Randevu Sistemi': 'appointments',
        'Canlı Destek (Takeover)': 'generalChatbot',
        'Lead Toplama': 'leadCollection',
        'Çok Kanallı': 'generalChatbot'
    }
}
