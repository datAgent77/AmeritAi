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
    | 'guided'


    | 'salesOptimization'


    | 'campaignManager'

    | 'gamification'
    | 'smartShopper'
    | 'visualDiagnosis'
    | 'digitalWaiter'
    | 'proactiveMessaging'
    | 'dynamicContext'
    | 'kvkkConsent'
    | 'humanHandoff';

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

    kvkkConsent: {
        id: 'kvkkConsent',
        name: {
            en: 'Data Privacy & KVKK',
            tr: 'KVKK ve Veri Gizliliği'
        },
        description: {
            en: 'Require data privacy consent before starting a chat',
            tr: 'Sohbet başlamadan önce KVKK ve veri gizliliği onayı isteyin'
        },
        icon: 'ShieldCheck',
        isCore: false,
        isPremium: false,
        price: 0,
        status: 'ready',
        supportedSectors: [],
        defaultEnabledBySector: [
            'ecommerce', 'booking', 'real_estate', 'saas', 'service',
            'healthcare', 'education', 'academic', 'finance', 'restaurant', 'maritime', 'other'
        ],
        legacyFirestoreField: 'enableKvkkConsent',
        longDescription: {
            en: 'Ensure your chat widget complies with data protection regulations. The KVKK module prompts users to review and accept your privacy policy before they can send their first message. You can customize the consent text or use the global default.',
            tr: 'Sohbet widget\'ınızın veri koruma düzenlemelerine uygun olduğundan emin olun. KVKK modülü, kullanıcıların ilk mesajlarını göndermeden önce gizlilik politikanızı incelemesini ve kabul etmesini sağlar. Onay metnini özelleştirebilir veya global varsayılanı kullanabilirsiniz.'
        },
        features: [
            {
                title: { en: 'Customizable Text', tr: 'Özelleştirilebilir Metin' },
                description: { en: 'Write your own privacy policy or use our default template.', tr: 'Kendi gizlilik politikanızı yazın veya varsayılan şablonumuzu kullanın.' },
                icon: 'Edit3'
            },
            {
                title: { en: 'Pre-Chat Consent', tr: 'Sohbet Öncesi Onay' },
                description: { en: 'Blocks interaction until the user explicitly accepts.', tr: 'Kullanıcı açıkça kabul edene kadar etkileşimi engeller.' },
                icon: 'Lock'
            }
        ],
        benefits: [
            { en: 'Stay legally compliant with GDPR/KVKK', tr: 'Tüm veri koruma yasalarına tam uyumlu kalın' },
            { en: 'Build trust with your customers', tr: 'Müşterilerinizle daha ilk adımda güven inşa edin' }
        ]
    },

    humanHandoff: {
        id: 'humanHandoff',
        name: {
            en: 'Human Handoff',
            tr: 'Musteri Temsilcisine Aktarma'
        },
        description: {
            en: 'Escalate conversations to your team with callback and notifications',
            tr: 'Sohbetleri callback ve bildirimlerle ekibinize aktarın'
        },
        icon: 'Users',
        isCore: false,
        isPremium: false,
        price: 0,
        status: 'ready',
        supportedSectors: [],
        defaultEnabledBySector: [],
        showOnLandingPage: false,
        legacyFirestoreField: 'enableHumanHandoff',
        longDescription: {
            en: 'Turn human escalation into a configurable tenant module. When enabled, explicit visitor requests or assistant-led escalation can open a callback record and notify your team by email or in-app notification.',
            tr: 'Insana aktarmayi tenant bazinda yonetilebilir bir modul haline getirin. Modul aktifken ziyaretcinin acik temsilci talebi veya assistant tarafli escalation akisi callback kaydi acabilir ve ekibinize e-posta ya da uygulama ici bildirim gonderebilir.'
        },
        features: [
            {
                title: { en: 'Configurable Trigger Rules', tr: 'Yonetilebilir Tetik Kurallari' },
                description: { en: 'Decide whether user requests, assistant escalation, or both should create a handoff.', tr: 'Kullanici talebi, assistant escalation veya her ikisinin de handoff uretip uretmeyecegini belirleyin.' },
                icon: 'Settings'
            },
            {
                title: { en: 'Callback Queue Integration', tr: 'Callback Kuyrugu Entegrasyonu' },
                description: { en: 'Every escalation opens or updates a callback record tied to the active session.', tr: 'Her escalation aktif oturuma bagli bir callback kaydi acar veya gunceller.' },
                icon: 'PhoneCall'
            },
            {
                title: { en: 'Team Notifications', tr: 'Ekip Bildirimleri' },
                description: { en: 'Notify operators via email and in-app alerts without leaving the tenant workflow.', tr: 'Tenant akisindan cikmadan operatorleri e-posta ve uygulama ici bildirimlerle haberdar edin.' },
                icon: 'Bell'
            }
        ],
        benefits: [
            { en: 'Keep complex requests from getting lost in chat', tr: 'Karmasik taleplerin sohbet icinde kaybolmasini engelleyin' },
            { en: 'Give each tenant control over when human escalation is available', tr: 'Her tenantin insana aktarimi ne zaman acacagini kontrol etmesini saglayin' }
        ],
        aiSystemInstruction: {
            en: `HUMAN HANDOFF MODULE ACTIVE.
RULES:
1. If the user explicitly asks for a human representative, live agent, support agent, or callback from the team:
   - This also includes customer service requests like "müşteri hizmetleri", "canlı destek", or "canlı desteğe bağlan".
   - Do not use the lead form for support handoff requests.
   - Respond with a short acknowledgement that the request is being routed to a live representative.
   - Do not ask for contact details or emit a handoff form marker.
2. If the user is asking for general contact capture or lead follow-up, let the lead collection module handle it.
3. Keep the handoff acknowledgement concise and human-oriented.`,
            tr: `INSAN TEMSILCISI AKTARIM MODULU AKTIF.
KURALLAR:
1. Kullanici acikca bir temsilci, canli destek, destek ekibi veya callback isterse:
   - Bu, "müşteri hizmetleri" ve "canlı desteğe bağlan" taleplerini de kapsar.
   - Destek aktarimi taleplerinde lead formunu kullanma.
   - Talebin canlı temsilciye yönlendirildiğini kısa bir yanıtla belirt.
   - İletişim bilgisi isteme ve handoff etiketi üretme.
2. Kullanici genel iletişim bilgisi birakmak veya lead takip etmek istiyorsa, bunu lead toplama modulu yönetsin.
3. Handoff yanıtini kisa ve insan odakli tut.`
        }
    },

    guided: {
        id: 'guided',
        name: {
            en: 'Guided',
            tr: 'Guided'
        },
        description: {
            en: 'Button and card based guided flows for web and messaging channels',
            tr: 'Web ve mesajlaşma kanalları için buton ve kart tabanlı yönlendirmeli akışlar'
        },
        icon: 'Route',
        isCore: false,
        isPremium: false,
        price: 0,
        status: 'ready',
        supportedSectors: [],
        defaultEnabledBySector: [],
        showOnLandingPage: false,
        legacyFirestoreField: 'enableGuided',
        longDescription: {
            en: 'Build deterministic guided journeys with buttons, cards, and final actions. Guided helps you turn repetitive operational flows into structured self-service experiences across web, WhatsApp, and Instagram.',
            tr: 'Butonlar, kartlar ve final aksiyonlarla deterministik yönlendirmeli akışlar oluşturun. Guided, tekrar eden operasyonel süreçleri web, WhatsApp ve Instagram genelinde yapılandırılmış self-servis deneyimlere dönüştürür.'
        },
        features: [
            {
                title: { en: 'Step-by-Step Flows', tr: 'Adım Adım Akışlar' },
                description: { en: 'Guide users through structured choices with chips or cards.', tr: 'Kullanıcıları chip veya kart tabanlı yapılandırılmış seçimlerle yönlendirin.' },
                icon: 'Route'
            },
            {
                title: { en: 'Multi-Channel Runtime', tr: 'Çok Kanallı Çalışma' },
                description: { en: 'Render rich UI on web and numbered text menus on messaging channels.', tr: 'Webde zengin arayüz, mesajlaşma kanallarında numaralı metin menüleri sunar.' },
                icon: 'Share2'
            },
            {
                title: { en: 'Action Handoff', tr: 'Aksiyon Tetikleme' },
                description: { en: 'Complete flows with confirmation or existing omni actions.', tr: 'Akışları onay veya mevcut omni aksiyonlarıyla tamamlayın.' },
                icon: 'Zap'
            }
        ],
        benefits: [
            { en: 'Reduce friction in repetitive support and operations flows', tr: 'Tekrarlayan destek ve operasyon akışlarındaki sürtünmeyi azaltın' },
            { en: 'Keep user choices deterministic without relying on semantic LLM matching', tr: 'LLM tabanlı semantik eşleme olmadan seçimleri deterministik tutun' }
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
            en: `PRODUCT CATALOG & SHOPPER MODULE IS AVAILABLE.
CRITICAL: Only act as a Sales Assistant when the user's message is related to products, shopping, or purchasing.
1. When the user asks about products, recommendations, prices, or expresses a need → Recommend relevant products using the product context.
2. Use the product context to answer questions about features and price.
3. If the user is unsure about a product, ask clarifying questions (budget, preferences) to narrow down options.
4. For NON-SHOPPING queries (greetings, FAQs, support, general info), respond normally WITHOUT mentioning products.`,
            tr: `ÜRÜN KATALOĞU VE ALIŞVERİŞ MODÜLÜ KULLANILABILIR.
KRİTİK: Sadece kullanıcının mesajı ürünler, alışveriş veya satın alma ile ilgiliyse Satış Asistanı gibi davran.
1. Kullanıcı ürünler, öneriler, fiyatlar hakkında sorduğunda veya bir ihtiyaç ifade ettiğinde → Ürün bağlamını kullanarak ilgili ürünleri öner.
2. Özellikler ve fiyat hakkındaki soruları yanıtlamak için sağlanan ürün bağlamını kullan.
3. Kullanıcı bir ürün hakkında kararsızsa, seçenekleri daraltmak için netleştirici sorular sor.
4. ALIŞVERİŞ DIŞI sorgularda (selamlaşma, SSS, destek, genel bilgi) ürünlerden bahsetmeden normal yanıt ver.`
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
1. If the user wants to leave contact details for lead follow-up, register, request a quote, or you need to collect their details (Name, Email, Phone):
   - You MUST output specifically: \`[SHOW_LEAD_FORM]\`
   - Example response: "Sure, please fill out this form. [SHOW_LEAD_FORM]"
2. If the user explicitly asks for a human representative, live agent, support agent, or callback from the team, use the human handoff flow instead.
3. DO NOT ask for details one by one in the chat.
4. DO NOT ask user to type their phone/email. ALWAYS use the form.`,
            tr: `LEAD TOPLAMA MODÜLÜ AKTİF.
KURALLAR:
1. Kullanıcı lead takibi için iletişim bilgilerini bırakmak, kayıt olmak, teklif almak veya bilgilerini toplaman gerekirse (Ad, E-posta, Telefon):
   - MUTLAKA şu özel komutu kullan: \`[SHOW_LEAD_FORM]\`
   - Örnek Yanıt: "Tabii, lütfen iletişim formunu doldurun. [SHOW_LEAD_FORM]"
2. Kullanıcı açıkça temsilci, canlı destek veya callback isterse human handoff akışını kullan.
3. Sohbet içinde bilgileri tek tek sorma.
4. Kullanıcıdan numarasını yazmasını isteme. HER ZAMAN formu aç.`
        }
    },

    voiceAssistant: {
        id: 'voiceAssistant',
        name: {
            en: 'Widget Voice',
            tr: 'Widget Voice'
        },
        description: {
            en: 'Browser-based voice conversations inside the web widget',
            tr: 'Web widget icinde tarayici tabanli sesli gorusmeler'
        },
        icon: 'Mic',
        isCore: false,
        isPremium: true,
        price: 49,
        status: 'coming_soon', // TEMPORARILY DISABLED - re-enable when production-ready
        supportedSectors: [],
        defaultEnabledBySector: [], // Cleared - no sector gets this by default
        showOnLandingPage: false, // Hidden from landing page
        legacyFirestoreField: 'enableVoiceAssistant',
        aiSystemInstruction: {
            en: `WIDGET VOICE MODULE ACTIVE. You are speaking through the website widget, not a phone line.

CORE RULES:
1. Keep replies short, natural, and easy to listen to.
2. Never mention telephony, call routing, or voice numbers.
3. If the user asks for a complex action, collect only the minimum context and continue the flow in chat.
4. When you repeat important data such as names, dates, or numbers, say them clearly and one at a time.
5. If a visual element, form, or button is available in chat, prefer that instead of overloading the voice response.`,

            tr: `WIDGET VOICE MODULU AKTIF. Sesli deneyim web sitesindeki widget icinde calisir, telefon hatti degildir.

TEMEL KURALLAR:
1. Yanitlari kisa, dogal ve dinlemesi kolay tut.
2. Telefon hatti, cagri yonlendirme veya sesli numara gibi konulardan bahsetme.
3. Kullanici karmasik bir islem isterse sadece gerekli minimum bilgiyi topla ve akisi chat icinde devam ettir.
4. Isim, tarih veya sayi gibi kritik verileri tekrar ederken net ve tek tek soyle.
5. Chat icinde form, buton veya baska bir arayuz unsuru varsa uzun sesli aciklama yerine onu tercih et.`
        },
        longDescription: {
            en: 'Let visitors talk to your website widget directly from the browser. Widget Voice adds a voice-first interaction layer to the existing web assistant without turning it into a phone channel.',
            tr: 'Ziyaretcilerin web sitenizdeki widget ile tarayici icinden sesli olarak konusmasini saglayin. Widget Voice, mevcut web asistanina telefon kanalina donusturmeyen ses odakli bir katman ekler.'
        },
        features: [
            {
                title: { en: 'Browser Voice Layer', tr: 'Tarayici Ici Ses Katmani' },
                description: { en: 'Visitors can speak directly inside the web widget without leaving the page.', tr: 'Ziyaretciler sayfadan ayrilmadan web widget icinde dogrudan konusabilir.' },
                icon: 'Mic'
            },
            {
                title: { en: 'Shared Chat Context', tr: 'Paylasilan Chat Baglami' },
                description: { en: 'Voice turns reuse the same web widget context, prompts, and knowledge source.', tr: 'Sesli turlar ayni web widget baglamini, promptlarini ve bilgi kaynagini kullanir.' },
                icon: 'MessageSquare'
            }
        ],
        benefits: [
            { en: 'Increase engagement on pages where typing feels slow or unnatural', tr: 'Yazmanin yavas veya dogal olmadigi sayfalarda etkilesimi artirin' },
            { en: 'Keep web voice separate from the phone voice product line', tr: 'Web icindeki sesi telefon sesli asistan urununden net sekilde ayirin' }
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
        status: 'ready',
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
        ],
        aiSystemInstruction: {
            en: `APPOINTMENTS MODULE ACTIVE.
RULES:
1. If the user wants to book, schedule, or make an appointment (keywords: appointment, booking, schedule, reserve, randevu, rezervasyon):
   - You MUST output specifically: \`[SHOW_BOOKING_FORM]\`
   - Example response: "Of course! Please fill out the booking form below. [SHOW_BOOKING_FORM]"
   - NEVER use [SHOW_LEAD_FORM] for appointment requests — use [SHOW_BOOKING_FORM] instead.
2. Do NOT collect appointment details one by one in the chat.
3. PRIORITY: This rule overrides the base Lead Collection rule for any appointment or booking intent.`,
            tr: `RANDEVU MODÜLÜ AKTİF.
KURALLAR:
1. Kullanıcı randevu almak, rezervasyon yapmak veya takvim ayarlamak isterse (anahtar kelimeler: randevu, rezervasyon, takvim, booking, schedule):
   - MUTLAKA şu özel komutu kullan: \`[SHOW_BOOKING_FORM]\`
   - Örnek Yanıt: "Tabii ki! Lütfen aşağıdaki randevu formunu doldurun. [SHOW_BOOKING_FORM]"
   - Randevu talepleri için asla [SHOW_LEAD_FORM] kullanma — bunun yerine [SHOW_BOOKING_FORM] kullan.
2. Randevu detaylarını sohbet içinde tek tek sorma.
3. ÖNCELİK: Bu kural, randevu veya rezervasyon niyeti içeren tüm taleplerde Lead Toplama kuralının önüne geçer.`
        }
    },



    smartShopper: {
        id: 'smartShopper',
        name: {
            en: 'Smart Shopping Assistant',
            tr: 'Akıllı Alışveriş Asistanı'
        },
        description: {
            en: 'Wishlist, price/stock alerts, personalized recommendations based on visitor behavior',
            tr: 'İstek listesi, fiyat/stok bildirimleri, ziyaretçi davranışına göre kişiselleştirilmiş öneriler'
        },
        icon: 'Sparkles',
        isCore: false,
        isPremium: true,
        price: 39,
        status: 'ready',
        supportedSectors: ['ecommerce'],
        defaultEnabledBySector: [],
        showOnLandingPage: true,
        legacyFirestoreField: 'enableSmartShopper',
        aiSystemInstruction: {
            en: `SMART SHOPPING ASSISTANT ACTIVE.
1. Help users save products to their wishlist if they express interest without buying.
2. Offer price/stock alerts for out-of-stock or high-price products: "I can notify you when it's back in stock or when the price drops."
3. Use visitor history to personalize recommendations: refer to previously viewed products.
4. Keep suggestions conversational and non-intrusive.`,
            tr: `AKILLI ALIŞVERİŞ ASISTANI AKTİF.
1. Kullanıcı satın almadan ilgi gösterirse ürünü istek listesine eklemeyi teklif et.
2. Stok dışı veya pahalı ürünler için fiyat/stok bildirimi öner: "Stoka girdiğinde veya fiyatı düştüğünde sizi haberdar edebilirim."
3. Ziyaretçi geçmişini kullanarak önerileri kişiselleştir: önceki ürünlere atıfta bulun.
4. Önerileri doğal ve rahatsız edici olmayan bir dille sun.`
        },
        longDescription: {
            en: 'Transform casual browsers into loyal buyers. The AI remembers what visitors viewed, lets them save wishlists, and sends automatic notifications when prices drop or items come back in stock.',
            tr: 'Gezip giden ziyaretçileri sadık alıcılara dönüştürün. AI, görüntülenen ürünleri hatırlar, istek listesi kaydetmeyi sağlar ve fiyatlar düştüğünde ya da ürünler tekrar stoğa girdiğinde otomatik bildirim gönderir.'
        },
        features: [
            {
                title: { en: 'Wishlist', tr: 'İstek Listesi' },
                description: { en: 'Save products for later with one tap.', tr: 'Ürünleri sonra için tek tıkla kaydedin.' },
                icon: 'Heart'
            },
            {
                title: { en: 'Price & Stock Alerts', tr: 'Fiyat ve Stok Bildirimleri' },
                description: { en: 'Notified automatically when price drops or item restocks.', tr: 'Fiyat düştüğünde veya stok geldiğinde otomatik bildirim.' },
                icon: 'Bell'
            },
            {
                title: { en: 'Visitor Profiling', tr: 'Ziyaretçi Profili' },
                description: { en: 'Personalized recommendations based on browsing history.', tr: 'Gezinme geçmişine göre kişisel öneriler.' },
                icon: 'User'
            }
        ],
        benefits: [
            { en: 'Reduce cart abandonment with timely reminders', tr: 'Zamanında hatırlatmalarla sepet terkini azaltın' },
            { en: 'Increase return visits and repeat purchases', tr: 'Geri dönüş ziyaretleri ve tekrar satışları artırın' }
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
            en: `DYNAMIC DATA CONTEXT MODULE ACTIVE.
You have access to real-time user data injected from the application.
RULES:
1. When the user asks personal questions (e.g., "What is my balance?", "Where is my order?", "Cart details"), check the LIVE USER DATA section.
2. If the requested data is available, answer directly and accurately.
3. [LOGIN DEFENCE] If the user asks about personal/account information but the required dynamic data is NOT in context, assume they are NOT logged in or authorized. You MUST gently reply: "I cannot access this information right now. Please make sure you are logged in to your account, or check your dashboard directly."
4. Always be specific when using dynamic data (mention exact numbers, dates, or values).`,
            tr: `DİNAMİK VERİ BAĞLAMI MODÜLÜ AKTİF.
Uygulamadan aktarılan gerçek zamanlı kullanıcı verilerine erişiminiz var.
KURALLAR:
1. Kullanıcı kişisel sorular sorduğunda (örn. "Bakiyem ne?", "Siparişim nerede?", "Sepetim"), CANLI KULLANICI VERİLERİ (LIVE USER DATA) bölümünü kontrol et.
2. İstenen veri bağlamda mevcutsa, doğrudan ve doğru şekilde yanıtla.
3. [GİRİŞ SAVUNMASI] Kullanıcı kişisel/hesap bilgileri sorarsa ancak gerekli dinamik veri bağlamda YOKSA, giriş yapmamış veya yetkisiz olduğunu varsay. Şuna benzer nazik bir yanıt ver: "Şu anda bu bilgiye erişemiyorum. Lütfen hesabınıza giriş yaptığınızdan emin olun veya doğrudan kontrol panelindeki bilgileri inceleyin."
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
    MODULES_REGISTRY.kvkkConsent,       // KVKK Consent
    MODULES_REGISTRY.humanHandoff,      // Human handoff
    MODULES_REGISTRY.guided,            // Guided flows
    MODULES_REGISTRY.productCatalog,    // Personal Shopper
    MODULES_REGISTRY.leadCollection,    // Lead Collection
    MODULES_REGISTRY.visualDiagnosis,   // Visual Analysis (Ready)
    MODULES_REGISTRY.salesOptimization, // Sales Optimization (Ready)
    MODULES_REGISTRY.smartShopper,       // Smart Shopping Assistant (Ready)
    MODULES_REGISTRY.proactiveMessaging, // Proactive Engagement (Ready)
    MODULES_REGISTRY.digitalWaiter,     // Digital Waiter (Ready)
    MODULES_REGISTRY.dynamicContext,    // Dynamic Data Context (Ready)

    // --- 2. COMING SOON MODULES ---
    MODULES_REGISTRY.voiceAssistant,    // Voice & Appointments (Coming Soon - temporarily disabled)
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
