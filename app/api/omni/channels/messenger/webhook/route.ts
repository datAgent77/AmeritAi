import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { dispatchOmniMessengerMessage } from "@/lib/omni/channel-dispatch"
import { executeOmniAction } from "@/lib/omni/action-execution"
import { generateOmniTextTurn } from "@/lib/omni/assistant-core"
import { maybeExecuteOmniAutoActions } from "@/lib/omni/auto-actions"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { upsertOmniContactMemory } from "@/lib/omni/memory"
import { claimOmniWebhookEvent } from "@/lib/omni/replay-protection"
import { normalizeGuidedSkillState } from "@/lib/guided-skills"
import { upsertContactGraph, upsertOmniSession, verifyMetaWebhookSignature } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

function hasMessageExternalId(messages: any[], externalId: string) {
    return messages.some((message: any) => message?.externalId === externalId || message?.id === externalId)
}

function buildTranscriptSummary(messages: any[]) {
    return messages
        .slice(-6)
        .map((message: any) => `${message.role === "assistant" ? "Assistant" : "User"}: ${message.content}`)
        .join(" ")
}

export async function GET(req: Request) {
    const adminDb = getAdminDb()
    const { searchParams } = new URL(req.url)
    const mode = searchParams.get("hub.mode")
    const token = searchParams.get("hub.verify_token")
    const challenge = searchParams.get("hub.challenge")
    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN

    if (mode === "subscribe" && challenge && verifyToken && token === verifyToken) {
        return new Response(challenge, { status: 200 })
    }

    if (mode === "subscribe" && challenge && token && adminDb) {
        const snapshot = await adminDb.collection("omni_channel_configs").where("messenger.verifyToken", "==", token).limit(1).get()
        if (!snapshot.empty) {
            return new Response(challenge, { status: 200 })
        }
    }

    return new Response("Forbidden", { status: 403 })
}

