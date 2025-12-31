export type ModuleId = 'generalChatbot' | 'appointments' | 'leadCollection' | 'productCatalog' | 'knowledgeBase' | 'voiceAssistant' | 'emailMarketing' | 'salesOptimization' | 'reviewManagement' | 'loyaltyProgram' | 'campaignManager' | 'autoTranslate' | 'gamification' | 'visualDiagnosis' | 'digitalWaiter' | 'proactiveMessaging';

export type IndustryType = 'ecommerce' | 'booking' | 'real_estate' | 'saas' | 'service' | 'healthcare' | 'education' | 'academic' | 'finance' | 'restaurant' | 'agriculture' | 'automotive' | 'insurance' | 'logistics' | 'beauty' | 'legal' | 'fitness' | 'maritime' | 'other';

export interface ModuleConfig {
    id: ModuleId;
    nameKey: string; // Translation key for name
    descriptionKey: string; // Translation key for description
    isPremium: boolean;
    isCore: boolean; // Core modules cannot be disabled
    price: number; // Monthly price in USD
    icon: string; // Lucide icon name
    recommendedFor: IndustryType[]; // Industries this module is recommended for
    status: 'ready' | 'beta' | 'coming_soon';
}

export interface SalesOptimizationConfig {
    discountCodes: boolean;      // İndirim kodu
    stockAlerts: boolean;        // Stok uyarısı
    cartRecovery: boolean;       // Sepet kurtarma
    productComparison: boolean;  // Ürün karşılaştırma
    // İndirim kodu ayarları
    discountCodeConfig?: {
        codes: { code: string; discount: number; type: 'percent' | 'fixed'; minOrder?: number }[];
        autoOffer: boolean;
        offerAfterSeconds: number;
    };
    // Stok uyarısı ayarları
    stockAlertConfig?: {
        lowStockThreshold: number;
        showExactCount: boolean;
    };
    // Sepet kurtarma ayarları
    cartRecoveryConfig?: {
        triggerAfterSeconds: number;
        offerDiscount: boolean;
        discountPercent: number;
    };
}

