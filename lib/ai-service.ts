
import { OpenAI } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { Pinecone } from "@pinecone-database/pinecone";
import { getAdminDb } from "@/lib/firebase-admin";
import { upsertChatSessionRecord } from "@/lib/chat-sessions";
import type { ChatSessionMessageRecord } from "@/lib/chat-session-messages";
import { INDUSTRY_CONFIG } from "@/lib/industry-config";
import { getAllModules } from "@/lib/modules-registry";
import { resolveConversationLanguage } from "@/lib/conversation-language";
import { evaluateCampaigns, buildCampaignSystemPromptBlock, fetchWeatherByCity } from "@/lib/campaigns/campaign-engine";
import { buildTenantTrainingPromptFromDb } from "@/lib/assistant-training";
import { getGuidedOptionsSystemInstruction } from "@/lib/guided-ai";

const pineconeApiKey = process.env.PINECONE_API_KEY?.trim();
const pc = pineconeApiKey
    ? new Pinecone({ apiKey: pineconeApiKey })
    : null;

export interface AIMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

// Helper to normalize stream output
async function* streamOpenAI(stream: any) {
    for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) yield content;
    }
}

async function* streamGoogle(stream: any) {
    for await (const chunk of stream.stream) {
        const content = chunk.text();
        if (content) yield content;
    }
}

async function* streamAnthropic(stream: any) {
    for await (const event of stream) {
        if (event?.type === "content_block_delta" && event.delta?.type === "text_delta") {
            const content = event.delta.text;
            if (content) yield content;
        }
    }
}

// Wraps a promise with a timeout so a hung provider call can't stall the request.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
        ),
    ]);
}

const AI_REQUEST_TIMEOUT_MS = 30000;

function isRetryableAiError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const msg = error.message.toLowerCase();
    return (
        msg.includes("timeout") ||
        msg.includes("timed out") ||
        msg.includes("network") ||
        msg.includes("connection") ||
        msg.includes("econnreset") ||
        msg.includes("503") ||
        msg.includes("502")
    );
}

type SensitiveFactType =
    | "wifi_password"
    | "gate_code"
    | "phone"
    | "email"
    | "address"
    | "working_hours"
    | "price"
    | "stock";

function detectSensitiveFactType(question: string): SensitiveFactType | null {
    const q = question.toLowerCase();

    if (/(wifi|wi-fi|internet).{0,80}(password|sifre|şifre)|(password|sifre|şifre).{0,80}(wifi|wi-fi|internet)/.test(q)) {
        return "wifi_password";
    }
    if (/(gate|door|entry|entrance|kapi|kapı).{0,80}(code|kod|şifre|sifre)|(code|kod|şifre|sifre).{0,80}(gate|door|entry|entrance|kapi|kapı)/.test(q)) {
        return "gate_code";
    }
    if (/(telefon|phone|tel\b|whatsapp|gsm|numara|number)/.test(q)) {
        return "phone";
    }
    if (/(e-?mail|email|mail adres|posta)/.test(q)) {
        return "email";
    }
    if (/(adres|address|konum|location|nerede|where are you|how can i reach)/.test(q)) {
        return "address";
    }
    if (/(çalışma saati|mesai|açılış|kapanış|working hours?|business hours?|opening hours?|closing time|kaçta aç|kaçta kap)/.test(q)) {
        return "working_hours";
    }
    if (/(fiyat|price|ücret|cost|how much|kaç para|ne kadar|pricing)/.test(q)) {
        return "price";
    }
    if (/(stok|stock|availability|in stock|out of stock|kaldı mı|tükendi)/.test(q)) {
        return "stock";
    }

    return null;
}

function hasEvidenceForSensitiveFact(context: string, factType: SensitiveFactType): boolean {
    const c = context.toLowerCase();
    const hasTime = /(?:[01]?\d|2[0-3])[:.][0-5]\d|\b\d{1,2}\s?(?:am|pm)\b/i.test(context);
    const hasCurrencyValue = /(?:[$€£₺]\s?\d+(?:[.,]\d{1,2})?)|(?:\d+(?:[.,]\d{1,2})?\s?(?:[$€£₺]|usd|eur|try|tl|dolar|euro))|\bfree\b|ücretsiz/i.test(context);
    const hasPhoneNumber = /\+?\d[\d\s().-]{6,}\d/.test(context);
    const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(context);

    switch (factType) {
        case "wifi_password": {
            const hasWifiKeywords = /(wifi|wi-fi|internet)/.test(c) && /(password|şifre|sifre)/.test(c);
            const hasPasswordValue = /(?:password|şifre|sifre)\s*(?:is|:|=)\s*[^\s]{4,}/i.test(context);
            return hasWifiKeywords && hasPasswordValue;
        }
        case "gate_code": {
            const hasGateKeywords = /(gate|door|entry|entrance|kapi|kapı)/.test(c) && /(code|kod|şifre|sifre)/.test(c);
            const hasCodeValue = /(?:code|kod|şifre|sifre)\s*(?:is|:|=)\s*[a-z0-9-]{3,}/i.test(context);
            return hasGateKeywords && hasCodeValue;
        }
        case "phone":
            return hasPhoneNumber && /(phone|telefon|tel|whatsapp|gsm|numara|call)/.test(c);
        case "email":
            return hasEmail;
        case "address": {
            const hasAddressLabel = /(address|adres|location|konum)\s*(?:is|:|=)\s*[^\n]{8,}/i.test(context);
            const hasStreetSignals = /(street|st\.|road|rd\.|avenue|ave\.|boulevard|blvd|cadde|sokak|mah|no\.?|posta kodu|zip)/.test(c);
            return hasAddressLabel || hasStreetSignals;
        }
        case "working_hours": {
            const hasHoursKeyword = /(working hours|business hours|opening|closing|open|close|çalışma saati|mesai|açılış|kapanış)/.test(c);
            return hasHoursKeyword && hasTime;
        }
        case "price":
            return /(price|fiyat|ücret|cost|pricing)/.test(c) && hasCurrencyValue;
        case "stock": {
            const hasStockKeyword = /(stock|stok|in stock|out of stock|available|availability|kaldı|tükendi)/.test(c);
            const hasQty = /\b\d+\s*(adet|pcs?|units?)\b/i.test(context);
            return hasStockKeyword && (hasQty || /in stock|out of stock|available|tükendi|stokta/i.test(context));
        }
        default:
            return false;
    }
}

function getUnknownResponse(language?: string, question?: string): string {
    const q = (question || "").toLowerCase();
    const resolvedLanguage = resolveConversationLanguage({
        explicitLanguage: language,
        userText: question,
    });

    const unknownResponses: Record<string, string> = {
        en: "I don't have verified information for that detail right now, and I don't want to guess.",
        tr: "Bu konuda doğrulanmış bir bilgiye sahip değilim. Emin olmadığım bir detayı uydurmak istemem.",
        de: "Dazu habe ich aktuell keine verifizierte Information, deshalb mochte ich nichts erfinden.",
        fr: "Je n'ai pas d'information verifiee sur ce point pour le moment, donc je prefere ne pas deviner.",
        es: "No tengo informacion verificada sobre ese detalle en este momento, asi que prefiero no adivinar.",
        ar: "لا أملك معلومة موثقة عن هذه النقطة الآن، ولا أريد التخمين.",
        ru: "У меня сейчас нет подтвержденной информации по этой детали, и я не хочу гадать.",
        it: "Non ho informazioni verificate su questo dettaglio in questo momento, quindi preferisco non indovinare.",
        pt: "Nao tenho informacao verificada sobre esse detalhe neste momento, entao prefiro nao adivinhar.",
        nl: "Ik heb daar op dit moment geen geverifieerde informatie over, dus ik wil niet gokken.",
        pl: "Nie mam teraz potwierdzonej informacji na ten temat, wiec wole nie zgadywac.",
        uk: "Зараз у мене немає підтвердженої інформації щодо цієї деталі, тому я не хочу вгадувати.",
        hi: "Mere paas is vishay par is samay satyapit jankari nahi hai, isliye main andaza nahi lagana chahta.",
        fa: "در حال حاضر اطلاعات تاییدشده‌ای درباره این مورد ندارم و نمی‌خواهم حدس بزنم.",
        he: "אין לי כרגע מידע מאומת לגבי הפרט הזה, ולכן אני מעדיף לא לנחש.",
        el: "Δεν εχω επιβεβαιωμενη πληροφορια για αυτη τη λεπτομερεια αυτη τη στιγμη, οποτε προτιμω να μην μαντεψω.",
        th: "ตอนนี้ฉันยังไม่มีข้อมูลที่ยืนยันได้เกี่ยวกับรายละเอียดนี้ จึงไม่อยากเดา",
        ja: "その点について現時点で確認済みの情報がないため、推測は避けます。",
        ko: "지금은 그 세부 사항에 대한 확인된 정보가 없어서 추측하고 싶지 않습니다.",
        zh: "我目前没有这项细节的已验证信息，所以不想猜测。",
    };

    if (resolvedLanguage === "tr" || /[çğıöşü]/.test(q) || /\b(nedir|nasıl|kaç|ne kadar|adres|şifre|telefon)\b/.test(q)) {
        return unknownResponses.tr;
    }

    return unknownResponses[resolvedLanguage] || unknownResponses.en;
}

type EnterprisePrivateQueryType =
    | "assignments"
    | "tasks"
    | "approvals"
    | "expenses"
    | "leave"
    | "projects"
    | "profile";

function detectEnterprisePrivateQuery(question: string): EnterprisePrivateQueryType | null {
    const q = (question || "").toLowerCase();

    if (/(zimmet|demirbaş|demirbas|asset|assets|equipment|device|devices|inventory|envanter|laptop|badge|kartım|kartim)/.test(q)) {
        return "assignments";
    }
    if (/(görev|gorev|task|tasks|to do|todo|işlerim|islerim|work item|work items)/.test(q)) {
        return "tasks";
    }
    if (/(onay|approval|approvals|bekleyen onay|approval queue)/.test(q)) {
        return "approvals";
    }
    if (/(masraf|expense|expenses|harcama|claim|beyan)/.test(q)) {
        return "expenses";
    }
    if (/(izin|leave|vacation|holiday|annual leave|yıllık izin|yillik izin)/.test(q)) {
        return "leave";
    }
    if (/(proje|project|projects|milestone|teslim|deadline)/.test(q)) {
        return "projects";
    }
    if (/(sicil|ünvan|unvan|departman|department|manager|yönetici|yonetici|profil|profile|employee|çalışan|calisan)/.test(q)) {
        return "profile";
    }

    return null;
}

