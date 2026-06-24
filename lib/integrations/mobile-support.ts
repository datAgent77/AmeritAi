import crypto from "crypto"

export type MobileAppEnvironment = "sandbox" | "production"
export type MobileAppIntegrationMode = "api_first" | "hosted_chat"
export type TicketWebhookAuthType = "none" | "bearer" | "api_key"

export interface MobileAppIntegrationConfig {
    enabled: boolean
    mode: MobileAppIntegrationMode
    environment: MobileAppEnvironment
    allowedAppIds: string[]
    clientTokenHash?: string | null
    clientTokenPreview?: string | null
    clientTokenCreatedAt?: string | null
    updatedAt?: string | null
}

export interface TicketWebhookIntegrationConfig {
    enabled: boolean
    url: string
    authType: TicketWebhookAuthType
    authHeaderName: string
    authToken?: string | null
    connected?: boolean
    lastTestAt?: string | null
    lastTestStatus?: number | null
    lastTestError?: string | null
    updatedAt?: string | null
}

export interface SupportTicketWebhookPayload {
    event: "support_ticket.create"
    chatbotId: string
    sessionId: string
    customer: {
        id?: string | null
        name?: string | null
        email?: string | null
        phone?: string | null
    }
    issue: {
        category: string
        priority: "low" | "normal" | "high" | "urgent"
        summary: string
        orderId?: string | null
        productId?: string | null
    }
    conversation: {
        summary: string
        lastMessages: Array<{ role: string; content: string }>
    }
    source: "mobile_app"
}

export const DEFAULT_MOBILE_APP_CONFIG: MobileAppIntegrationConfig = {
    enabled: false,
    mode: "api_first",
    environment: "sandbox",
    allowedAppIds: [],
    clientTokenHash: null,
    clientTokenPreview: null,
    clientTokenCreatedAt: null,
}

export const DEFAULT_TICKET_WEBHOOK_CONFIG: TicketWebhookIntegrationConfig = {
    enabled: false,
    url: "",
    authType: "none",
    authHeaderName: "Authorization",
    authToken: "",
    connected: false,
    lastTestAt: null,
    lastTestStatus: null,
    lastTestError: null,
}

function toStringArray(value: unknown) {
    if (Array.isArray(value)) {
        return value
            .map((item) => String(item || "").trim())
            .filter(Boolean)
            .slice(0, 20)
    }

    if (typeof value === "string") {
        return value
            .split(/[,\n]/)
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 20)
    }

    return []
}

export function generateMobileClientToken() {
    return `vion_mobile_${crypto.randomBytes(32).toString("base64url")}`
}

export function generateMobileSessionToken() {
    return `vion_session_${crypto.randomBytes(32).toString("base64url")}`
}

export function hashMobileClientToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex")
}

export function previewMobileClientToken(token: string) {
    if (token.length <= 12) return token
    return `${token.slice(0, 10)}...${token.slice(-6)}`
}

export function normalizeMobileAppIntegrationConfig(value: any): MobileAppIntegrationConfig {
    const source = value && typeof value === "object" ? value : {}
    const environment = source.environment === "production" ? "production" : "sandbox"
    const mode: MobileAppIntegrationMode = source.mode === "hosted_chat" ? "hosted_chat" : "api_first"

    return {
        enabled: source.enabled === true,
        mode,
        environment,
        allowedAppIds: toStringArray(source.allowedAppIds),
        clientTokenHash: typeof source.clientTokenHash === "string" ? source.clientTokenHash : null,
        clientTokenPreview: typeof source.clientTokenPreview === "string" ? source.clientTokenPreview : null,
        clientTokenCreatedAt: typeof source.clientTokenCreatedAt === "string" ? source.clientTokenCreatedAt : null,
        updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : null,
    }
}

export function buildMobileUserContext(input: any) {
    const context = input.context && typeof input.context === "object" ? input.context : {}
    const screen = typeof context.screen === "string" ? context.screen : "mobile_app"

    return {
        url: `app://mobile/${screen}`,
        title: "Mobile App",
        desc: "Authenticated mobile app support context.",
        dynamicData: {
            customer: input.customer || null,
            context,
        },
        publicContext: {
            source: "mobile_app",
            screen,
        },
        privateContextSummary: {
            customer: input.customer || null,
            order: context.order || null,
            shipment: context.shipment || null,
            cart: context.cart || null,
        },
        assistantContextSource: "host_app",
        siteSessionContext: {
            source: "mobile_app",
            ...context,
        },
        mobileSessionId: input.sessionId || null,
    }
}

export function normalizeTicketWebhookIntegrationConfig(value: any): TicketWebhookIntegrationConfig {
    const source = value && typeof value === "object" ? value : {}
    const authType: TicketWebhookAuthType =
        source.authType === "bearer" || source.authType === "api_key" ? source.authType : "none"

    return {
        enabled: source.enabled === true,
        url: typeof source.url === "string" ? source.url.trim() : "",
        authType,
        authHeaderName: typeof source.authHeaderName === "string" && source.authHeaderName.trim()
            ? source.authHeaderName.trim()
            : "Authorization",
        authToken: typeof source.authToken === "string" ? source.authToken : "",
        connected: source.connected === true,
        lastTestAt: typeof source.lastTestAt === "string" ? source.lastTestAt : null,
        lastTestStatus: typeof source.lastTestStatus === "number" ? source.lastTestStatus : null,
        lastTestError: typeof source.lastTestError === "string" ? source.lastTestError : null,
        updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : null,
    }
}

