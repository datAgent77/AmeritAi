
import { OpenAI } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pinecone } from "@pinecone-database/pinecone";
import { getAdminDb } from "@/lib/firebase-admin";
import { INDUSTRY_CONFIG } from "@/lib/industry-config";
import { getAllModules } from "@/lib/modules-registry";
import { resolveConversationLanguage } from "@/lib/conversation-language";

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

    if (resolvedLanguage === "tr" || /[çğıöşü]/.test(q) || /\b(nedir|nasıl|kaç|ne kadar|adres|şifre|telefon)\b/.test(q)) {
        return "Bu konuda doğrulanmış bir bilgiye sahip değilim. Emin olmadığım bir detayı uydurmak istemem.";
    }

    if (resolvedLanguage === "de") {
        return "Dazu habe ich aktuell keine verifizierte Information, deshalb mochte ich nichts erfinden.";
    }

    if (resolvedLanguage === "fr") {
        return "Je n'ai pas d'information verifiee sur ce point pour le moment, donc je prefere ne pas deviner.";
    }

    if (resolvedLanguage === "es") {
        return "No tengo informacion verificada sobre ese detalle en este momento, asi que prefiero no adivinar.";
    }

    if (resolvedLanguage === "ar") {
        return "لا أملك معلومة موثقة عن هذه النقطة الآن، ولا أريد التخمين.";
    }

    if (resolvedLanguage === "ru") {
        return "У меня сейчас нет подтвержденной информации по этой детали, и я не хочу гадать.";
    }

    return "I don't have verified information for that detail right now, and I don't want to guess.";
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
        siteSessionContext?: Record<string, any>,
        crawlStatus?: Record<string, any>
    },
    isVoice?: boolean,
    language?: string,
    visualAnalysisContext?: string,
    forcedIndustry?: string
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
            console.log(`AI Service [KNOWLEDGE DEBUG]: Knowledge base DISABLED for chatbotId=${chatbotId}`);
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

# TURN LANGUAGE
The latest user message is currently in "${resolvedLanguage}".
Reply in that same language for this turn unless the user explicitly switches languages.

# KNOWLEDGE BASE CONTEXT
${context ? `Use this context to answer:\n${context}\n\n[CONTEXT RULE]: If the context above says "visit our website for details" or "contact us for more info", YOU MUST IGNORE THAT INSTRUCTION. Instead, extract and summarize the actual information (features, specs, policies) from the context. If the specific detail is missing, say "I don't have that specific detail."` : "No specific context available."}

