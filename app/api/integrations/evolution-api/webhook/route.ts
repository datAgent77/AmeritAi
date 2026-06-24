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
import { upsertContactGraph, upsertOmniSession } from "@/lib/omni/server-utils"
import { detectContactLanguage } from "@/lib/detect-language"
import { normalizeEvolutionApiConfig } from "@/lib/integrations/evolution-api/setup"
import {
    classifyConsentKeyword,
    consentReplyLanguage,
    getOptInConfirmation,
    getOptOutConfirmation,
    recordOptIn,
    recordOptOut,
} from "@/lib/messaging/opt-out"

export const dynamic = "force-dynamic"

function textFromEvolutionMessage(message: any) {
    return (
        message?.conversation ||
        message?.extendedTextMessage?.text ||
        message?.imageMessage?.caption ||
        message?.videoMessage?.caption ||
        message?.buttonsResponseMessage?.selectedDisplayText ||
        message?.listResponseMessage?.title ||
        (message?.imageMessage ? "[Image]" : null) ||
        (message?.audioMessage ? "[Audio]" : null) ||
        "[Unsupported content]"
    )
}

function normalizeRemoteJid(remoteJid: string) {
    const raw = String(remoteJid || "").trim()
    const number = raw.split("@")[0] || raw
    return number.replace(/[^\d]/g, "") || raw
}

function buildTranscriptSummary(messages: any[]) {
    return messages
        .slice(-6)
        .map((message: any) => `${message.role === "assistant" ? "Assistant" : "User"}: ${message.content}`)
        .join(" ")
}

function extractMessages(body: any) {
    const data = body?.data || body
    const messages = Array.isArray(data) ? data : [data]
    return messages
        .map((item: any) => {
            const key = item?.key || item?.message?.key || {}
            const message = item?.message || item?.data?.message || item
            const remoteJid = key?.remoteJid || item?.remoteJid || item?.from || ""
            return {
                externalId: key?.id || item?.id || item?.messageId || `${remoteJid}-${Date.now()}`,
                fromMe: key?.fromMe === true || item?.fromMe === true,
                remoteJid,
                pushName: item?.pushName || item?.senderName || null,
                timestamp: item?.messageTimestamp || item?.timestamp || null,
                content: textFromEvolutionMessage(message),
            }
        })
        .filter((message: any) => message.remoteJid && !message.fromMe)
}