export async function POST(req: Request) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 })
    }

    const rawBody = await req.text()
    let body: any = null
    try {
        body = JSON.parse(rawBody)
    } catch {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const firstPageId = body?.entry?.[0]?.id
    if (firstPageId) {
        const configSnapshot = await adminDb.collection("omni_channel_configs").where("messenger.pageId", "==", firstPageId).limit(1).get()
        if (configSnapshot.empty) {
            return NextResponse.json({ received: true, ignored: true })
        }

        const configDoc = configSnapshot.docs[0]
        const config = configDoc.data() || {}
        const appSecret = config?.messenger?.appSecretRef || process.env.META_APP_SECRET || process.env.INSTAGRAM_APP_SECRET || ""
        const signatureHeader = req.headers.get("x-hub-signature-256")

        if (!appSecret) {
            await logOmniAuditEvent({
                chatbotId: config.chatbotId || configDoc.id,
                channel: "messenger",
                eventType: "messenger.webhook_signature",
                result: "error",
                source: "api/omni/channels/messenger/webhook",
                message: "Messenger app secret is not configured",
                metadata: { pageId: firstPageId },
            })
            return NextResponse.json({ error: "Messenger app secret is not configured" }, { status: 401 })
        }

        if (!verifyMetaWebhookSignature(rawBody, signatureHeader, appSecret)) {
            await logOmniAuditEvent({
                chatbotId: config.chatbotId || configDoc.id,
                channel: "messenger",
                eventType: "messenger.webhook_signature",
                result: "denied",
                source: "api/omni/channels/messenger/webhook",
                message: "Invalid Meta webhook signature",
                metadata: { pageId: firstPageId },
            })
            return NextResponse.json({ error: "Invalid webhook signature" }, { status: 403 })
        }
    }

    const entries = Array.isArray(body.entry) ? body.entry : []

    for (const entry of entries) {
        const events = Array.isArray(entry.messaging) ? entry.messaging : []

        for (const event of events) {
            if (event?.message?.is_echo) continue

            const senderId = event?.sender?.id
            const pageId = event?.recipient?.id || entry.id
            const messageContent =
                event?.message?.text ||
                (Array.isArray(event?.message?.attachments) && event.message.attachments.length > 0 ? "[Attachment]" : null) ||
                event?.postback?.payload ||
                null

            if (!senderId || !pageId || !messageContent) continue

            const configSnapshot = await adminDb.collection("omni_channel_configs").where("messenger.pageId", "==", pageId).limit(1).get()
            if (configSnapshot.empty) continue

            const configDoc = configSnapshot.docs[0]
            const config = configDoc.data() || {}
            const chatbotId = (config.chatbotId || configDoc.id) as string
            const messengerConfig = config.messenger || {}

            if (messengerConfig.enabled === false) {
                await logOmniAuditEvent({
                    chatbotId,
                    channel: "messenger",
                    eventType: "messenger.channel_disabled",
                    result: "blocked",
                    source: "api/omni/channels/messenger/webhook",
                    message: "Messenger channel disabled; inbound event ignored",
                    metadata: { pageId, messageCount: events.length },
                })
                continue
            }

            const sessionId = `messenger-${pageId}-${senderId}`
            const sessionRef = adminDb.collection("chat_sessions").doc(sessionId)
            const sessionSnapshot = await sessionRef.get()
            const sessionData = sessionSnapshot.exists ? sessionSnapshot.data() || {} : {}
            const existingMessages = Array.isArray(sessionData.messages) ? sessionData.messages : []
            const externalId = event?.message?.mid || `${senderId}-${entry.time || Date.now()}`
            const replay = await claimOmniWebhookEvent(adminDb, {
                chatbotId,
                channel: "messenger",
                source: "api/omni/channels/messenger/webhook",
                eventKey: `message:${pageId}:${externalId}`,
                metadata: {
                    sessionId,
                    pageId,
                    senderId,
                    externalId,
                },
            })

            if (replay.duplicate || hasMessageExternalId(existingMessages, externalId)) {
                continue
            }

            const userMessage = {
                role: "user",
                content: messageContent,
                createdAt: new Date(),
                externalId,
            }
            const currentGuidedState = normalizeGuidedSkillState(sessionData.guidedSkillState)

            const contact = await upsertContactGraph(adminDb, {
                chatbotId,
                channel: "messenger",
                contactKey: senderId,
                displayName: senderId,
                aliases: [{ aliasType: "messenger", aliasValue: senderId, sourceChannel: "messenger" }],
            })

            await upsertOmniSession(adminDb, {
                sessionId,
                chatbotId,
                channel: "messenger",
                contactKey: senderId,
                canonicalContactId: contact.id || null,
                channelMeta: {
                    pageId,
                    senderId,
                    pageName: messengerConfig.pageId === pageId ? "Messenger Page" : null,
                },
                message: userMessage,
                visitorName: sessionData.visitorName || senderId,
            })

            const sessionMessages = [...existingMessages, userMessage]
            let assistantReplyText = ""
            let shouldOfferCallback = false
            let assistantProfileId = sessionData.assistantProfileId || null
            let resolvedGuidedState = currentGuidedState
            let lastDisposition = "auto_replied"
            let handoffStatus: string | null = null

            const generation = await generateOmniTextTurn({
                chatbotId,
                channel: "messenger",
                transcript: messageContent,
                messages: sessionMessages,
                contactKey: senderId,
            })
            assistantReplyText = generation.replyText
            shouldOfferCallback = generation.shouldOfferCallback
            assistantProfileId = generation.assistantProfileId || assistantProfileId

            const autoAction = await maybeExecuteOmniAutoActions({
                adminDb,
                chatbotId,
                channel: "messenger",
                sessionId,
                contactKey: senderId,
                displayName: sessionData.visitorName || senderId,
                visitorEmail: sessionData.visitorEmail || null,
                existingMessages,
                userMessage,
                assistantRawResponse: assistantReplyText,
            })

            if (autoAction.disposition) {
                lastDisposition = autoAction.disposition
            }

            if (shouldOfferCallback) {
                await executeOmniAction(adminDb, {
                    chatbotId,
                    actionId: "create_callback_request",
                    sourceChannel: "messenger",
                    sourceSessionId: sessionId,
                    contactKey: senderId,
                    canonicalContactId: contact.id || null,
                    payload: {
                        displayName: senderId,
                        notes: `Requested during Messenger conversation: ${messageContent}`,
                    },
                })

                if (!/geri arama talebinizi kaydettim|callback request/i.test(assistantReplyText)) {
                    assistantReplyText = `${assistantReplyText} Geri arama talebinizi kaydettim.`.trim()
                }

                handoffStatus = "callback_requested"
                lastDisposition = "callback_requested"
            }

            if (!assistantReplyText.trim()) continue

            const delivery = await dispatchOmniMessengerMessage(
                adminDb,
                chatbotId,
                {
                    ...sessionData,
                    contactKey: senderId,
                    canonicalContactId: contact.id || null,
                    channelMeta: {
                        ...(sessionData.channelMeta || {}),
                        pageId,
                        senderId,
                    },
                },
                assistantReplyText,
                {
                    source: "api/omni/channels/messenger/webhook",
                    sessionId,
                }
            )

            const assistantMessage = {
                role: "assistant",
                content: assistantReplyText,
                createdAt: new Date(),
            }

            await upsertOmniSession(adminDb, {
                sessionId,
                chatbotId,
                channel: "messenger",
                contactKey: senderId,
                canonicalContactId: contact.id || null,
                channelMeta: {
                    pageId,
                    senderId,
                },
                message: assistantMessage,
                transcriptSummary: buildTranscriptSummary([...sessionMessages, assistantMessage]),
                assistantProfileId,
                guidedSkillState: resolvedGuidedState,
                handoffStatus,
                lastDisposition,
            })

            await upsertOmniContactMemory(adminDb, {
                chatbotId,
                contactKey: senderId,
                canonicalContactId: contact.id || null,
                displayName: sessionData.visitorName || senderId,
                channel: "messenger",
                sourceSessionId: sessionId,
                preferredLanguage: "tr",
                userMessage: messageContent,
                assistantReply: assistantReplyText,
                lastDisposition,
            })

            await logOmniAuditEvent({
                chatbotId,
                channel: "messenger",
                eventType: "messenger.auto_reply",
                result: "success",
                source: "api/omni/channels/messenger/webhook",
                message: "Messenger reply delivered",
                metadata: {
                    sessionId,
                    pageId,
                    inboundMessageId: externalId,
                    outboundMessageId: delivery.messageId || null,
                    lastDisposition,
                },
            })
        }
    }

    return NextResponse.json({ received: true })
}
