import { getAdminDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";
import { generateAIResponse, saveMessageToSession, analyzeSentiment, type AIMessage } from "@/lib/ai-service";
import { trackAiUsage } from "@/lib/usage-tracker";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limiter";
import { isAppointmentConfirmation, extractAppointmentData } from "@/lib/appointment-extractor";
import { isLeadConfirmation, extractLeadData } from "@/lib/lead-extractor";
import { resolveConversationLanguage, toCopyLanguage } from "@/lib/conversation-language";

export const runtime = 'nodejs';

type ChatMessage = {
    role?: string;
    content?: string;
    id?: string;
};

type ChatRequestBody = {
    messages?: ChatMessage[];
    chatbotId?: string;
    sessionId?: string;
    context?: unknown;
    language?: string;
    isVoice?: boolean;
    shouldStream?: boolean;
    userId?: string;
    visualAnalysisContext?: string;
    assistantMessageId?: string;
    industry?: string;
};

type NormalizedChatMessage = AIMessage & {
    id?: string;
};

type UserContextPayload = {
    url: string;
    title: string;
    desc: string;
    description?: string;
    pageText?: string;
    dynamicData?: Record<string, any>;
    siteSessionContext?: Record<string, any>;
    crawlStatus?: Record<string, any>;
};

function isUserContextPayload(value: unknown): value is UserContextPayload {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Record<string, unknown>;
    return typeof candidate.url === "string"
        && typeof candidate.title === "string"
        && (typeof candidate.desc === "string" || typeof candidate.description === "string");
}

type ShopperProduct = {
    id: string;
    name?: string;
    description?: string;
    price?: number | string;
    currency?: string;
    imageUrl?: string;
    url?: string;
    category?: string;
    inStock?: boolean;
};

const TR_STOPWORDS = new Set([
    "ve", "ile", "bir", "bu", "için", "ama", "gibi", "olan", "olanlar", "bana", "şu", "de", "da", "mı", "mi", "mu", "mü", "ne", "hangi", "yap", "yapar", "lütfen"
]);

const EN_STOPWORDS = new Set([
    "the", "and", "for", "with", "this", "that", "from", "have", "your", "please", "can", "could", "would", "make", "give", "about"
]);

function normalizeText(input: string): string {
    return input
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

type UILang = "tr" | "en" | "de" | "fr" | "es";

const FALLBACK_COPY: Record<UILang, { intro: string; closing: string; noPrice: string; noCatalog: string }> = {
    tr: {
        intro: "AI anahtarı yerelde eksik olduğu için katalogdan hızlı öneri hazırladım:",
        closing: "İstersen bütçe, kişi (kadın/erkek/çocuk) ve kategori yaz; daha nokta atışı öneri yapayım.",
        noPrice: "Fiyat bilgisi yok",
        noCatalog: "Shopper modülü aktif görünüyor ama katalogda henüz ürün yok. Konsoldan ürün ekledikten sonra tekrar deneyin."
    },
    en: {
        intro: "AI key is missing locally, so I prepared quick recommendations from your catalog:",
        closing: "Share budget, recipient (woman/man/kid), and category, and I will refine the suggestions.",
        noPrice: "Price unavailable",
        noCatalog: "Shopper is enabled, but there are no products in the catalog yet. Add products from console and try again."
    },
    de: {
        intro: "Da der AI-Schlüssel lokal fehlt, habe ich schnelle Empfehlungen aus deinem Katalog vorbereitet:",
        closing: "Nenne Budget, Empfänger (Frau/Mann/Kind) und Kategorie, dann verfeinere ich die Vorschläge.",
        noPrice: "Preis nicht verfügbar",
        noCatalog: "Shopper ist aktiv, aber im Katalog sind noch keine Produkte vorhanden."
    },
    fr: {
        intro: "La clé AI n'étant pas disponible en local, j'ai préparé des recommandations rapides depuis votre catalogue :",
        closing: "Indiquez le budget, le destinataire (femme/homme/enfant) et la catégorie pour des recommandations plus précises.",
        noPrice: "Prix indisponible",
        noCatalog: "Le module Shopper est actif, mais aucun produit n'est encore présent dans le catalogue."
    },
    es: {
        intro: "Como falta la clave de AI en local, preparé recomendaciones rápidas desde tu catálogo:",
        closing: "Comparte presupuesto, destinatario (mujer/hombre/niño) y categoría para afinar las recomendaciones.",
        noPrice: "Precio no disponible",
        noCatalog: "Shopper está activo, pero aún no hay productos en el catálogo."
    }
};

function resolveUiLanguage(language: string | undefined, userText: string): UILang {
    return toCopyLanguage(resolveConversationLanguage({
        explicitLanguage: language,
        userText,
    }));
}

function extractKeywords(query: string): string[] {
    const normalized = normalizeText(query);
    if (!normalized) return [];

    const tokens = normalized.split(" ");
    return tokens.filter((token) => {
        if (token.length < 3) return false;
        return !TR_STOPWORDS.has(token) && !EN_STOPWORDS.has(token);
    });
}

function rankProducts(products: ShopperProduct[], userQuery: string): ShopperProduct[] {
    const normalizedQuery = normalizeText(userQuery);
    const keywords = extractKeywords(normalizedQuery);

    if (!keywords.length) return products;

    const scored = products.map((product, index) => {
        const haystack = normalizeText(
            `${product.name || ""} ${product.description || ""} ${product.category || ""}`
        );

        let score = 0;
        for (const keyword of keywords) {
            if (haystack.includes(keyword)) {
                const inTitle = normalizeText(product.name || "").includes(keyword);
                score += inTitle ? 3 : 1;
            }
        }

        if (normalizedQuery.includes("hediye") && /hediye|gift/.test(haystack)) {
            score += 2;
        }

        return { product, score, index };
    });

    scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.index - b.index;
    });

    return scored.map((entry) => entry.product);
}

