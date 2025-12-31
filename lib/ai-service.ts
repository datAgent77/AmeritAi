
import { OpenAI } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pinecone } from "@pinecone-database/pinecone";
import { getAdminDb } from "@/lib/firebase-admin";
import { INDUSTRY_CONFIG } from "@/lib/industry-config";
import { getAllModules } from "@/lib/modules-registry";

// Initialize Pinecone (Always needed for RAG)
const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
});

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
    return { provider: "openai", model: "gpt-3.5-turbo" };
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
    userContext?: { url: string, title: string, desc: string },
    isVoice?: boolean,
    language?: string
) {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) throw new Error("Firebase Admin not initialized");

        // 1. Fetch Global AI Configuration
        const globalAiConfig = await getSystemConfig(adminDb);

        // 2. Get Chatbot Config & Context
        console.log(`AI Service: Fetching chatbot config`, { chatbotId });
        const lastMessage = messages[messages.length - 1];

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
            model = tenantAiConfig.model || globalAiConfig.model || "gpt-3.5-turbo";
            apiKey = tenantAiConfig.apiKey || globalAiConfig.apiKey;
            console.log(`AI Service: Using TENANT config for ${chatbotId}: ${provider}/${model}`);
        } else {
            // Use global configuration
            provider = globalAiConfig.provider || "openai";
            model = globalAiConfig.model || "gpt-3.5-turbo";
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
        const sectorId = rawSector || rawSectorId || rawIndustry;
        console.log(`AI Service [SECTOR DEBUG]: chatbotId=${chatbotId}, rawSectorId=${rawSectorId}, rawIndustry=${rawIndustry}, rawSector=${rawSector}, using=${sectorId}`);
        const industry = normalizeIndustry(sectorId);
        console.log(`AI Service [SECTOR DEBUG]: Normalized to: ${industry}`);
        const industryConfig = INDUSTRY_CONFIG[industry as keyof typeof INDUSTRY_CONFIG];

        // RAG Setup
        const index = pc.index("chatbot-knowledge");
        let context = "";
        const isKnowledgeBaseEnabled = chatbotData?.enableKnowledgeBase !== false;

        if (isKnowledgeBaseEnabled) {
            // Needed for Embedding - OpenAI is standard for embedding even if chat is Gemini (for now)
            // Or use Gemini embeddings if fully Google? For stability, sticking to OpenAI for embeddings
            // as vector dimensions must match Pinecone index (1536).
            const embeddingClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

            const embeddingResponse = await embeddingClient.embeddings.create({
                model: "text-embedding-3-small",
                input: lastMessage.content,
            });
            const embedding = embeddingResponse.data[0].embedding;
            const queryResponse = await index.query({
                vector: embedding,
                topK: 5,
                includeMetadata: true,
                filter: { chatbotId: chatbotId }
            });
            context = queryResponse.matches.map((m) => m.metadata?.text).join("\n\n");
        }

        // 3. Prepare System Prompt (Same Logic)
        let systemPrompt = `
# ROLE & IDENTITY
You are an advanced AI Assistant for ${chatbotId}.
Your goal is to provide accurate, helpful, and professional support.
${industryConfig.systemPrompt}

# KNOWLEDGE BASE CONTEXT
${context ? `Use this context to answer:\n${context}` : "No specific context available."}

# STRICT RULES
1. Answer directly.
2. Be concise.
3. Links: [Text](URL).
4. If answer is unknown and not general knowledge, admit it.
5. Use Markdown.
`;

        if (isShopperEnabled && shopperConfig) {
            systemPrompt += `\n# PERSONAL SHOPPER\nTone: ${shopperConfig.salesTone || "friendly"}. Recommend products.`;
        }

        if (language && language !== 'auto') {
            const langs: any = { 'en': 'English', 'tr': 'Turkish' };
            systemPrompt += `\n# LANGUAGE\nMust respond in ${langs[language] || 'English'}.`;
        }

        // Add User Context
        if (userContext) {
            systemPrompt += `\n# USER CONTEXT\nURL: ${userContext.url}\nTitle: ${userContext.title}`;
        }

        // Voice Mode
        if (isVoice) {
            systemPrompt += `\n# VOICE MODE\nMake it short and conversational.`;
        }

        // 5. INJECT ACTIVE MODULE INSTRUCTIONS
        const allModules = getAllModules();
        const activeModuleInstructions: string[] = [];

        console.log("AI Service: Checking module instructions. ChatbotData keys:", Object.keys(chatbotData || {}));

        for (const mod of allModules) {
            // Check if module is enabled
            // 1. Core modules are always active
            // 2. Legacy field check in chatbotData
            // 3. For voiceAppointments, also check enableAppointments
            let isEnabled = mod.isCore || (mod.legacyFirestoreField && chatbotData?.[mod.legacyFirestoreField] === true);

            // Special case for appointments/voice - check multiple field names
            if (mod.id === 'voiceAssistant' && !isEnabled) {
                isEnabled = chatbotData?.enableAppointments === true || chatbotData?.enableVoiceAppointments === true;
            }

            if (isEnabled && mod.aiSystemInstruction) {
                console.log(`AI Service: Module ${mod.id} is ENABLED, injecting instruction`);
                const langKey = (language === 'tr') ? 'tr' : 'en';
                let instruction = mod.aiSystemInstruction[langKey] || mod.aiSystemInstruction['en'];

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
        const fullMessages = [
            { role: "system", content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
        ];

        let resultStream;
        let resultContent = "";

        if (provider === 'google') {
            // Google Gemini Logic
            const genAI = new GoogleGenerativeAI(apiKey || process.env.GOOGLE_API_KEY!);
            const geminiModel = genAI.getGenerativeModel({ model: model }); // e.g. gemini-1.5-flash

            // Convert messages to Gemini format (System prompt is usually separate or first part)
            // Gemini API uses 'user'/'model' roles. System instruction is passed to getGenerativeModel (new API) 
            // or prepended. GenerativeModelConfig supports systemInstruction in newer versions.
            // For safety, I'll Prepend system prompt to history or use systemInstruction if package supports.
            // The @google/generative-ai package structure:
            // messages: { role: 'user'|'model', parts: [{ text: ... }] }

            // Converting generic messages to Gemini history
            const history = messages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

            // Handle System Prompt: Use systemInstruction if available or prepend
            const chat = geminiModel.startChat({
                history: history,
                systemInstruction: systemPrompt
            });

            const lastMsgContent = lastMessage.content;

            if (streamResponse) {
                const result = await chat.sendMessageStream(lastMsgContent);
                resultStream = streamGoogle(result);
                return { stream: resultStream, isStream: true, context, modelUsed: model };
            } else {
                const result = await chat.sendMessage(lastMsgContent);
                resultContent = result.response.text();
                return { content: resultContent, isStream: false, context, modelUsed: model };
            }

        } else {
            // Default: OpenAI
            const openai = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });

            if (streamResponse) {
                const response = await openai.chat.completions.create({
                    model: model,
                    stream: true,
                    messages: fullMessages as any,
                });
                resultStream = streamOpenAI(response);
                return { stream: resultStream, isStream: true, context, modelUsed: model };
            } else {
                const response = await openai.chat.completions.create({
                    model: model,
                    stream: false,
                    messages: fullMessages as any,
                });
                resultContent = response.choices[0].message.content || "";

                // Save non-streamed immediately
                if (sessionId) {
                    await saveMessageToSession(sessionId, chatbotId, { role: "assistant", content: resultContent });
                }

                return { content: resultContent, isStream: false, context, modelUsed: model };
            }
        }

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
            model: "gpt-3.5-turbo",
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
