/**
 * Modül Tanımları
 * Tüm mevcut modüller ve özellikleri
 */

export interface ModuleDefinition {
    id: string;
    name: {
        en: string;
        tr: string;
    };
    description: {
        en: string;
        tr: string;
    };
    icon: string;
    monthlyPrice: number; // 0 = ücretsiz (tüm planlarda dahil)
    isCore: boolean; // Core modüller her zaman aktif
    firestoreField: string; // users collection'daki field adı
}

export const MODULES: Record<string, ModuleDefinition> = {
    chatbot: {
        id: 'chatbot',
        name: { en: 'AI Chatbot', tr: 'AI Sohbet Botu' },
        description: {
            en: 'Intelligent website chatbot that answers customer questions 24/7',
            tr: 'Müşteri sorularını 7/24 yanıtlayan akıllı web sitesi sohbet botu'
        },
        icon: 'MessageSquare',
        monthlyPrice: 0,
        isCore: true,
        firestoreField: 'enableChatbot'
    },
    personalShopper: {
        id: 'personalShopper',
        name: { en: 'Personal Shopper', tr: 'Kişisel Alışveriş Asistanı' },
        description: {
            en: 'AI-powered product recommendations and shopping assistance',
            tr: 'AI destekli ürün önerileri ve alışveriş yardımı'
        },
        icon: 'ShoppingBag',
        monthlyPrice: 29,
        isCore: false,
        firestoreField: 'enablePersonalShopper'
    },
    leadFinder: {
        id: 'leadFinder',
        name: { en: 'Lead Collection', tr: 'Potansiyel Müşteri Toplama' },
        description: {
            en: 'Capture and manage leads from chatbot conversations',
            tr: 'Sohbet konuşmalarından potansiyel müşteri bilgilerini topla ve yönet'
        },
        icon: 'UserPlus',
        monthlyPrice: 19,
        isCore: false,
        firestoreField: 'enableLeadFinder'
    },
    voiceAssistant: {
        id: 'voiceAssistant',
        name: { en: 'Voice & Appointments', tr: 'Sesli Asistan ve Randevu' },
        description: {
            en: 'Voice chat capability and appointment scheduling',
            tr: 'Sesli sohbet özelliği ve randevu planlama'
        },
        icon: 'Mic',
        monthlyPrice: 39,
        isCore: false,
        firestoreField: 'enableVoiceAssistant'
    },
    copywriter: {
        id: 'copywriter',
        name: { en: 'AI Copywriter', tr: 'AI Metin Yazarı' },
        description: {
            en: 'Generate marketing copy, emails, and content',
            tr: 'Pazarlama metinleri, e-postalar ve içerik üret'
        },
        icon: 'PenTool',
        monthlyPrice: 49,
        isCore: false,
        firestoreField: 'enableCopywriter'
    }
};

/**
 * Sektör Bazlı Varsayılan Modüller
 * Her sektör için hangi modüller ücretsiz dahil
 */
export const INDUSTRY_DEFAULT_MODULES: Record<string, string[]> = {
    ecommerce: ['chatbot', 'personalShopper', 'leadFinder'],
    booking: ['chatbot', 'voiceAssistant', 'leadFinder'],
    real_estate: ['chatbot', 'leadFinder', 'voiceAssistant'],
    saas: ['chatbot', 'leadFinder'],
    service: ['chatbot', 'voiceAssistant', 'leadFinder'],
    healthcare: ['chatbot', 'voiceAssistant'],
    education: ['chatbot', 'leadFinder'],
    academic: ['chatbot', 'leadFinder'],
    finance: ['chatbot', 'leadFinder'],
    other: ['chatbot']
};

/**
 * Modül ID'lerinden Firestore field adlarını döndürür
 */
export function getModuleFields(moduleIds: string[]): Record<string, boolean> {
    const fields: Record<string, boolean> = {};

    for (const moduleId of moduleIds) {
        const mod = MODULES[moduleId];
        if (mod) {
            fields[mod.firestoreField] = true;
        }
    }

    return fields;
}

/**
 * Sektöre göre varsayılan modül alanlarını döndürür
 */
export function getDefaultModuleFieldsForIndustry(industry: string): Record<string, boolean> {
    const moduleIds = INDUSTRY_DEFAULT_MODULES[industry] || INDUSTRY_DEFAULT_MODULES.other;

    // Tüm modülleri false olarak başlat
    const allFields: Record<string, boolean> = {};
    for (const mod of Object.values(MODULES)) {
        allFields[mod.firestoreField] = false;
    }

    // Sektör bazlı modülleri true yap
    for (const moduleId of moduleIds) {
        const mod = MODULES[moduleId];
        if (mod) {
            allFields[mod.firestoreField] = true;
        }
    }

    return allFields;
}

/**
 * Modülün belirli bir sektör için ücretsiz olup olmadığını kontrol eder
 */
export function isModuleFreeForIndustry(moduleId: string, industry: string): boolean {
    const defaultModules = INDUSTRY_DEFAULT_MODULES[industry] || INDUSTRY_DEFAULT_MODULES.other;
    return defaultModules.includes(moduleId);
}

/**
 * Tüm modül ID'lerini döndürür
 */
export function getAllModuleIds(): string[] {
    return Object.keys(MODULES);
}

/**
 * Ek (premium) modülleri listeler - sektöre dahil olmayanlar
 */
export function getAdditionalModulesForIndustry(industry: string): ModuleDefinition[] {
    const defaultModules = INDUSTRY_DEFAULT_MODULES[industry] || INDUSTRY_DEFAULT_MODULES.other;

    return Object.values(MODULES).filter(
        module => !module.isCore && !defaultModules.includes(module.id)
    );
}
