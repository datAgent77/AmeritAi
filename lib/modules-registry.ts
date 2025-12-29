/**
 * Modules Registry
 * 
 * Central registry of all modules in the Vion platform.
 * This is the source of truth for module definitions.
 * 
 * Adding a new module:
 * 1. Add entry to MODULES_REGISTRY
 * 2. Add to defaultEnabledBySector[] for relevant sectors
 * 3. Module will automatically work with entitlements system
 */

// =============================================================================
// TYPES
// =============================================================================

export type ModuleId =
    | 'generalChatbot'
    | 'productCatalog'
    | 'voiceAssistant'
    | 'appointments'
    | 'leadCollection'
    | 'knowledgeBase'
    | 'socialMedia'
    | 'emailMarketing'
    | 'salesOptimization'
    | 'reviewManagement'
    | 'loyaltyProgram'
    | 'campaignManager'
    | 'autoTranslate'
    | 'gamification'
    | 'visualDiagnosis'
    | 'agriCalendar'
    | 'marketWatch';

export type SectorId =
    | 'ecommerce'
    | 'booking'
    | 'real_estate'
    | 'saas'
    | 'service'
    | 'healthcare'
    | 'education'
    | 'academic'
    | 'finance'
    | 'restaurant'
    | 'agriculture'
    | 'other';

export interface ModuleDefinition {
    id: ModuleId;
    name: {
        en: string;
        tr: string;
    };
    description: {
        en: string;
        tr: string;
    };
    icon: string;

    /**
     * Core modules are always available on all plans.
     * Cannot be disabled by user.
     */
    isCore: boolean;

    /**
     * Premium add-on modules require additional payment.
     * During trial, these are LOCKED (Decision A).
     */
    isPremiumAddOn: boolean;

    /**
     * Sectors where this module can be used.
     * Empty array = available to all sectors.
     */
    supportedSectors: SectorId[];

    /**
     * Sectors where this module is enabled by default (free).
     * User gets these automatically based on their sector selection.
     */
    defaultEnabledBySector: SectorId[];

    /**
     * Legacy Firestore field name for backward compatibility.
     * Used to sync with existing user document structure.
     */
    legacyFirestoreField?: string;

    /**
     * list of module IDs that this module conflicts with.
     * If any of these are active, this module cannot be enabled.
     */
    conflictsWith?: ModuleId[];

    /**
     * Marketing Data for Detail Pages
     */
    longDescription?: {
        en: string;
        tr: string;
    };
    features?: {
        title: { en: string; tr: string };
        description: { en: string; tr: string };
        icon: string; // Lucide icon name
    }[];
    benefits?: {
        en: string; // e.g., "Reduce support costs by 50%"
        tr: string;
    }[];
    usageExample?: {
        user: { en: string; tr: string };
        ai: { en: string; tr: string };
    };
    /**
     * Specific AI instructions to be injected into the system prompt when this module is active.
     */
    aiSystemInstruction?: {
        en: string; // e.g., "You can book appointments. Ask for date/time."
        tr: string;
    };
}

// =============================================================================
// MODULES REGISTRY
// =============================================================================

