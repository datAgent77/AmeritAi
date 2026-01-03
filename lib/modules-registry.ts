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

    | 'emailMarketing'
    | 'salesOptimization'
    | 'reviewManagement'
    | 'loyaltyProgram'
    | 'campaignManager'
    | 'autoTranslate'
    | 'gamification'
    | 'visualDiagnosis'
    | 'digitalWaiter'
    | 'proactiveMessaging';

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
        isPremium: false,
        price: 0,
        status: 'ready',
        supportedSectors: [],
        defaultEnabledBySector: [
            'ecommerce', 'booking', 'real_estate', 'saas', 'service',
            'healthcare', 'education', 'academic', 'finance', 'restaurant', 'other'
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
            'ecommerce', 'booking', 'real_estate', 'saas', 'service', 'finance'
        ],
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
            en: `LEAD COLLECTION ACTIVE. If a user expresses interest in services or asks for a quote:
1. Politely ask for their Name and Contact Information (Email/Phone).
2. Explain that a representative will contact them.
3. Do not be intrusive; ask naturally within the flow of conversation.`,
            tr: `LEAD TOPLAMA AKTİF. Kullanıcı hizmetlere ilgi gösterirse veya fiyat teklifi isterse:
1. Nazikçe Adını ve İletişim Bilgilerini (E-posta/Telefon) iste.
2. Bir temsilcinin onlarla iletişime geçeceğini belirt.
3. Israrcı olma; sohbetin akışı içinde doğal bir şekilde sor.`
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
        status: 'coming_soon',
        supportedSectors: ['ecommerce', 'saas'],
        defaultEnabledBySector: [],
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
        isPremium: true,
        price: 29,
        status: 'coming_soon',
        supportedSectors: [],
        defaultEnabledBySector: [],
        legacyFirestoreField: 'enableEmailMarketing',
        longDescription: {
            en: 'Create, schedule, and track professional email campaigns without needing a designer. The AI helps you write compelling subject lines and content that converts.',
            tr: 'Bir tasarımcıya ihtiyaç duymadan profesyonel e-posta kampanyaları oluşturun, planlayın ve takip edin. AI, dönüşüm sağlayan etkileyici konu satırları ve içerikler yazmanıza yardımcı olur.'
        },
        features: [
            {
                title: { en: 'AI Copywriter', tr: 'AI Metin Yazarı' },
                description: { en: 'Generates engaging email content instantly.', tr: 'Anında ilgi çekici e-posta içerikleri üretir.' },
                icon: 'PenTool'
            },
            {
                title: { en: 'Automated Sequences', tr: 'Otomatik Seriler' },
                description: { en: 'Send welcome emails and follow-ups automatically.', tr: 'Hoş geldin ve takip e-postalarını otomatik gönderin.' },
                icon: 'Send'
            },
            {
                title: { en: 'Analytics', tr: 'Analitik' },
                description: { en: 'Track open rates and click-throughs.', tr: 'Açılma ve tıklama oranlarını takip edin.' },
                icon: 'BarChart'
            }
        ],
        benefits: [
            { en: 'Save hours on content creation', tr: 'İçerik üretiminde saatlerce zaman kazanın' },
            { en: 'Drive repeat business effectively', tr: 'Tekrar eden satışları etkili bir şekilde artırın' }
        ]
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
        isPremium: true,
        price: 39,
        status: 'coming_soon',
        supportedSectors: ['restaurant', 'service', 'booking', 'healthcare', 'real_estate'],
        defaultEnabledBySector: [],
        legacyFirestoreField: 'enableReviewManagement',
        aiSystemInstruction: {
            en: `REVIEW MANAGEMENT ACTIVE.
If the user expresses high satisfaction or thanks you for great service, politely invite them to leave a review: "We're glad to help! If you have a moment, we'd love your feedback on Google/Yelp."`,
            tr: `YORUM YÖNETİMİ AKTİF.
Kullanıcı hizmetten çok memnun kaldığını belirtirse veya teşekkür ederse, nazikçe yorum yapmaya davet et: "Yardımcı olabildiğimize sevindik! Vaktiniz varsa, Google/Yelp üzerinde değerlendirme yapmanız bizi çok mutlu eder."`
        },
        longDescription: {
            en: 'Consolidate reviews from Google and Yelp in one dashboard. Let AI generate professional, empathetic responses to both positive and negative reviews instantly.',
            tr: 'Google ve Yelp yorumlarını tek bir panelde toplayın. Yapay zekanın hem olumlu hem de olumsuz yorumlara anında profesyonel ve empatik yanıtlar üretmesine izin verin.'
        },
        features: [
            {
                title: { en: 'Unified Inbox', tr: 'Birleşik Gelen Kutusu' },
                description: { en: 'View all reviews from all platforms in one place.', tr: 'Tüm platformlardan gelen yorumları tek yerde görün.' },
                icon: 'Inbox'
            },
            {
                title: { en: 'AI Auto-Reply', tr: 'AI Otomatik Yanıt' },
                description: { en: 'Generate perfect responses in seconds.', tr: 'Saniyeler içinde mükemmel yanıtlar oluşturun.' },
                icon: 'MessageSquare'
            }
        ],
        benefits: [
            { en: 'Improve your online reputation score', tr: 'Çevrimiçi itibar puanınızı artırın' },
            { en: 'Respond to customers 10x faster', tr: 'Müşterilere 10 kat daha hızlı yanıt verin' }
        ]
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
        isPremium: true,
        price: 29,
        status: 'coming_soon',
        supportedSectors: ['restaurant', 'service'],
        defaultEnabledBySector: [],
        legacyFirestoreField: 'enableLoyaltyProgram',
        longDescription: {
            en: 'Replace paper punch cards with a digital loyalty system. Customers earn stamps or points for each visit, encouraging repeat business and building long-term value.',
            tr: 'Kağıt kartları dijital bir sadakat sistemiyle değiştirin. Müşteriler her ziyarette damga veya puan kazanır, bu da tekrar eden işleri teşvik eder ve uzun vadeli değer yaratır.'
        },
        features: [
            {
                title: { en: 'Digital Stamps', tr: 'Dijital Damgalar' },
                description: { en: 'Simple QR code scanning to give stamps.', tr: 'Damga vermek için basit QR kod tarama.' },
                icon: 'QrCode'
            },
            {
                title: { en: 'Custom Rewards', tr: 'Özel Ödüller' },
                description: { en: 'Define your own rewards (e.g., Free Coffee).', tr: 'Kendi ödüllerinizi tanımlayın (örn. Ücretsiz Kahve).' },
                icon: 'Gift'
            }
        ],
        benefits: [
            { en: 'Increase customer retention by 40%', tr: 'Müşteri sadakatini %40 artırın' },
            { en: 'Eliminate fraud associated with paper cards', tr: 'Kağıt kartlarla ilgili sahtekarlığı ortadan kaldırın' }
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
        isPremium: true,
        price: 29,
        status: 'coming_soon',
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
            en: 'Digital Waiter',
            tr: 'Dijital Garson'
        },
        description: {
            en: 'Active QR menu assistant that takes orders',
            tr: 'Sipariş alan aktif QR menü asistanı'
        },
        icon: 'Utensils',
        isCore: false,
        isPremium: true,
        price: 29,
        status: 'beta',
        supportedSectors: ['restaurant'],
        defaultEnabledBySector: ['restaurant'],
        legacyFirestoreField: 'enableDigitalWaiter',
        longDescription: {
            en: 'More than a menu. A digital waiter that greets your guests, recommends specialties, answers questions about allergens, and takes orders instantly via QR code.',
            tr: 'Bir menüden fazlası. Misafirlerinizi karşılayan, spesiyalleri öneren, alerjen sorularını yanıtlayan ve QR kod üzerinden sipariş alan dijital garson.'
        },
        aiSystemInstruction: {
            en: `DIGITAL WAITER MODE ACTIVE. You are the digital waiter of this restaurant.
            1. Greet guests warmly and present the menu.
            2. Suggest specials and drink pairings.
            3. Answer questions about ingredients/allergens accurately.
            4. Take orders precisely and confirm them.
            5. Ask if they need anything else (water, napkins, etc.).`,
            tr: `DİJİTAL GARSON MODU AKTİF. Bu restoranın dijital garsonusun.
            1. Misafirleri sıcak bir şekilde karşıla ve menüyü sun.
            2. Günün spesiyallerini ve içecek eşleşmelerini öner.
            3. İçerik ve alerjen sorularını doğru şekilde yanıtla.
            4. Siparişleri eksiksiz al ve onayla.
            5. Başka bir istekleri olup olmadığını sor (su, peçete vb.).`
        },
        features: [
            {
                title: { en: 'Smart Recommendations', tr: 'Akıllı Öneriler' },
                description: { en: 'Suggests high-margin items.', tr: 'Yüksek kârlı ürünleri önerir.' },
                icon: 'Star'
            },
            {
                title: { en: 'Order Taking', tr: 'Sipariş Alma' },
                description: { en: 'Takes complete orders and sends to kitchen.', tr: 'Siparişi eksiksiz alır ve mutfağa iletir.' },
                icon: 'CheckCircle'
            }
        ],
        benefits: [
            { en: 'Increase table turnover by 20%', tr: 'Masa devir hızını %20 artırın' },
            { en: 'Boost average ticket size', tr: 'Ortalama sepet tutarını yükseltin' }
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
        status: 'beta',
        supportedSectors: [], // All sectors
        defaultEnabledBySector: [],
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
    MODULES_REGISTRY.voiceAssistant,    // Voice

    // --- 2. BETA MODULES ---
    MODULES_REGISTRY.salesOptimization, // Beta
    MODULES_REGISTRY.proactiveMessaging, // Beta
    MODULES_REGISTRY.digitalWaiter,     // Beta - Functional
    MODULES_REGISTRY.appointments,      // Beta
    MODULES_REGISTRY.emailMarketing,    // Beta
    MODULES_REGISTRY.reviewManagement,  // Beta
    MODULES_REGISTRY.loyaltyProgram,    // Beta
    MODULES_REGISTRY.campaignManager,   // Beta
    MODULES_REGISTRY.autoTranslate,     // Beta
    MODULES_REGISTRY.gamification,      // Beta
    MODULES_REGISTRY.visualDiagnosis,   // Beta
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