export function redactTicketWebhookConfig(config: TicketWebhookIntegrationConfig) {
    return {
        ...config,
        authToken: config.authToken ? "••••••••" : "",
        hasAuthToken: Boolean(config.authToken),
    }
}

export function buildMobileAppSamplePayload(chatbotId: string) {
    return {
        chatbotId,
        sessionId: "mobile-session-123",
        message: "Siparisim teslim edilmedi, destek alabilir miyim?",
        customer: {
            id: "customer-123",
            name: "Ayse Yilmaz",
            email: "ayse@example.com",
            phone: "+905...",
        },
        context: {
            screen: "order_detail",
            order: {
                id: "ORD-12345",
                status: "in_transit",
                carrier: "Example Cargo",
            },
            cart: {
                total: 1299,
                currency: "TRY",
            },
        },
        language: "tr",
    }
}

export function buildMobileHostedSessionSamplePayload(chatbotId: string) {
    return {
        chatbotId,
        sessionId: "mobile-session-123",
        customer: {
            id: "customer-123",
            name: "Ayse Yilmaz",
            email: "ayse@example.com",
            phone: "+905...",
        },
        context: {
            screen: "order_detail",
            order: {
                id: "ORD-12345",
                status: "in_transit",
                carrier: "Example Cargo",
                trackingUrl: "https://cargo.example.com/track/ORD-12345",
            },
            cart: {
                total: 1299,
                currency: "TRY",
            },
        },
        language: "tr",
        ttlMinutes: 30,
    }
}

export function buildSupportTicketPayload(input: {
    chatbotId: string
    sessionId: string
    customer?: Record<string, any> | null
    issue?: Record<string, any> | null
    messages: Array<{ role: string; content: string }>
    assistantContent?: string | null
}): SupportTicketWebhookPayload {
    const lastUserMessage = [...input.messages].reverse().find((message) => message.role === "user")?.content || ""
    const customer = input.customer || {}
    const issue = input.issue || {}
    const summary = String(issue.summary || lastUserMessage || input.assistantContent || "Support request").slice(0, 1200)

    return {
        event: "support_ticket.create",
        chatbotId: input.chatbotId,
        sessionId: input.sessionId,
        customer: {
            id: customer.id || customer.customerId || null,
            name: customer.name || customer.customerName || customer.fullName || null,
            email: customer.email || customer.customerEmail || null,
            phone: customer.phone || customer.phoneNumber || customer.mobile || null,
        },
        issue: {
            category: String(issue.category || "support_request"),
            priority: issue.priority === "urgent" || issue.priority === "high" || issue.priority === "low" ? issue.priority : "normal",
            summary,
            orderId: issue.orderId || issue.order_id || customer.orderId || null,
            productId: issue.productId || issue.product_id || null,
        },
        conversation: {
            summary,
            lastMessages: input.messages.slice(-8).map((message) => ({
                role: message.role,
                content: message.content,
            })),
        },
        source: "mobile_app",
    }
}

export function shouldCreateSupportTicket(input: {
    userText: string
    assistantContent?: string | null
    forceTicket?: boolean
}) {
    if (input.forceTicket) return true
    const corpus = `${input.userText || ""}\n${input.assistantContent || ""}`.toLowerCase()
    return /ticket|destek talebi|talep aç|talep olustur|talep oluştur|canlı destek|canli destek|müşteri temsilcisi|musteri temsilcisi|temsilci|insan|human|representative|support agent|live support/.test(corpus)
        || /bilmiyorum|emin değilim|yardımcı olamıyorum|i don't have|i cannot help|can't help/.test(corpus)
}

export async function dispatchTicketWebhook(config: TicketWebhookIntegrationConfig, payload: SupportTicketWebhookPayload) {
    if (!config.enabled || !config.url) {
        return {
            attempted: false,
            ok: false,
            status: null,
            externalTicketId: null,
            error: "Ticket webhook is not enabled",
        }
    }

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-AmeritAI-Event": payload.event,
        "X-AmeritAI-Chatbot-Id": payload.chatbotId,
    }

    if (config.authType === "bearer" && config.authToken) {
        headers.Authorization = `Bearer ${config.authToken}`
    } else if (config.authType === "api_key" && config.authToken) {
        headers[config.authHeaderName || "X-API-Key"] = config.authToken
    }

    const response = await fetch(config.url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
    })

    const text = await response.text()
    let json: any = null
    try {
        json = text ? JSON.parse(text) : null
    } catch {
        json = null
    }

    return {
        attempted: true,
        ok: response.ok,
        status: response.status,
        externalTicketId: json?.externalTicketId || json?.ticketId || json?.id || null,
        responseBody: json || text || null,
        error: response.ok ? null : (json?.error || json?.message || text || `Webhook failed with ${response.status}`),
    }
}