export async function POST(req: Request) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const chatbotId = searchParams.get("chatbotId") || ""
    const secret = searchParams.get("secret") || ""
    if (!chatbotId || !secret) {
        return NextResponse.json({ error: "Missing webhook credentials" }, { status: 400 })
    }

    const configSnapshot = await adminDb.collection("omni_channel_configs").doc(chatbotId).get()
    const config = configSnapshot.exists ? configSnapshot.data() || {} : {}
    const evolutionConfig = normalizeEvolutionApiConfig(config.evolutionApi)
    if (!evolutionConfig.enabled || !evolutionConfig.webhookSecret || evolutionConfig.webhookSecret !== secret) {
        await logOmniAuditEvent({
            chatbotId,
            channel: "whatsapp",
            eventType: "evolution_api.webhook_auth",
            result: "denied",
            source: "api/integrations/evolution-api/webhook",
            message: "Invalid Evolution API webhook secret",
        })
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let body: any = null
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const eventName = String(body?.event || body?.type || "").toUpperCase()
    if (eventName && eventName !== "MESSAGES_UPSERT") {
        if (eventName === "CONNECTION_UPDATE") {
            await adminDb.collection("omni_channel_configs").doc(chatbotId).set({
                evolutionApi: {
                    ...evolutionConfig,
                    connectionState: String(body?.data?.state || body?.state || "unknown").toLowerCase(),
                    lastHealthCheckAt: new Date().toISOString(),
                },
            }, { merge: true })
        }
        return NextResponse.json({ received: true, ignored: true })
    }

    const messages = extractMessages(body)
    for (const message of messages) {
        const from = normalizeRemoteJid(message.remoteJid)
        const sessionId = `whatsapp-evolution-${evolutionConfig.instanceName || "instance"}-${from}`
        const sessionRef = adminDb.collection("chat_sessions").doc(sessionId)
        const sessionSnapshot = await sessionRef.get()
        const sessionData = sessionSnapshot.exists ? sessionSnapshot.data() || {} : {}
        const existingMessages = Array.isArray(sessionData.messages) ? sessionData.messages : []

        const replay = await claimOmniWebhookEvent(adminDb, {
            chatbotId,
            channel: "whatsapp",
            source: "api/integrations/evolution-api/webhook",
            eventKey: `message:${evolutionConfig.instanceName}:${message.externalId}`,
            metadata: {
                sessionId,
                externalId: message.externalId,
                remoteJid: message.remoteJid,
            },
        })
        if (replay.duplicate) continue

        const createdAt = message.timestamp ? new Date(Number(message.timestamp) * 1000) : new Date()
        const userMessage = {
            role: "user",
            content: message.content,
            createdAt,
            externalId: message.externalId,
        }
        const currentGuidedState = normalizeGuidedSkillState(sessionData.guidedSkillState)
        const contact = await upsertContactGraph(adminDb, {
            chatbotId,
            channel: "whatsapp",
            contactKey: from,
            displayName: message.pushName || from,
            whatsappNumber: from,
        })

        const channelMeta = {
            provider: "evolution-api",
            instanceName: evolutionConfig.instanceName,
            remoteJid: message.remoteJid,
        }

        await upsertOmniSession(adminDb, {
            sessionId,
            chatbotId,
            channel: "whatsapp",
            contactKey: from,
            canonicalContactId: contact.id || null,
            channelMeta,
            message: userMessage,
            transcriptSummary: buildTranscriptSummary([...existingMessages, userMessage]),
            lastDisposition: "received",
            assistantProfileId: "omni-default",
        })

        // TCPA: honor STOP/START before any assistant processing.
        const consent = classifyConsentKeyword(message.content)
        if (consent) {
            const replyLang = consentReplyLanguage(message.content)
            if (consent === "opt_out") {
                await recordOptOut(adminDb, { chatbotId, channel: "whatsapp", contactKey: from }, { source: "api/integrations/evolution-api/webhook", keyword: message.content.slice(0, 40) })
            } else {
                await recordOptIn(adminDb, { chatbotId, channel: "whatsapp", contactKey: from }, { source: "api/integrations/evolution-api/webhook", keyword: message.content.slice(0, 40) })
            }
            const confirmation = consent === "opt_out" ? getOptOutConfirmation(replyLang) : getOptInConfirmation(replyLang)
            try {
                await dispatchOmniWhatsAppMessage(
                    adminDb,
                    chatbotId,
                    { ...sessionData, contactKey: from, canonicalContactId: contact.id || null, channelMeta },
                    confirmation,
                    { source: "api/integrations/evolution-api/webhook", sessionId, metadata: { bypassOptOut: true, consent, provider: "evolution-api", inboundMessageId: message.externalId } }
                )
            } catch {
                // confirmation delivery failure should not block recording the opt-out
            }
            await logOmniAuditEvent({
                chatbotId,
                channel: "whatsapp",
                eventType: consent === "opt_out" ? "evolution_api.opt_out" : "evolution_api.opt_in",
                result: "success",
                source: "api/integrations/evolution-api/webhook",
                message: consent === "opt_out" ? "Contact opted out (STOP)" : "Contact opted back in (START)",
                metadata: { sessionId, externalId: message.externalId },
            })
            continue
        }

        const whatsappConfig = config.whatsapp || {}
        const autoReplyEnabled = whatsappConfig.enabled !== false && (whatsappConfig.defaultReplyMode || "assistant") === "assistant"
        if (!autoReplyEnabled) continue

        try {
            const guidedResult = await resolveGuidedSkillTurn({
                adminDb,
                chatbotId,
                channel: "whatsapp",
                sessionId,
                transcript: message.content,
                currentState: currentGuidedState,
                contactKey: from,
                canonicalContactId: contact.id || null,
                language: null,
            })

            let replyText = guidedResult.guidedTextMenu || guidedResult.assistantContent || ""
            let handoffStatus = guidedResult.handoffStatus || null
            let lastDisposition = guidedResult.lastDisposition || "guided_skill"

            if (!guidedResult.handled) {
                const turn = await generateOmniTextTurn({
                    chatbotId,
                    channel: "whatsapp",
                    transcript: message.content,
                    contactKey: from,
                    messages: [...existingMessages, userMessage],
                })
                replyText = turn.replyText || "Su anda net bir yanit veremiyorum."
                lastDisposition = "auto_replied"

                const autoAction = await maybeExecuteOmniAutoActions({
                    adminDb,
                    chatbotId,
                    channel: "whatsapp",
                    sessionId,
                    contactKey: from,
                    displayName: message.pushName || from,
                    visitorEmail: sessionData.visitorEmail || null,
                    existingMessages,
                    userMessage,
                    assistantRawResponse: turn.rawResponse,
                })

                if (autoAction.disposition) lastDisposition = autoAction.disposition
                if (turn.shouldOfferCallback) {
                    await executeOmniAction(adminDb, {
                        chatbotId,
                        actionId: "create_callback_request",
                        sourceChannel: "whatsapp",
                        sourceSessionId: sessionId,
                        contactKey: from,
                        canonicalContactId: contact.id || null,
                        payload: {
                            displayName: message.pushName || from,
                            notes: `Requested during WhatsApp conversation: ${message.content}`,
                        },
                    })
                    if (!/geri arama talebinizi kaydettim|callback request/i.test(replyText)) {
                        replyText = `${replyText} Geri arama talebinizi kaydettim.`.trim()
                    }
                    handoffStatus = "callback_requested"
                    lastDisposition = "callback_requested"
                }
            }

            const delivery = await dispatchOmniWhatsAppMessage(
                adminDb,
                chatbotId,
                {
                    ...sessionData,
                    contactKey: from,
                    canonicalContactId: contact.id || null,
                    channelMeta,
                },
                replyText,
                {
                    source: "api/integrations/evolution-api/webhook",
                    sessionId,
                    metadata: {
                        autoReply: true,
                        provider: "evolution-api",
                        inboundMessageId: message.externalId,
                    },
                }
            )

            const assistantMessage = {
                role: "assistant",
                content: replyText,
                createdAt: new Date(),
                externalId: delivery.messageId || `evolution-assistant-${message.externalId}`,
            }

            await upsertOmniSession(adminDb, {
                sessionId,
                chatbotId,
                channel: "whatsapp",
                contactKey: from,
                canonicalContactId: contact.id || null,
                channelMeta: {
                    ...channelMeta,
                    lastOutboundMessageId: delivery.messageId || null,
                },
                message: assistantMessage,
                guidedSkillState: guidedResult.handled ? guidedResult.nextState ?? currentGuidedState ?? null : currentGuidedState ?? null,
                transcriptSummary: buildTranscriptSummary([...existingMessages, userMessage, assistantMessage]),
                lastDisposition,
                handoffStatus,
                assistantProfileId: sessionData.assistantProfileId || "omni-default",
            })

            await upsertOmniContactMemory(adminDb, {
                chatbotId,
                contactKey: from,
                canonicalContactId: contact.id || null,
                displayName: message.pushName || from,
                channel: "whatsapp",
                sourceSessionId: sessionId,
                preferredLanguage: detectContactLanguage(message.content),
                userMessage: message.content,
                assistantReply: replyText,
                lastDisposition,
            })
        } catch (error) {
            await logOmniAuditEvent({
                chatbotId,
                channel: "whatsapp",
                eventType: "evolution_api.auto_reply",
                result: "error",
                source: "api/integrations/evolution-api/webhook",
                message: error instanceof Error ? error.message : "Evolution API auto reply failed",
                metadata: {
                    sessionId,
                    externalId: message.externalId,
                },
            })
        }
    }

    return NextResponse.json({ received: true })
}
