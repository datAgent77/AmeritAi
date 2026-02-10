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


    | 'salesOptimization'


    | 'campaignManager'

    | 'gamification'
    | 'visualDiagnosis'
    | 'digitalWaiter'
    | 'proactiveMessaging'
    | 'dynamicContext';

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
    | 'automotive'
    | 'insurance'
    | 'logistics'
    | 'beauty'
    | 'legal'
    | 'fitness'
    | 'maritime'
    | 'manufacturing'
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
     * Premium modules require additional payment or higher plan.
     * During trial, these are LOCKED.
     */
    isPremium: boolean;

    /**
     * Monthly price in USD for this module (0 for core/free modules)
     */
    price: number;

    /**
     * Module status: ready, beta, or coming_soon
     */
    status: 'ready' | 'beta' | 'coming_soon';

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
     * Whether this module should be featured on the landing page modules section.
     */
    showOnLandingPage?: boolean;

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
        isPremium: false,
        price: 0,
        status: 'ready',
        supportedSectors: [], // All sectors
        defaultEnabledBySector: [
            'ecommerce', 'booking', 'real_estate', 'saas', 'service',
            'healthcare', 'education', 'academic', 'finance', 'restaurant', 'maritime', 'other'
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
        isPremium: false,
        price: 0,
        status: 'ready',
        supportedSectors: [],
        defaultEnabledBySector: [
            'ecommerce', 'booking', 'real_estate', 'saas', 'service',
            'healthcare', 'education', 'academic', 'finance', 'restaurant', 'maritime', 'other'
        ],
        legacyFirestoreField: 'enableKnowledgeBase',
        longDescription: {
            en: 'Turn your AI into a subject matter expert. Upload your existing PDFs, documents, or website links, and the AI will instantly learn everything about your business to answer specific questions accurately.',
            tr: 'Yapay zekanızı bir konu uzmanına dönüştürün. Mevcut PDF, doküman veya web sitesi linklerinizi yükleyin; AI, işletmenizle ilgili her şeyi anında öğrenerek özel soruları doğru şekilde yanıtlasın.'
        },
        features: [
            {
                title: { en: 'Document Learning', tr: 'Doküman Öğrenme' },
                description: { en: 'Upload PDFs, Docs, and TXT files directly.', tr: 'PDF, Doc ve TXT dosyalarını doğrudan yükleyin.' },
                icon: 'FileText'
            },
            {
                title: { en: 'Website Scraping', tr: 'Web Sitesi Tarama' },
                description: { en: 'Learn from your existing website content.', tr: 'Mevcut web sitenizdeki içerikleri öğrenir.' },
                icon: 'Globe'
            }
        ],
        benefits: [
            { en: 'Reduce training time from weeks to minutes', tr: 'Eğitim süresini haftalardan dakikalara indirin' },
            { en: 'Provide accurate, referenced answers', tr: 'Doğru ve referanslı yanıtlar sunun' }
        ]
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
        isPremium: false, // Free for ecommerce, premium for others
        price: 29,
        status: 'ready',
        supportedSectors: ['ecommerce', 'restaurant', 'real_estate'],
        defaultEnabledBySector: ['ecommerce'],
        showOnLandingPage: true,
        legacyFirestoreField: 'enablePersonalShopper',
        longDescription: {
            en: 'Showcase your products directly within the chat. The AI suggests items, explains features, and guides customers to checkout, acting like a knowledgeable in-store sales associate.',
            tr: 'Ürünlerinizi doğrudan sohbet içinde sergileyin. AI, bilgili bir mağaza satış temsilcisi gibi hareket ederek ürünler önerir, özellikleri açıklar ve müşterileri satın almaya yönlendirir.'
        },
        features: [
            {
                title: { en: 'Smart Recommendations', tr: 'Akıllı Öneriler' },
                description: { en: 'Suggests products based on customer needs.', tr: 'Müşteri ihtiyaçlarına göre ürünler önerir.' },
                icon: 'Sparkles'
            },
            {
                title: { en: 'Interactive Card', tr: 'Etkileşimli Kartlar' },
                description: { en: 'Displays products with images and prices.', tr: 'Ürünleri görsel ve fiyatlarıyla birlikte gösterir.' },
                icon: 'ShoppingBag'
            }
        ],
        benefits: [
            { en: 'Increase conversion rates via guided selling', tr: 'Yönlendirmeli satış ile dönüşüm oranlarını artırın' },
            { en: 'Shorten the path to purchase', tr: 'Satın alma yolculuğunu kısaltın' }
        ],
        aiSystemInstruction: {
            en: `PRODUCT CATALOG & SHOPPER ACTIVE. You are a knowledgeable Sales Assistant.
1. Recommend products based on user needs.
2. Use the product context provided to answer questions about features and price.
3. If the user is unsure, ask clarifying questions (budget, preferences) to narrow down options.`,
            tr: `ÜRÜN KATALOĞU VE ALIŞVERİŞ MODÜLÜ AKTİF. Sen bilgili bir Satış Asistanısın.
1. Kullanıcı ihtiyaçlarına göre ürünler öner.
2. Özellikler ve fiyat hakkındaki soruları yanıtlamak için sağlanan ürün bağlamını kullan.
3. Kullanıcı kararsızsa, seçenekleri daraltmak için netleştirici sorular (bütçe, tercihler) sor.`
        }
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
        isPremium: false,
        price: 29,
        status: 'ready',
        supportedSectors: [],
        defaultEnabledBySector: [
            'ecommerce', 'booking', 'real_estate', 'saas', 'service', 'finance', 'maritime'
        ],
        showOnLandingPage: true,
        legacyFirestoreField: 'enableLeadCollection',
        longDescription: {
            en: 'Never lose a potential customer. The AI intelligently identifies sales opportunities during conversations and collects contact details (Name, Email, Phone) so your team can follow up.',
            tr: 'Potansiyel hiçbir müşteriyi kaybetmeyin. AI, sohbet sırasında satış fırsatlarını akıllıca tespit eder ve ekibinizin takip edebilmesi için iletişim bilgilerini (Ad, E-posta, Telefon) toplar.'
        },
        features: [
            {
                title: { en: 'Smart Detection', tr: 'Akıllı Tespit' },
                description: { en: 'Identifies intent to purchase or inquiry.', tr: 'Satın alma veya bilgi alma niyetini tespit eder.' },
                icon: 'ScanFace'
            },
            {
                title: { en: 'CRM Integration', tr: 'CRM Entegrasyonu' },
                description: { en: 'Syncs leads directly to your customer list.', tr: 'Leadleri doğrudan müşteri listenize senkronize eder.' },
                icon: 'Database'
            }
        ],
        benefits: [
            { en: 'Automate lead qualification', tr: 'Lead kalifikasyonunu otomatikleştirin' },
            { en: 'Grow your customer database 24/7', tr: 'Müşteri veritabanınızı 7/24 büyütün' }
        ],
        aiSystemInstruction: {
            en: `LEAD COLLECTION MODULE ACTIVE.
RULES:
1. If the user wants to be contacted, or you need to collect their details (Name, Email, Phone):
   - You MUST output specifically: \`[SHOW_LEAD_FORM]\`
   - Example response: "Sure, please fill out this form. [SHOW_LEAD_FORM]"
2. DO NOT ask for details one by one in the chat.
3. DO NOT ask user to type their phone/email. ALWAYS use the form.`,
            tr: `LEAD TOPLAMA MODÜLÜ AKTİF.
KURALLAR:
1. Kullanıcı aranmak isterse veya iletişim bilgilerini alman gerekirse (Ad, E-posta, Telefon):
   - MUTLAKA şu özel komutu kullan: \`[SHOW_LEAD_FORM]\`
   - Örnek Yanıt: "Tabii, lütfen iletişim formunu doldurun. [SHOW_LEAD_FORM]"
2. Sohbet içinde bilgileri tek tek sorma.
3. Kullanıcıdan numarasını yazmasını isteme. HER ZAMAN formu aç.`
        }
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
        isPremium: true,
        price: 49,
        status: 'ready',
        supportedSectors: [],
        defaultEnabledBySector: ['booking', 'healthcare', 'service', 'real_estate', 'maritime'],
        showOnLandingPage: true,
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
        },
        longDescription: {
            en: 'Allow your customers to book appointments simply by talking or chatting. The AI manages your calendar, checks availability, and registers appointments seamlessly.',
            tr: 'Müşterilerinizin sadece konuşarak veya yazışarak randevu almasını sağlayın. Yapay zeka takviminizi yönetir, müsaitliği kontrol eder ve randevuları sorunsuz şekilde kaydeder.'
        },
        features: [
            {
                title: { en: 'Voice & Chat Booking', tr: 'Sesli ve Yazılı Randevu' },
                description: { en: 'Customers can book via voice commands or text chat.', tr: 'Müşteriler sesli komutlarla veya yazışarak randevu alabilir.' },
                icon: 'Mic'
            },
            {
                title: { en: 'Smart Availability', tr: 'Akıllı Müsaitlik' },
                description: { en: 'AI checks your real-time calendar availability.', tr: 'AI, gerçek zamanlı takvim müsaitliğinizi kontrol eder.' },
                icon: 'Calendar'
            }
        ],
        benefits: [
            { en: 'Automate 100% of appointment scheduling', tr: 'Randevu planlamayı %100 otomatikleştirin' },
            { en: 'Never miss a booking call again', tr: 'Bir daha asla randevu talebini kaçırmayın' }
        ]
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
        isPremium: true,
        price: 39,
        status: 'coming_soon',
        supportedSectors: ['booking', 'healthcare', 'service', 'academic', 'real_estate'],
        defaultEnabledBySector: [],
        showOnLandingPage: false,
        legacyFirestoreField: 'enableAppointments',
        longDescription: {
            en: 'A comprehensive calendar system fully integrated with your AI assistant. Manage staff availability, service durations, and view all AI-booked appointments in one place.',
            tr: 'AI asistanınızla tam entegre çalışan kapsamlı bir takvim sistemi. Personel müsaitliğini ve hizmet sürelerini yönetin, AI tarafından alınan tüm randevuları tek bir yerden görüntüleyin.'
        },
        features: [
            {
                title: { en: 'Unified Calendar', tr: 'Birleşik Takvim' },
                description: { en: 'See manual and AI bookings in one view.', tr: 'Manuel ve AI randevularını tek bir görünümde izleyin.' },
                icon: 'Calendar'
            },
            {
                title: { en: 'Service Management', tr: 'Hizmet Yönetimi' },
                description: { en: 'Define durations and prices for your services.', tr: 'Hizmetleriniz için süre ve fiyatları tanımlayın.' },
                icon: 'Settings'
            }
        ],
        benefits: [
            { en: 'Eliminate double bookings', tr: 'Çifte rezervasyonları ortadan kaldırın' },
            { en: 'Optimize staff schedule efficiency', tr: 'Personel programı verimliliğini optimize edin' }
        ]
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
        isPremium: true,
        price: 49,
        status: 'ready',
        supportedSectors: ['ecommerce', 'saas'],
        defaultEnabledBySector: [],
        showOnLandingPage: true,
        legacyFirestoreField: 'enableSalesOptimization',
        aiSystemInstruction: {
            en: `SALES OPTIMIZATION ACTIVE.
1. Suggest complementary items (Cross-sell) when appropriate (e.g., "Would you like a case with that phone?").
2. Highlight unique value propositions to encourage purchase.
3. If user abandons a topic/cart, gently remind them of the benefits.`,
            tr: `SATIŞ OPTİMİZASYONU AKTİF.
1. Uygun olduğunda tamamlayıcı ürünler (Çapraz Satış) öner (örn. "Bu telefonun yanına bir kılıf ister misiniz?").
2. Satın almayı teşvik etmek için benzersiz değer önerilerini vurgula.
3. Kullanıcı bir konuyu/sepeti terk ederse, avantajları nazikçe hatırlat.`
        },
        longDescription: {
            en: 'Turn your AI into a top-performing sales agent. It uses proven psychological triggers, cross-selling techniques, and cart recovery strategies to maximize the value of every customer interaction.',
            tr: 'Yapay zekanızı en iyi performans gösteren bir satış temsilcisine dönüştürün. Müşteri etkileşimlerinin değerini maksimize etmek için kanıtlanmış psikolojik tetikleyiciler, çapraz satış teknikleri ve sepet kurtarma stratejileri kullanır.'
        },
        features: [
            {
                title: { en: 'Smart Cross-Selling', tr: 'Akıllı Çapraz Satış' },
                description: { en: 'Suggests add-ons at the perfect moment.', tr: 'Doğru zamanda ek ürünler önerir.' },
                icon: 'TrendingUp'
            },
            {
                title: { en: 'Cart Recovery', tr: 'Sepet Kurtarma' },
                description: { en: 'Gently nudges users to complete purchases.', tr: 'Kullanıcıları satın almayı tamamlamaları için nazikçe teşvik eder.' },
                icon: 'ShoppingBag'
            }
        ],
        benefits: [
            { en: 'Increase Average Order Value (AOV) by 25%', tr: 'Ortalama Sipariş Tutarını (AOV) %25 artırın' },
            { en: 'Recover lost sales automatically', tr: 'Kaybedilen satışları otomatik olarak kurtarın' }
        ]
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
        isPremium: true,
        price: 19,
        status: 'coming_soon',
        supportedSectors: ['restaurant', 'ecommerce', 'service'],
        defaultEnabledBySector: [],
        legacyFirestoreField: 'enableCampaignManager',
        longDescription: {
            en: 'Launch "Happy Hour" or "Rainy Day" specials in seconds. The AI dynamically adjusts your chat agent\'s behavior to promote these offers during active times.',
            tr: '"Mutlu Saatler" veya "Yağmurlu Gün" kampanyalarını saniyeler içinde başlatın. AI, bu teklifleri aktif zamanlarda tanıtmak için sohbet asistanınızın davranışını dinamik olarak ayarlar.'
        },
        features: [
            {
                title: { en: 'One-Click Campaigns', tr: 'Tek Tık Kampanyalar' },
                description: { en: 'Launch pre-configured promotions instantly.', tr: 'Önceden yapılandırılmış promosyonları anında başlatın.' },
                icon: 'MousePointerClick'
            },
            {
                title: { en: 'Context Aware', tr: 'Bağlam Duyarlı' },
                description: { en: 'AI promotes deals only during valid hours.', tr: 'AI, fırsatları yalnızca geçerli saatlerde tanıtır.' },
                icon: 'Clock'
            }
        ],
        benefits: [
            { en: 'Drive traffic during slow hours', tr: 'Sakin saatlerde trafiği artırın' },
            { en: 'Clear excess inventory quickly', tr: 'Fazla stoku hızlıca eritin' }
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
        isPremium: true,
        price: 39,
        status: 'coming_soon',
        supportedSectors: ['ecommerce', 'restaurant'],
        defaultEnabledBySector: [],
        legacyFirestoreField: 'enableGamification',
        aiSystemInstruction: {
            en: `GAMIFICATION ACTIVE.
If the user seems price-sensitive or asks for discounts, mention the 'Spin the Wheel' game: "Did you know you can spin the wheel to win a special discount code?"`,
            tr: `OYUNLAŞTIRMA AKTİF.
Kullanıcı fiyat konusunda hassas görünüyorsa veya indirim sorarsa, 'Çarkıfelek' oyununu hatırlat: "Özel bir indirim kodu kazanmak için çarkı çevirebileceğinizi biliyor muydunuz?"`
        },
        longDescription: {
            en: 'Add a fun "Spin the Wheel" popup to your site. Visitors play to win discounts or free items, which drastically increases email signup rates and time spent on site.',
            tr: 'Sitenize eğlenceli bir "Çarkıfelek" açılır penceresi ekleyin. Ziyaretçiler indirim veya hediye kazanmak için oynar; bu da e-posta toplama oranlarını ve sitede geçirilen süreyi ciddi oranda artırır.'
        },
        features: [
            {
                title: { en: 'Customizable Prizes', tr: 'Özelleştirilebilir Ödüller' },
                description: { en: 'Set your own win probabilities and rewards.', tr: 'Kendi kazanma olasılıklarınızı ve ödüllerinizi belirleyin.' },
                icon: 'Gift'
            },
            {
                title: { en: 'Exit Intent Trigger', tr: 'Çıkış Niyeti Tetikleyicisi' },
                description: { en: 'Shows the game when a user tries to leave.', tr: 'Kullanıcı siteden çıkmaya çalıştığında oyunu gösterir.' },
                icon: 'MousePointerClick'
            }
        ],
        benefits: [
            { en: 'Capture 3x more leads than static forms', tr: 'Statik formlardan 3 kat daha fazla lead toplayın' },
            { en: 'Reduce cart abandonment', tr: 'Sepet terk etme oranını azaltın' }
        ]
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
        isPremium: true,
        price: 59,
        status: 'ready',
        supportedSectors: ['agriculture', 'healthcare', 'real_estate'],
        defaultEnabledBySector: [],
        showOnLandingPage: true,
        legacyFirestoreField: 'enableVisualDiagnosis',
        aiSystemInstruction: {
            en: `VISUAL DIAGNOSIS ACTIVE.
You have the capability to analyze images. If the user describes a visible problem (e.g., plant disease, car damage, skin issue), ask them to UPLOAD A PHOTO for analysis.`,
            tr: `GÖRSEL TANI AKTİF.
Görüntüleri analiz etme yeteneğine sahipsin. Kullanıcı gözle görülür bir sorunu (örn. bitki hastalığı, araç hasarı, cilt sorunu) tarif ederse, analiz için BİR FOTOĞRAF YÜKLEMESİNİ iste.`
        },
        longDescription: {
            en: 'Empower your users to diagnose issues simply by uploading a photo. Perfect for agriculture (plant diseases), insurance (damage assessment), or technical support.',
            tr: 'Kullanıcılarınızın sadece bir fotoğraf yükleyerek sorunları teşhis etmesini sağlayın. Tarım (bitki hastalıkları), sigorta (hasar tespiti) veya teknik destek için mükemmeldir.'
        },
        features: [
            {
                title: { en: 'Instant Analysis', tr: 'Anlık Analiz' },
                description: { en: 'Identify problems in seconds with computer vision.', tr: 'Bilgisayarlı görü ile sorunları saniyeler içinde tanımlayın.' },
                icon: 'Camera'
            },
            {
                title: { en: 'Actionable Advice', tr: 'Uygulanabilir Tavsiyeler' },
                description: { en: 'Provide immediate treatment or repair steps.', tr: 'Anında tedavi veya onarım adımları sunun.' },
                icon: 'CheckCircle'
            }
        ],
        benefits: [
            { en: 'Solve problems remotely without site visits', tr: 'Saha ziyareti olmadan sorunları uzaktan çözün' },
            { en: 'Standardize assessment quality', tr: 'Değerlendirme kalitesini standartlaştırın' }
        ]
    },

    digitalWaiter: {
        id: 'digitalWaiter',
        name: {
            en: 'Restaurant & Cafe AI',
            tr: 'Restoran ve Kafe AI'
        },
        description: {
            en: 'Smart assistant for menus, recommendations, and service flow',
            tr: 'Menü, öneriler ve servis akışı için akıllı asistan'
        },
        icon: 'Utensils',
        isCore: false,
        isPremium: true,
        price: 29,
        status: 'ready',
        supportedSectors: ['restaurant'],
        defaultEnabledBySector: ['restaurant'],
        showOnLandingPage: true,
        legacyFirestoreField: 'enableDigitalWaiter',
        longDescription: {
            en: 'Transform your venue with an AI that understands your menu. Whether you run a fine dining restaurant (Table Service) or a coffee shop (Counter Service), this AI adapts to your service style to guide guests and boost sales.',
            tr: 'Mekanınızı menünüzü anlayan bir yapay zeka ile dönüştürün. İster masaya servis yapan bir restoran, ister kasadan servis yapan bir kafe işletin; bu AI servis stilinize uyum sağlayarak misafirleri yönlendirir ve satışları artırır.'
        },
        aiSystemInstruction: {
            en: `RESTAURANT & CAFE AI ACTIVE.
Your role is to assist guests with the menu and service.
Specific behavior (Waiter vs Barista) will be defined by the Service Mode settings.`,
            tr: `RESTORAN VE KAFE AI AKTİF.
Göreviniz, menü ve servis konularında misafirlere yardımcı olmaktır.
Özel davranışınız (Garson veya Barista), Servis Modu ayarlarına göre belirlenecektir.`
        },
        features: [
            {
                title: { en: 'Smart Menu', tr: 'Akıllı Menü' },
                description: { en: 'Explains dishes and ingredients in detail.', tr: 'Yemekleri ve içerikleri detaylıca anlatır.' },
                icon: 'BookOpen'
            },
            {
                title: { en: 'Service Modes', tr: 'Servis Modları' },
                description: { en: 'Adapts to Table Service or Self Service.', tr: 'Masaya Servis veya Self Servis düzenine uyum sağlar.' },
                icon: 'Settings'
            }
        ],
        benefits: [
            { en: 'Increase upsells with smart recommendations', tr: 'Akıllı önerilerle ek satışları artırın' },
            { en: 'Reduce staff workload', tr: 'Personel iş yükünü azaltın' }
        ]
    },

    proactiveMessaging: {
        id: 'proactiveMessaging',
        name: {
            en: 'Proactive Engagement',
            tr: 'Proaktif Etkileşim'
        },
        description: {
            en: 'Engage visitors with non-intrusive bubble messages',
            tr: 'Ziyaretçilerle rahatsız etmeyen balon mesajlarıyla etkileşime geçin'
        },
        icon: 'MessageCircle', // Or 'Bell'
        isCore: false,
        isPremium: true,
        price: 19,
        status: 'ready',
        supportedSectors: [], // All sectors
        defaultEnabledBySector: [],
        showOnLandingPage: true,
        legacyFirestoreField: 'enableProactiveMessaging',
        longDescription: {
            en: 'Catch your visitors\' attention without being annoying. Display small, timed bubble messages above your chat widget to highlight offers, welcome guests, or provide quick tips.',
            tr: 'Ziyaretçilerinizin dikkatini rahatsız etmeden çekin. Teklifleri vurgulamak, misafirleri karşılamak veya hızlı ipuçları sağlamak için sohbet widget\'ınızın üzerinde zamanlanmış küçük balon mesajları görüntüleyin.'
        },
        features: [
            {
                title: { en: 'Timed Triggers', tr: 'Zamanlanmış Tetikleyiciler' },
                description: { en: 'Show messages after a delay or on specific pages.', tr: 'Mesajları bir gecikmeden sonra veya belirli sayfalarda gösterin.' },
                icon: 'Clock'
            },
            {
                title: { en: 'Smart Nudges', tr: 'Akıllı Dürtmeler' },
                description: { en: 'AI-generated hints based on user behavior.', tr: 'Kullanıcı davranışına dayalı AI tabanlı ipuçları.' },
                icon: 'Lightbulb'
            }
        ],
        benefits: [
            { en: 'Increase conversion rates by 15%', tr: 'Dönüşüm oranlarını %15 artırın' },
            { en: 'Reduce bounce rates', tr: 'Hemen çıkma oranlarını düşürün' }
        ]
    },

    dynamicContext: {
        id: 'dynamicContext',
        name: {
            en: 'Dynamic Data Context',
            tr: 'Dinamik Veri Bağlamı'
        },
        description: {
            en: 'Inject real-time user data into AI context',
            tr: 'Gerçek zamanlı kullanıcı verilerini AI bağlamına aktarın'
        },
        icon: 'Database', // or 'Cpu' or 'Activity'
        isCore: false,
        isPremium: true,
        price: 39,
        status: 'ready',
        supportedSectors: ['saas', 'ecommerce', 'booking'],
        defaultEnabledBySector: [],
        showOnLandingPage: false,
        legacyFirestoreField: 'enableDynamicContext',
        longDescription: {
            en: 'Empower your AI to answer personal questions like "How many tasks do I have?" or "What is my current balance?" by injecting dynamic data from your application directly into the chat context.',
            tr: 'Uygulamanızdan gelen dinamik verileri doğrudan sohbet bağlamına aktararak, yapay zekanızın "Kaç görevim var?" veya "Güncel bakiyem nedir?" gibi kişisel soruları yanıtlamasını sağlayın.'
        },
        features: [
            {
                title: { en: 'Real-time Data', tr: 'Gerçek Zamanlı Veri' },
                description: { en: 'AI reads live data passed from your frontend.', tr: 'AI, ön yüzden gönderilen canlı verileri okur.' },
                icon: 'Activity'
            },
            {
                title: { en: 'Personalized Answers', tr: 'Kişiselleştirilmiş Yanıtlar' },
                description: { en: 'Give specific answers based on user state.', tr: 'Kullanıcı durumuna göre özel yanıtlar verin.' },
                icon: 'UserCheck'
            }
        ],
        benefits: [
            { en: 'Eliminate need for navigation', tr: 'Gezinme ihtiyacını ortadan kaldırın' },
            { en: 'Provide hyper-personalized support', tr: 'Hiper-kişiselleştirilmiş destek sağlayın' }
        ],
        aiSystemInstruction: {
            en: `DYNAMIC CONTEXT MODULE ACTIVE.
You have access to real-time user data injected from the application.
RULES:
1. When the user asks personal questions (e.g., "What is my balance?", "How many orders do I have?"), check the DYNAMIC CONTEXT section for relevant data.
2. If the data is available in context, answer directly and accurately.
3. If the data is NOT in context, do NOT make up information. Instead say: "I don't have access to that information right now. Please check your dashboard."
4. Always be specific when using dynamic data (mention exact numbers, dates, or values).`,
            tr: `DİNAMİK BAĞLAM MODÜLÜ AKTİF.
Uygulamadan aktarılan gerçek zamanlı kullanıcı verilerine erişiminiz var.
KURALLAR:
1. Kullanıcı kişisel sorular sorduğunda (örn. "Bakiyem ne?", "Kaç siparişim var?"), ilgili veri için DİNAMİK BAĞLAM bölümünü kontrol et.
2. Veri bağlamda mevcutsa, doğrudan ve doğru şekilde yanıtla.
3. Veri bağlamda YOKSA, bilgi uydurmayın. Bunun yerine şöyle söyle: "Şu anda bu bilgiye erişimim yok. Lütfen kontrol panelinize bakın."
4. Dinamik veri kullanırken her zaman spesifik ol (tam sayıları, tarihleri veya değerleri belirt).`
        }
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
 * Get premium modules
 */
export function getPremiumModules(): ModuleDefinition[] {
    return getAllModules().filter(m => m.isPremium);
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

// =============================================================================
// ORDERED MODULES FOR RENDERING
// =============================================================================

/**
 * Ordered array for rendering - Core modules first, then by status
 * This replaces the ORDERED_MODULES from module-config.ts
 */
export const ORDERED_MODULES: ModuleDefinition[] = [
    // --- 1. READY MODULES ---
    MODULES_REGISTRY.generalChatbot,    // Core
    MODULES_REGISTRY.knowledgeBase,     // Core
    MODULES_REGISTRY.productCatalog,    // Personal Shopper
    MODULES_REGISTRY.leadCollection,    // Lead Collection
    MODULES_REGISTRY.visualDiagnosis,   // Visual Analysis (Ready)
    MODULES_REGISTRY.salesOptimization, // Sales Optimization (Ready)
    MODULES_REGISTRY.proactiveMessaging, // Proactive Engagement (Ready)
    MODULES_REGISTRY.digitalWaiter,     // Digital Waiter (Ready)
    MODULES_REGISTRY.dynamicContext,    // Dynamic Data Context (Ready)
    MODULES_REGISTRY.voiceAssistant,    // Voice & Appointments (Ready)

    // --- 2. COMING SOON MODULES ---
    MODULES_REGISTRY.appointments,      // Coming Soon
    // MODULES_REGISTRY.emailMarketing,    // Coming Soon - Not yet implemented
    // MODULES_REGISTRY.reviewManagement,  // Coming Soon - Removed
    // MODULES_REGISTRY.loyaltyProgram,    // Coming Soon - Removed
    MODULES_REGISTRY.campaignManager,   // Coming Soon
    // MODULES_REGISTRY.autoTranslate,     // Coming Soon - Removed
    MODULES_REGISTRY.gamification,      // Coming Soon
];

// =============================================================================
// BACKWARD COMPATIBILITY EXPORTS
// =============================================================================

/**
 * Alias for backward compatibility with module-config.ts imports
 * Use ModuleDefinition for new code
 */
export type ModuleConfig = ModuleDefinition;

/**
 * Alias for backward compatibility - same as MODULES_REGISTRY
 */
export const MODULES = MODULES_REGISTRY;

/**
 * Alias for backward compatibility - same as SectorId
 */
export type IndustryType = SectorId;
