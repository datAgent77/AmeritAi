import { NextResponse } from "next/server"
import crypto from "crypto"
import { getAdminDb } from "@/lib/firebase-admin"
import { generateAIResponse, type AIMessage } from "@/lib/ai-service"
import {
    buildMobileUserContext,
    buildSupportTicketPayload,
    dispatchTicketWebhook,
    hashMobileClientToken,
    normalizeMobileAppIntegrationConfig,
    normalizeTicketWebhookIntegrationConfig,
    shouldCreateSupportTicket,
} from "@/lib/integrations/mobile-support"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getClientToken(req: Request) {
    const auth = req.headers.get("authorization")
    if (auth?.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim()
    return req.headers.get("x-vion-client-token")?.trim() || ""
}

function normalizeMessages(input: any): AIMessage[] {
    const messages = Array.isArray(input.messages) ? input.messages : []
    const normalized = messages
        .map((message: any) => ({
            role: message?.role === "assistant" ? "assistant" : "user",
            content: String(message?.content || "").trim(),
        }))
        .filter((message: AIMessage) => message.content)
        .slice(-12)

    const directMessage = String(input.message || "").trim()
    if (directMessage && normalized[normalized.length - 1]?.content !== directMessage) {
        normalized.push({ role: "user", content: directMessage })
    }

    return normalized.length > 0 ? normalized : [{ role: "user", content: directMessage || "Hello" }]
}

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

        const body = await req.json()
        const chatbotId = String(body.chatbotId || "").trim()
        if (!chatbotId) return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 })

        const token = getClientToken(req)
        if (!token) return NextResponse.json({ error: "Missing mobile client token" }, { status: 401 })

        const chatbotRef = adminDb.collection("chatbots").doc(chatbotId)
        const chatbotSnap = await chatbotRef.get()
        const chatbotData = chatbotSnap.exists ? chatbotSnap.data() || {} : {}
        const mobileConfig = normalizeMobileAppIntegrationConfig(chatbotData.integrations?.mobileApp)

        if (!mobileConfig.enabled || !mobileConfig.clientTokenHash) {
            return NextResponse.json({ error: "Mobile App API integration is not enabled" }, { status: 403 })
        }

        if (hashMobileClientToken(token) !== mobileConfig.clientTokenHash) {
            return NextResponse.json({ error: "Invalid mobile client token" }, { status: 401 })
        }

        const appId = req.headers.get("x-vion-app-id")?.trim()
        if (mobileConfig.allowedAppIds.length > 0 && (!appId || !mobileConfig.allowedAppIds.includes(appId))) {
            return NextResponse.json({ error: "App id is not allowed" }, { status: 403 })
        }

        const messages = normalizeMessages(body)
        const sessionId = String(body.sessionId || `mobile-${crypto.randomUUID()}`).trim()
        const language = typeof body.language === "string" ? body.language : undefined
        const userContext = buildMobileUserContext({ ...body, sessionId })
        const aiResult = await generateAIResponse(
            chatbotId,
            messages,
            sessionId,
            false,
            userContext,
            false,
            language,
            undefined,
            "ecommerce",
            false
        )
        const assistantContent = typeof aiResult.content === "string" ? aiResult.content : ""
        const userText = [...messages].reverse().find((message) => message.role === "user")?.content || ""
        const shouldTicket = shouldCreateSupportTicket({
            userText,
            assistantContent,
            forceTicket: body.createTicket === true,
        })

        let ticket: any = null
        if (shouldTicket) {
            const ticketConfig = normalizeTicketWebhookIntegrationConfig(chatbotData.integrations?.ticketWebhook)
            const payload = buildSupportTicketPayload({
                chatbotId,
                sessionId,
                customer: body.customer || null,
                issue: body.issue || null,
                messages: [...messages, { role: "assistant", content: assistantContent }],
                assistantContent,
            })
            const webhookResult = await dispatchTicketWebhook(ticketConfig, payload)
            const now = new Date()
            const callbackRef = adminDb.collection("callback_requests").doc(sessionId)
            await callbackRef.set({
                chatbotId,
                sourceSessionId: sessionId,
                sourceChannel: "mobile_app",
                contactKey: payload.customer.email || payload.customer.phone || payload.customer.id || sessionId,
                displayName: payload.customer.name || null,
                priority: payload.issue.priority,
                status: "pending",
                resolutionStatus: webhookResult.ok ? "waiting" : "open",
                triggerSource: "assistant_trigger",
                notes: payload.conversation.summary,
                externalTicketId: webhookResult.externalTicketId || null,
                externalSyncStatus: webhookResult.ok ? "synced" : "pending_external_sync",
                externalSyncError: webhookResult.ok ? null : webhookResult.error,
                ticketPayload: payload,
                createdAt: now,
                updatedAt: now,
            }, { merge: true })

            ticket = {
                created: true,
                id: callbackRef.id,
                externalTicketId: webhookResult.externalTicketId || null,
                externalSyncStatus: webhookResult.ok ? "synced" : "pending_external_sync",
            }
        }

        const now = new Date()
        await adminDb.collection("chat_sessions").doc(sessionId).set({
            chatbotId,
            source: "mobile_app",
            channel: "mobile_app",
            customer: body.customer || null,
            lastMessage: userText,
            lastAssistantMessage: assistantContent,
            handoffStatus: ticket ? "callback_requested" : chatbotData.handoffStatus || null,
            supportTicketId: ticket?.id || null,
            externalTicketId: ticket?.externalTicketId || null,
            externalTicketSyncStatus: ticket?.externalSyncStatus || null,
            updatedAt: now,
            createdAt: now,
        }, { merge: true })

        return NextResponse.json({
            success: true,
            sessionId,
            message: assistantContent,
            modelUsed: aiResult.modelUsed || null,
            ticket,
        })
    } catch (error: any) {
        console.error("[mobile-assistant/chat POST]", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}