function hasMatchingSummaryKeys(value: unknown, patterns: RegExp[], depth = 0): boolean {
    if (!value || typeof value !== "object" || depth > 4) return false;
    if (Array.isArray(value)) {
        return value.some((item) => hasMatchingSummaryKeys(item, patterns, depth + 1));
    }
    return Object.entries(value as Record<string, unknown>).some(([key, child]) => {
        if (patterns.some((pattern) => pattern.test(key))) return true;
        return hasMatchingSummaryKeys(child, patterns, depth + 1);
    });
}

function hasEnterpriseSummaryForQuery(summary: Record<string, unknown> | undefined, queryType: EnterprisePrivateQueryType): boolean {
    if (!summary) return false;

    const patternsByType: Record<EnterprisePrivateQueryType, RegExp[]> = {
        assignments: [/assign/i, /asset/i, /equip/i, /device/i, /inventory/i, /zimmet/i, /demir/i],
        tasks: [/task/i, /todo/i, /workitem/i, /gorev/i],
        approvals: [/approval/i, /onay/i, /queue/i],
        expenses: [/expense/i, /masraf/i, /claim/i, /harcama/i, /beyan/i],
        leave: [/leave/i, /izin/i, /vacation/i, /holiday/i],
        projects: [/project/i, /proje/i, /milestone/i, /deadline/i],
        profile: [/employee/i, /profile/i, /person/i, /department/i, /manager/i, /title/i, /unvan/i, /departman/i, /yonetici/i, /sicil/i],
    };

    return hasMatchingSummaryKeys(summary, patternsByType[queryType]);
}

function getEnterpriseContextFallback(language: string | undefined, queryType: EnterprisePrivateQueryType): string {
    const resolvedLanguage = resolveConversationLanguage({
        explicitLanguage: language,
        userText: "",
    });

    const tr: Record<EnterprisePrivateQueryType, string> = {
        assignments: "Su anda canli zimmet bilginize erisemiyorum. Bu oturumda zimmet ozeti geldiginde uzerinizdeki kayitlari burada dogrudan listeleyebilirim.",
        tasks: "Su anda canli gorev bilginize erisemiyorum. Bu oturumda gorev ozeti geldiginde acik ve geciken gorevlerinizi burada dogrudan soyleyebilirim.",
        approvals: "Su anda canli onay bilginize erisemiyorum. Bu oturumda onay ozeti geldiginde bekleyen onaylarinizi burada dogrudan listeleyebilirim.",
        expenses: "Su anda canli masraf bilginize erisemiyorum. Bu oturumda masraf ozeti geldiginde durumlari burada dogrudan paylasabilirim.",
        leave: "Su anda canli izin bilginize erisemiyorum. Bu oturumda izin ozeti geldiginde kalan izin ve bekleyen talepleri burada dogrudan soyleyebilirim.",
        projects: "Su anda canli proje bilginize erisemiyorum. Bu oturumda proje ozeti geldiginde aktif ve geciken projelerinizi burada dogrudan paylasabilirim.",
        profile: "Su anda canli profil bilginize erisemiyorum. Bu oturumda personel ozeti geldiginde unvan, yonetici ve organizasyon bilgilerinizi burada dogrudan aktarabilirim.",
    };

    const en: Record<EnterprisePrivateQueryType, string> = {
        assignments: "I can't access your live assignment data right now. Once this session receives an assignment summary, I can list your assigned assets directly here.",
        tasks: "I can't access your live task data right now. Once this session receives a task summary, I can tell you your open and overdue tasks directly here.",
        approvals: "I can't access your live approval data right now. Once this session receives an approval summary, I can list your pending approvals directly here.",
        expenses: "I can't access your live expense data right now. Once this session receives an expense summary, I can share your current expense statuses directly here.",
        leave: "I can't access your live leave data right now. Once this session receives a leave summary, I can tell you your remaining leave and pending requests directly here.",
        projects: "I can't access your live project data right now. Once this session receives a project summary, I can share your active and delayed projects directly here.",
        profile: "I can't access your live profile data right now. Once this session receives a profile summary, I can share your title, manager, and organization details directly here.",
    };

    return resolvedLanguage === "tr" ? tr[queryType] : en[queryType];
}