function toCardPayload(product: ShopperProduct): Record<string, string | number> {
    const description = typeof product.description === "string"
        ? product.description.trim().slice(0, 180)
        : "";

    const payload: Record<string, string | number> = {
        name: product.name || "Product",
        price: typeof product.price === "number"
            ? product.price
            : (product.price ? String(product.price) : "N/A"),
        currency: product.currency || "₺",
    };

    if (description) payload.description = description;
    if (product.imageUrl) payload.imageUrl = product.imageUrl;
    if (product.url) payload.url = product.url;

    return payload;
}

function buildShopperFallbackMessage(products: ShopperProduct[], uiLang: UILang): string {
    const intro = FALLBACK_COPY[uiLang].intro;
    const closing = FALLBACK_COPY[uiLang].closing;

    const lines: string[] = [intro, ""];
    const carouselPayload = {
        type: "product-carousel",
        items: products.map((product) => toCardPayload(product))
    };

    lines.push("```json");
    lines.push(JSON.stringify(carouselPayload, null, 2));
    lines.push("```");
    lines.push("");

    lines.push(closing);
    return lines.join("\n").trim();
}

async function tryShopperFallback(body: ChatRequestBody | null | undefined): Promise<string | null> {
    if (!body?.chatbotId) return null;

    const adminDb = getAdminDb();
    if (!adminDb) return null;

    const chatbotSnap = await adminDb.collection("chatbots").doc(body.chatbotId).get();
    if (!chatbotSnap.exists) return null;

    const chatbotData = chatbotSnap.data() || {};
    if (chatbotData.enablePersonalShopper !== true) return null;

    const productSnap = await adminDb
        .collection("products")
        .where("chatbotId", "==", body.chatbotId)
        .limit(200)
        .get();

    const products = productSnap.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<ShopperProduct, "id">) }))
        .filter((product) => typeof product.name === "string" && product.name.trim().length > 0)
        .filter((product) => product.inStock !== false);

    const userMessage = [...(body.messages || [])]
        .reverse()
        .find((message) => message?.role === "user" && typeof message.content === "string");
    const userText = userMessage?.content || "";
    const uiLang = resolveUiLanguage(body.language, userText);

    if (!products.length) {
        return FALLBACK_COPY[uiLang].noCatalog;
    }

    const ranked = rankProducts(products, userText);
    const picks = ranked.slice(0, 3);
    return buildShopperFallbackMessage(picks, uiLang);
}

