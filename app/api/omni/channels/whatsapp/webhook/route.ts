import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { dispatchOmniWhatsAppMessage } from "@/lib/omni/channel-dispatch"
import { executeOmniAction } from "@/lib/omni/action-execution"
import { generateOmniTextTurn } from "@/lib/omni/assistant-core"
import { maybeExecuteOmniAutoActions } from "@/lib/omni/auto-actions"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { upsertOmniContactMemory } from "@/lib/omni/memory"
import { claimOmniWebhookEvent } from "@/lib/omni/replay-protection"
import { normalizeGuidedSkillState } from "@/lib/guided-skills"
import { resolveGuidedSkillTurn } from "@/lib/guided-skills/engine"
import { upsertContactGraph, upsertOmniSession, verifyMetaWebhookSignature } from "@/lib/omni/server-utils"
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
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || process.env.META_WEBHOOK_VERIFY_TOKEN

    if (mode === "subscribe" && challenge && verifyToken && token === verifyToken) {
        return new Response(challenge, { status: 200 })
    }

    if (mode === "subscribe" && challenge && token && adminDb) {
        const snapshot = await adminDb.collection("omni_channel_configs").where("whatsapp.verifyToken", "==", token).limit(1).get()
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

    const firstPhoneNumberId = body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id
    if (firstPhoneNumberId) {
        const configSnapshot = await adminDb.collection("omni_channel_configs").where("whatsapp.phoneNumberId", "==", firstPhoneNumberId).limit(1).get()
        if (configSnapshot.empty) {
            return NextResponse.json({ received: true, ignored: true })
        }

        const configDoc = configSnapshot.docs[0]
        const config = configDoc.data() || {}
        const appSecret = config?.whatsapp?.appSecretRef || process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET || ""
        const signatureHeader = req.headers.get("x-hub-signature-256")

        if (!appSecret) {
            await logOmniAuditEvent({
                chatbotId: config.chatbotId || configDoc.id,
                channel: "whatsapp",
                eventType: "whatsapp.webhook_signature",
                result: "error",
                source: "api/omni/channels/whatsapp/webhook",
                message: "WhatsApp app secret is not configured",
                metadata: {
                    phoneNumberId: firstPhoneNumberId,
                },
            })
            return NextResponse.json({ error: "WhatsApp app secret is not configured" }, { status: 401 })
        }

        if (!verifyMetaWebhookSignature(rawBody, signatureHeader, appSecret)) {
            await logOmniAuditEvent({
                chatbotId: config.chatbotId || configDoc.id,
                channel: "whatsapp",
                eventType: "whatsapp.webhook_signature",
                result: "denied",
                source: "api/omni/channels/whatsapp/webhook",
                message: "Invalid Meta webhook signature",
                metadata: {
                    phoneNumberId: firstPhoneNumberId,
                },
            })
            return NextResponse.json({ error: "Invalid webhook signature" }, { status: 403 })
        }
    }

    const entries = Array.isArray(body.entry) ? body.entry : []

    for (const entry of entries) {
        const changes = Array.isArray(entry.changes) ? entry.changes : []

        for (const change of changes) {
            const value = change?.value || {}
            const metadata = value.metadata || {}
            const phoneNumberId = metadata.phone_number_id
            const displayNumber = metadata.display_phone_number || null
            const messages = Array.isArray(value.messages) ? value.messages : []

            if (!phoneNumberId) {
                continue
            }

            const configSnapshot = await adminDb.collection("omni_channel_configs").where("whatsapp.phoneNumberId", "==", phoneNumberId).limit(1).get()
            if (configSnapshot.empty) {
                continue
            }

            const configDoc = configSnapshot.docs[0]
            const config = configDoc.data() || {}
            const chatbotId = (config.chatbotId || configDoc.id) as string
            const whatsappConfig = config.whatsapp || {}

            if (whatsappConfig.enabled === false) {
                await logOmniAuditEvent({
                    chatbotId,
                    channel: "whatsapp",
                    eventType: "whatsapp.channel_disabled",
                    result: "blocked",
                    source: "api/omni/channels/whatsapp/webhook",
                    message: "WhatsApp channel disabled; inbound event ignored",
                    metadata: {
                        phoneNumberId,
                        displayNumber,
                        messageCount: messages.length,
                    },
                })
                continue
            }

            for (const message of messages) {
                const from = message?.from
                const content =
                    message?.text?.body ||
                    message?.button?.text ||
                    message?.interactive?.button_reply?.title ||
                    (message?.image ? "[Image]" : null) ||
                    "[Unsupported content]"

                if (!from) {
                    continue
                }

                const sessionId = `whatsapp-${phoneNumberId}-${from}`
                const sessionRef = adminDb.collection("chat_sessions").doc(sessionId)
                const sessionSnapshot = await sessionRef.get()
                const sessionData = sessionSnapshot.exists ? sessionSnapshot.data() || {} : {}
                const existingMessages = Array.isArray(sessionData.messages) ? sessionData.messages : []
                const externalId = message?.id || `${phoneNumberId}-${from}-${Date.now()}`
                const replay = await claimOmniWebhookEvent(adminDb, {
                    chatbotId,
                    channel: "whatsapp",
                    source: "api/omni/channels/whatsapp/webhook",
                    eventKey: `message:${phoneNumberId}:${externalId}`,
                    metadata: {
                        sessionId,
                        phoneNumberId,
                        from,
                        externalId,
                    },
                })

                if (replay.duplicate) {
                    await logOmniAuditEvent({
                        chatbotId,
                        channel: "whatsapp",
                        eventType: "whatsapp.webhook_replay",
                        result: "success",
                        source: "api/omni/channels/whatsapp/webhook",
                        message: "Duplicate WhatsApp webhook ignored",
                        metadata: {
                            sessionId,
                            phoneNumberId,
                            externalId,
                        },
                    })
                    continue
                }

                if (hasMessageExternalId(existingMessages, externalId)) {
                    continue
                }

                const createdAt = message?.timestamp ? new Date(Number(message.timestamp) * 1000) : new Date()
                const userMessage = {
                    role: "user",
                    content,
                    createdAt,
                    externalId,
                }
                const currentGuidedState = normalizeGuidedSkillState(sessionData.guidedSkillState)

                const contact = await upsertContactGraph(adminDb, {
                    chatbotId,
                    channel: "whatsapp",
                    contactKey: from,
                    displayName: from,
                    whatsappNumber: from,
                })

                await upsertOmniSession(adminDb, {
                    sessionId,
                    chatbotId,
                    channel: "whatsapp",
                    contactKey: from,
                    canonicalContactId: contact.id || null,
                    channelMeta: {
                        phoneNumberId,
                        displayNumber,
                    },
                    message: userMessage,
                    transcriptSummary: buildTranscriptSummary([...existingMessages, userMessage]),
                    lastDisposition: "received",
                    assistantProfileId: "omni-default",
                })

                // TCPA: honor STOP/START before any assistant processing.
                const consent = classifyConsentKeyword(content)
                if (consent) {
                    const replyLang = consentReplyLanguage(content)
                    if (consent === "opt_out") {
                        await recordOptOut(adminDb, { chatbotId, channel: "whatsapp", contactKey: from }, { source: "api/omni/channels/whatsapp/webhook", keyword: content.slice(0, 40) })
                    } else {
                        await recordOptIn(adminDb, { chatbotId, channel: "whatsapp", contactKey: from }, { source: "api/omni/channels/whatsapp/webhook", keyword: content.slice(0, 40) })
                    }
                    const confirmation = consent === "opt_out" ? getOptOutConfirmation(replyLang) : getOptInConfirmation(replyLang)
                    try {
                        await dispatchOmniWhatsAppMessage(
                            adminDb,
                            chatbotId,
                            {
                                ...sessionData,
                                contactKey: from,
                                canonicalContactId: contact.id || null,
                                channelMeta: { ...(sessionData.channelMeta || {}), phoneNumberId, displayNumber },
                            },
                            confirmation,
                            { source: "api/omni/channels/whatsapp/webhook", sessionId, metadata: { bypassOptOut: true, consent, inboundMessageId: externalId } }
                        )
                    } catch {
                        // confirmation delivery failure should not block recording the opt-out
                    }
                    await logOmniAuditEvent({
                        chatbotId,
                        channel: "whatsapp",
                        eventType: consent === "opt_out" ? "whatsapp.opt_out" : "whatsapp.opt_in",
                        result: "success",
                        source: "api/omni/channels/whatsapp/webhook",
                        message: consent === "opt_out" ? "Contact opted out (STOP)" : "Contact opted back in (START)",
                        metadata: { sessionId, phoneNumberId, inboundMessageId: externalId },
                    })
                    continue
                }

                const autoReplyEnabled = whatsappConfig.enabled !== false && (whatsappConfig.defaultReplyMode || "assistant") === "assistant"
                if (!autoReplyEnabled) {
                    continue
                }

                try {
                    const guidedResult = await resolveGuidedSkillTurn({
                        adminDb,
                        chatbotId,
                        channel: "whatsapp",
                        sessionId,
                        transcript: content,
                        currentState: currentGuidedState,
                        contactKey: from,
                        canonicalContactId: contact.id || null,
                        language: null,
                    })

                    if (guidedResult.handled) {
                        const replyText = guidedResult.guidedTextMenu || guidedResult.assistantContent || "Su anda net bir yanit veremiyorum."
                        const lastDisposition = guidedResult.lastDisposition || "guided_skill"
                        const handoffStatus = guidedResult.handoffStatus || null

                        const delivery = await dispatchOmniWhatsAppMessage(
                            adminDb,
                            chatbotId,
                            {
                                ...sessionData,
                                contactKey: from,
                                canonicalContactId: contact.id || null,
                                channelMeta: {
                                    ...(sessionData.channelMeta || {}),
                                    phoneNumberId,
                                    displayNumber,
                                },
                            },
                            replyText,
                            {
                                source: "api/omni/channels/whatsapp/webhook",
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
                            externalId: delivery.messageId || `wa-guided-${externalId}`,
                        }

                        await upsertOmniSession(adminDb, {
                            sessionId,
                            chatbotId,
                            channel: "whatsapp",
                            contactKey: from,
                            canonicalContactId: contact.id || null,
                            channelMeta: {
                                phoneNumberId,
                                displayNumber,
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
                            contactKey: from,
                            canonicalContactId: contact.id || null,
                            displayName: sessionData.visitorName || from,
                            channel: "whatsapp",
                            sourceSessionId: sessionId,
                            preferredLanguage: "tr",
                            userMessage: content,
                            assistantReply: replyText,
                            lastDisposition,
                        })

                        await logOmniAuditEvent({
                            chatbotId,
                            channel: "whatsapp",
                            eventType: "whatsapp.auto_reply",
                            result: "success",
                            source: "api/omni/channels/whatsapp/webhook",
                            message: "Guided reply delivered",
                            metadata: {
                                sessionId,
                                phoneNumberId,
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
                        channel: "whatsapp",
                        transcript: content,
                        contactKey: from,
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
                        channel: "whatsapp",
                        sessionId,
                        contactKey: from,
                        displayName: sessionData.visitorName || from,
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
                            sourceChannel: "whatsapp",
                            sourceSessionId: sessionId,
                            contactKey: from,
                            canonicalContactId: contact.id || null,
                            payload: {
                                displayName: from,
                                notes: `Requested during WhatsApp conversation: ${content}`,
                            },
                        })

                        if (!/geri arama talebinizi kaydettim|callback request/i.test(replyText)) {
                            replyText = `${replyText} Geri arama talebinizi kaydettim.`.trim()
                        }

                        handoffStatus = "callback_requested"
                        lastDisposition = "callback_requested"
                    }

                    const delivery = await dispatchOmniWhatsAppMessage(
                        adminDb,
                        chatbotId,
                        {
                            ...sessionData,
                            contactKey: from,
                            canonicalContactId: contact.id || null,
                            channelMeta: {
                                ...(sessionData.channelMeta || {}),
                                phoneNumberId,
                                displayNumber,
                            },
                        },
                        replyText,
                        {
                            source: "api/omni/channels/whatsapp/webhook",
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
                        externalId: delivery.messageId || `wa-assistant-${externalId}`,
                    }

                    await upsertOmniSession(adminDb, {
                        sessionId,
                        chatbotId,
                        channel: "whatsapp",
                        contactKey: from,
                        canonicalContactId: contact.id || null,
                        channelMeta: {
                            phoneNumberId,
                            displayNumber,
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
                        contactKey: from,
                        canonicalContactId: contact.id || null,
                        displayName: sessionData.visitorName || from,
                        channel: "whatsapp",
                        sourceSessionId: sessionId,
                        preferredLanguage: "tr",
                        userMessage: content,
                        assistantReply: replyText,
                        lastDisposition,
                    })

                    await logOmniAuditEvent({
                        chatbotId,
                        channel: "whatsapp",
                        eventType: "whatsapp.auto_reply",
                        result: "success",
                        source: "api/omni/channels/whatsapp/webhook",
                        message: "Assistant reply delivered",
                        metadata: {
                            sessionId,
                            phoneNumberId,
                            inboundMessageId: externalId,
                            outboundMessageId: delivery.messageId || null,
                            lastDisposition,
                            createdAppointmentId: autoAction.createdAppointmentId || null,
                            createdLeadId: autoAction.createdLeadId || null,
                        },
                    })
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : "WhatsApp auto reply failed"
                    await upsertOmniSession(adminDb, {
                        sessionId,
                        chatbotId,
                        channel: "whatsapp",
                        contactKey: from,
                        canonicalContactId: contact.id || null,
                        channelMeta: {
                            phoneNumberId,
                            displayNumber,
                        },
                        lastDisposition: "reply_failed",
                        assistantProfileId: "omni-default",
                    })
                    await logOmniAuditEvent({
                        chatbotId,
                        channel: "whatsapp",
                        eventType: "whatsapp.auto_reply",
                        result: "error",
                        source: "api/omni/channels/whatsapp/webhook",
                        message: errorMessage,
                        metadata: {
                            sessionId,
                            phoneNumberId,
                            inboundMessageId: externalId,
                        },
                    })
                }
            }
        }
    }

    return NextResponse.json({ received: true })
}
