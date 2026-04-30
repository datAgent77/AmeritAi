import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { authorizeTargetAccess } from "@/lib/api-auth"
import {
    buildSupportTicketPayload,
    normalizeTicketWebhookIntegrationConfig,
    redactTicketWebhookConfig,
    type TicketWebhookAuthType,
} from "@/lib/integrations/mobile-support"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function loadConfig(adminDb: any, chatbotId: string) {
    const snap = await adminDb.collection("chatbots").doc(chatbotId).get()
    const data = snap.exists ? snap.data() || {} : {}
    return normalizeTicketWebhookIntegrationConfig(data.integrations?.ticketWebhook)
}

export async function GET(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

        const { searchParams } = new URL(req.url)
        const chatbotId = searchParams.get("chatbotId") || ""
        if (!chatbotId) return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 })

        const authz = await authorizeTargetAccess(req, chatbotId)
        if (!authz.ok) return authz.response

        const config = await loadConfig(adminDb, chatbotId)
        const samplePayload = buildSupportTicketPayload({
            chatbotId,
            sessionId: "mobile-session-123",
            customer: {
                id: "customer-123",
                name: "Ayse Yilmaz",
                email: "ayse@example.com",
                phone: "+905...",
            },
            issue: {
                category: "order_delivery",
                priority: "normal",
                summary: "Musteri siparisinin teslim edilmedigini belirtti.",
                orderId: "ORD-12345",
                productId: "SKU-7788",
            },
            messages: [
                { role: "user", content: "Siparisim teslim edilmedi." },
                { role: "assistant", content: "Bu konu icin destek talebi aciyorum." },
            ],
        })

        return NextResponse.json({
            config: redactTicketWebhookConfig(config),
            samplePayload,
        })
    } catch (error: any) {
        console.error("[ticket-webhook/settings GET]", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

        const body = await req.json()
        const chatbotId = String(body.chatbotId || "").trim()
        if (!chatbotId) return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 })

        const authz = await authorizeTargetAccess(req, chatbotId)
        if (!authz.ok) return authz.response

        const existing = await loadConfig(adminDb, chatbotId)
        const authType: TicketWebhookAuthType =
            body.authType === "bearer" || body.authType === "api_key" ? body.authType : "none"
        const incomingAuthToken = typeof body.authToken === "string" ? body.authToken.trim() : ""
        const authToken = incomingAuthToken && incomingAuthToken !== "••••••••"
            ? incomingAuthToken
            : existing.authToken || ""
        const now = new Date().toISOString()

        const nextConfig = normalizeTicketWebhookIntegrationConfig({
            enabled: body.enabled === true,
            url: typeof body.url === "string" ? body.url.trim() : "",
            authType,
            authHeaderName: typeof body.authHeaderName === "string" && body.authHeaderName.trim()
                ? body.authHeaderName.trim()
                : (authType === "api_key" ? "X-API-Key" : "Authorization"),
            authToken,
            connected: existing.connected === true,
            lastTestAt: existing.lastTestAt,
            lastTestStatus: existing.lastTestStatus,
            lastTestError: existing.lastTestError,
            updatedAt: now,
        })

        if (nextConfig.enabled && !nextConfig.url) {
            return NextResponse.json({ error: "Webhook URL is required when enabled" }, { status: 400 })
        }

        await adminDb.collection("chatbots").doc(chatbotId).set({
            integrations: {
                ticketWebhook: nextConfig,
            },
        }, { merge: true })

        return NextResponse.json({
            success: true,
            config: redactTicketWebhookConfig(nextConfig),
        })
    } catch (error: any) {
        console.error("[ticket-webhook/settings POST]", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}