# CONTEXT AUTHORITY & TRUTH
The information provided in the KNOWLEDGE BASE CONTEXT is the **absolute truth** for this chatbot.
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

        // Language Mirroring: AI responds in whatever language the user writes
        systemPrompt += `\n# LANGUAGE - CRITICAL
Detect the language and script the user is writing in. ALWAYS respond in that SAME language.
RULES:
1. If user writes in German → respond in German.
2. If user writes in Russian (Cyrillic script like "Привет") → respond in Russian.
3. If user writes in Turkish → respond in Turkish.
4. If user writes in French → respond in French.
5. If user writes in Spanish → respond in Spanish.
6. If user writes in Arabic → respond in Arabic.
7. If user writes in any other language, mirror that language.
8. FALLBACK: If you cannot determine the language, respond in English.
Mirror the user's language exactly. Do NOT default to Turkish or another language unless the user wrote in that language.`;

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
- Search your knowledge base thoroughly
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

        // Add User Context
        if (userContext) {
            systemPrompt += `\n# USER CONTEXT\nURL: ${userContext.url}\nTitle: ${userContext.title}`;
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
            systemPrompt += `\n# VOICE MODE\nMake it short and conversational.`;
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
                    if (waiterConfig) {
                        const serviceMode = waiterConfig.serviceMode || 'table_service';
                        const isTR = langKey === 'tr';
                        let waiterPrompt = "";

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
                            // corrected quote 
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

                        // Shared Menu Info
                        if (waiterConfig.menuUrl) {
                            waiterPrompt += isTR ? `📄 Dijital Menü Linki: ${waiterConfig.menuUrl}\n` : `📄 Digital Menu Link: ${waiterConfig.menuUrl}\n`;
                        }

                        if (waiterConfig.signatureDishes && waiterConfig.signatureDishes.length > 0) {
                            const dishes = waiterConfig.signatureDishes.join(', ');
                            waiterPrompt += isTR
                                ? `🌟 ÖNERİLECEK İMZA ÜRÜNLER (Israrla tavsiye et): ${dishes}\n`
                                : `🌟 SIGNATURE ITEMS TO RECOMMEND (Strongly suggest these): ${dishes}\n`;
                        }

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
                    const siteSessionContext = userContext?.siteSessionContext;
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

        // 4. Generate Response based on Provider

        // Context Window Protection: Keep only last 12 messages
        const MAX_HISTORY_LENGTH = 12;
        const recentMessages = messages.length > MAX_HISTORY_LENGTH
            ? messages.slice(-MAX_HISTORY_LENGTH)
            : messages;

        console.log(`AI Service: Using ${recentMessages.length} messages (truncated from ${messages.length}) to save tokens.`);

        const fullMessages = [
            { role: "system", content: systemPrompt },
            ...recentMessages.map((m) => ({ role: m.role, content: m.content })),
        ];

        const configuredApiKey = typeof apiKey === "string" ? apiKey.trim() : "";
        const envOpenAiKey = process.env.OPENAI_API_KEY?.trim() || "";
        const envGoogleKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || "";
        const openAiApiKey = provider === "openai" ? (configuredApiKey || envOpenAiKey) : envOpenAiKey;
        const googleApiKey = provider === "google" ? (configuredApiKey || envGoogleKey) : envGoogleKey;

        const attempts: Array<{ provider: "openai" | "google"; model: string; apiKey: string }> = [];
        const pushAttempt = (attempt: { provider: "openai" | "google"; model: string; apiKey: string }) => {
            if (!attempt.apiKey) return;
            if (attempts.some((existing) => existing.provider === attempt.provider)) return;
            attempts.push(attempt);
        };

        if (provider === "google") {
            pushAttempt({ provider: "google", model, apiKey: googleApiKey });
            pushAttempt({ provider: "openai", model: "gpt-4o-mini", apiKey: openAiApiKey });
        } else {
            pushAttempt({ provider: "openai", model, apiKey: openAiApiKey });
            pushAttempt({ provider: "google", model: "gemini-1.5-flash", apiKey: googleApiKey });
        }

        if (attempts.length === 0) {
            throw new Error("No AI provider is configured. Add OPENAI_API_KEY or GEMINI_API_KEY.");
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

                    const result = await chat.sendMessage(lastMsgContent);
                    return { content: result.response.text(), isStream: false, context, modelUsed: attempt.model };
                }

                const openai = new OpenAI({ apiKey: attempt.apiKey });
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
                const resultContent = response.choices[0].message.content || "";

                if (sessionId) {
                    await saveMessageToSession(sessionId, chatbotId, { role: "assistant", content: resultContent });
                }

                return { content: resultContent, isStream: false, context, modelUsed: attempt.model };
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
    message: { role: string, content: string, id?: string, sentiment?: string },
    userId?: string
) {
    const adminDb = getAdminDb();
    if (!adminDb) return;

    const sessionRef = adminDb.collection("chat_sessions").doc(sessionId);
    const sessionSnap = await sessionRef.get();

    if (!sessionSnap.exists) {
        await sessionRef.set({
            chatbotId,
            createdAt: new Date().toISOString(),
            messages: [],
            ...(userId ? { userId } : {})
        });
    } else if (userId && !sessionSnap.data()?.userId) {
        // Backfill userId if missing (and provided)
        await sessionRef.update({ userId });
    }

    const m = {
        id: message.id || Date.now().toString(),
        role: message.role,
        content: message.content,
        createdAt: new Date().toISOString(),
        ...(message.sentiment ? { sentiment: message.sentiment } : {})
    };

    const { FieldValue } = require('firebase-admin/firestore');
    await sessionRef.update({ messages: FieldValue.arrayUnion(m) }).catch(() => {
        sessionRef.set({ messages: [m] }, { merge: true });
    });
}