export async function POST(req: Request) {
    let body: ChatRequestBody = {};

    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            console.error("Chat API: Firebase Admin SDK not initialized");
            return new Response(JSON.stringify({ error: "Service unavailable" }), { status: 503 });
        }
        // Rate limiting check
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            || req.headers.get("x-real-ip")
            || "unknown";

        const parsedBody = await req.json();
        body = (parsedBody && typeof parsedBody === "object" ? parsedBody : {}) as ChatRequestBody;
        const {
            messages = [],
            chatbotId,
            sessionId,
            context,
            language,
            isVoice,
            shouldStream = true,
            userId,
            visualAnalysisContext,
            assistantMessageId
        } = body;

        if (!chatbotId || messages.length === 0) {
            return NextResponse.json(
                { error: "Invalid request body: chatbotId and messages are required." },
                { status: 400 }
            );
        }

        const normalizedMessages: NormalizedChatMessage[] = messages
            .filter((message): message is NormalizedChatMessage => {
                const validRole = message?.role === "user" || message?.role === "assistant" || message?.role === "system";
                const validContent = typeof message?.content === "string";
                return validRole && validContent;
            })
            .map((message) => ({
                id: message.id,
                role: message.role as AIMessage["role"],
                content: message.content as string
            }));

        if (normalizedMessages.length === 0) {
            return NextResponse.json(
                { error: "Invalid request body: at least one valid message is required." },
                { status: 400 }
            );
        }
        const latestUserText = [...normalizedMessages]
            .reverse()
            .find((message) => message.role === "user" && message.content.trim())
            ?.content || "";
        const resolvedLanguage = resolveConversationLanguage({
            explicitLanguage: language,
            userText: latestUserText,
        });
        const safeContext = isUserContextPayload(context)
            ? {
                ...(context as UserContextPayload),
                desc: typeof (context as any).desc === "string"
                    ? (context as any).desc
                    : (typeof (context as any).description === "string" ? (context as any).description : "")
            }
            : undefined;

        // Rate limiting check
        const rateLimitResult = checkRateLimit(ip, sessionId);
        if (!rateLimitResult.allowed) {
            return new Response(
                JSON.stringify({ error: "Too many requests", reason: rateLimitResult.reason }),
                { status: 429, headers: { ...getRateLimitHeaders(rateLimitResult), 'Content-Type': 'application/json' } }
            );
        }

        // === TRIAL EXPIRATION CHECK ===
        // Check if the tenant's trial has expired and block the widget
        if (userId) {
            try {
                const userDoc = await adminDb.collection('users').doc(userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();

                    // === ACCOUNT STATUS CHECK ===
                    // Explicitly check for false, default to true if undefined to be safe
                    if (userData?.isActive === false) {
                        console.log(`[CHAT API] Account is inactive for user ${userId}, blocking widget`);
                        return NextResponse.json({
                            error: "account_inactive",
                            message: "Bu sohbet botu şu anda aktif değil. Lütfen site yöneticisi ile iletişime geçin.",
                            isInactive: true
                        }, { status: 403 });
                    }

                    const subscriptionStatus = userData?.subscriptionStatus;
                    const trialEndsAt = userData?.trialEndsAt;

                    // If subscription is 'trial' and trial has expired, block the request
                    if (subscriptionStatus === 'trial' && trialEndsAt) {
                        const now = new Date();
                        const endDate = new Date(trialEndsAt);
                        const isExpired = endDate.getTime() < now.getTime();

                        if (isExpired) {
                            console.log(`[CHAT API] Trial expired for user ${userId}, blocking widget`);
                            return NextResponse.json({
                                error: "trial_expired",
                                message: "Deneme süreniz sona erdi. Devam etmek için lütfen bir plan seçin.",
                                shouldUpgrade: true
                            }, { status: 402 }); // 402 Payment Required
                        }
                    }
                }
            } catch (trialCheckError) {
                console.error('[CHAT API] Error checking trial status:', trialCheckError);
                // Don't block on error, just log and continue
            }
        }
        // === END TRIAL EXPIRATION CHECK ===

        // ... existing rate limit codes ...

        // ... existing pause check codes ...

        // Parallelize: Save user message and start generating AI response
        const lastMessage = normalizedMessages[normalizedMessages.length - 1]!;
        const messageId = lastMessage.id || Date.now().toString();
        const userContent = typeof lastMessage.content === "string" ? lastMessage.content : "";

        const [saveResult, result] = await Promise.all([
            sessionId && lastMessage.role === "user" && userContent
                ? saveMessageToSession(
                    sessionId,
                    chatbotId,
                    { id: messageId, role: "user", content: userContent, sentiment: "Neutral" },
                    userId
                )
                : Promise.resolve(),
            generateAIResponse(chatbotId, normalizedMessages, sessionId, shouldStream, safeContext, isVoice, resolvedLanguage, visualAnalysisContext, body.industry)
        ]);

        // ... sentiment code ...

        // Estimate Input Tokens
        const inputContent = normalizedMessages.map((m) => m.content).join(" ");
        const estimatedInputTokens = Math.ceil(inputContent.length / 4);

        if (result.isStream) {
            const stream = (result as any).stream;
            const encoder = new TextEncoder();
            let fullContent = '';

            const readableStream = new ReadableStream({
                async start(controller) {
                    try {
                        for await (const content of stream) {
                            if (content) {
                                fullContent += content;
                                controller.enqueue(encoder.encode(content));
                            }
                        }

                        // Save assistant response after stream completes using PRE-GENERATED ID
                        if (sessionId && fullContent) {
                            await saveMessageToSession(sessionId, chatbotId, {
                                role: "assistant",
                                content: fullContent,
                                id: assistantMessageId // <--- USE THIS ID
                            }, userId);

                            // Check if this is an appointment confirmation and save it
                            if (isAppointmentConfirmation(fullContent)) {

                                try {
                                    // Extract appointment data using the clean extractor
                                    const extractedData = extractAppointmentData(normalizedMessages, fullContent);

                                    // Validate we have minimum required data
                                    if (!extractedData.customerEmail && !extractedData.customerPhone) {
                                        // No contact info, skip save
                                    } else {
                                        // Double-check adminDb is available
                                        if (!adminDb) {
                                            console.error("Chat API: ❌ adminDb is null for appointment save!");
                                        } else {
                                            // Save appointment to Firestore
                                            const appointmentDoc = {
                                                chatbotId,
                                                customerName: extractedData.customerName || "Guest",
                                                customerEmail: extractedData.customerEmail || "",
                                                customerPhone: extractedData.customerPhone || "",
                                                date: extractedData.date || "",
                                                time: extractedData.time || "",
                                                sessionId,
                                                status: 'pending',
                                                createdAt: new Date()
                                            };

                                            await adminDb.collection("appointments").add(appointmentDoc);

                                            // Sync to Google Calendar if connected
                                            try {
                                                const chatbotDoc = await adminDb.collection("chatbots").doc(chatbotId).get();
                                                const integrations = chatbotDoc.data()?.integrations || {};

                                                if (integrations.googleCalendar?.connected && extractedData.date && extractedData.time) {
                                                    // Parse date and time
                                                    const dateStr = extractedData.date;
                                                    const timeStr = extractedData.time;

                                                    // Combine date and time into ISO format
                                                    let startDateTime: string;
                                                    let endDateTime: string;

                                                    try {
                                                        const date = new Date(`${dateStr}T${timeStr}`);
                                                        startDateTime = date.toISOString();
                                                        endDateTime = new Date(date.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour default
                                                    } catch {
                                                        // Fallback: use current date/time if parsing fails
                                                        const now = new Date();
                                                        startDateTime = now.toISOString();
                                                        endDateTime = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
                                                    }

                                                    await fetch(`${new URL(req.url).origin}/api/integrations/google-calendar/events`, {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({
                                                            userId: chatbotId,
                                                            eventData: {
                                                                summary: `Appointment with ${extractedData.customerName || 'Guest'}`,
                                                                description: `Appointment scheduled via chatbot\nEmail: ${extractedData.customerEmail || 'N/A'}\nPhone: ${extractedData.customerPhone || 'N/A'}`,
                                                                start: { dateTime: startDateTime, timeZone: "UTC" },
                                                                end: { dateTime: endDateTime, timeZone: "UTC" },
                                                                attendees: extractedData.customerEmail ? [{ email: extractedData.customerEmail }] : []
                                                            }
                                                        })
                                                    });

                                                }
                                            } catch (syncError) {
                                                console.error("Chat API: ❌ Google Calendar sync error:", syncError);
                                            }
                                        }
                                    }
                                } catch (appointmentError: any) {
                                    console.error("Chat API: ❌ Appointment save failed:", appointmentError?.message || appointmentError);
                                }
                            }


                            // Check if this is a lead confirmation and save it
                            if (isLeadConfirmation(fullContent)) {
                                try {
                                    const leadData = extractLeadData(normalizedMessages);

                                    // IMPORTANT: Only save if we have REAL contact info (email or phone)
                                    // Don't save if only name exists, as it might be incorrectly extracted from chat messages
                                    const hasRealContactInfo = leadData.email || leadData.phone;

                                    if (hasRealContactInfo) {
                                        if (!adminDb) {
                                            console.error("Chat API: ❌ adminDb is null for lead save!");
                                        } else {
                                            // Get translation for source based on language
                                            const sourceText = resolvedLanguage === 'tr'
                                                ? "Sohbet İçi Konuşma"
                                                : "In-Chat Conversation";

                                            const leadDoc = {
                                                chatbotId,
                                                name: leadData.name || (resolvedLanguage === 'tr' ? "Anonim" : "Anonymous"),
                                                email: leadData.email || "",
                                                phone: leadData.phone || "",
                                                source: sourceText,
                                                customFields: leadData.company ? { company: leadData.company } : {},
                                                sessionId,
                                                createdAt: new Date()
                                            };

                                            await adminDb.collection("leads").add(leadDoc);

                                            // External lead sync integrations (Salesforce/Mailchimp/Constant Contact)
                                            // are intentionally disabled.
                                        }
                                    } else {

                                    }
                                } catch (leadError: any) {
                                    console.error("Chat API: ❌ Lead save failed:", leadError?.message || leadError);
                                }
                            }
                        }

                        // Track Usage (Async, Fire-and-forget)
                        const estimatedOutputTokens = Math.ceil(fullContent.length / 4);
                        // TODO: Pass actual model used from result.modelUsed
                        const modelUsed = (result as any).modelUsed || "gpt-4o-mini";
                        trackAiUsage(chatbotId, estimatedInputTokens, estimatedOutputTokens, modelUsed);


                        controller.close();
                    } catch (error) {
                        controller.error(error);
                    }
                }
            });

            return new Response(readableStream, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Transfer-Encoding': 'chunked',
                },
            });
        } else {
            return new Response(result.content, { status: 200 });
        }

    } catch (error) {
        console.error("Chat API Error:", error);
        const rawMessage = error instanceof Error ? error.message : String(error);
        const lowered = rawMessage.toLowerCase();
        const isConfigError = lowered.includes("no ai provider is configured") || lowered.includes("api key");

        if (isConfigError) {
            try {
                const fallbackResponse = await tryShopperFallback(body);
                if (fallbackResponse) {
                    if (body?.sessionId && body?.chatbotId) {
                        try {
                            await saveMessageToSession(
                                body.sessionId,
                                body.chatbotId,
                                {
                                    role: "assistant",
                                    content: fallbackResponse,
                                    id: body.assistantMessageId || `assistant-fallback-${Date.now()}`
                                },
                                body.userId
                            );
                        } catch (saveFallbackError) {
                            console.error("Chat API: Failed to persist fallback response:", saveFallbackError);
                        }
                    }

                    return new Response(fallbackResponse, {
                        status: 200,
                        headers: { "Content-Type": "text/plain; charset=utf-8" }
                    });
                }
            } catch (fallbackError) {
                console.error("Chat API: Shopper fallback failed:", fallbackError);
            }
        }

        const message = isConfigError
            ? "AI service configuration is incomplete. Please contact support."
            : "AI service is temporarily unavailable. Please try again.";

        return new Response(
            JSON.stringify({ error: "ai_unavailable", message }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