export const MODULES: Record<ModuleId, ModuleConfig> = {
    generalChatbot: {
        id: 'generalChatbot',
        nameKey: 'aiChatbot',
        descriptionKey: 'aiChatbotDesc',
        isPremium: false,
        isCore: true,
        price: 0,
        icon: 'MessageSquare',
        recommendedFor: [], // Core - always included
        status: 'ready'
    },
    knowledgeBase: {
        id: 'knowledgeBase',
        nameKey: 'modules.knowledgeBase',
        descriptionKey: 'modules.knowledgeBaseDesc',
        isPremium: false,
        isCore: true,
        price: 0,
        icon: 'BookOpen',
        recommendedFor: [], // Core - always included
        status: 'ready'
    },
    productCatalog: {
        id: 'productCatalog',
        nameKey: 'modules.productCatalog',
        descriptionKey: 'modules.productCatalogDesc',
        isPremium: true,
        isCore: false,
        price: 29,
        icon: 'ShoppingBag',
        recommendedFor: ['ecommerce', 'real_estate', 'education'],
        status: 'ready'
    },
    leadCollection: {
        id: 'leadCollection',
        nameKey: 'modules.leadCollection',
        descriptionKey: 'modules.leadCollectionDesc',
        isPremium: true,
        isCore: false,
        price: 29,
        icon: 'Users',
        recommendedFor: ['ecommerce', 'real_estate', 'saas', 'service', 'finance'],
        status: 'ready'
    },
    appointments: {
        id: 'appointments',
        nameKey: 'modules.appointments',
        descriptionKey: 'modules.appointmentsDesc',
        isPremium: true,
        isCore: false,
        price: 39,
        icon: 'Calendar',
        recommendedFor: ['booking', 'healthcare', 'service', 'academic', 'real_estate'],
        status: 'beta'
    },
    voiceAssistant: {
        id: 'voiceAssistant',
        nameKey: 'modules.voiceAssistant',
        descriptionKey: 'modules.voiceAssistantDesc',
        isPremium: true,
        isCore: false,
        price: 49,
        icon: 'Mic',
        recommendedFor: ['healthcare', 'service', 'booking'],
        status: 'ready'
    },
    emailMarketing: {
        id: 'emailMarketing',
        nameKey: 'modules.emailMarketing',
        descriptionKey: 'modules.emailMarketingDesc',
        isPremium: true,
        isCore: false,
        price: 29,
        icon: 'Mail',
        recommendedFor: ['ecommerce', 'saas', 'education'],
        status: 'beta'
    },

    reviewManagement: {
        id: 'reviewManagement',
        nameKey: 'modules.reviewManagement',
        descriptionKey: 'modules.reviewManagementDesc',
        isPremium: true,
        isCore: false,
        price: 39,
        icon: 'Star',
        recommendedFor: ['restaurant', 'service', 'booking', 'healthcare', 'real_estate'],
        status: 'beta'
    },

    loyaltyProgram: {
        id: 'loyaltyProgram',
        nameKey: 'modules.loyaltyProgram',
        descriptionKey: 'modules.loyaltyProgramDesc',
        isPremium: true,
        isCore: false,
        price: 29,
        icon: 'Award',
        recommendedFor: ['restaurant', 'service'],
        status: 'beta'
    },

    campaignManager: {
        id: 'campaignManager',
        nameKey: 'modules.campaignManager',
        descriptionKey: 'modules.campaignManagerDesc',
        isPremium: true,
        isCore: false,
        price: 19,
        icon: 'Zap',
        recommendedFor: [],
        status: 'beta'
    },

    autoTranslate: {
        id: 'autoTranslate',
        nameKey: 'modules.autoTranslate',
        descriptionKey: 'modules.autoTranslateDesc',
        isPremium: true,
        isCore: false,
        price: 29,
        icon: 'Languages',
        recommendedFor: ['restaurant', 'booking', 'real_estate'],
        status: 'beta'
    },

    gamification: {
        id: 'gamification',
        nameKey: 'modules.gamification',
        descriptionKey: 'modules.gamificationDesc',
        isPremium: true,
        isCore: false,
        price: 39,
        icon: 'Gamepad2',
        recommendedFor: ['ecommerce', 'restaurant'],
        status: 'beta'
    },

    visualDiagnosis: {
        id: 'visualDiagnosis',
        nameKey: 'modules.visualDiagnosis',
        descriptionKey: 'modules.visualDiagnosisDesc',
        isPremium: true,
        isCore: false,
        price: 59,
        icon: 'Scan',
        recommendedFor: ['agriculture', 'healthcare', 'real_estate'],
        status: 'beta'
    },



    salesOptimization: {
        id: 'salesOptimization',
        nameKey: 'modules.salesOptimization',
        descriptionKey: 'modules.salesOptimizationDesc',
        isPremium: true,
        isCore: false,
        price: 49,
        icon: 'TrendingUp',
        recommendedFor: ['ecommerce', 'real_estate', 'finance'],
        status: 'beta'
    },

    digitalWaiter: {
        id: 'digitalWaiter',
        nameKey: 'modules.digitalWaiter',
        descriptionKey: 'modules.digitalWaiterDesc',
        isPremium: true,
        isCore: false,
        price: 29,
        icon: 'Utensils',
        recommendedFor: ['restaurant'],
        status: 'beta'
    },
    proactiveMessaging: {
        id: 'proactiveMessaging',
        nameKey: 'modules.proactiveMessaging',
        descriptionKey: 'modules.proactiveMessagingDesc',
        isPremium: true,
        isCore: false,
        price: 19,
        icon: 'MessageCircle', // Or another suitable icon like 'Bell' or 'Zap'
        recommendedFor: [], // Available for all
        status: 'beta'
    }
};

// Ordered array for rendering - Core modules first, then others
export const ORDERED_MODULES: ModuleConfig[] = [
    // --- 1. READY MODULES ---
    MODULES.generalChatbot,    // Core
    MODULES.knowledgeBase,     // Core
    MODULES.productCatalog,    // Personal Shopper
    MODULES.leadCollection,    // Lead Collection
    MODULES.voiceAssistant,    // Voice

    // --- 2. BETA MODULES ---
    MODULES.salesOptimization, // Beta
    MODULES.proactiveMessaging, // Beta
    MODULES.digitalWaiter,     // Beta - Functional
    MODULES.appointments,      // Beta
    MODULES.emailMarketing,    // Beta
    MODULES.reviewManagement,  // Beta
    MODULES.loyaltyProgram,    // Beta
    MODULES.campaignManager,   // Beta
    MODULES.autoTranslate,     // Beta
    MODULES.gamification,      // Beta
    MODULES.visualDiagnosis,   // Beta

    // --- 3. COMING SOON MODULES ---
    // None currently!
];
