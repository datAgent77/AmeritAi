export type ModuleId = 'generalChatbot' | 'appointments' | 'leadCollection' | 'productCatalog' | 'knowledgeBase' | 'voiceAssistant' | 'emailMarketing' | 'salesOptimization' | 'reviewManagement' | 'loyaltyProgram' | 'campaignManager' | 'autoTranslate' | 'gamification' | 'visualDiagnosis' | 'agriCalendar' | 'marketWatch';

export type IndustryType = 'ecommerce' | 'booking' | 'real_estate' | 'saas' | 'service' | 'healthcare' | 'education' | 'academic' | 'finance' | 'restaurant' | 'agriculture' | 'other';

export interface ModuleConfig {
    id: ModuleId;
    nameKey: string; // Translation key for name
    descriptionKey: string; // Translation key for description
    isPremium: boolean;
    isCore: boolean; // Core modules cannot be disabled
    price: number; // Monthly price in USD
    icon: string; // Lucide icon name
    recommendedFor: IndustryType[]; // Industries this module is recommended for
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
        recommendedFor: [] // Core - always included
    },
    knowledgeBase: {
        id: 'knowledgeBase',
        nameKey: 'modules.knowledgeBase',
        descriptionKey: 'modules.knowledgeBaseDesc',
        isPremium: false,
        isCore: true,
        price: 0,
        icon: 'BookOpen',
        recommendedFor: [] // Core - always included
    },
    productCatalog: {
        id: 'productCatalog',
        nameKey: 'modules.productCatalog',
        descriptionKey: 'modules.productCatalogDesc',
        isPremium: true,
        isCore: false,
        price: 29,
        icon: 'ShoppingBag',
        recommendedFor: ['ecommerce', 'real_estate', 'education']
    },
    leadCollection: {
        id: 'leadCollection',
        nameKey: 'modules.leadCollection',
        descriptionKey: 'modules.leadCollectionDesc',
        isPremium: true,
        isCore: false,
        price: 29,
        icon: 'Users',
        recommendedFor: ['ecommerce', 'real_estate', 'saas', 'service', 'finance']
    },
    appointments: {
        id: 'appointments',
        nameKey: 'modules.appointments',
        descriptionKey: 'modules.appointmentsDesc',
        isPremium: true,
        isCore: false,
        price: 39,
        icon: 'Calendar',
        recommendedFor: ['booking', 'real_estate', 'healthcare', 'service', 'academic']
    },
    voiceAssistant: {
        id: 'voiceAssistant',
        nameKey: 'modules.voiceAssistant',
        descriptionKey: 'modules.voiceAssistantDesc',
        isPremium: true,
        isCore: false,
        price: 49,
        icon: 'Mic',
        recommendedFor: ['healthcare', 'service', 'booking']
    },
    emailMarketing: {
        id: 'emailMarketing',
        nameKey: 'modules.emailMarketing',
        descriptionKey: 'modules.emailMarketingDesc',
        isPremium: true,
        isCore: false,
        price: 29,
        icon: 'Mail',
        recommendedFor: ['ecommerce', 'saas', 'education']
    },

    reviewManagement: {
        id: 'reviewManagement',
        nameKey: 'modules.reviewManagement',
        descriptionKey: 'modules.reviewManagementDesc',
        isPremium: true,
        isCore: false,
        price: 39,
        icon: 'Star',
        recommendedFor: ['restaurant', 'service', 'booking']
    },

    loyaltyProgram: {
        id: 'loyaltyProgram',
        nameKey: 'modules.loyaltyProgram',
        descriptionKey: 'modules.loyaltyProgramDesc',
        isPremium: true,
        isCore: false,
        price: 29,
        icon: 'Award',
        recommendedFor: ['restaurant', 'service']
    },

    campaignManager: {
        id: 'campaignManager',
        nameKey: 'modules.campaignManager',
        descriptionKey: 'modules.campaignManagerDesc',
        isPremium: true,
        isCore: false,
        price: 19,
        icon: 'Zap',
        recommendedFor: ['restaurant', 'ecommerce']
    },

    autoTranslate: {
        id: 'autoTranslate',
        nameKey: 'modules.autoTranslate',
        descriptionKey: 'modules.autoTranslateDesc',
        isPremium: true,
        isCore: false,
        price: 29,
        icon: 'Languages',
        recommendedFor: ['restaurant', 'booking']
    },

    gamification: {
        id: 'gamification',
        nameKey: 'modules.gamification',
        descriptionKey: 'modules.gamificationDesc',
        isPremium: true,
        isCore: false,
        price: 39,
        icon: 'Gamepad2',
        recommendedFor: ['ecommerce', 'restaurant']
    },

    visualDiagnosis: {
        id: 'visualDiagnosis',
        nameKey: 'modules.visualDiagnosis',
        descriptionKey: 'modules.visualDiagnosisDesc',
        isPremium: true,
        isCore: false,
        price: 59,
        icon: 'Scan',
        recommendedFor: ['agriculture', 'healthcare', 'real_estate']
    },

    agriCalendar: {
        id: 'agriCalendar',
        nameKey: 'modules.agriCalendar',
        descriptionKey: 'modules.agriCalendarDesc',
        isPremium: false,
        isCore: false,
        price: 0,
        icon: 'CalendarDays',
        recommendedFor: ['agriculture']
    },

    marketWatch: {
        id: 'marketWatch',
        nameKey: 'modules.marketWatch',
        descriptionKey: 'modules.marketWatchDesc',
        isPremium: false,
        isCore: false,
        price: 0,
        icon: 'TrendingUp',
        recommendedFor: ['agriculture']
    },

    salesOptimization: {
        id: 'salesOptimization',
        nameKey: 'modules.salesOptimization',
        // ...
        // (We also need to update ORDERED_MODULES)
        // I will do it in a separate call or try to squeeze it here?
        // The tool says "Use this tool ONLY when you are making a SINGLE CONTIGUOUS block of edits".
        // So I can't do both if they are far apart.
        // I will just add the definition first.

        descriptionKey: 'modules.salesOptimizationDesc',
        isPremium: true,
        isCore: false,
        price: 49,
        icon: 'TrendingUp',
        recommendedFor: ['ecommerce', 'real_estate', 'finance']
    }
};

// Ordered array for rendering - Core modules first, then others
export const ORDERED_MODULES: ModuleConfig[] = [
    MODULES.generalChatbot,    // 1. Core: General Chatbot
    MODULES.knowledgeBase,     // 2. Core: Knowledge Base
    MODULES.productCatalog,    // 3. Product Catalog
    MODULES.leadCollection,    // 4. Lead Collection
    MODULES.appointments,      // 5. Appointments
    MODULES.voiceAssistant,    // 6. Voice Assistant

    MODULES.emailMarketing,    // 8. Email Marketing
    MODULES.reviewManagement,  // 9. Review Management
    MODULES.loyaltyProgram,    // 10. Loyalty Program
    MODULES.campaignManager,   // 11. Campaign Manager
    MODULES.autoTranslate,     // 12. Auto Translate
    MODULES.gamification,      // 13. Gamification
    MODULES.visualDiagnosis,   // 14. Visual Diagnosis
    MODULES.agriCalendar,      // 15. Agri Calendar
    MODULES.marketWatch,       // 16. Market Watch
    MODULES.salesOptimization, // 17. Sales Optimization
];
