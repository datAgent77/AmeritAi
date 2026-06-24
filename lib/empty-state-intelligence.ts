/**
 * ============================================================================
 * EMPTY STATE INTELLIGENCE ENGINE
 * ============================================================================
 * 
 * Transforms empty states into helpful guidance moments.
 * 
 * DESIGN PRINCIPLES:
 * - Empty states should feel intentional, not lacking
 * - Never mention upgrade or pricing
 * - Never block interaction
 * - Reduce guidance as user gains experience
 * 
 * TONE BY PLAN:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Starter   → Encourage first success, celebrate potential   │
 * │ Scale     → Emphasize optimization & efficiency            │
 * │ Enterprise→ Minimal, neutral, professional                 │
 * └─────────────────────────────────────────────────────────────┘
 */

// =============================================================================
// TYPES
// =============================================================================

export type EmptyStateModule =
    | 'dashboard'
    | 'conversations'
    | 'analytics'
    | 'leads'
    | 'knowledge'
    | 'products'
    | 'settings'
    | 'integrations';

export type SuggestedAction =
    | 'connect'      // Connect widget/integration
    | 'configure'    // Set up module
    | 'explore'      // Explore features
    | 'wait'         // Data will appear soon
    | 'none';        // No action suggested

export interface EmptyStateContext {
    planId: string;
    moduleId: EmptyStateModule;
    isTrial: boolean;
    hasData: boolean;
    userActionCount: number;
}

export interface EmptyStateConfig {
    title: string;
    description: string;
    helperText?: string;
    suggestedAction: SuggestedAction;
    actionLabel?: string;
}

// =============================================================================
// COPY LIBRARY
// =============================================================================

type PlanType = 'starter' | 'growth' | 'enterprise';

interface ModuleCopy {
    starter: { title: string; description: string; helperText?: string };
    growth: { title: string; description: string; helperText?: string };
    enterprise: { title: string; description: string };
    suggestedAction: SuggestedAction;
    actionLabel?: string;
}

