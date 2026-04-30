import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { authorizeTargetAccess } from "@/lib/api-auth"
import {
    buildSupportTicketPayload,
    dispatchTicketWebhook,
    normalizeTicketWebhookIntegrationConfig,
    redactTicketWebhookConfig,
} from "@/lib/integrations/mobile-support"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

        const body = await req.json()
        const chatbotId = String(body.chatbotId || "").trim()
        if (!chatbotId) return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 })

        const authz = await authorizeTargetAccess(req, chatbotId)
        if (!authz.ok) return authz.response

        const ref = adminDb.collection("chatbots").doc(chatbotId)
        const snap = await ref.get()
        const data = snap.exists ? snap.data() || {} : {}
        const config = normalizeTicketWebhookIntegrationConfig(data.integrations?.ticketWebhook)

        const payload = buildSupportTicketPayload({
            chatbotId,
            sessionId: `test-${Date.now()}`,
            customer: {
                id: "test-customer",
                name: "Vion Test Customer",
                email: "test@example.com",
            },
            issue: {
                category: "test",
                priority: "normal",
                summary: "Vion ticket webhook test event.",
                orderId: "TEST-ORDER-1",
            },
            messages: [
                { role: "user", content: "Ticket webhook test." },
                { role: "assistant", content: "Creating a test support ticket." },
            ],
        })

        const result = await dispatchTicketWebhook(config, payload)
        const now = new Date().toISOString()
        const nextConfig = {
            ...config,
            connected: result.ok,
            lastTestAt: now,
            lastTestStatus: result.status,
            lastTestError: result.ok ? null : result.error,
            updatedAt: now,
        }

        await ref.set({
            integrations: {
                ticketWebhook: nextConfig,
            },
        }, { merge: true })

        return NextResponse.json({
            success: result.ok,
            result,
            config: redactTicketWebhookConfig(nextConfig),
        }, { status: result.ok ? 200 : 502 })
    } catch (error: any) {
        console.error("[ticket-webhook/test POST]", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}
