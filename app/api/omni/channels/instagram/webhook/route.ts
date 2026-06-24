import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { dispatchOmniInstagramMessage } from "@/lib/omni/channel-dispatch"
import { executeOmniAction } from "@/lib/omni/action-execution"
import { generateOmniTextTurn } from "@/lib/omni/assistant-core"
import { maybeExecuteOmniAutoActions } from "@/lib/omni/auto-actions"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { upsertOmniContactMemory } from "@/lib/omni/memory"
import { claimOmniWebhookEvent } from "@/lib/omni/replay-protection"
import { normalizeGuidedSkillState } from "@/lib/guided-skills"
import { resolveGuidedSkillTurn } from "@/lib/guided-skills/engine"
import { upsertContactGraph, upsertOmniSession, verifyMetaWebhookSignature } from "@/lib/omni/server-utils"
import { detectContactLanguage } from "@/lib/detect-language"
import {
    classifyConsentKeyword,
    consentReplyLanguage,
    getOptInConfirmation,
    getOptOutConfirmation,
    recordOptIn,
    recordOptOut,
} from "@/lib/messaging/opt-out"

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
    const verifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || process.env.META_WEBHOOK_VERIFY_TOKEN

    if (mode === "subscribe" && challenge && verifyToken && token === verifyToken) {
        return new Response(challenge, { status: 200 })
    }

    if (mode === "subscribe" && challenge && token && adminDb) {
        const snapshot = await adminDb.collection("omni_channel_configs").where("instagram.verifyToken", "==", token).limit(1).get()
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
        const configSnapshot = await adminDb.collection("omni_channel_configs").where("instagram.pageId", "==", firstPageId).limit(1).get()
        if (configSnapshot.empty) {
            return NextResponse.json({ received: true, ignored: true })
        }

        const configDoc = configSnapshot.docs[0]
        const config = configDoc.data() || {}
        const appSecret = config?.instagram?.appSecretRef || process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET || ""
        const signatureHeader = req.headers.get("x-hub-signature-256")

        if (!appSecret) {
            await logOmniAuditEvent({
                chatbotId: config.chatbotId || configDoc.id,
                channel: "instagram",
                eventType: "instagram.webhook_signature",
                result: "error",
                source: "api/omni/channels/instagram/webhook",
                message: "Instagram app secret is not configured",
                metadata: {
                    pageId: firstPageId,
                },
            })
            return NextResponse.json({ error: "Instagram app secret is not configured" }, { status: 401 })
        }

        if (!verifyMetaWebhookSignature(rawBody, signatureHeader, appSecret)) {
            await logOmniAuditEvent({
                chatbotId: config.chatbotId || configDoc.id,
                channel: "instagram",
                eventType: "instagram.webhook_signature",
                result: "denied",
                source: "api/omni/channels/instagram/webhook",
                message: "Invalid Meta webhook signature",
                metadata: {
                    pageId: firstPageId,
                },
            })
            return NextResponse.json({ error: "Invalid webhook signature" }, { status: 403 })
        }
    }

    const entries = Array.isArray(body.entry) ? body.entry : []

    for (const entry of entries) {
        const events = Array.isArray(entry.messaging) ? entry.messaging : []

        for (const event of events) {
            if (event?.message?.is_echo) {
                continue
            }

            const senderId = event?.sender?.id
            const pageId = event?.recipient?.id || entry.id
            const messageContent =
                event?.message?.text ||
                (Array.isArray(event?.message?.attachments) && event.message.attachments.length > 0 ? "[Attachment]" : null) ||
                event?.postback?.payload ||
                null

            if (!senderId || !pageId || !messageContent) {
                continue
            }

            const configSnapshot = await adminDb.collection("omni_channel_configs").where("instagram.pageId", "==", pageId).limit(1).get()
            if (configSnapshot.empty) {
                continue
            }

            const configDoc = configSnapshot.docs[0]
            const config = configDoc.data() || {}
            const chatbotId = (config.chatbotId || configDoc.id) as string
            const instagramConfig = config.instagram || {}

            if (instagramConfig.enabled === false) {
                await logOmniAuditEvent({
                    chatbotId,
                    channel: "instagram",
                    eventType: "instagram.channel_disabled",
                    result: "blocked",
                    source: "api/omni/channels/instagram/webhook",
                    message: "Instagram channel disabled; inbound event ignored",
                    metadata: {
                        pageId,
                        messageCount: events.length,
                    },
                })
                continue
            }

            const sessionId = `instagram-${pageId}-${senderId}`
            const sessionRef = adminDb.collection("chat_sessions").doc(sessionId)
            const sessionSnapshot = await sessionRef.get()
            const sessionData = sessionSnapshot.exists ? sessionSnapshot.data() || {} : {}
            const existingMessages = Array.isArray(sessionData.messages) ? sessionData.messages : []
            const externalId = event?.message?.mid || `${senderId}-${entry.time || Date.now()}`
            const replay = await claimOmniWebhookEvent(adminDb, {
                chatbotId,
                channel: "instagram",
                source: "api/omni/channels/instagram/webhook",
                eventKey: `message:${pageId}:${externalId}`,
                metadata: {
                    sessionId,
                    pageId,
                    senderId,
                    externalId,
                },
            })

            if (replay.duplicate) {
                await logOmniAuditEvent({
                    chatbotId,
                    channel: "instagram",
                    eventType: "instagram.webhook_replay",
                    result: "success",
                    source: "api/omni/channels/instagram/webhook",
                    message: "Duplicate Instagram webhook ignored",
                    metadata: {
                        sessionId,
                        pageId,
                        externalId,
                    },
                })
                continue
            }

            if (hasMessageExternalId(existingMessages, externalId)) {
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
                channel: "instagram",
                contactKey: senderId,
                displayName: senderId,
                instagramHandle: senderId,
            })

            await upsertOmniSession(adminDb, {
                sessionId,
                chatbotId,
                channel: "instagram",
                contactKey: senderId,
                canonicalContactId: contact.id || null,
                channelMeta: {
                    pageId,
                    senderId,
                },
                message: userMessage,
                transcriptSummary: buildTranscriptSummary([...existingMessages, userMessage]),
                lastDisposition: "received",
                assistantProfileId: "omni-default",
            })

            // TCPA: honor STOP/START before any assistant processing.
            const consent = classifyConsentKeyword(messageContent)
            if (consent) {
                const replyLang = consentReplyLanguage(messageContent)
                if (consent === "opt_out") {
                    await recordOptOut(adminDb, { chatbotId, channel: "instagram", contactKey: senderId }, { source: "api/omni/channels/instagram/webhook", keyword: messageContent.slice(0, 40) })
                } else {
                    await recordOptIn(adminDb, { chatbotId, channel: "instagram", contactKey: senderId }, { source: "api/omni/channels/instagram/webhook", keyword: messageContent.slice(0, 40) })
                }
                const confirmation = consent === "opt_out" ? getOptOutConfirmation(replyLang) : getOptInConfirmation(replyLang)
                try {
                    await dispatchOmniInstagramMessage(
                        adminDb,
                        chatbotId,
                        { ...sessionData, contactKey: senderId, canonicalContactId: contact.id || null, channelMeta: { ...(sessionData.channelMeta || {}), pageId, senderId } },
                        confirmation,
                        { source: "api/omni/channels/instagram/webhook", sessionId, metadata: { bypassOptOut: true, consent, inboundMessageId: externalId } }
                    )
                } catch {
                    // confirmation delivery failure should not block recording the opt-out
                }
                await logOmniAuditEvent({
                    chatbotId,
                    channel: "instagram",
                    eventType: consent === "opt_out" ? "instagram.opt_out" : "instagram.opt_in",
                    result: "success",
                    source: "api/omni/channels/instagram/webhook",
                    message: consent === "opt_out" ? "Contact opted out (STOP)" : "Contact opted back in (START)",
                    metadata: { sessionId, pageId, inboundMessageId: externalId },
                })
                continue
            }

            const autoReplyEnabled = instagramConfig.enabled !== false && (instagramConfig.defaultReplyMode || "assistant") === "assistant"
            if (!autoReplyEnabled) {
                continue
            }

            try {
                const guidedResult = await resolveGuidedSkillTurn({
                    adminDb,
                    chatbotId,
                    channel: "instagram",
                    sessionId,
                    transcript: messageContent,
                    currentState: currentGuidedState,
                    contactKey: senderId,
                    canonicalContactId: contact.id || null,
                    language: null,
                })

                if (guidedResult.handled) {
                    const replyText = guidedResult.guidedTextMenu || guidedResult.assistantContent || "Su anda net bir yanit veremiyorum."
                    const lastDisposition = guidedResult.lastDisposition || "guided_skill"
                    const handoffStatus = guidedResult.handoffStatus || null

                    const delivery = await dispatchOmniInstagramMessage(
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
                        replyText,
                        {
                            source: "api/omni/channels/instagram/webhook",
                            sessionId,
                            metadata: {
                                autoReply: true,
                                guidedSkill: true,
                                inboundMessageId: externalId,
                            },
                        }
                    )

                    const assistantMessage = {
                        role: "assistant",
                        content: replyText,
                        createdAt: new Date(),
                        externalId: delivery.messageId || `ig-guided-${externalId}`,
                    }

                    await upsertOmniSession(adminDb, {
                        sessionId,
                        chatbotId,
                        channel: "instagram",
                        contactKey: senderId,
                        canonicalContactId: contact.id || null,
                        channelMeta: {
                            pageId,
                            senderId,
                            lastOutboundMessageId: delivery.messageId || null,
                        },
                        message: assistantMessage,
                        guidedSkillState: guidedResult.nextState ?? currentGuidedState ?? null,
                        transcriptSummary: buildTranscriptSummary([...existingMessages, userMessage, assistantMessage]),
                        lastDisposition,
                        handoffStatus,
                        assistantProfileId: sessionData.assistantProfileId || "omni-default",
                    })

                    await upsertOmniContactMemory(adminDb, {
                        chatbotId,
                        contactKey: senderId,
                        canonicalContactId: contact.id || null,
                        displayName: sessionData.visitorName || senderId,
                        channel: "instagram",
                        sourceSessionId: sessionId,
                        preferredLanguage: detectContactLanguage(messageContent),
                        userMessage: messageContent,
                        assistantReply: replyText,
                        lastDisposition,
                    })

                    await logOmniAuditEvent({
                        chatbotId,
                        channel: "instagram",
                        eventType: "instagram.auto_reply",
                        result: "success",
                        source: "api/omni/channels/instagram/webhook",
                        message: "Guided reply delivered",
                        metadata: {
                            sessionId,
                            pageId,
                            inboundMessageId: externalId,
                            outboundMessageId: delivery.messageId || null,
                            lastDisposition,
                            guidedSkillId: guidedResult.nextState?.skillId || currentGuidedState?.skillId || null,
                        },
                    })

                    continue
                }

                const turn = await generateOmniTextTurn({
                    chatbotId,
                    channel: "instagram",
                    transcript: messageContent,
                    contactKey: senderId,
                    messages: [...existingMessages, userMessage],
                })

                let replyText = turn.replyText || "Su anda net bir yanit veremiyorum."
                let handoffStatus: string | null = null
                let lastDisposition = "auto_replied"

                if (existingMessages.length === 0 && guidedResult.guidedTextMenu) {
                    replyText = `${replyText}\n\n${guidedResult.guidedTextMenu}`.trim()
                }

                const autoAction = await maybeExecuteOmniAutoActions({
                    adminDb,
                    chatbotId,
                    channel: "instagram",
                    sessionId,
                    contactKey: senderId,
                    displayName: sessionData.visitorName || senderId,
                    visitorEmail: sessionData.visitorEmail || null,
                    existingMessages,
                    userMessage,
                    assistantRawResponse: turn.rawResponse,
                })

                if (autoAction.disposition) {
                    lastDisposition = autoAction.disposition
                }

                if (turn.shouldOfferCallback) {
                    await executeOmniAction(adminDb, {
                        chatbotId,
                        actionId: "create_callback_request",
                        sourceChannel: "instagram",
                        sourceSessionId: sessionId,
                        contactKey: senderId,
                        canonicalContactId: contact.id || null,
                        payload: {
                            displayName: senderId,
                            notes: `Requested during Instagram DM: ${messageContent}`,
                        },
                    })

                    if (!/geri arama talebinizi kaydettim|callback request/i.test(replyText)) {
                        replyText = `${replyText} Geri arama talebinizi kaydettim.`.trim()
                    }

                    handoffStatus = "callback_requested"
                    lastDisposition = "callback_requested"
                }

                const delivery = await dispatchOmniInstagramMessage(
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
                    replyText,
                    {
                        source: "api/omni/channels/instagram/webhook",
                        sessionId,
                        metadata: {
                            autoReply: true,
                            inboundMessageId: externalId,
                        },
                    }
                )

                const assistantMessage = {
                    role: "assistant",
                    content: replyText,
                    createdAt: new Date(),
                    externalId: delivery.messageId || `ig-assistant-${externalId}`,
                }

                await upsertOmniSession(adminDb, {
                    sessionId,
                    chatbotId,
                    channel: "instagram",
                    contactKey: senderId,
                    canonicalContactId: contact.id || null,
                    channelMeta: {
                        pageId,
                        senderId,
                        lastOutboundMessageId: delivery.messageId || null,
                    },
                    message: assistantMessage,
                    transcriptSummary: buildTranscriptSummary([...existingMessages, userMessage, assistantMessage]),
                    lastDisposition,
                    handoffStatus,
                    assistantProfileId: turn.assistantProfileId || sessionData.assistantProfileId || "omni-default",
                })

                await upsertOmniContactMemory(adminDb, {
                    chatbotId,
                    contactKey: senderId,
                    canonicalContactId: contact.id || null,
                    displayName: sessionData.visitorName || senderId,
                    channel: "instagram",
                    sourceSessionId: sessionId,
                    preferredLanguage: detectContactLanguage(messageContent),
                    userMessage: messageContent,
                    assistantReply: replyText,
                    lastDisposition,
                })

                await logOmniAuditEvent({
                    chatbotId,
                    channel: "instagram",
                    eventType: "instagram.auto_reply",
                    result: "success",
                    source: "api/omni/channels/instagram/webhook",
                    message: "Assistant reply delivered",
                    metadata: {
                        sessionId,
                        pageId,
                        inboundMessageId: externalId,
                        outboundMessageId: delivery.messageId || null,
                        lastDisposition,
                        createdAppointmentId: autoAction.createdAppointmentId || null,
                        createdLeadId: autoAction.createdLeadId || null,
                    },
                })
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Instagram auto reply failed"
                await upsertOmniSession(adminDb, {
                    sessionId,
                    chatbotId,
                    channel: "instagram",
                    contactKey: senderId,
                    canonicalContactId: contact.id || null,
                    channelMeta: {
                        pageId,
                        senderId,
                    },
                    lastDisposition: "reply_failed",
                    assistantProfileId: "omni-default",
                })
                await logOmniAuditEvent({
                    chatbotId,
                    channel: "instagram",
                    eventType: "instagram.auto_reply",
                    result: "error",
                    source: "api/omni/channels/instagram/webhook",
                    message: errorMessage,
                    metadata: {
                        sessionId,
                        pageId,
                        inboundMessageId: externalId,
                    },
                })
            }
        }
    }

    return NextResponse.json({ received: true })
}