const COPY: Record<EmptyStateModule, { tr: ModuleCopy; en: ModuleCopy }> = {
    dashboard: {
        tr: {
            starter: {
                title: 'Dashboard\'unuz hazır',
                description: 'İlk ziyaretçiniz geldiğinde burada görünecek.',
                helperText: 'Widget\'ı sitenize ekleyin ve ilk konuşmayı başlatın.'
            },
            growth: {
                title: 'Veriler yolda',
                description: 'Widget aktif olduğunda istatistikler burada görünecek.'
            },
            enterprise: {
                title: 'Dashboard hazır',
                description: 'Veriler widget aktif olduğunda görünecek.'
            },
            suggestedAction: 'connect',
            actionLabel: 'Widget\'ı Ekle'
        },
        en: {
            starter: {
                title: 'Your dashboard is ready',
                description: 'Stats will appear here when your first visitor arrives.',
                helperText: 'Add the widget to your site to start your first conversation.'
            },
            growth: {
                title: 'Data is on the way',
                description: 'Analytics will appear here once the widget is active.'
            },
            enterprise: {
                title: 'Dashboard ready',
                description: 'Data will appear when widget is active.'
            },
            suggestedAction: 'connect',
            actionLabel: 'Add Widget'
        }
    },
    conversations: {
        tr: {
            starter: {
                title: 'İlk konuşmanız sizi bekliyor',
                description: 'Müşterileriniz chatbot ile konuşmaya başladığında burada göreceksiniz.',
                helperText: 'Her konuşma öğrenme fırsatı!'
            },
            growth: {
                title: 'Konuşmalar burada görünecek',
                description: 'Müşteri etkileşimlerinizi takip edebilirsiniz.'
            },
            enterprise: {
                title: 'Konuşma geçmişi',
                description: 'Henüz konuşma kaydı yok.'
            },
            suggestedAction: 'wait'
        },
        en: {
            starter: {
                title: 'Your first conversation awaits',
                description: 'You\'ll see chats here when customers start talking to your chatbot.',
                helperText: 'Every conversation is a learning opportunity!'
            },
            growth: {
                title: 'Conversations will appear here',
                description: 'Track your customer interactions.'
            },
            enterprise: {
                title: 'Conversation history',
                description: 'No conversations recorded yet.'
            },
            suggestedAction: 'wait'
        }
    },
    analytics: {
        tr: {
            starter: {
                title: 'Analizler yolda',
                description: 'İlk konuşmalarınız başladığında burada değerli içgörüler göreceksiniz.',
                helperText: 'Widget\'ınızı etkinleştirerek veri toplamaya başlayın.'
            },
            growth: {
                title: 'Analiz verileri hazırlanıyor',
                description: 'Detaylı raporlar konuşmalar başladığında görünecek.'
            },
            enterprise: {
                title: 'Analiz merkezi',
                description: 'Veri toplandığında raporlar burada görünecek.'
            },
            suggestedAction: 'connect'
        },
        en: {
            starter: {
                title: 'Analytics are coming',
                description: 'You\'ll see valuable insights here once conversations begin.',
                helperText: 'Activate your widget to start collecting data.'
            },
            growth: {
                title: 'Analytics data is being prepared',
                description: 'Detailed reports will appear when conversations start.'
            },
            enterprise: {
                title: 'Analytics center',
                description: 'Reports will appear here when data is collected.'
            },
            suggestedAction: 'connect'
        }
    },
    leads: {
        tr: {
            starter: {
                title: 'Potansiyel müşterileriniz burada',
                description: 'Chatbot ziyaretçilerden bilgi topladığında burada listelenecek.',
                helperText: 'Lead toplama modülü aktif olduğunda veriler otomatik akar.'
            },
            growth: {
                title: 'Lead veritabanınız hazır',
                description: 'Toplanan müşteri bilgileri burada görünecek.'
            },
            enterprise: {
                title: 'Lead yönetimi',
                description: 'Henüz lead kaydı yok.'
            },
            suggestedAction: 'configure',
            actionLabel: 'Modülü Yapılandır'
        },
        en: {
            starter: {
                title: 'Your leads will appear here',
                description: 'Leads will be listed when the chatbot collects visitor information.',
                helperText: 'Data flows automatically when lead collection is active.'
            },
            growth: {
                title: 'Your lead database is ready',
                description: 'Collected customer information will appear here.'
            },
            enterprise: {
                title: 'Lead management',
                description: 'No leads recorded yet.'
            },
            suggestedAction: 'configure',
            actionLabel: 'Configure Module'
        }
    },
    knowledge: {
        tr: {
            starter: {
                title: 'AI eğitim kaynaklarınızı oluşturun',
                description: 'SSS ve ürün bilgilerini ekleyerek chatbot\'unuzu daha akıllı yapın.',
                helperText: 'Ne kadar bilgi eklerseniz, chatbot o kadar doğru yanıtlar verir.'
            },
            growth: {
                title: 'AI eğitim kaynakları merkezi',
                description: 'Dökümanlar ve SSS\'ler ekleyerek AI\'ı eğitin.'
            },
            enterprise: {
                title: 'Kurumsal AI eğitim kaynakları',
                description: 'İçerik eklemek için başlayın.'
            },
            suggestedAction: 'configure',
            actionLabel: 'İçerik Ekle'
        },
        en: {
            starter: {
                title: 'Build your AI training resources',
                description: 'Make your chatbot smarter by adding FAQs and product info.',
                helperText: 'The more info you add, the more accurate the responses.'
            },
            growth: {
                title: 'AI training resources center',
                description: 'Train the AI by adding documents and FAQs.'
            },
            enterprise: {
                title: 'Enterprise AI training resources',
                description: 'Start by adding content.'
            },
            suggestedAction: 'configure',
            actionLabel: 'Add Content'
        }
    },
    products: {
        tr: {
            starter: {
                title: 'Ürün kataloğunuz',
                description: 'Ürünlerinizi ekleyerek chatbot\'un satış yapmasını sağlayın.',
                helperText: 'Ürünler eklendikten sonra müşterilerinize önerilecek.'
            },
            growth: {
                title: 'Ürün yönetim merkezi',
                description: 'Katalog ve envanter bilgilerinizi buradan yönetin.'
            },
            enterprise: {
                title: 'Ürün veritabanı',
                description: 'Ürün verisi henüz yüklenmedi.'
            },
            suggestedAction: 'configure',
            actionLabel: 'Ürün Ekle'
        },
        en: {
            starter: {
                title: 'Your product catalog',
                description: 'Add products to let your chatbot make sales.',
                helperText: 'Products will be recommended to customers after adding.'
            },
            growth: {
                title: 'Product management center',
                description: 'Manage catalog and inventory from here.'
            },
            enterprise: {
                title: 'Product database',
                description: 'No product data loaded yet.'
            },
            suggestedAction: 'configure',
            actionLabel: 'Add Product'
        }
    },
    settings: {
        tr: {
            starter: {
                title: 'Ayarlar',
                description: 'Chatbot\'unuzu kişiselleştirin.'
            },
            growth: {
                title: 'Yapılandırma merkezi',
                description: 'Gelişmiş ayarları buradan yönetin.'
            },
            enterprise: {
                title: 'Sistem ayarları',
                description: 'Kurumsal yapılandırmalar.'
            },
            suggestedAction: 'explore'
        },
        en: {
            starter: {
                title: 'Settings',
                description: 'Personalize your chatbot.'
            },
            growth: {
                title: 'Configuration center',
                description: 'Manage advanced settings here.'
            },
            enterprise: {
                title: 'System settings',
                description: 'Enterprise configurations.'
            },
            suggestedAction: 'explore'
        }
    },
    integrations: {
        tr: {
            starter: {
                title: 'Entegrasyonlar',
                description: 'Diğer araçlarınızı AmeritAI ile bağlayın.',
                helperText: 'WhatsApp, Instagram ve daha fazlasıyla entegre olun.'
            },
            growth: {
                title: 'Entegrasyon merkezi',
                description: 'Tüm kanallarınızı tek yerden yönetin.'
            },
            enterprise: {
                title: 'API & Entegrasyonlar',
                description: 'Kurumsal entegrasyon seçenekleri.'
            },
            suggestedAction: 'explore',
            actionLabel: 'Keşfet'
        },
        en: {
            starter: {
                title: 'Integrations',
                description: 'Connect your other tools with AmeritAI.',
                helperText: 'Integrate with WhatsApp, Instagram, and more.'
            },
            growth: {
                title: 'Integration center',
                description: 'Manage all your channels in one place.'
            },
            enterprise: {
                title: 'API & Integrations',
                description: 'Enterprise integration options.'
            },
            suggestedAction: 'explore',
            actionLabel: 'Explore'
        }
    }
};

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Get intelligent empty state configuration based on context.
 */