function stripVoiceUiArtifacts(input: string): string {
    return input
        .replace(/\[SHOW_[A-Z_]+\]/g, " ")
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/[`*_#>-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function buildVoiceCollectionFallback(params: {
    language?: string;
    userText?: string;
    rawContent?: string;
}): string {
    const resolvedLanguage = resolveConversationLanguage({
        explicitLanguage: params.language,
        userText: params.userText || params.rawContent,
    });
    const corpus = `${params.userText || ""} ${params.rawContent || ""}`.toLowerCase();
    const isAppointment = /(appointment|book|booking|schedule|reserve|randevu|rezervasyon)/i.test(corpus);
    const isContact = /(call me|callback|contact me|reach me|beni ar|geri don|geri dön|iletisim|iletişim|telefon)/i.test(corpus);

    if (resolvedLanguage === "tr") {
        if (isAppointment) {
            return "Elbette, randevunuzu birlikte oluşturalım. Önce size uygun gün ve saati söyler misiniz?";
        }
        if (isContact) {
            return "Tabii, bunu birlikte ayarlayabiliriz. Önce adınızı ve telefon numaranızı söyler misiniz?";
        }
        return "Tabii, bunu birlikte ilerletebiliriz. İlk gerekli bilgiyi bana kısaca söyler misiniz?";
    }

    if (isAppointment) {
        return "Of course, let's set up your appointment together. First, what day and time work best for you?";
    }
    if (isContact) {
        return "Sure, we can handle that together. First, may I have your name and phone number?";
    }
    return "Sure, we can continue this together. Please tell me the first detail you want me to note.";
}

function sanitizeVoiceAssistantContent(params: {
    content: string;
    language?: string;
    userText?: string;
}): string {
    const raw = params.content || "";
    if (!raw.trim()) return raw;

    let sanitized = stripVoiceUiArtifacts(raw)
        .replace(/\b(lütfen|lutfen)\s+(aşağıdaki|asagidaki)\s+formu\s+doldur(?:un)?\.?/gi, " ")
        .replace(/\b(tabii|tabi|elbette|sure),?\s*(lütfen|lutfen)\s*(iletişim|iletisim)?\s*formunu\s*doldur(?:un)?\.?/gi, " ")
        .replace(/\b(please|kindly)\s+fill\s+out\s+(the\s+)?(contact\s+)?form(\s+below|\s+on\s+the\s+screen)?\.?/gi, " ")
        .replace(/\b(form|button|screen|chat)\b/gi, (match) => {
            const lower = match.toLowerCase();
            if (lower === "form" || lower === "button" || lower === "screen") return "";
            return match;
        })
        .replace(/\b(aşağıda|asagida|below|yukarida|above|ekranda|on the screen)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

    const hadUiMarker = /\[SHOW_[A-Z_]+\]/.test(raw)
        || /(formu doldur|formunu doldur|fill out .*form|contact form|aşağıdaki form|asagidaki form)/i.test(raw);

    if (hadUiMarker) {
        return buildVoiceCollectionFallback({
            language: params.language,
            userText: params.userText,
            rawContent: raw,
        });
    }

    return sanitized;
}

async function getSystemConfig(adminDb: any) {
    try {
        const doc = await adminDb.collection("system_settings").doc("ai_config").get();
        if (doc.exists) {
            return doc.data();
        }
    } catch (e) {
        console.error("Failed to fetch AI config", e);
    }
    // Default
    return { provider: "openai", model: "gpt-4o-mini" };
}

function normalizeIndustry(input: string | undefined): keyof typeof INDUSTRY_CONFIG {
    if (!input) return 'ecommerce';
    const lower = input.toLowerCase().trim();

    // Direct match check first (e.g., 'ecommerce', 'maritime')
    if (INDUSTRY_CONFIG[lower as keyof typeof INDUSTRY_CONFIG]) {
        return lower as keyof typeof INDUSTRY_CONFIG;
    }

    // Map known variations - ORDER MATTERS (more specific first)

    // Maritime / Denizcilik (CHECK BEFORE others to avoid false matches)
    if (lower.includes('maritime') || lower.includes('marine') || lower.includes('denizcilik') || lower.includes('naval') || lower.includes('shipping')) {
        return 'maritime';
    }

    // Automotive / Otomotiv
    if (lower.includes('automotive') || lower.includes('auto') || lower.includes('otomotiv') || lower.includes('car') || lower.includes('vehicle')) {
        return 'automotive';
    }

    // Insurance / Sigorta
    if (lower.includes('insurance') || lower.includes('sigorta')) {
        return 'insurance';
    }

    // Logistics / Lojistik
    if (lower.includes('logistics') || lower.includes('lojistik') || lower.includes('cargo') || lower.includes('freight')) {
        return 'logistics';
    }

    // Beauty & Wellness / Güzellik
    if (lower.includes('beauty') || lower.includes('wellness') || lower.includes('spa') || lower.includes('salon') || lower.includes('guzellik')) {
        return 'beauty';
    }

    // Legal / Hukuk
    if (lower.includes('legal') || lower.includes('law') || lower.includes('hukuk') || lower.includes('attorney') || lower.includes('lawyer')) {
        return 'legal';
    }

    // Fitness / Spor
    if (lower.includes('fitness') || lower.includes('gym') || lower.includes('sport') || lower.includes('spor')) {
        return 'fitness';
    }

    // SaaS / Software
    if (lower.includes('saas') || lower.includes('software') || lower.includes('tech')) {
        return 'saas';
    }

    // Travel / Booking (AFTER maritime and logistics to avoid conflicts)
    if (lower.includes('travel') || lower.includes('booking') || lower.includes('hotel') || lower.includes('flight')) {
        return 'booking';
    }

    // Real Estate / Emlak
    if (lower.includes('estate') || lower.includes('property') || lower.includes('emlak')) {
        return 'real_estate';
    }

    // Education / Academic
    if (lower.includes('education') || lower.includes('school') || lower.includes('university') || lower.includes('academic')) {
        if (lower.includes('university') || lower.includes('academic')) return 'academic';
        return 'education';
    }

    // Finance / Banking
    if (lower.includes('finance') || lower.includes('bank') || lower.includes('fintech')) {
        return 'finance';
    }

    // Healthcare / Sağlık
    if (lower.includes('health') || lower.includes('doctor') || lower.includes('medical') || lower.includes('saglik')) {
        return 'healthcare';
    }

    // Service / Agency
    if (lower.includes('service') || lower.includes('agency') || lower.includes('hizmet')) {
        return 'service';
    }

    // Restaurant / Cafe
    if (lower.includes('restaurant') || lower.includes('cafe') || lower.includes('food') || lower.includes('restoran')) {
        return 'restaurant';
    }

    // Agriculture / Tarım
    if (lower.includes('agriculture') || lower.includes('farm') || lower.includes('tarim')) {
        return 'agriculture';
    }

    // Manufacturing / Üretim
    if (lower.includes('manufacturing') || lower.includes('production') || lower.includes('factory') || lower.includes('uretim') || lower.includes('fabrika') || lower.includes('sanayi')) {
        return 'manufacturing';
    }

    // E-commerce (check last as fallback for many terms)
    if (lower.includes('ecommerce') || lower.includes('commerce') || lower.includes('shop') || lower.includes('store')) {
        return 'ecommerce';
    }

    // Ultimate fallback
    return 'other';
}

export async function generateAIResponse(
    chatbotId: string,
    messages: AIMessage[],
    sessionId?: string,
    streamResponse: boolean = true,
    userContext?: {
        url: string,
        title: string,
        desc: string,
        pageText?: string,
        dynamicData?: Record<string, any>,
        publicContext?: Record<string, unknown>,
        privateContextSummary?: Record<string, unknown>,
        assistantContextSource?: string,
        siteSessionContext?: Record<string, any>,
        crawlStatus?: Record<string, any>
    },
    isVoice?: boolean,
    language?: string,
    visualAnalysisContext?: string,
    forcedIndustry?: string,
    guidedOptionsEnabled: boolean = false
) {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) throw new Error("Firebase Admin not initialized");

        // 1. Fetch Global AI Configuration
        const globalAiConfig = await getSystemConfig(adminDb);

        // 2. Get Chatbot Config & Context
        console.log(`AI Service: Fetching chatbot config`, { chatbotId });
        const lastMessage = messages[messages.length - 1];
        const latestUserMessage = [...messages]
            .reverse()
            .find((message) => message.role === "user" && typeof message.content === "string" && message.content.trim());
        const resolvedLanguage = resolveConversationLanguage({
            explicitLanguage: language,
            userText: latestUserMessage?.content || lastMessage?.content,
        });

        const chatbotSnap = await adminDb.collection("chatbots").doc(chatbotId).get();
        const chatbotData = chatbotSnap.exists ? chatbotSnap.data() : null;
        const shopperConfig = chatbotData?.shopperConfig;
        const isShopperEnabled = chatbotData?.enablePersonalShopper === true;
        const assistantContextSource = typeof userContext?.assistantContextSource === "string"
            ? userContext.assistantContextSource
            : "";
        const isEnterpriseBridgeContext = assistantContextSource === "enterprise_bridge" || assistantContextSource === "host_app";
        const enterprisePrivateQuery = detectEnterprisePrivateQuery(lastMessage.content || "");
        const hasRelevantEnterpriseSummary = enterprisePrivateQuery
            ? hasEnterpriseSummaryForQuery(userContext?.privateContextSummary, enterprisePrivateQuery)
            : false;

        if (isEnterpriseBridgeContext && enterprisePrivateQuery && !hasRelevantEnterpriseSummary) {
            return {
                content: getEnterpriseContextFallback(resolvedLanguage, enterprisePrivateQuery),
                isStream: false,
                context: "",
                modelUsed: "enterprise-context-fallback",
            };
        }

        // 3. Determine AI Config: Tenant-specific or Global
        let provider: string;
        let model: string;
        let apiKey: string | undefined;

        const tenantAiConfig = chatbotData?.aiConfig;
        if (tenantAiConfig && tenantAiConfig.useGlobalDefaults === false) {
            // Use tenant-specific configuration
            provider = tenantAiConfig.provider || globalAiConfig.provider || "openai";
            model = tenantAiConfig.model || globalAiConfig.model || "gpt-4o-mini";
            apiKey = tenantAiConfig.apiKey || globalAiConfig.apiKey;
            console.log(`AI Service: Using TENANT config for ${chatbotId}: ${provider}/${model}`);
        } else {
            // Use global configuration
            provider = globalAiConfig.provider || "openai";
            model = globalAiConfig.model || "gpt-4o-mini";
            apiKey = globalAiConfig.apiKey;
            console.log(`AI Service: Using GLOBAL config: ${provider}/${model}`);
        }

        // Industry Config
        // Industry Config
        // Industry Config
        const rawSectorId = chatbotData?.sectorId;
        const rawIndustry = chatbotData?.industry;
        const rawSector = chatbotData?.sector;
        // Prioritize 'sector' (Admin Panel) over 'sectorId' (Legacy)
        const sectorId = forcedIndustry || rawSector || rawSectorId || rawIndustry;
        console.log(`AI Service [SECTOR DEBUG]: chatbotId=${chatbotId}, forcedIndustry=${forcedIndustry}, rawSectorId=${rawSectorId}, rawIndustry=${rawIndustry}, rawSector=${rawSector}, using=${sectorId}`);
        const industry = normalizeIndustry(sectorId);
        console.log(`AI Service [SECTOR DEBUG]: Normalized to: ${industry}`);
        const industryConfig = INDUSTRY_CONFIG[industry as keyof typeof INDUSTRY_CONFIG];

        // RAG Setup
        let context = "";
        const isKnowledgeBaseEnabled = chatbotData?.enableKnowledgeBase !== false;

        if (isKnowledgeBaseEnabled && pc) {
            const embeddingApiKey = process.env.OPENAI_API_KEY?.trim();
            if (!embeddingApiKey) {
                console.warn("AI Service [KNOWLEDGE DEBUG]: OPENAI_API_KEY missing, skipping RAG retrieval.");
            } else {
                try {
                    const index = pc.index("chatbot-knowledge");
                    const embeddingClient = new OpenAI({ apiKey: embeddingApiKey });
                    const embeddingResponse = await embeddingClient.embeddings.create({
                        model: "text-embedding-3-small",
                        input: lastMessage.content,
                    });
                    const embedding = embeddingResponse.data[0].embedding;
                    const queryResponse = await index.query({
                        vector: embedding,
                        topK: 8, // Reduced from 20 to save tokens
                        includeMetadata: true,
                        filter: { chatbotId: chatbotId }
                    });

                    console.log(`AI Service [KNOWLEDGE DEBUG]: Query for chatbotId=${chatbotId}, matches found: ${queryResponse.matches.length}`);
                    if (queryResponse.matches.length > 0) {
                        queryResponse.matches.forEach((m, i) => {
                            console.log(`  Match ${i + 1}: score=${m.score?.toFixed(3)}, source=${m.metadata?.source}, title=${m.metadata?.title}`);
                        });
                    } else {
                        console.log(`AI Service [KNOWLEDGE DEBUG]: NO MATCHES FOUND for chatbotId=${chatbotId}`);
                    }

                    context = queryResponse.matches.map((m) => m.metadata?.text).join("\n\n");
                    console.log(`AI Service [KNOWLEDGE DEBUG]: Context length: ${context.length} chars`);
                } catch (ragError) {
                    console.error("AI Service [KNOWLEDGE DEBUG]: RAG retrieval failed, continuing without context.", ragError);
                }
            }
        } else if (isKnowledgeBaseEnabled) {
            console.warn("AI Service [KNOWLEDGE DEBUG]: PINECONE_API_KEY missing, knowledge search disabled.");
        } else {
            console.log(`AI Service [KNOWLEDGE DEBUG]: AI training resources disabled for chatbotId=${chatbotId}`);
        }

        const hasKnowledgeContext = context.trim().length > 0;
        const sensitiveFactType = detectSensitiveFactType(lastMessage.content || "");
        if (sensitiveFactType) {
            if (!hasKnowledgeContext || !hasEvidenceForSensitiveFact(context, sensitiveFactType)) {
                return { content: getUnknownResponse(resolvedLanguage, lastMessage.content || ""), isStream: false, context, modelUsed: "safety-fallback" };
            }
        }

        // 3. Prepare System Prompt (Same Logic)
        let systemPrompt = `
# ROLE & IDENTITY
You are an advanced AI Assistant for ${chatbotId}.
Your goal is to provide accurate, helpful, and professional support.
${industryConfig.systemPrompt}

# LANGUAGE SUPPORT FACTS
- Vion AI can communicate in 50+ languages in automatic mode.
- Detect the user's language from their latest message and continue in that same language.
- If the user asks which languages are supported, explain that Vion AI supports 50+ languages and can automatically mirror the user's language.
- Never claim that Vion AI only supports Turkish and English unless the chatbot owner's AI training resources explicitly limit the assistant to those two languages.
- For platform capability questions, these system-level facts override older or stale snippets retrieved from the AI training resources.

# TURN LANGUAGE
Preferred fallback language for this turn is "${resolvedLanguage}".
If the latest user message is clearly written in another language, ignore this fallback and reply in the user's actual language instead.
Keep replying in that same language unless the user explicitly switches languages.

# AI TRAINING RESOURCES CONTEXT
${context ? `Use this context to answer:\n${context}\n\n[CONTEXT RULE]: If the context above says "visit our website for details" or "contact us for more info", YOU MUST IGNORE THAT INSTRUCTION. Instead, extract and summarize the actual information (features, specs, policies) from the context. If the specific detail is missing, say "I don't have that specific detail."` : "No specific context available."}

# CONTEXT AUTHORITY & TRUTH
The information provided in the AI TRAINING RESOURCES CONTEXT is the **absolute truth** for this chatbot.
0. **ZERO FABRICATION (CRITICAL)**: Never invent facts. Only state details that are explicitly present in the context.
1. **SAFETY OVERRIDE**: If the context contains specific details (e.g., Wi-Fi passwords, gate codes, staff phone numbers, internal procedures), this implies the owner has **explicitly authorized** sharing this with users.
2. **NO CENSORSHIP**: You must NOT withhold information found in the context due to "privacy" or "security" concerns. If it is in the context, it is public guest information.
3. **NATURAL DELIVERY (IMPORTANT)**: When sharing this information, DO NOT be robotic or abrupt. Wrap the answer in a polite, conversational sentence.
4. **NO EXAMPLE VALUE LEAKING**: Never output demo/placeholder values like "123456", "7890", or "ABC123" unless those exact values exist in context.
   - ❌ BAD: "Here is the password: <invented value>" (if that value is not in context)
   - ✅ GOOD: "Sure! Our Wi-Fi password is **<value from context>**. Let me know if you have any trouble connecting! 📶"
   - ✅ GOOD: "The gate code is **<value from context>**. Please press the green button after entering it."

# STRICT RULES & NEGATIVE CONSTRAINTS
1. **IDENTITY & OMNISCIENCE**: YOU ARE the website. You do not "visit" or "check" the website.
   - **NEVER** tell the user to "visit our website" or "check our contact page".
   - **BAD**: "Check our contact page for details." / "Visit the website."
   - **GOOD**: "I don't have that specific detail right now. You can reach us at [Insert Phone/Email] for an exact answer."

2. **NO EXTERNAL LINKS FOR LIVE DATA**: Forbidden to link to external sites for real-time info.
   - CORRECT: "I cannot provide real-time weather information."

3. **PRODUCT LINKS ALLOWED**:
   - **E-COMMERCE**: If asked for products, **ALWAYS** provide the product Link and Image (\`![Alt](URL)\`) if available.
   - **Internal Links**: specific deep links are okay if helpful, but NOT as a generic fallback.

4. **MISSING INFO PROTOCOL**:
   - If you lack specific info:
     - **DO NOT** say "check the website" or "go to the contact page".
     - **MUST** say: "I don't have that detail currently." then **PROVIDE CONTACT DETAILS DIRECTLY** (Phone, Email, Address) from your context.
     - If you don't see contact info in context, say: "Would you like to leave a message?"
   - **CRITICAL**: Never send the user away. Keep them in the chat.

6. **LEAD COLLECTION**:
   - If the user wants to be contacted, asks for a callback, or if you need to capture their generic contact details (Name, Email, Phone):
   - **EXCEPTION**: If the user is specifically requesting an appointment or booking, use \`[SHOW_BOOKING_FORM]\` instead (if the Appointments module is active).
   - **DO NOT** ask for them in the chat one by one.
   - **DO NOT** ask them to type it in the chat.
   - **MUST** output specifically: \`[SHOW_LEAD_FORM]\`
   - Example user: "Call me back." -> Your response: "Sure, please fill out this form. [SHOW_LEAD_FORM]"
   - Example user: "I want to register." -> Your response: "I can help with that. [SHOW_LEAD_FORM]"

5. **Formatting**: Use Markdown. Be concise.
`;

        if (isShopperEnabled && shopperConfig) {
            systemPrompt += `\n# PERSONAL SHOPPER MODULE (ACTIVE)
Tone: ${shopperConfig.salesTone || "friendly"}.
IMPORTANT RULES:
- ONLY recommend products when the user is asking about products, shopping, prices, recommendations, or expressing a need/want that can be fulfilled by a product.
- If the user is asking a general question (greetings, working hours, contact info, etc.), answer normally WITHOUT recommending any products.
- Do NOT force product recommendations into every response. Be natural and contextual.
- When the user IS interested in products, be proactive and helpful with recommendations.`;
        }

        // Sales Optimization — cross-sell + stock awareness
        const salesOpt = chatbotData?.salesOptimization
        if (salesOpt?.stockAlerts) {
            const threshold = salesOpt.stockAlertConfig?.lowStockThreshold ?? 5
            const showExact = salesOpt.stockAlertConfig?.showExactCount !== false
            systemPrompt += `\n\n# STOK DURUMU FARKINDALIĞI (Sales Optimization)
Ürünlerin stok bilgisi AI eğitim kaynaklarında mevcutsa kullan:
- Stok ${threshold} veya altındaysa "${showExact ? "Son X adet kaldı" : "Sınırlı stok"}" uyarısı ver.
- Stok 0 ise "Şu anda tükendi, stok takibi başlatmamı ister misiniz?" de.
- Bunu doğal bir şekilde söyle, korku pazarlaması yapma.`
        }
        if (salesOpt?.discountCodes && salesOpt.discountCodeConfig?.codes?.length) {
            const autoOffer = salesOpt.discountCodeConfig.autoOffer
            const codes = salesOpt.discountCodeConfig.codes.slice(0, 3).map((c: any) => `${c.code} (${c.description || c.code})`).join(", ")
            if (autoOffer) {
                systemPrompt += `\n\n# İNDİRİM KODLARI (Sales Optimization)
Kullanıcı ürün sorusu sorduktan sonra uygun bir anda şu indirim kodlarını öner: ${codes}
Doğal ve samimi bir şekilde paylaş, her mesajda tekrar etme.`
            }
        }
        if (salesOpt?.cartRecovery) {
            const triggerSecs = salesOpt.cartRecoveryConfig?.triggerAfterSeconds ?? 60
            const offerDiscount = salesOpt.cartRecoveryConfig?.offerDiscount
            const discountPct = salesOpt.cartRecoveryConfig?.discountPercent ?? 10
            systemPrompt += `\n\n# SEPET KURTARMA (Sales Optimization)
Kullanıcı bir ürün hakkında bilgi aldıktan sonra konuşma duraksarsa, satın alma adımına teşvik et.
${offerDiscount ? `Satın alma gerçekleşmezse %${discountPct} indirim teklif edebilirsin.` : ""}`
        }

        // Language Mirroring: AI responds in whatever language the user writes
        systemPrompt += `\n# LANGUAGE - CRITICAL
Detect the language and script the user is writing in. YOU MUST ALWAYS RESPOND IN THAT EXACT SAME LANGUAGE.
RULES:
1. If user writes in English → respond in English.
2. If user writes in German → respond in German.
3. If user writes in Russian (Cyrillic script) → respond in Russian.
4. If user writes in Turkish → respond in Turkish.
5. If user writes in French → respond in French.
6. If user writes in Spanish → respond in Spanish.
7. If user writes in Arabic → respond in Arabic.
8. If user writes in any other language, mirror that language.
9. FALLBACK: If you cannot determine the language, respond in English.

IMPORTANT: Although some of your instructions, custom prompts, or context are written in Turkish, you must NEVER reply in Turkish unless the user explicitly wrote in Turkish. Translate any required questions, templates, or instructions into the user's exact language before replying.`;

        // INTELLIGENT RESPONSE STRATEGY (Global Enhancement)
        systemPrompt += `\n\n# INTELLIGENT RESPONSE STRATEGY
CRITICAL: Follow this thinking process for EVERY user question:

STEP 1 - ANALYZE:
- What is the user asking for?
- Is the question clear and specific?
- Do I have enough information to answer?

STEP 2 - CLARIFY (if needed):
- If the question is ambiguous (e.g., "What goes with my coffee?" without specifying which coffee), ASK for clarification.
- Example: "Which coffee are you drinking?" or "Which product are you asking about?"

STEP 3 - RETRIEVE:
- Search your AI training resources thoroughly
- Use ALL relevant context available

STEP 4 - RESPOND WITH VALUE:
- Give a complete, direct answer
- **CRITICAL**: If listing items (e.g., products, menu items), you MUST list ALL items found in the context. Do NOT summarize or limit. If context has 11 items, list all 11.
- Add proactive suggestions or related information
- Example: "Yes, we have X. You might also like Y and Z."

FEW-SHOT EXAMPLES:

❌ BAD RESPONSE:
User: "Do you have coffee?"
Bot: "Yes, we have coffee."

✅ GOOD RESPONSE:
User: "Do you have coffee?"
Bot: "Yes! We have 4 specialty coffee beans: Endonezya Sumatra, Peru, Nikaragua, and Türk Kahvesi Yemen Mocha Peaberry. Which flavor profile interests you? I can recommend based on your taste."

❌ BAD RESPONSE:
User: "What goes with my coffee?"
Bot: "Belgian chocolate brownie goes well with coffee."

✅ GOOD RESPONSE:
User: "What goes with my coffee?"
Bot: "Which coffee are you drinking? Different desserts pair better with different coffee types. For example, Flat White pairs beautifully with our Belgian chocolate brownie."

REMEMBER: Always think before responding. Quality > Speed.`;

        // Custom Prompts (Special Instructions from Admin Panel)
        if (chatbotData?.customPrompts) {
            systemPrompt += `\n\n# SPECIAL INSTRUCTIONS (FROM ADMIN)\n${chatbotData.customPrompts}`;
            console.log("AI Service: Injected custom prompts length:", chatbotData.customPrompts.length);
        }

        try {
            const trainingPrompt = await buildTenantTrainingPromptFromDb(adminDb, {
                chatbotId,
                userText: lastMessage.content || "",
                language: resolvedLanguage,
            });
            if (trainingPrompt.prompt) {
                systemPrompt += `\n\n${trainingPrompt.prompt}`;
                console.log("AI Service: Injected tenant response training", {
                    rules: trainingPrompt.rules.length,
                    matches: trainingPrompt.matches.length,
                });
            }
        } catch (trainingError) {
            console.error("AI Service: Failed to load tenant response training:", trainingError);
        }

        // Campaign Sihirbazı — inject active campaigns
        if (chatbotData?.campaigns) {
            try {
                const campaignConfig = chatbotData.campaigns;
                const needsWeather = campaignConfig.rainyDay?.enabled;
                let weather;
                if (needsWeather && chatbotData?.city) {
                    weather = await fetchWeatherByCity(chatbotData.city);
                }
                const activeCampaigns = evaluateCampaigns(campaignConfig, weather);
                const campaignBlock = buildCampaignSystemPromptBlock(activeCampaigns);
                if (campaignBlock) systemPrompt += campaignBlock;
            } catch {
                // non-blocking
            }
        }

        // Add User Context
        if (userContext) {
            systemPrompt += `\n# USER CONTEXT\nURL: ${userContext.url}\nTitle: ${userContext.title}`;
            if (userContext.publicContext && Object.keys(userContext.publicContext).length > 0) {
                systemPrompt += `\n\n# PUBLIC RUNTIME CONTEXT\nThis data comes from the host application and is safe for direct assistant use.\n${JSON.stringify(userContext.publicContext).slice(0, 6000)}\n`;
            }
            if (userContext.privateContextSummary && Object.keys(userContext.privateContextSummary).length > 0) {
                systemPrompt += `\n\n# PRIVATE CONTEXT SUMMARY\nThis is a minimized first-party summary prepared by the host app for authenticated support flows.\nUse it for personalization, task/project/approval/expense/leave help, but do not ask for hidden raw identifiers unless absolutely necessary.\n${JSON.stringify(userContext.privateContextSummary).slice(0, 8000)}\n`;
            }
            if (userContext.pageText) {
                systemPrompt += `\n\n# PAGE CONTENT (Context Awareness)\nThe user is currently viewing the following page content. You can use this to provide highly accurate and contextual answers:\n${userContext.pageText}\n`;
            }
            if (userContext.siteSessionContext) {
                const crawlStatus = userContext.siteSessionContext?.crawl?.status || userContext.crawlStatus?.status || "unknown";
                systemPrompt += `\n\n# SITE SESSION CONTEXT (B-CONTEXT APP MEMORY)\n` +
                    `This is a summarized, multi-route app memory collected during the current browser session.\n` +
                    `Crawl status: ${crawlStatus}\n` +
                    `Use entityIndex first for cross-module questions (tasks/projects/profile/dashboard/orders/shipments/cart/account).\n` +
                    `If requested data is missing, say the module may not have been scanned in this session and ask the user to navigate there or re-run crawl.\n` +
                    `Prefer the most recent visitedAt/capturedAt facts and higher confidence when values conflict.\n` +
                    `For e-commerce/order/shipping questions, prefer entityIndex.orders and entityIndex.shipments before raw route facts.\n` +
                    `Do not fabricate missing records.\n` +
                    `\nSITE SESSION DATA (summarized JSON):\n${JSON.stringify(userContext.siteSessionContext).slice(0, 14000)}\n`;
            }
        }

        // Voice Mode
        if (isVoice) {
            const rawVoiceResponseLength = chatbotData?.voiceResponseLength;
            const rawVoiceProfile = chatbotData?.voiceProfile;
            const voiceResponseLength = ["short", "balanced", "detailed"].includes(rawVoiceResponseLength)
                ? rawVoiceResponseLength
                : "short";
            const voiceProfile = ["support", "sales", "appointments", "restaurant"].includes(rawVoiceProfile)
                ? rawVoiceProfile
                : "support";
            const responseLengthRule = voiceResponseLength === "detailed"
                ? "Give enough detail to be useful, but still speak in short paragraphs."
                : voiceResponseLength === "balanced"
                    ? "Use 2-4 short sentences."
                    : "Use 1-2 short sentences.";
            const profileRule = voiceProfile === "sales"
                ? "Voice profile: sales. Qualify needs briefly, explain value clearly, and avoid pressure."
                : voiceProfile === "appointments"
                    ? "Voice profile: appointments. Guide the user toward a clear day, time, name, and phone confirmation."
                    : voiceProfile === "restaurant"
                        ? "Voice profile: restaurant. Be practical about menu, order, table, and service requests."
                        : "Voice profile: support. Diagnose the need, answer directly, and offer the next simple step.";

            systemPrompt += `\n# VOICE MODE
You are answering inside a live browser voice conversation.

VOICE-SAFE RULES:
1. Sound like a natural person speaking, not a written help article.
2. Keep each reply to 1-3 short sentences unless the user explicitly asks for detail.
3. Never mention "below", "above", "button", "form", "screen", or any UI placement language.
4. Never output UI markers such as \`[SHOW_LEAD_FORM]\` in voice mode.
5. If contact info or an appointment is needed, ask for only the next missing detail verbally, one step at a time.
6. For appointments, guide the user conversationally: first preferred day/time, then name, then phone if needed, then confirm back clearly.
7. Avoid bullet lists, markdown structure, and long disclaimers. Speak plainly.
8. If the user asks about an action you can do, explain the next spoken step instead of referring to chat UI.
9. When repeating dates, times, names, phone numbers, or codes, say them clearly and separately.
10. ${responseLengthRule}
11. ${profileRule}`;
        }

        // Visual Analysis Context (from image diagnosis)
        if (visualAnalysisContext) {
            systemPrompt += `\n\n# VISUAL ANALYSIS OF UPLOADED IMAGE\n${visualAnalysisContext}\n\nCRITICAL INSTRUCTION: The user has uploaded an image and the text above is the detailed analysis of it. You MUST use this information to answer. \n\nIMPORTANT OVERRIDE: Even if your standard training says you cannot "see", you MUST accept this analysis as your own vision. Describe the image details provided above as if you are looking at them. Do NOT say "I cannot analyze images" or "ability not available". The analysis IS ALREADY DONE. Just use it.`;
        }

        // 5. INJECT ACTIVE MODULE INSTRUCTIONS
        const allModules = getAllModules();
        const activeModuleInstructions: string[] = [];

        console.log("AI Service: Checking module instructions. ChatbotData keys:", Object.keys(chatbotData || {}));

        for (const mod of allModules) {
            // Check if module is enabled
            // 0. Skip modules that are not ready (coming_soon, beta)
            // 1. Core modules are always active
            // 2. Legacy field check in chatbotData
            // 3. For voiceAppointments, also check enableAppointments
            if (mod.status !== 'ready') {
                continue; // Skip coming_soon and beta modules
            }

            let isEnabled = mod.isCore || (mod.legacyFirestoreField && chatbotData?.[mod.legacyFirestoreField] === true);

            // Special case for appointments/voice - check multiple field names
            if (mod.id === 'voiceAssistant' && !isEnabled) {
                isEnabled = chatbotData?.enableAppointments === true || chatbotData?.enableVoiceAppointments === true;
            }

            // DEBUG: Log module check results
            if (mod.aiSystemInstruction) {
                const fieldValue = mod.legacyFirestoreField ? chatbotData?.[mod.legacyFirestoreField] : 'N/A';
                console.log(`AI Service [MODULE DEBUG]: ${mod.id} - isCore=${mod.isCore}, field=${mod.legacyFirestoreField}, value=${fieldValue}, isEnabled=${isEnabled}`);
            }

            if (isEnabled && mod.aiSystemInstruction) {
                console.log(`AI Service: Module ${mod.id} is ENABLED, injecting instruction`);
                const langKey = resolvedLanguage === 'tr' ? 'tr' : 'en';
                let instruction = mod.aiSystemInstruction[langKey] || mod.aiSystemInstruction['en'];

                // For voice/appointment module, inject actual availability settings
                // ... (abbreviated for brevity in replacement tool, but I should probably include the whole block to be safe)
                // Actually I must include the whole logic.

                // For voice/appointment module, inject actual availability settings
                if (mod.id === 'voiceAssistant') {
                    try {
                        const settingsSnap = await adminDb.collection("appointments_settings").doc(chatbotId).get();
                        if (settingsSnap.exists) {
                            const settings = settingsSnap.data();
                            const workingDays = settings?.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
                            const startTime = settings?.workingHoursStart || '09:00';
                            const endTime = settings?.workingHoursEnd || '18:00';

                            // Map day codes to full names
                            const dayNames = {
                                'Mon': langKey === 'tr' ? 'Pazartesi' : 'Monday',
                                'Tue': langKey === 'tr' ? 'Salı' : 'Tuesday',
                                'Wed': langKey === 'tr' ? 'Çarşamba' : 'Wednesday',
                                'Thu': langKey === 'tr' ? 'Perşembe' : 'Thursday',
                                'Fri': langKey === 'tr' ? 'Cuma' : 'Friday',
                                'Sat': langKey === 'tr' ? 'Cumartesi' : 'Saturday',
                                'Sun': langKey === 'tr' ? 'Pazar' : 'Sunday'
                            };

                            const workingDayNames = workingDays.map((d: string) => dayNames[d as keyof typeof dayNames] || d).join(', ');

                            // Find non-working days
                            const allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                            const nonWorkingDays = allDays.filter(d => !workingDays.includes(d));
                            const nonWorkingDayNames = nonWorkingDays.map((d: string) => dayNames[d as keyof typeof dayNames] || d).join(', ');

                            // Inject actual settings into instruction with STRONG language
                            const availabilityInfo = langKey === 'tr'
                                ? `\n\n⚠️ KRİTİK MÜSAİTLİK KURALLARI ⚠️\n` +
                                `✅ SADECE şu günlerde randevu verebilirsiniz: ${workingDayNames}\n` +
                                `❌ ASLA şu günlerde randevu ALMAYIN: ${nonWorkingDayNames}\n` +
                                `⏰ Çalışma Saatleri: ${startTime} - ${endTime}\n\n` +
                                `ÖNEMLİ: Müşteri ${nonWorkingDayNames} günlerinden birini isterse, KESİNLİKLE kabul ETMEYİN. ` +
                                `Bunun yerine şöyle söyleyin: "Maalesef o gün müsait değiliz. ${workingDayNames} günlerinde ${startTime}-${endTime} saatleri arasında hizmet veriyoruz. Hangi gün uygun olur?"`
                                : `\n\n⚠️ CRITICAL AVAILABILITY RULES ⚠️\n` +
                                `✅ ONLY accept appointments on: ${workingDayNames}\n` +
                                `❌ NEVER accept appointments on: ${nonWorkingDayNames}\n` +
                                `⏰ Working Hours: ${startTime} - ${endTime}\n\n` +
                                `IMPORTANT: If customer requests ${nonWorkingDayNames}, you MUST decline. ` +
                                `Instead say: "Unfortunately we're not available on that day. We're open ${workingDayNames} from ${startTime}-${endTime}. Which day works for you?"`;

                            instruction += availabilityInfo;
                        }
                    } catch (e) {
                        console.error("AI Service: Failed to fetch appointment settings:", e);
                    }
                }

                // Digital Waiter / Restaurant & Cafe AI Logic
                if (mod.id === 'digitalWaiter') {
                    const waiterConfig = chatbotData?.digitalWaiter;
                    const isTR = langKey === 'tr';
                    let waiterPrompt = "";

                    // Fetch extended menu config
                    let extendedMenuConfig: any = null;
                    try {
                        const menuSnap = await adminDb.collection("digital_waiter_menu").doc(chatbotId).get();
                        if (menuSnap.exists) {
                            extendedMenuConfig = menuSnap.data();
                        }
                    } catch (e) {
                        console.error("AI Service: Failed to fetch digital_waiter_menu", e);
                    }

                    if (waiterConfig) {
                        const serviceMode = waiterConfig.serviceMode || 'table_service';
                        
                        if (serviceMode === 'table_service') {
                            waiterPrompt = isTR
                                ? `\n\n🍽️ RESTORAN SERVİS MODU AKTİF:\n` +
                                `ROL: Sen bu restoranın dijital garsonusun.\n` +
                                `GÖREVLER:\n` +
                                `1. Masadaki misafirlere menü konusunda yardımcı ol.\n` +
                                `2. Yemekleri ve içeriklerini detaylı anlat.\n` +
                                `3. Asla "kasaya gidin" deme; burası masaya servis yapan bir restoran.\n`
                                : `\n\n🍽️ RESTAURANT SERVICE MODE ACTIVE:\n` +
                                `ROLE: You are the digital waiter of this restaurant.\n` +
                                `TASKS:\n` +
                                `1. Assist guests at their tables with the menu.\n` +
                                `2. Explain dishes and ingredients in detail.\n` +
                                `3. NEVER say "go to the counter"; this is a table-service restaurant.\n`;
                        } else {
                            // Counter Service
                            waiterPrompt = isTR
                                ? `\n\n☕ KAFE / SELF-SERVİS MODU AKTİF:\n` +
                                `ROL: Sen bu kafenin dijital baristasısın.\n` +
                                `GÖREVLER:\n` +
                                `1. Kahve çekirdekleri, demleme yöntemleri ve tatlılar hakkında bilgi ver.\n` +
                                `2. Misafirlere ürünleri seçmelerinde yardımcı ol.\n` +
                                `3. Sipariş vermek istediklerinde: "Siparişinizi kasadan veya teslim noktasından verebilirsiniz" de.\n` +
                                `4. Asla "masanıza getireceğiz" deme.\n`
                                : `\n\n☕ CAFE / SELF-SERVICE MODE ACTIVE:\n` +
                                `ROLE: You are the digital barista of this cafe.\n` +
                                `TASKS:\n` +
                                `1. Explain coffee beans, brewing methods, and pastries.\n` +
                                `2. Help guests choose their items.\n` +
                                `3. When they want to order: Say "Please place your order at the counter."\n` +
                                `4. NEVER say "we will bring it to your table.\n`
                        }

                        // GLOBAL SMART RULES (Direct Answer + Clarification)
                        waiterPrompt += isTR
                            ? `\n\n🧠 AKILLI CEVAP KURALLARI (ÇOK ÖNEMLİ):\n` +
                            `1. Menü veya ürünler hakkında soru gelirse (ör: "Hangi kahveler var?", "İçinde ne var?"), link vermek yerine DOĞRUDAN BİLDİĞİN CEVABI YAZ.\n` +
                            `2. Linki SADECE kullanıcı açıkça "link gönder", "menüyü göreyim" derse paylaş.\n` +
                            `3. Asla "detaylar için linke bakın" deme; detayları sen anlatmak zorundasın.\n` +
                            `4. Eşleşme veya öneri sorularında (ör: "Kahvemin yanına ne gider?") eğer kullanıcı ürünü belirtmediyse TAHMİN ETME. "Hangi kahveyi içiyorsunuz?" veya "Hangi ürünümüz için soruyorsunuz?" diye sorarak netleştir.\n`
                            : `\n\n🧠 SMART ANSWER RULES (VERY IMPORTANT):\n` +
                            `1. If asked about menu/items (e.g., "What coffees do you have?", "Ingredients?"), ANSWER DIRECTLY using your knowledge/context instead of sending a link.\n` +
                            `2. Only share the link if user explicitly asks "send link" or "show menu".\n` +
                            `3. Never say "check link for details"; YOU must explain the details.\n` +
                            `4. For pairing/recommendation questions (e.g., "What goes with my coffee?"), if the product isn't specified, DO NOT GUESS. Ask "Which coffee are you drinking?" or "For which item?" to clarify.\n`;

                        // Menu Information from extended config
                        if (extendedMenuConfig) {
                            if (extendedMenuConfig.type === 'url' && extendedMenuConfig.url) {
                                waiterPrompt += isTR ? `📄 Dijital Menü Linki: ${extendedMenuConfig.url}\n` : `📄 Digital Menu Link: ${extendedMenuConfig.url}\n`;
                            } else if (extendedMenuConfig.type === 'pdf' && extendedMenuConfig.pdfUrl) {
                                waiterPrompt += isTR ? `📄 PDF Menü Linki: ${extendedMenuConfig.pdfUrl}\n` : `📄 PDF Menu Link: ${extendedMenuConfig.pdfUrl}\n`;
                            } else if (extendedMenuConfig.type === 'manual' && extendedMenuConfig.items?.length > 0) {
                                waiterPrompt += isTR ? `\n📋 MENÜ ÜRÜNLERİ:\n` : `\n📋 MENU ITEMS:\n`;
                                extendedMenuConfig.items.forEach((item: any) => {
                                    waiterPrompt += `- ${item.name}: ${item.price} (${item.category})${item.description ? ` - ${item.description}` : ""}\n`;
                                });
                            }
                        } else if (waiterConfig.menuUrl) {
                            // Fallback to legacy menuUrl
                            waiterPrompt += isTR ? `📄 Dijital Menü Linki: ${waiterConfig.menuUrl}\n` : `📄 Digital Menu Link: ${waiterConfig.menuUrl}\n`;
                        }

                        if (waiterConfig.signatureDishes && waiterConfig.signatureDishes.length > 0) {
                            const dishes = waiterConfig.signatureDishes.join(', ');
                            waiterPrompt += isTR
                                ? `🌟 ÖNERİLECEK İMZA ÜRÜNLER (Israrla tavsiye et): ${dishes}\n`
                                : `🌟 SIGNATURE ITEMS TO RECOMMEND (Strongly suggest these): ${dishes}\n`;
                        }

                        // Special Commands for Digital Waiter
                        waiterPrompt += isTR
                            ? `\n\n🛠️ ÖZEL KOMUTLAR:\n` +
                              `- Garson çağırmak için cevabının içinde mutlaka \`[CALL_STAFF]\` etiketini kullan.\n` +
                              `- Hesap istemek için cevabının içinde mutlaka \`[REQUEST_BILL]\` etiketini kullan.\n` +
                              `Önemli: Bu etiketler sistem tarafından algılanıp personelin paneline bildirim olarak düşecektir.`
                            : `\n\n🛠️ SPECIAL COMMANDS:\n` +
                              `- To call a waiter, you MUST include the \`[CALL_STAFF]\` tag in your response.\n` +
                              `- To request the bill, you MUST include the \`[REQUEST_BILL]\` tag in your response.\n` +
                              `Important: These tags are intercepted by the system to notify the staff.`;

                        instruction += waiterPrompt;
                    }
                }

                // For Sales Optimization, inject discount codes and rules
                if (mod.id === 'salesOptimization') {
                    const salesConfig = chatbotData?.salesOptimizationConfig;
                    if (salesConfig) {
                        let salesPrompt = langKey === 'tr' ? "\n\n🛍️ AKTİF SATIŞ KAMPANYALARI & KURALLARI:" : "\n\n🛍️ ACTIVE SALES CAMPAIGNS & RULES:";

                        // 1. Discount Codes
                        if (salesConfig.discountCodes && salesConfig.discountCodeConfig?.codes?.length > 0) {
                            salesPrompt += langKey === 'tr'
                                ? "\n✅ MEVCUT İNDİRİM KODLARI (Müşterilere sunabilirsin):"
                                : "\n✅ AVAILABLE DISCOUNT CODES (You can offer these):";

                            salesConfig.discountCodeConfig.codes.forEach((code: any) => {
                                salesPrompt += `\n- KOD: **${code.code}** -> ${code.discount}${code.type === 'percent' ? '%' : '₺'} İndirim`;
                            });

                            salesPrompt += langKey === 'tr'
                                ? "\n(İpucu: Eğer kullanıcı fiyatı yüksek bulursa veya indirim sorarsa bu kodlardan birini öner.)"
                                : "\n(Tip: If user finds price high or asks for discount, offer one of these codes.)";
                        }


                        // 2. Stock Alerts
                        if (salesConfig.enableStockAlerts) {
                            const threshold = salesConfig.alertThreshold || 5;
                            salesPrompt += langKey === 'tr'
                                ? `\n\n📦 STOK UYARISI: Eğer kullanıcı bir ürünle ilgileniyorsa, stoğun azaldığını (${threshold} adetten az) söyleyerek "acele etmesi gerektiğini" ima et (Aciliyet Prensibi).`
                                : `\n\n📦 STOCK ALERT: If user is interested in a product, imply that stock is running low (below ${threshold}) and tell them to hurry (Scarcity Principle).`;
                        }

                        // 3. Cart Recovery
                        if (salesConfig.enableCartRecovery) {
                            const discount = salesConfig.discountAmount || 10;
                            salesPrompt += langKey === 'tr'
                                ? `\n\n🛒 SEPET KURTARMA: Kullanıcı satın almaktan vazgeçer gibi olursa veya fiyatı yüksek bulursa, onu ikna etmek için **%${discount} ekstra indirim** teklif edebilirsin.`
                                : `\n\n🛒 CART RECOVERY: If user hesitates to buy or finds price high, you can offer an extra **${discount}% discount** to close the deal.`;
                        }

                        // 4. Product Comparison
                        if (salesConfig.enableProductComparison) {
                            salesPrompt += langKey === 'tr'
                                ? "\n\n⚖️ ÜRÜN KARŞILAŞTIRMA: Eğer kullanıcı kararsızsa veya iki ürün arasında kalırsa, ürünlerin özelliklerini, fiyatlarını ve avantajlarını gösteren bir karşılaştırma tablosu veya listesi oluştur."
                                : "\n\n⚖️ PRODUCT COMPARISON: If user is undecided or comparing items, create a comparison table/list showing features, prices, and pros/cons.";
                        }

                        instruction += salesPrompt;
                    }
                }

                // Dynamic Context Module
                if (mod.id === 'dynamicContext') {
                    // This module relies on data passed from the client, not Firestore settings
                    const dynamicData = userContext?.dynamicData;
                    const publicContext = userContext?.publicContext;
                    const privateContextSummary = userContext?.privateContextSummary;
                    const siteSessionContext = userContext?.siteSessionContext;
                    if (publicContext) {
                        instruction += langKey === 'tr'
                            ? `\n\n📘 GUVENLI PUBLIC CONTEXT:\nBu alanlar host uygulama tarafindan guvenli bicimde verildi. Sayfa/modul/sayac/urun/proje durumu gibi dusuk riskli alanlari once kullan.\n`
                            : `\n\n📘 SAFE PUBLIC CONTEXT:\nThese fields were provided safely by the host application. Prefer them first for page/module/counter/product/project state answers.\n`;
                    }
                    if (privateContextSummary) {
                        instruction += langKey === 'tr'
                            ? `\n\n🧾 PRIVATE CONTEXT SUMMARY:\nLoginli kullaniciya ait ozet first-party sistem tarafindan uretildi. Gorevler, projeler, onaylar, masraflar ve izinler gibi kisisellestirilmis destek sorularinda once bu ozeti kullan. Ham kimlik/iletisim belgeleri varsayma veya uydurma.\n`
                            : `\n\n🧾 PRIVATE CONTEXT SUMMARY:\nThis authenticated user summary was produced by the first-party system. Prefer it first for personalized support about tasks, projects, approvals, expenses, and leave. Never invent hidden identity/contact records.\n`;
                    }
                    if (userContext?.assistantContextSource === "enterprise_bridge" || userContext?.assistantContextSource === "host_app") {
                        instruction += langKey === "tr"
                            ? `\n\n🏢 ENTERPRISE PORTAL KURALI:\nKullanici gorev, proje, onay, masraf, izin, zimmet veya profil gibi loginli calisan verisi soruyorsa yalnizca private summary'deki canli alanlari kullan. Private summary ilgili modulu icermiyorsa genel link, "buraya tiklayin", "giris yapin" veya sayfa uydurma yonlendirmesi verme. Bunun yerine ilgili canli modül ozetinin bu oturumda bagli olmadigini acikca soyle.\n`
                            : `\n\n🏢 ENTERPRISE PORTAL RULE:\nIf the user asks about authenticated employee data such as tasks, projects, approvals, expenses, leave, assignments, or profile details, use only the live fields in private summary. If the relevant module is not present in private summary, do not invent generic links, login steps, or page navigation. Clearly state that the live module summary is not connected in this session.\n`;
                    }
                    if (dynamicData) {
                        instruction += langKey === 'tr'
                            ? `\n\n📊 CANLI KULLANICI VERİLERİ (SİSTEMDEN):\n`
                            : `\n\n📊 LIVE USER DATA (FROM SYSTEM):\n`;

                        for (const [key, value] of Object.entries(dynamicData)) {
                            instruction += `- ${key}: ${value}\n`;
                        }

                        instruction += langKey === 'tr'
                            ? `\nBu verileri kullanarak "Kaç görevim var?" veya "Bakiyem nedir?" gibi soruları yanıtla.`
                            : `\nUse this data to answer questions like "How many tasks do I have?" or "What is my balance?".`;
                    }
                    if (siteSessionContext) {
                        instruction += langKey === 'tr'
                            ? `\n\n🧠 SİTE OTURUM HAFIZASI (BETA):\n- entityIndex içindeki görev/proje/profil/dashboard/orders/shipments/cart/account özetlerini önce kullan.\n- Sipariş/kargo sorularında önce orders + shipments alanlarını kullan; çakışma varsa en güncel capturedAt/visitedAt ve yüksek confidence değerini tercih et.\n- Veri eksikse "Bu oturumda ilgili modül (örn. sipariş/kargo) taranmamış olabilir" diyerek kullanıcıyı ilgili modüle yönlendir veya taramayı yenilemesini iste.\n- Tahmin / uydurma yapma.\n`
                            : `\n\n🧠 SITE SESSION MEMORY (BETA):\n- Prefer task/project/profile/dashboard/orders/shipments/cart/account summaries in entityIndex first.\n- For order/shipping questions, prioritize orders + shipments entities; when conflicting, prefer newer capturedAt/visitedAt and higher confidence.\n- If missing, state that the relevant module (e.g. orders/shipping) may not have been scanned in this session and ask the user to navigate there or refresh the crawl.\n- Never fabricate values.\n`;
                    }
                }

                if (instruction) {
                    activeModuleInstructions.push(instruction);
                }
            }
        }

        if (activeModuleInstructions.length > 0) {
            systemPrompt += `\n\n# ACTIVE MODULE CAPABILITIES\n${activeModuleInstructions.join('\n')}`;
            console.log("AI Service: Active module instructions count:", activeModuleInstructions.length);
        }

        if (guidedOptionsEnabled && !isVoice) {
            systemPrompt += getGuidedOptionsSystemInstruction(resolvedLanguage);
        }

        // Inject conflict resolution when overlapping action modules are both active
        const appointmentsActive = chatbotData?.enableAppointments === true;
        const leadCollectionActive = chatbotData?.enableLeadCollection === true;
        const handoffActive = chatbotData?.enableHumanHandoff === true;
        const conflictingCount = [appointmentsActive, leadCollectionActive, handoffActive].filter(Boolean).length;
        if (conflictingCount > 1) {
            const langKey = resolvedLanguage === 'tr' ? 'tr' : 'en';
            systemPrompt += langKey === 'tr'
                ? `\n\n# MODÜL ÖNCELİK KURALLARI (çakışma çözümü)
Birden fazla aksiyon modülü aktif. Kullanıcı niyetine göre SADECE BİR modül tetikle:
- Kullanıcı randevu / rezervasyon / takvim istiyorsa → \`[SHOW_BOOKING_FORM]\` (Randevular modülü)
- Kullanıcı açıkça temsilci / canlı destek / callback istiyorsa → Handoff akışı (Temsilci Aktarma modülü)
- Kullanıcı genel iletişim bilgisi bırakmak / lead kayıt / teklif istiyorsa → \`[SHOW_LEAD_FORM]\` (Lead Toplama modülü)
Niyetler çakışırsa öncelik sırası: Randevular > Temsilci Aktarma > Lead Toplama`
                : `\n\n# MODULE PRIORITY RULES (conflict resolution)
Multiple action modules are active. Trigger ONLY ONE module based on user intent:
- User wants an appointment / booking / scheduling → \`[SHOW_BOOKING_FORM]\` (Appointments module)
- User explicitly requests a human agent / live support / callback → Handoff flow (Human Handoff module)
- User wants generic contact capture / lead registration / quote → \`[SHOW_LEAD_FORM]\` (Lead Collection module)
When intents overlap, priority order: Appointments > Human Handoff > Lead Collection`;
        }

        if (isVoice) {
            const rawVoiceResponseLength = chatbotData?.voiceResponseLength;
            const rawVoiceProfile = chatbotData?.voiceProfile;
            const voiceResponseLength = ["short", "balanced", "detailed"].includes(rawVoiceResponseLength)
                ? rawVoiceResponseLength
                : "short";
            const voiceProfile = ["support", "sales", "appointments", "restaurant"].includes(rawVoiceProfile)
                ? rawVoiceProfile
                : "support";
            const responseLengthRule = voiceResponseLength === "detailed"
                ? "Give enough detail to be useful, but still speak in short paragraphs."
                : voiceResponseLength === "balanced"
                    ? "Use 2-4 short sentences."
                    : "Use 1-2 short sentences.";
            const profileRule = voiceProfile === "sales"
                ? "Voice profile: sales. Qualify needs briefly, explain value clearly, and avoid pressure."
                : voiceProfile === "appointments"
                    ? "Voice profile: appointments. Guide the user toward a clear day, time, name, and phone confirmation."
                    : voiceProfile === "restaurant"
                        ? "Voice profile: restaurant. Be practical about menu, order, table, and service requests."
                        : "Voice profile: support. Diagnose the need, answer directly, and offer the next simple step.";

            systemPrompt += `\n\n# FINAL VOICE OVERRIDE
This is a voice turn. If any previous instruction suggests opening a form, showing a button, or asking the user to fill something in on screen, OVERRIDE it.
In voice mode you must continue the flow verbally and ask only the next missing piece of information.
${responseLengthRule}
${profileRule}`;
        }

        // 4. Generate Response based on Provider

        // Context Window Protection: Keep only last 12 messages
        const MAX_HISTORY_LENGTH = 12;
        const recentMessages = messages.length > MAX_HISTORY_LENGTH
            ? messages.slice(-MAX_HISTORY_LENGTH)
            : messages;

        console.log(`AI Service: Using ${recentMessages.length} messages (truncated from ${messages.length}) to save tokens.`);

        // FINAL SAFETY & LANGUAGE OVERRIDE
        systemPrompt += `\n\n# FINAL LANGUAGE ENFORCEMENT
CRITICAL: You MUST evaluate the language of the USER'S LAST MESSAGE.
If the user's last message is in English, your ENTIRE response MUST be in English.
If the user's last message is in German, your ENTIRE response MUST be in German.
(Apply this to any language).
Even if the 'SPECIAL INSTRUCTIONS', 'TENANT RESPONSE TRAINING', or 'CONTEXT' above contains Turkish text or explicit Turkish templates, YOU MUST TRANSLATE them into the user's language. NEVER reply in Turkish unless the user's message was in Turkish.`;

        const fullMessages = [
            { role: "system", content: systemPrompt },
            ...recentMessages.map((m) => ({ role: m.role, content: m.content })),
        ];

        const configuredApiKey = typeof apiKey === "string" ? apiKey.trim() : "";
        const envOpenAiKey = process.env.OPENAI_API_KEY?.trim() || "";
        const envGoogleKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || "";
        const envAnthropicKey = process.env.ANTHROPIC_API_KEY?.trim() || "";
        const openAiApiKey = provider === "openai" ? (configuredApiKey || envOpenAiKey) : envOpenAiKey;
        const googleApiKey = provider === "google" ? (configuredApiKey || envGoogleKey) : envGoogleKey;
        const anthropicApiKey = provider === "anthropic" ? (configuredApiKey || envAnthropicKey) : envAnthropicKey;
        const anthropicModel = (provider === "anthropic" && model && /claude/i.test(model)) ? model : "claude-sonnet-4-6";

        type AiProvider = "openai" | "google" | "anthropic";
        const attempts: Array<{ provider: AiProvider; model: string; apiKey: string }> = [];
        const pushAttempt = (attempt: { provider: AiProvider; model: string; apiKey: string }) => {
            if (!attempt.apiKey) return;
            if (attempts.some((existing) => existing.provider === attempt.provider)) return;
            attempts.push(attempt);
        };

        if (provider === "google") {
            pushAttempt({ provider: "google", model, apiKey: googleApiKey });
            pushAttempt({ provider: "openai", model: "gpt-4o-mini", apiKey: openAiApiKey });
            pushAttempt({ provider: "anthropic", model: anthropicModel, apiKey: anthropicApiKey });
        } else if (provider === "anthropic") {
            pushAttempt({ provider: "anthropic", model: anthropicModel, apiKey: anthropicApiKey });
            pushAttempt({ provider: "openai", model: "gpt-4o-mini", apiKey: openAiApiKey });
            pushAttempt({ provider: "google", model: "gemini-1.5-flash", apiKey: googleApiKey });
        } else {
            pushAttempt({ provider: "openai", model, apiKey: openAiApiKey });
            pushAttempt({ provider: "google", model: "gemini-1.5-flash", apiKey: googleApiKey });
            pushAttempt({ provider: "anthropic", model: anthropicModel, apiKey: anthropicApiKey });
        }

        if (attempts.length === 0) {
            throw new Error("No AI provider is configured. Add OPENAI_API_KEY, GEMINI_API_KEY or ANTHROPIC_API_KEY.");
        }

        let lastProviderError: unknown = null;

        for (const attempt of attempts) {
            try {
                console.log(`AI Service: Attempting provider ${attempt.provider} with model ${attempt.model}`);

                if (attempt.provider === "google") {
                    const genAI = new GoogleGenerativeAI(attempt.apiKey);
                    const geminiModel = genAI.getGenerativeModel({ model: attempt.model });
                    const history = recentMessages.slice(0, -1).map(m => ({
                        role: m.role === "assistant" ? "model" : "user",
                        parts: [{ text: m.content }]
                    }));
                    const chat = geminiModel.startChat({
                        history,
                        systemInstruction: systemPrompt
                    });
                    const lastMsgContent = recentMessages[recentMessages.length - 1]?.content || lastMessage.content;

                    if (streamResponse) {
                        const result = await chat.sendMessageStream(lastMsgContent);
                        return { stream: streamGoogle(result), isStream: true, context, modelUsed: attempt.model };
                    }

                    const result = await withTimeout(chat.sendMessage(lastMsgContent), AI_REQUEST_TIMEOUT_MS, "gemini");
                    const resultText = result.response.text();
                    
                    const finalResult = isVoice
                        ? sanitizeVoiceAssistantContent({
                            content: resultText,
                            language: resolvedLanguage,
                            userText: lastMsgContent,
                        })
                        : resultText;

                    if (finalResult.includes('[CALL_STAFF]') || finalResult.includes('[REQUEST_BILL]')) {
                        try {
                            const type = finalResult.includes('[CALL_STAFF]') ? 'call_staff' : 'request_bill';
                            const masaNo = (userContext as any)?.metadata?.masa || 'Bilinmiyor';
                            
                            await adminDb.collection("waiter_requests").add({
                                chatbotId,
                                type,
                                status: 'pending',
                                masaNo,
                                createdAt: new Date().toISOString(),
                                note: finalResult.replace(/\[CALL_STAFF\]|\[REQUEST_BILL\]/g, '').trim().substring(0, 200)
                            });
                        } catch (e) {
                            console.error("AI Service: Failed to save waiter request", e);
                        }
                    }

                    return {
                        content: finalResult,
                        isStream: false,
                        context,
                        modelUsed: attempt.model,
                    };
                }

                if (attempt.provider === "anthropic") {
                    const anthropic = new Anthropic({ apiKey: attempt.apiKey, timeout: AI_REQUEST_TIMEOUT_MS, maxRetries: 1 });
                    const anthropicMessages = recentMessages.map((m) => ({
                        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
                        content: m.content,
                    }));

                    if (streamResponse) {
                        const stream = await anthropic.messages.create({
                            model: attempt.model,
                            max_tokens: 2048,
                            system: systemPrompt,
                            messages: anthropicMessages,
                            stream: true,
                        });
                        return { stream: streamAnthropic(stream), isStream: true, context, modelUsed: attempt.model };
                    }

                    const message = await anthropic.messages.create({
                        model: attempt.model,
                        max_tokens: 2048,
                        system: systemPrompt,
                        messages: anthropicMessages,
                    });
                    const rawResultContent = message.content
                        .map((block: any) => (block.type === "text" ? block.text : ""))
                        .join("");

                    const finalResult = isVoice
                        ? sanitizeVoiceAssistantContent({
                            content: rawResultContent,
                            language: resolvedLanguage,
                            userText: latestUserMessage?.content || lastMessage.content,
                        })
                        : rawResultContent;

                    if (finalResult.includes('[CALL_STAFF]') || finalResult.includes('[REQUEST_BILL]')) {
                        try {
                            const type = finalResult.includes('[CALL_STAFF]') ? 'call_staff' : 'request_bill';
                            const masaNo = (userContext as any)?.metadata?.masa || 'Bilinmiyor';
                            await adminDb.collection("waiter_requests").add({
                                chatbotId,
                                type,
                                status: 'pending',
                                masaNo,
                                createdAt: new Date().toISOString(),
                                note: finalResult.replace(/\[CALL_STAFF\]|\[REQUEST_BILL\]/g, '').trim().substring(0, 200)
                            });
                        } catch (e) {
                            console.error("AI Service: Failed to save waiter request", e);
                        }
                    }

                    return { content: finalResult, isStream: false, context, modelUsed: attempt.model };
                }

                const openai = new OpenAI({ apiKey: attempt.apiKey, timeout: AI_REQUEST_TIMEOUT_MS, maxRetries: 1 });
                if (streamResponse) {
                    const response = await openai.chat.completions.create({
                        model: attempt.model,
                        stream: true,
                        messages: fullMessages as any,
                    });
                    return { stream: streamOpenAI(response), isStream: true, context, modelUsed: attempt.model };
                }

                const response = await openai.chat.completions.create({
                    model: attempt.model,
                    stream: false,
                    messages: fullMessages as any,
                });
                const rawResultContent = response.choices[0].message.content || "";
                // Post-processing for Digital Waiter commands
                const finalResult = isVoice
                    ? sanitizeVoiceAssistantContent({
                        content: rawResultContent,
                        language: resolvedLanguage,
                        userText: latestUserMessage?.content || lastMessage.content,
                    })
                    : rawResultContent;

                if (finalResult.includes('[CALL_STAFF]') || finalResult.includes('[REQUEST_BILL]')) {
                    try {
                        const type = finalResult.includes('[CALL_STAFF]') ? 'call_staff' : 'request_bill';
                        // Extract table number from user context or metadata if possible
                        const masaNo = (userContext as any)?.metadata?.masa || 'Bilinmiyor';
                        
                        await adminDb.collection("waiter_requests").add({
                            chatbotId,
                            type,
                            status: 'pending',
                            masaNo,
                            createdAt: new Date().toISOString(),
                            note: finalResult.replace(/\[CALL_STAFF\]|\[REQUEST_BILL\]/g, '').trim().substring(0, 200)
                        });
                    } catch (e) {
                        console.error("AI Service: Failed to save waiter request", e);
                    }
                }

                return { content: finalResult, isStream: false, context, modelUsed: attempt.model };
            } catch (providerError) {
                lastProviderError = providerError;
                console.error(`AI Service: Provider ${attempt.provider} failed.`, providerError);

                if (!isRetryableAiError(providerError) && attempts[attempts.length - 1]?.provider === attempt.provider) {
                    break;
                }
            }
        }

        throw (lastProviderError || new Error("AI providers failed"));

    } catch (error) {
        console.error("AI Generation Error:", error);
        throw error;
    }
}

// Helpers
export async function analyzeSentiment(text: string): Promise<"Positive" | "Neutral" | "Negative"> {
    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        // Always use OpenAI for lightweight utility tasks for consistency/speed/cost-predictability
        // Or could use the global provider too, but simpler to keep this fixed for now.
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "Classify: Positive, Neutral, Negative." },
                { role: "user", content: text }
            ],
            temperature: 0,
            max_tokens: 10
        });
        const sentiment = response.choices[0].message.content?.trim() || "Neutral";
        return ["Positive", "Neutral", "Negative"].includes(sentiment) ? sentiment as any : "Neutral";
    } catch { return "Neutral"; }
}

export async function saveMessageToSession(
    sessionId: string,
    chatbotId: string,
    message: Partial<ChatSessionMessageRecord> & { role: string; content: string },
    userId?: string
) {
    await upsertChatSessionRecord({
        sessionId,
        chatbotId,
        userId,
        message: {
            id: message.id || Date.now().toString(),
            role: message.role,
            content: message.content,
            sentiment: message.sentiment,
            guidedUi: message.guidedUi,
            guidedEvent: message.guidedEvent,
            externalId: message.externalId,
            createdAt: message.createdAt || new Date().toISOString(),
        },
    });
}