export const MODULES_REGISTRY: Record<ModuleId, ModuleDefinition> = {
    generalChatbot: {
        id: 'generalChatbot',
        name: {
            en: 'General AI Assistant',
            tr: 'Genel AI Asistanı'
        },
        description: {
            en: 'Core chatbot that answers customer questions 24/7',
            tr: 'Müşteri sorularını 7/24 yanıtlayan temel sohbet botu'
        },
        icon: 'MessageSquare',
        isCore: true,
        isPremiumAddOn: false,
        supportedSectors: [], // All sectors
        defaultEnabledBySector: [
            'ecommerce', 'booking', 'real_estate', 'saas', 'service',
            'healthcare', 'education', 'academic', 'finance', 'restaurant', 'other'
        ],
        legacyFirestoreField: 'enableChatbot',
        longDescription: {
            en: 'Transform your customer service with an AI agent that works 24/7. It learns from your business data to provide accurate, instant responses to any customer query.',
            tr: 'Müşteri hizmetlerinizi 7/24 çalışan bir AI asistanı ile dönüştürün. İşletme verilerinizden öğrenerek her türlü müşteri sorusuna anında ve doğru yanıtlar verir.'
        },
        features: [
            {
                title: { en: 'Instant Answers', tr: 'Anlık Yanıtlar' },
                description: { en: 'Responds to FAQs instantly without human wait time.', tr: 'SSS\'leri insan bekleme süresi olmadan anında yanıtlar.' },
                icon: 'Zap'
            },
            {
                title: { en: 'Multi-Channel', tr: 'Çok Kanallı' },
                description: { en: 'Works on Web, WhatsApp, and Social Media.', tr: 'Web, WhatsApp ve Sosyal Medya üzerinde çalışır.' },
                icon: 'Share2'
            },
            {
                title: { en: 'Human Handoff', tr: 'İnsan Devri' },
                description: { en: 'Smartly transfers complex issues to human agents.', tr: 'Karmaşık sorunları akıllıca insan temsilcilere aktarır.' },
                icon: 'Users'
            }
        ],
        benefits: [
            { en: 'Reduce support costs by up to 70%', tr: 'Destek maliyetlerini %70\'e kadar azaltın' },
            { en: 'Increase customer satisfaction with 0 wait time', tr: '0 bekleme süresi ile müşteri memnuniyetini artırın' },
            { en: 'Consistent brand voice across all channels', tr: 'Tüm kanallarda tutarlı marka sesi' }
        ],
        usageExample: {
            user: { en: 'What are your opening hours?', tr: 'Hafta sonu açık mısınız?' },
            ai: { en: 'We are open Monday-Friday 9am-6pm. On weekends we are closed via phone but I am here 24/7!', tr: 'Hafta içi 09:00-18:00 arası açığız. Hafta sonu kapalıyız ancak ben 7/24 buradayım, size nasıl yardımcı olabilirim?' }
        }
    },

    knowledgeBase: {
        id: 'knowledgeBase',
        name: {
            en: 'Knowledge & Education',
            tr: 'Bilgi Tabanı ve Eğitim'
        },
        description: {
            en: 'FAQ management, document upload, and knowledge base',
            tr: 'SSS yönetimi, doküman yükleme ve bilgi tabanı'
        },
        icon: 'BookOpen',
        isCore: true,
        isPremiumAddOn: false,
        supportedSectors: [],
        defaultEnabledBySector: [
            'ecommerce', 'booking', 'real_estate', 'saas', 'service',
            'healthcare', 'education', 'academic', 'finance', 'restaurant', 'other'
        ],
        legacyFirestoreField: 'enableKnowledgeBase'
    },

    productCatalog: {
        id: 'productCatalog',
        name: {
            en: 'Sales & Catalog',
            tr: 'Satış ve Ürün Kataloğu'
        },
        description: {
            en: 'Product recommendations, catalog browsing, AI shopping assistant',
            tr: 'Ürün önerileri, katalog tarama, AI alışveriş asistanı'
        },
        icon: 'ShoppingBag',
        isCore: false,
        isPremiumAddOn: false, // Free for ecommerce, premium for others
        supportedSectors: ['ecommerce', 'restaurant', 'real_estate'],
        defaultEnabledBySector: ['ecommerce'],
        legacyFirestoreField: 'enablePersonalShopper'
    },

    leadCollection: {
        id: 'leadCollection',
        name: {
            en: 'Lead Collection',
            tr: 'Potansiyel Müşteri Toplama'
        },
        description: {
            en: 'Capture leads from conversations with custom forms',
            tr: 'Sohbetlerden özel formlarla lead toplama'
        },
        icon: 'UserPlus',
        isCore: false,
        isPremiumAddOn: false,
        supportedSectors: [],
        defaultEnabledBySector: [
            'ecommerce', 'booking', 'real_estate', 'saas', 'service', 'finance'
        ],
        legacyFirestoreField: 'enableLeadFinder'
    },

    voiceAssistant: {
        id: 'voiceAssistant',
        name: {
            en: 'Voice & Appointments',
            tr: 'Sesli Asistan ve Randevu'
        },
        description: {
            en: 'Voice chat and appointment scheduling',
            tr: 'Sesli sohbet ve randevu planlama'
        },
        icon: 'Mic',
        isCore: false,
        isPremiumAddOn: true,
        supportedSectors: [],
        defaultEnabledBySector: ['booking', 'healthcare', 'service', 'real_estate'],
        legacyFirestoreField: 'enableVoiceAssistant',
        aiSystemInstruction: {
            en: `APPOINTMENT BOOKING MODULE ACTIVE. You are a helpful assistant. Your goal is to collect the necessary information to book an appointment kindly and naturally.

REQUIRED INFORMATION:
1. Full Name
2. Contact Info (Phone OR Email)
3. Date & Time

HOW TO INTERACT:
- Be polite and helpful. Do NOT be rigid or robotic.
- If the user provides only some information (e.g., just name), accept it happily and ask for the missing details.
- Example: "Thank you, [Name]. What date would you like to come in?"
- Do NOT say "Missing information" or reject the input. Always guide the user forward.

CONFIRMATION (Only when ALL info is present):
- Confirm naturally: "Dear [Name], I have scheduled your appointment for [Date] at [Time]. We will reach you at [Contact]."
- ALWAYS use "Dear [Name]" in the final confirmation message to ensure correct registration.`,

            tr: `RANDEVU MODÜLÜ AKTİF. Sen yardımsever bir asistansın. Amacın, randevu için gerekli bilgileri nazikçe ve doğal bir sohbet akışı içinde toplamak.

GEREKLİ BİLGİLER:
1. Ad Soyad
2. İletişim Bilgisi (Telefon VEYA E-posta)
3. Tarih ve Saat

NASIL DAVRANMALISIN:
- Asla katı veya reddedici olma. Bilgileri bir sorgu memuru gibi değil, yardımcı bir asistan gibi topla.
- Kullanıcı tek bir bilgi verse bile (örneğin sadece adını), bunu kabul et ve teşekkür edip eksik olanı sor.
- Örnek: "Memnun oldum Ahmet Bey. Randevunuzu hangi tarih ve saat için oluşturmak istersiniz?"
- Asla "Eksik bilgi verdiniz" veya "Maalesef işlem yapamıyorum" deme. Bunun yerine "Peki, size hangi numaradan ulaşabiliriz?" gibi yönlendirici sorular sor.
- Kullanıcı tek başına bir sayı söylerse (ör: "10"), bunun SAAT mi (10:00) yoksa GÜN mü (ayın 10'u) olduğunu sor. Varsayımda bulunma.
- Yıl belirtilmemişse, GELECEK en yakın tarihi baz al. Geçmiş tarihli randevu oluşturma.
- Tarih ve saat doluluğunu kontrol et, uygun değilse nazikçe alternatif öner.

ONAYLAMA (Sadece TÜM bilgiler toplandığında):
- Tüm bilgiler tamamsa, şu formatta onayla: "Sayın [Ad Soyad], randevunuzu [Tarih] saat [Saat] için oluşturdum. Size [İletişim] üzerinden ulaşacağız."
- Onay mesajında "Sayın [Ad Soyad]" kalıbını kullanman, ismin sisteme doğru kaydedilmesi için ÇOK ÖNEMLİDİR.`
        }
    },

    appointments: {
        id: 'appointments',
        name: {
            en: 'Appointments',
            tr: 'Randevular'
        },
        description: {
            en: 'Appointment scheduling and calendar',
            tr: 'Randevu planlama ve takvim'
        },
        icon: 'Calendar',
        isCore: false,
        isPremiumAddOn: true,
        supportedSectors: ['booking', 'healthcare', 'service', 'academic', 'real_estate'],
        defaultEnabledBySector: [],
        legacyFirestoreField: 'enableAppointments'
    },



    salesOptimization: {
        id: 'salesOptimization',
        name: {
            en: 'Sales Optimization',
            tr: 'Satış Optimizasyonu'
        },
        description: {
            en: 'Upsell/cross-sell suggestions, cart abandonment recovery',
            tr: 'Çapraz satış önerileri, terk edilen sepet kurtarma'
        },
        icon: 'TrendingUp',
        isCore: false,
        isPremiumAddOn: true,
        supportedSectors: ['ecommerce', 'saas'],
        defaultEnabledBySector: [],
        legacyFirestoreField: 'enableSalesOptimization'
    },

    socialMedia: {
        id: 'socialMedia',
        name: {
            en: 'Social Media Sharing',
            tr: 'Sosyal Medya Paylaşımı'
        },
        description: {
            en: 'Generate and schedule social media content',
            tr: 'Sosyal medya içeriği üretimi ve zamanlama'
        },
        icon: 'Share2',
        isCore: false,
        isPremiumAddOn: true,
        supportedSectors: [],
        defaultEnabledBySector: [],
        legacyFirestoreField: 'enableSocialMedia'
    },

    emailMarketing: {
        id: 'emailMarketing',
        name: {
            en: 'Email Marketing',
            tr: 'E-posta Pazarlaması'
        },
        description: {
            en: 'AI-powered email campaigns and automation',
            tr: 'AI destekli e-posta kampanyaları ve otomasyon'
        },
        icon: 'Mail',
        isCore: false,
        isPremiumAddOn: true,
        supportedSectors: [],
        defaultEnabledBySector: [],
        legacyFirestoreField: 'enableEmailMarketing'
    },


    reviewManagement: {
        id: 'reviewManagement',
        name: {
            en: 'Review Management',
            tr: 'Yorum Yönetimi'
        },
        description: {
            en: 'Manage and auto-reply to Google/Yelp reviews',
            tr: 'Google/Yelp yorumlarını yönetin ve otomatik yanıtlayın'
        },
        icon: 'Star',
        isCore: false,
        isPremiumAddOn: true,
        supportedSectors: ['restaurant', 'service', 'booking', 'healthcare', 'real_estate'],
        defaultEnabledBySector: [],
        legacyFirestoreField: 'enableReviewManagement'
    },

    loyaltyProgram: {
        id: 'loyaltyProgram',
        name: {
            en: 'Loyalty Program',
            tr: 'Sadakat Programı'
        },
        description: {
            en: 'Digital punch cards and rewards',
            tr: 'Dijital damga kartları ve ödüller'
        },
        icon: 'Award',
        isCore: false,
        isPremiumAddOn: true,
        supportedSectors: ['restaurant', 'service'],
        defaultEnabledBySector: [],
        legacyFirestoreField: 'enableLoyaltyProgram'
    },

    campaignManager: {
        id: 'campaignManager',
        name: {
            en: 'Campaign Wizard',
            tr: 'Kampanya Sihirbazı'
        },
        description: {
            en: 'Instant discount and happy hour manager',
            tr: 'Anlık indirim ve mutlu saatler yöneticisi'
        },
        icon: 'Zap',
        isCore: false,
        isPremiumAddOn: true,
        supportedSectors: ['restaurant', 'ecommerce', 'service'],
        defaultEnabledBySector: [],
        legacyFirestoreField: 'enableCampaignManager'
    },

    autoTranslate: {
        id: 'autoTranslate',
        name: {
            en: 'Tourist & Translation',
            tr: 'Turist ve Çeviri'
        },
        description: {
            en: 'Auto-translate menu and chat for tourists',
            tr: 'Turistler için menü ve sohbeti otomatik çevirin'
        },
        icon: 'Languages',
        isCore: false,
        isPremiumAddOn: true,
        supportedSectors: ['restaurant', 'booking', 'real_estate'],
        defaultEnabledBySector: [],
        legacyFirestoreField: 'enableAutoTranslate',
        longDescription: {
            en: 'Break down language barriers instantly. Your menus, chats, and interface automatically translate to the user\'s native language, boosting engagement and sales from tourists.',
            tr: 'Dil bariyerlerini anında kaldırın. Menüleriniz, sohbetleriniz ve arayüzünüz kullanıcının ana diline otomatik olarak çevrilir, böylece turistlerden gelen etkileşimi ve satışları artırır.'
        },
        features: [
            {
                title: { en: 'Instant Menu Translation', tr: 'Anlık Menü Çevirisi' },
                description: { en: 'QR menus automatically appear in the user\'s phone language.', tr: 'QR menüler kullanıcının telefon dilinde otomatik açılır.' },
                icon: 'Globe' // Using Globe as proxy for Languages if needed, or Languages itself
            },
            {
                title: { en: 'Real-time Chat Translation', tr: 'Eşzamanlı Sohbet Çevirisi' },
                description: { en: 'You write in your language, they read in theirs.', tr: 'Siz Türkçe yazın, onlar kendi dillerinde okusun.' },
                icon: 'MessageCircle'
            }
        ],
        benefits: [
            { en: 'Increase revenue from international tourists by 30%', tr: 'Yabancı turistlerden elde edilen geliri %30 artırın' },
            { en: 'Eliminate misunderstandings in orders', tr: 'Siparişlerdeki yanlış anlaşılmaları ortadan kaldırın' },
            { en: 'Provide a premium seamless experience', tr: 'Kusursuz ve premium bir deneyim sunun' }
        ]
    },

    gamification: {
        id: 'gamification',
        name: {
            en: 'Gamification & Wheel',
            tr: 'Oyunlaştırma ve Çarkıfelek'
        },
        description: {
            en: 'Spin the wheel games to increase engagement',
            tr: 'Etkileşimi artırmak için çarkıfelek oyunları'
        },
        icon: 'Gamepad2',
        isCore: false,
        isPremiumAddOn: true,
        supportedSectors: ['ecommerce', 'restaurant'],
        defaultEnabledBySector: [],
        legacyFirestoreField: 'enableGamification'
    },

    visualDiagnosis: {
        id: 'visualDiagnosis',
        name: {
            en: 'Visual Diagnosis & Analysis',
            tr: 'Görsel Tanı ve Analiz'
        },
        description: {
            en: 'AI visual analysis for disease detection and damage assessment',
            tr: 'Hastalık tespiti ve hasar analizi için AI görsel analiz'
        },
        icon: 'Scan',
        isCore: false,
        isPremiumAddOn: true,
        supportedSectors: ['agriculture', 'healthcare', 'real_estate'],
        defaultEnabledBySector: [],
        legacyFirestoreField: 'enableVisualDiagnosis'
    },

    agriCalendar: {
        id: 'agriCalendar',
        name: {
            en: 'Smart Agri-Calendar',
            tr: 'Akıllı Tarım Takvimi'
        },
        description: {
            en: 'Weather-based planting and harvest alerts',
            tr: 'Hava durumu tabanlı ekim ve hasat uyarıları'
        },
        icon: 'CalendarDays',
        isCore: false,
        isPremiumAddOn: false,
        supportedSectors: ['agriculture'],
        defaultEnabledBySector: ['agriculture'],
        legacyFirestoreField: 'enableAgriCalendar'
    },

    marketWatch: {
        id: 'marketWatch',
        name: {
            en: 'Market Watch',
            tr: 'Hal & Borsa Takibi'
        },
        description: {
            en: 'Real-time market price tracking',
            tr: 'Anlık piyasa fiyat takibi'
        },
        icon: 'TrendingUp',
        isCore: false,
        isPremiumAddOn: false,
        supportedSectors: ['agriculture'],
        defaultEnabledBySector: ['agriculture'],
        legacyFirestoreField: 'enableMarketWatch'
    }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all registered modules
 */
export function getAllModules(): ModuleDefinition[] {
    return Object.values(MODULES_REGISTRY);
}

/**
 * Get module by ID
 */
export function getModule(moduleId: ModuleId): ModuleDefinition | undefined {
    return MODULES_REGISTRY[moduleId];
}

/**
 * Get all core modules (always enabled)
 */
export function getCoreModules(): ModuleDefinition[] {
    return getAllModules().filter(m => m.isCore);
}

/**
 * Get premium add-on modules
 */
export function getPremiumModules(): ModuleDefinition[] {
    return getAllModules().filter(m => m.isPremiumAddOn);
}

/**
 * Get modules supported by a sector
 */
export function getModulesForSector(sectorId: SectorId): ModuleDefinition[] {
    return getAllModules().filter(m =>
        m.supportedSectors.length === 0 || m.supportedSectors.includes(sectorId)
    );
}

/**
 * Get default enabled modules for a sector
 */
export function getDefaultModulesForSector(sectorId: SectorId): ModuleId[] {
    return getAllModules()
        .filter(m => m.defaultEnabledBySector.includes(sectorId))
        .map(m => m.id);
}

/**
 * Check if a module is available for a sector
 */
export function isModuleAvailableForSector(moduleId: ModuleId, sectorId: SectorId): boolean {
    const mod = getModule(moduleId);
    if (!mod) return false;
    return mod.supportedSectors.length === 0 || mod.supportedSectors.includes(sectorId);
}

/**
 * Check if a module is default-enabled for a sector
 */
export function isModuleDefaultForSector(moduleId: ModuleId, sectorId: SectorId): boolean {
    const mod = getModule(moduleId);
    if (!mod) return false;
    return mod.defaultEnabledBySector.includes(sectorId);
}

// =============================================================================
// LEGACY COMPATIBILITY
// =============================================================================

/**
 * Map module IDs to legacy Firestore fields
 */
export function getLegacyFieldsForModules(moduleIds: ModuleId[]): Record<string, boolean> {
    const fields: Record<string, boolean> = {};

    // Set all legacy fields to false first
    for (const mod of getAllModules()) {
        if (mod.legacyFirestoreField) {
            fields[mod.legacyFirestoreField] = false;
        }
    }

    // Enable selected modules
    for (const moduleId of moduleIds) {
        const mod = getModule(moduleId);
        if (mod?.legacyFirestoreField) {
            fields[mod.legacyFirestoreField] = true;
        }
    }

    return fields;
}