export function getEmptyState(
    context: EmptyStateContext,
    lang: 'en' | 'tr' = 'tr'
): EmptyStateConfig {
    // If user has data, no empty state needed
    if (context.hasData) {
        return {
            title: '',
            description: '',
            suggestedAction: 'none'
        };
    }

    const planType = getPlanType(context.planId);
    const moduleCopy = COPY[context.moduleId]?.[lang];

    if (!moduleCopy) {
        return getGenericEmptyState(planType, lang);
    }

    const copy = moduleCopy[planType];
    const shouldShowHelper = shouldShowHelperText(context);

    return {
        title: copy.title,
        description: copy.description,
        helperText: shouldShowHelper ? (copy as any).helperText : undefined,
        suggestedAction: moduleCopy.suggestedAction,
        actionLabel: moduleCopy.actionLabel
    };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getPlanType(planId: string): PlanType {
    if (planId === 'enterprise') return 'enterprise';
    if (planId === 'growth' || planId === 'pro') return 'growth';
    return 'starter';
}

/**
 * Reduce guidance as user gains experience
 */
function shouldShowHelperText(context: EmptyStateContext): boolean {
    // New users (< 5 actions) get full guidance
    if (context.userActionCount < 5) return true;

    // Experienced users get minimal guidance
    if (context.userActionCount > 20) return false;

    // In-between: show for trials, hide for paid
    return context.isTrial;
}

function getGenericEmptyState(planType: PlanType, lang: 'en' | 'tr'): EmptyStateConfig {
    const generic = {
        tr: {
            starter: { title: 'Hazır', description: 'Veriler yakında görünecek.' },
            growth: { title: 'Hazır', description: 'Veriler burada görünecek.' },
            enterprise: { title: 'Veri bekleniyor', description: '' }
        },
        en: {
            starter: { title: 'Ready', description: 'Data will appear soon.' },
            growth: { title: 'Ready', description: 'Data will appear here.' },
            enterprise: { title: 'Awaiting data', description: '' }
        }
    };

    return {
        ...generic[lang][planType],
        suggestedAction: 'none'
    };
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Get empty state for dashboard
 */
export function getDashboardEmptyState(
    planId: string,
    isTrial: boolean,
    userActionCount: number,
    lang: 'en' | 'tr' = 'tr'
): EmptyStateConfig {
    return getEmptyState({
        planId,
        moduleId: 'dashboard',
        isTrial,
        hasData: false,
        userActionCount
    }, lang);
}

/**
 * Get empty state for any module page
 */
export function getModuleEmptyState(
    moduleId: EmptyStateModule,
    planId: string,
    lang: 'en' | 'tr' = 'tr'
): EmptyStateConfig {
    return getEmptyState({
        planId,
        moduleId,
        isTrial: false,
        hasData: false,
        userActionCount: 0
    }, lang);
}
