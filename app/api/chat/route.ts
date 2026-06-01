import { getAdminDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";
import { generateAIResponse, saveMessageToSession, analyzeSentiment, type AIMessage } from "@/lib/ai-service";
import { upsertChatSessionRecord } from "@/lib/chat-sessions";
import { normalizeGuidedSkillState } from "@/lib/guided-skills";
import { resolveGuidedSkillTurn } from "@/lib/guided-skills/engine";
import type { GuidedSkillClientEvent } from "@/lib/guided-skills/types";
import { buildAiGeneratedGuidedUi, extractGuidedOptionsFromContent } from "@/lib/guided-ai";
import {
    getHumanHandoffAssistantMessage,
    getHumanHandoffContactPromptMessage,
    getHumanHandoffOutsideBusinessHoursMessage,
    getHumanHandoffUnavailableMessage,
    isExplicitHumanHandoffRequest,
    isHumanHandoffWithinBusinessHours,
    resolveHumanHandoffNotificationEmail,
    resolveHumanHandoffSettings,
} from "@/lib/human-handoff";
import { createAndNotifyHumanHandoff } from "@/lib/human-handoff-server";
import { trackAiUsage } from "@/lib/usage-tracker";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limiter";
import { isAppointmentConfirmation, extractAppointmentData } from "@/lib/appointment-extractor";
import { isLeadConfirmation, extractLeadData } from "@/lib/lead-extractor";
import { normalizePhoneNumber, upsertContactGraph, upsertWebChatSession } from "@/lib/vion-web-session";
import { resolveConversationLanguage, toCopyLanguage } from "@/lib/conversation-language";
import { processWaiterRequestsFromAi } from "@/lib/waiter-request-server";

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
    guidedEvent?: GuidedSkillClientEvent | null;
    kvkkConsentVersion?: string;
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

async function updateSessionHandoffState(adminDb: any, sessionId: string, patch: Record<string, any>) {
    if (!sessionId) return;
    try {
        await adminDb.collection("chat_sessions").doc(sessionId).set({
            ...patch,
            updatedAt: new Date().toISOString(),
        }, { merge: true });
    } catch (error) {
        console.error("[CHAT API] Failed to update handoff state:", error);
    }
}

function isUserContextPayload(value: unknown): value is UserContextPayload {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Record<string, unknown>;
    return typeof candidate.url === "string"
        && typeof candidate.title === "string"
        && (typeof candidate.desc === "string" || typeof candidate.description === "string");
}

type WebIdentityHints = {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    aliases: Array<{ aliasType: string; aliasValue: string; verified?: boolean }>;
};

const EMAIL_KEYS = ["email", "customerEmail", "mail"];
const PHONE_KEYS = ["phone", "phoneNumber", "customerPhone", "mobile", "gsm", "telephone"];
const NAME_KEYS = ["name", "fullName", "displayName", "customerName"];
const FIRST_NAME_KEYS = ["firstName", "firstname", "givenName"];
const LAST_NAME_KEYS = ["lastName", "lastname", "surname", "familyName"];
const EXTERNAL_ID_KEYS = ["customerId", "customer_id", "accountId", "account_id", "memberId", "member_id", "profileId", "profile_id", "userId", "user_id"];

function asPlainObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function findNestedString(value: unknown, keys: string[], depth = 0): string | null {
    if (depth > 4) return null;
    if (typeof value === "string") return null;
    if (Array.isArray(value)) {
        for (const item of value) {
            const hit = findNestedString(item, keys, depth + 1);
            if (hit) return hit;
        }
        return null;
    }

    const record = asPlainObject(value);
    if (!record) return null;

    for (const [key, fieldValue] of Object.entries(record)) {
        if (typeof fieldValue === "string" && keys.some((candidate) => candidate.toLowerCase() === key.toLowerCase()) && fieldValue.trim()) {
            return fieldValue.trim();
        }
    }

    for (const nestedValue of Object.values(record)) {
        const hit = findNestedString(nestedValue, keys, depth + 1);
        if (hit) return hit;
    }

    return null;
}

function collectNestedAliasValues(value: unknown, keys: string[], depth = 0, bucket: Array<{ aliasType: string; aliasValue: string }>) {
    if (depth > 4) return;
    if (Array.isArray(value)) {
        for (const item of value) {
            collectNestedAliasValues(item, keys, depth + 1, bucket);
        }
        return;
    }

    const record = asPlainObject(value);
    if (!record) return;

    for (const [key, fieldValue] of Object.entries(record)) {
        if (typeof fieldValue === "string" && fieldValue.trim()) {
            const normalizedKey = key.toLowerCase();
            const matched = keys.find((candidate) => candidate.toLowerCase() === normalizedKey);
            if (matched) {
                bucket.push({
                    aliasType: `external:${matched.toLowerCase()}`,
                    aliasValue: fieldValue.trim(),
                });
            }
        } else if (typeof fieldValue === "number" && Number.isFinite(fieldValue)) {
            const normalizedKey = key.toLowerCase();
            const matched = keys.find((candidate) => candidate.toLowerCase() === normalizedKey);
            if (matched) {
                bucket.push({
                    aliasType: `external:${matched.toLowerCase()}`,
                    aliasValue: String(fieldValue),
                });
            }
        } else if (fieldValue && typeof fieldValue === "object") {
            collectNestedAliasValues(fieldValue, keys, depth + 1, bucket);
        }
    }
}

function extractWebIdentityHints(context?: UserContextPayload): WebIdentityHints {
    const sources = [context?.dynamicData, context?.siteSessionContext].filter(Boolean);
    const aliases: Array<{ aliasType: string; aliasValue: string; verified?: boolean }> = [];

    const email = sources.map((source) => findNestedString(source, EMAIL_KEYS)).find(Boolean) || null;
    const phoneRaw = sources.map((source) => findNestedString(source, PHONE_KEYS)).find(Boolean) || null;
    const phone = phoneRaw ? normalizePhoneNumber(phoneRaw) || phoneRaw : null;
    const directName = sources.map((source) => findNestedString(source, NAME_KEYS)).find(Boolean) || null;
    const firstName = sources.map((source) => findNestedString(source, FIRST_NAME_KEYS)).find(Boolean) || null;
    const lastName = sources.map((source) => findNestedString(source, LAST_NAME_KEYS)).find(Boolean) || null;
    const fallbackName = [firstName, lastName].filter(Boolean).join(" ").trim() || null;
    const name = directName || fallbackName;

    for (const source of sources) {
        collectNestedAliasValues(source, EXTERNAL_ID_KEYS, 0, aliases);
    }

    if (email) {
        aliases.push({ aliasType: "email", aliasValue: email, verified: true });
    }
    if (phone) {
        aliases.push({ aliasType: "phone", aliasValue: phone });
    }

    const deduped = new Map<string, { aliasType: string; aliasValue: string; verified?: boolean }>();
    for (const alias of aliases) {
        const key = `${alias.aliasType}:${alias.aliasValue}`.toLowerCase();
        const existing = deduped.get(key);
        deduped.set(key, {
            aliasType: alias.aliasType,
            aliasValue: alias.aliasValue,
            verified: alias.verified || existing?.verified || false,
        });
    }

    return {
        name,
        email: email ? email.toLowerCase() : null,
        phone,
        aliases: Array.from(deduped.values()),
    };
}

async function syncWebSessionIdentity(adminDb: any, params: {
    chatbotId: string;
    sessionId: string;
    context?: UserContextPayload;
}) {
    const identity = extractWebIdentityHints(params.context);
    const hasResolvableIdentity = Boolean(identity.email || identity.phone || identity.aliases.length > 0);
    if (!hasResolvableIdentity) {
        return null;
    }
    const contactKey =
        identity.email ||
        identity.phone ||
        identity.aliases[0]?.aliasValue ||
        params.sessionId;

    const contact = await upsertContactGraph(adminDb, {
        chatbotId: params.chatbotId,
        channel: "web",
        contactKey,
        displayName: identity.name || null,
        verifiedPhone: identity.phone || null,
        email: identity.email || null,
        aliases: identity.aliases.map((alias) => ({
            aliasType: alias.aliasType,
            aliasValue: alias.aliasValue,
            verified: alias.verified,
        })),
        notes: "Synced from web widget runtime context.",
    });

    await upsertWebChatSession(adminDb, {
        sessionId: params.sessionId,
        chatbotId: params.chatbotId,
        channel: "web",
        contactKey: contact.contactKey || contactKey,
        canonicalContactId: contact.id || null,
        visitorName: identity.name || null,
        visitorEmail: identity.email || null,
        channelMeta: {
            webIdentityResolved: Boolean(identity.email || identity.phone || identity.aliases.length > 0),
        },
    });

    return {
        contact,
        identity,
    };
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
    stockQuantity?: number;
    lowStockThreshold?: number;
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
        intro: "Elbette, katalogdaki öne çıkan ürünleri kart olarak gösteriyorum:",
        closing: "İstersen bütçe, kişi (kadın/erkek/çocuk) ve kategori yaz; daha nokta atışı öneri yapayım.",
        noPrice: "Fiyat bilgisi yok",
        noCatalog: "Shopper modülü aktif görünüyor ama katalogda henüz ürün yok. Konsoldan ürün ekledikten sonra tekrar deneyin."
    },
    en: {
        intro: "Sure, here are featured products from the catalog as product cards:",
        closing: "Share budget, recipient (woman/man/kid), and category, and I will refine the suggestions.",
        noPrice: "Price unavailable",
        noCatalog: "Shopper is enabled, but there are no products in the catalog yet. Add products from console and try again."
    },
    de: {
        intro: "Gerne, hier sind ausgewählte Produkte aus dem Katalog als Produktkarten:",
        closing: "Nenne Budget, Empfänger (Frau/Mann/Kind) und Kategorie, dann verfeinere ich die Vorschläge.",
        noPrice: "Preis nicht verfügbar",
        noCatalog: "Shopper ist aktiv, aber im Katalog sind noch keine Produkte vorhanden."
    },
    fr: {
        intro: "Bien sûr, voici des produits du catalogue sous forme de cartes :",
        closing: "Indiquez le budget, le destinataire (femme/homme/enfant) et la catégorie pour des recommandations plus précises.",
        noPrice: "Prix indisponible",
        noCatalog: "Le module Shopper est actif, mais aucun produit n'est encore présent dans le catalogue."
    },
    es: {
        intro: "Claro, aquí tienes productos destacados del catálogo en tarjetas:",
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

function isShopperCatalogCardRequest(userText: string): boolean {
    const normalized = normalizeText(userText);
    if (!normalized) return false;

    const mentionsCatalogItem = /(urun|ürün|product|catalog|katalog|item|sku)/u.test(normalized);
    const asksToShow = /(goster|göster|listele|list|show|oner|öner|recommend|featured|one cikan|öne çıkan|kayitli|kayıtlı)/u.test(normalized);
    const asksForCount = /\b(3|uc|üç|three|ilk|top|öne çıkan|one cikan)\b/u.test(normalized);

    return mentionsCatalogItem && asksToShow && asksForCount;
}

function toCardPayload(product: ShopperProduct): Record<string, string | number | boolean> {
    const description = typeof product.description === "string"
        ? product.description.trim().slice(0, 180)
        : "";

    const payload: Record<string, string | number | boolean> = {
        name: product.name || "Product",
        price: typeof product.price === "number"
            ? product.price
            : (product.price ? String(product.price) : "N/A"),
        currency: product.currency || "₺",
    };

    if (description) payload.description = description;
    if (product.imageUrl) payload.imageUrl = product.imageUrl;
    if (product.url) payload.url = product.url;
    if (typeof product.inStock === "boolean") payload.inStock = product.inStock;
    if (typeof product.stockQuantity === "number") payload.stockQuantity = product.stockQuantity;
    if (typeof product.lowStockThreshold === "number") payload.lowStockThreshold = product.lowStockThreshold;

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
    let activeSessionId = "";

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
            assistantMessageId,
        } = body;

        if (!chatbotId || messages.length === 0) {
            return NextResponse.json(
                { error: "Invalid request body: chatbotId and messages are required." },
                { status: 400 }
            );
        }

        activeSessionId = typeof sessionId === "string" && sessionId.trim()
            ? sessionId.trim()
            : `sess-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

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

        const webIdentitySyncPromise =
            safeContext
                ? syncWebSessionIdentity(adminDb, {
                    chatbotId,
                    sessionId: activeSessionId,
                    context: safeContext,
                }).catch((error) => {
                    console.error("[CHAT API] Failed to sync web identity:", error);
                    return null;
                })
                : Promise.resolve(null);

        // Rate limiting check
        const rateLimitResult = checkRateLimit(ip, activeSessionId);
        if (!rateLimitResult.allowed) {
            return new Response(
                JSON.stringify({ error: "Too many requests", reason: rateLimitResult.reason }),
                { status: 429, headers: { ...getRateLimitHeaders(rateLimitResult), 'Content-Type': 'application/json' } }
            );
        }

        const [tenantUserSnapshot, chatbotSnapshot, omniChannelConfigSnapshot] = await Promise.all([
            adminDb.collection("users").doc(chatbotId).get(),
            adminDb.collection("chatbots").doc(chatbotId).get(),
            adminDb.collection("omni_channel_configs").doc(chatbotId).get().catch(() => null),
        ])

        const tenantUserData = tenantUserSnapshot.exists ? tenantUserSnapshot.data() || {} : {}
        const chatbotData = chatbotSnapshot.exists ? chatbotSnapshot.data() || {} : {}
        const mergedTenantData = {
            ...tenantUserData,
            ...chatbotData,
        }
        const isGuidedAiModeEnabled = mergedTenantData.enableGuided === true;
        const omniChannelConfig = omniChannelConfigSnapshot && "exists" in omniChannelConfigSnapshot && omniChannelConfigSnapshot.exists
            ? omniChannelConfigSnapshot.data() || {}
            : {}

        // === TRIAL EXPIRATION CHECK ===
        try {
            if (tenantUserData?.isActive === false) {
                console.log(`[CHAT API] Account is inactive for tenant ${chatbotId}, blocking widget`);
                return NextResponse.json({
                    error: "account_inactive",
                    message: "Bu sohbet botu su anda aktif degil. Lutfen site yoneticisi ile iletisime gecin.",
                    isInactive: true
                }, { status: 403 });
            }

            const subscriptionStatus = tenantUserData?.subscriptionStatus;
            const trialEndsAt = tenantUserData?.trialEndsAt;

            if (subscriptionStatus === 'trial' && trialEndsAt) {
                const now = new Date();
                const endDate = new Date(trialEndsAt);
                const isExpired = endDate.getTime() < now.getTime();

                if (isExpired) {
                    console.log(`[CHAT API] Trial expired for tenant ${chatbotId}, blocking widget`);
                    return NextResponse.json({
                        error: "trial_expired",
                        message: "Deneme sureniz sona erdi. Devam etmek icin lutfen bir plan secin.",
                        shouldUpgrade: true
                    }, { status: 402 });
                }
            }
        } catch (trialCheckError) {
            console.error('[CHAT API] Error checking trial status:', trialCheckError);
        }
        // === END TRIAL EXPIRATION CHECK ===

        // ... existing rate limit codes ...

        // ... existing pause check codes ...

        const lastMessage = normalizedMessages[normalizedMessages.length - 1]!;
        const messageId = lastMessage.id || Date.now().toString();
        const userContent = typeof lastMessage.content === "string" ? lastMessage.content : "";
        const sessionSnapshot =
            activeSessionId
                ? await adminDb.collection("chat_sessions").doc(activeSessionId).get().catch(() => null)
                : null;
        const sessionData = sessionSnapshot?.data?.() || {};
        const hasPendingHumanHandoff = Boolean(sessionData.humanHandoffPending);
        const isSessionPaused = Boolean(sessionData.isPaused);
        const currentGuidedState = normalizeGuidedSkillState(sessionData.guidedSkillState);
        const humanHandoffSettings = resolveHumanHandoffSettings(mergedTenantData)
        // KVKK/GDPR now runs in hybrid mode for web chat: the basic chat is not
        // blocked by a missing notice acknowledgement. The widget records
        // `notice_acknowledged` or `continued_after_notice` events separately,
        // while explicit-consent flows such as lead and appointment submit are
        // guarded in their own UI/API paths.

        const userMessageSavePromise = (lastMessage.role === "user" && userContent)
            ? saveMessageToSession(
                activeSessionId,
                chatbotId,
                {
                    id: messageId,
                    role: "user",
                    content: userContent,
                    sentiment: "Neutral",
                    guidedEvent: body.guidedEvent || undefined,
                },
                userId
            ).catch(err => console.error("[CHAT API] Failed to save user message:", err))
            : Promise.resolve();

        if (isSessionPaused) {
            await userMessageSavePromise;
            return new Response(null, {
                status: 204,
                headers: {
                    "X-AI-Paused": "true",
                },
            })
        }

        const syncedIdentity = await webIdentitySyncPromise;
        await userMessageSavePromise;

        if (lastMessage.role === "user" && userContent) {
            const explicitHandoffRequest = isExplicitHumanHandoffRequest(userContent);
            const shouldProcessHandoff = explicitHandoffRequest || hasPendingHumanHandoff;
            const canStartExplicitHandoff = humanHandoffSettings.enabled && humanHandoffSettings.triggerOnUserRequest;

            if (explicitHandoffRequest && !hasPendingHumanHandoff && !canStartExplicitHandoff) {
                const assistantContent = getHumanHandoffUnavailableMessage(resolvedLanguage);
                const handoffAssistantMessageId = assistantMessageId || `assistant-handoff-unavailable-${Date.now()}`;

                await saveMessageToSession(activeSessionId, chatbotId, {
                    id: handoffAssistantMessageId,
                    role: "assistant",
                    content: assistantContent,
                }, userId);

                return NextResponse.json({
                    content: assistantContent,
                    assistantMessageId: handoffAssistantMessageId,
                    sessionId: activeSessionId,
                    handoffRequested: false,
                });
            }

            if (shouldProcessHandoff) {
                const extractedLeadData = extractLeadData(normalizedMessages);
                const resolvedEmail = extractedLeadData.email || syncedIdentity?.identity?.email || "";
                const resolvedPhone = extractedLeadData.phone || syncedIdentity?.identity?.phone || "";
                const resolvedName = extractedLeadData.name || syncedIdentity?.identity?.name || null;
                let canonicalContactId = syncedIdentity?.contact?.id || null;
                let contactKey = syncedIdentity?.contact?.contactKey || resolvedPhone || resolvedEmail || activeSessionId;

                if ((resolvedEmail || resolvedPhone) && adminDb) {
                    const contact = await upsertContactGraph(adminDb, {
                        chatbotId,
                        channel: "web",
                        canonicalContactId,
                        contactKey,
                        displayName: resolvedName,
                        verifiedPhone: resolvedPhone || null,
                        email: resolvedEmail || null,
                        aliases: syncedIdentity?.identity?.aliases || [],
                        notes: "Updated during web human handoff capture.",
                    });

                    canonicalContactId = contact.id || canonicalContactId;
                    contactKey = contact.contactKey || contactKey;
                }

                const hasContactInfo = Boolean(resolvedEmail || resolvedPhone);
                const withinBusinessHours = isHumanHandoffWithinBusinessHours(humanHandoffSettings);

                if (!hasContactInfo) {
                    await updateSessionHandoffState(adminDb, activeSessionId, {
                        humanHandoffPending: true,
                        humanHandoffPendingAt: new Date().toISOString(),
                        humanHandoffPendingReason: "human_handoff_requested",
                    });

                    const assistantContent = getHumanHandoffContactPromptMessage(resolvedLanguage, humanHandoffSettings);
                    const handoffAssistantMessageId = assistantMessageId || `assistant-handoff-form-${Date.now()}`;

                    await saveMessageToSession(activeSessionId, chatbotId, {
                        id: handoffAssistantMessageId,
                        role: "assistant",
                        content: assistantContent,
                    }, userId);

                    return NextResponse.json({
                        content: assistantContent,
                        assistantMessageId: handoffAssistantMessageId,
                        sessionId: activeSessionId,
                        handoffRequested: false,
                    });
                }

                const notificationEmail = resolveHumanHandoffNotificationEmail({
                    settings: humanHandoffSettings,
                    mergedData: mergedTenantData,
                    omniChannelConfig,
                });
                const assistantContent = withinBusinessHours
                    ? getHumanHandoffAssistantMessage(resolvedLanguage, humanHandoffSettings.customWaitMessage)
                    : getHumanHandoffOutsideBusinessHoursMessage(resolvedLanguage, humanHandoffSettings);

                const callbackOutcome = await createAndNotifyHumanHandoff({
                    adminDb,
                    chatbotId,
                    sessionId: activeSessionId,
                    sourceChannel: "web",
                    contactKey,
                    canonicalContactId,
                    displayName: resolvedName,
                    triggerSource: "user_request",
                    userText: userContent,
                    companyName: mergedTenantData.companyName || "Vion AI",
                    notificationEmail,
                    settings: humanHandoffSettings,
                });

                await updateSessionHandoffState(adminDb, activeSessionId, {
                    humanHandoffPending: false,
                    humanHandoffPendingAt: null,
                    humanHandoffPendingReason: null,
                    humanHandoffCompletedAt: new Date().toISOString(),
                });

                const handoffAssistantMessageId = assistantMessageId || `assistant-handoff-${Date.now()}`;
                await saveMessageToSession(activeSessionId, chatbotId, {
                    id: handoffAssistantMessageId,
                    role: "assistant",
                    content: assistantContent,
                }, userId);

                return NextResponse.json({
                    content: assistantContent,
                    assistantMessageId: handoffAssistantMessageId,
                    sessionId: activeSessionId,
                    handoffRequested: true,
                    callbackId: callbackOutcome.callback.id || activeSessionId,
                });
            }

            if (!body.guidedEvent && !isVoice && isShopperCatalogCardRequest(userContent)) {
                const shopperResponse = await tryShopperFallback(body);

                if (shopperResponse) {
                    const shopperAssistantMessageId = assistantMessageId || `assistant-shopper-${Date.now()}`;

                    await saveMessageToSession(activeSessionId, chatbotId, {
                        id: shopperAssistantMessageId,
                        role: "assistant",
                        content: shopperResponse,
                    }, userId);

                    return new Response(shopperResponse, {
                        status: 200,
                        headers: { "Content-Type": "text/plain; charset=utf-8" },
                    });
                }
            }

            const guidedResult = !isGuidedAiModeEnabled
                ? await resolveGuidedSkillTurn({
                    adminDb,
                    chatbotId,
                    channel: "web",
                    sessionId: activeSessionId,
                    transcript: userContent,
                    guidedEvent: body.guidedEvent || null,
                    currentState: currentGuidedState,
                    contactKey: syncedIdentity?.contact?.contactKey || activeSessionId,
                    canonicalContactId: syncedIdentity?.contact?.id || null,
                    language: resolvedLanguage,
                })
                : { handled: false as const };

                if (guidedResult.handled) {
                        const guidedAssistantMessageId = assistantMessageId || `assistant-guided-${Date.now()}`
                        const hasContactInfo = Boolean(syncedIdentity?.identity?.email || syncedIdentity?.identity?.phone)
                        const assistantGuidedUi = guidedResult.assistantGuidedUi || undefined
                        let assistantContent = guidedResult.assistantContent || ""

                        if (
                            guidedResult.handoffStatus === "callback_requested" &&
                            humanHandoffSettings.enabled &&
                            humanHandoffSettings.triggerOnAssistantHandoff &&
                            !hasContactInfo
                        ) {

                            const notificationEmail = resolveHumanHandoffNotificationEmail({
                                settings: humanHandoffSettings,
                                mergedData: mergedTenantData,
                                omniChannelConfig,
                            })

                            await createAndNotifyHumanHandoff({
                                adminDb,
                                chatbotId,
                                sessionId: activeSessionId,
                                sourceChannel: "web",
                                contactKey: syncedIdentity?.contact?.contactKey || activeSessionId,
                                canonicalContactId: syncedIdentity?.contact?.id || null,
                                displayName: syncedIdentity?.identity?.name || null,
                                triggerSource: "assistant_trigger",
                                userText: userContent,
                                companyName: mergedTenantData.companyName || "Vion AI",
                                notificationEmail,
                                settings: humanHandoffSettings,
                            })

                            await updateSessionHandoffState(adminDb, activeSessionId, {
                                humanHandoffPending: true,
                                humanHandoffPendingAt: new Date().toISOString(),
                                humanHandoffPendingReason: "human_handoff_requested",
                            })

                            assistantContent = assistantContent || getHumanHandoffAssistantMessage(resolvedLanguage, humanHandoffSettings.customWaitMessage)
                        }

                    await upsertChatSessionRecord({
                        sessionId: activeSessionId,
                        chatbotId,
                        userId,
                        channel: "web",
                        guidedSkillState: guidedResult.nextState ?? null,
                        message: {
                            id: guidedAssistantMessageId,
                            role: "assistant",
                            content: assistantContent,
                            guidedUi: assistantGuidedUi,
                        },
                    })

                    if (
                        guidedResult.handoffStatus === "callback_requested" &&
                        humanHandoffSettings.enabled &&
                        humanHandoffSettings.triggerOnAssistantHandoff &&
                        hasContactInfo
                    ) {
                        const notificationEmail = resolveHumanHandoffNotificationEmail({
                            settings: humanHandoffSettings,
                            mergedData: mergedTenantData,
                            omniChannelConfig,
                        })

                        await createAndNotifyHumanHandoff({
                            adminDb,
                            chatbotId,
                            sessionId: activeSessionId,
                            sourceChannel: "web",
                            contactKey: syncedIdentity?.contact?.contactKey || activeSessionId,
                            canonicalContactId: syncedIdentity?.contact?.id || null,
                            displayName: syncedIdentity?.identity?.name || null,
                            triggerSource: "assistant_trigger",
                            userText: userContent,
                            companyName: mergedTenantData.companyName || "Vion AI",
                            notificationEmail,
                            settings: humanHandoffSettings,
                        })



                        await updateSessionHandoffState(adminDb, activeSessionId, {
                            humanHandoffPending: false,
                            humanHandoffPendingAt: null,
                            humanHandoffPendingReason: null,
                            humanHandoffCompletedAt: new Date().toISOString(),
                        })
                    }

                    return NextResponse.json({
                        content: assistantContent,
                        guidedUi: assistantGuidedUi || null,
                        assistantMessageId: guidedAssistantMessageId,
                        guidedSkillState: guidedResult.nextState ?? null,
                        sessionId: activeSessionId,
                    })
                }
        }

        const effectiveShouldStream = shouldStream && !isGuidedAiModeEnabled;
        const result = await generateAIResponse(
            chatbotId,
            normalizedMessages,
            activeSessionId,
            effectiveShouldStream,
            safeContext,
            isVoice,
            resolvedLanguage,
            visualAnalysisContext,
            body.industry,
            isGuidedAiModeEnabled && !isVoice
        );

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
                        if (activeSessionId && fullContent) {
                                await saveMessageToSession(activeSessionId, chatbotId, {
                                    role: "assistant",
                                    content: fullContent,
                                    id: assistantMessageId // <--- USE THIS ID
                                }, userId);

                                // Process Digital Waiter requests if any
                                await processWaiterRequestsFromAi({
                                    chatbotId,
                                    sessionId: activeSessionId,
                                    content: fullContent,
                                    context: safeContext
                                });

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
                                            const syncedIdentity = await webIdentitySyncPromise;
                                            const contact = await upsertContactGraph(adminDb, {
                                                chatbotId,
                                                channel: "web",
                                                canonicalContactId: syncedIdentity?.contact?.id || null,
                                                contactKey: extractedData.customerPhone || extractedData.customerEmail || syncedIdentity?.contact?.contactKey || activeSessionId || null,
                                                displayName: extractedData.customerName || syncedIdentity?.identity?.name || null,
                                                verifiedPhone: extractedData.customerPhone || syncedIdentity?.identity?.phone || null,
                                                email: extractedData.customerEmail || syncedIdentity?.identity?.email || null,
                                                aliases: syncedIdentity?.identity?.aliases || [],
                                                notes: "Updated during web appointment capture.",
                                            });

                                            const appointmentDoc = {
                                                chatbotId,
                                                customerName: extractedData.customerName || "Guest",
                                                customerEmail: extractedData.customerEmail || "",
                                                customerPhone: extractedData.customerPhone || "",
                                                date: extractedData.date || "",
                                                time: extractedData.time || "",
                                                sessionId: activeSessionId,
                                                sourceSessionId: activeSessionId,
                                                sourceChannel: "web",
                                                contactKey: contact.contactKey || extractedData.customerPhone || extractedData.customerEmail || null,
                                                canonicalContactId: contact.id || syncedIdentity?.contact?.id || null,
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

                                            const syncedIdentity = await webIdentitySyncPromise;
                                            const contact = await upsertContactGraph(adminDb, {
                                                chatbotId,
                                                channel: "web",
                                                canonicalContactId: syncedIdentity?.contact?.id || null,
                                                contactKey: leadData.phone || leadData.email || syncedIdentity?.contact?.contactKey || activeSessionId || null,
                                                displayName: leadData.name || syncedIdentity?.identity?.name || null,
                                                verifiedPhone: leadData.phone || syncedIdentity?.identity?.phone || null,
                                                email: leadData.email || syncedIdentity?.identity?.email || null,
                                                aliases: syncedIdentity?.identity?.aliases || [],
                                                notes: "Updated during web lead capture.",
                                            });

                                            const leadDoc = {
                                                chatbotId,
                                                name: leadData.name || (resolvedLanguage === 'tr' ? "Anonim" : "Anonymous"),
                                                email: leadData.email || "",
                                                phone: leadData.phone || "",
                                                source: sourceText,
                                                customFields: leadData.company ? { company: leadData.company } : {},
                                                sessionId: activeSessionId,
                                                sourceSessionId: activeSessionId,
                                                sourceChannel: "web",
                                                contactKey: contact.contactKey || leadData.phone || leadData.email || null,
                                                canonicalContactId: contact.id || syncedIdentity?.contact?.id || null,
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
            if (isGuidedAiModeEnabled && !isVoice) {
                const guidedAssistantMessageId = assistantMessageId || `assistant-guided-ai-${Date.now()}`
                const parsedGuided = extractGuidedOptionsFromContent(result.content || "")
                const assistantGuidedUi = buildAiGeneratedGuidedUi({
                    assistantMessageId: guidedAssistantMessageId,
                    content: parsedGuided.content,
                    options: parsedGuided.options,
                    language: resolvedLanguage,
                })

                if (activeSessionId && parsedGuided.content) {
                    await upsertChatSessionRecord({
                        sessionId: activeSessionId,
                        chatbotId,
                        userId,
                        channel: "web",
                        guidedSkillState: null,
                        message: {
                            id: guidedAssistantMessageId,
                            role: "assistant",
                            content: parsedGuided.content,
                            guidedUi: assistantGuidedUi || undefined,
                        },
                    })

                    // Process Digital Waiter requests if any
                    await processWaiterRequestsFromAi({
                        chatbotId,
                        sessionId: activeSessionId,
                        content: parsedGuided.content,
                        context: safeContext
                    });
                }

                return NextResponse.json({
                    content: parsedGuided.content,
                    guidedUi: assistantGuidedUi || null,
                    assistantMessageId: guidedAssistantMessageId,
                    guidedSkillState: null,
                    sessionId: activeSessionId,
                })
            }

            return new Response(result.content, { status: 200 });
        }

    } catch (error) {
        console.error("Chat API Error:", error);
        const rawMessage = error instanceof Error ? error.message : String(error);
        const lowered = rawMessage.toLowerCase();
        const isConfigError = lowered.includes("no ai provider is configured") || lowered.includes("api key");
        const isGuidedRequest = typeof body?.guidedEvent?.skillId === "string" && body.guidedEvent.skillId.trim().length > 0;
        const shouldExposeGuidedError = process.env.NODE_ENV !== "production" && isGuidedRequest;

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
            : shouldExposeGuidedError
                ? rawMessage
                : "AI service is temporarily unavailable. Please try again.";

        return new Response(
            JSON.stringify({
                error: "ai_unavailable",
                message,
                ...(shouldExposeGuidedError ? { details: rawMessage } : {}),
            }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
