import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { detectVoiceCallbackIntent, generateOmniVoiceTurn } from "@/lib/omni/assistant-core"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { upsertOmniContactMemory } from "@/lib/omni/memory"
import { claimOmniWebhookEvent } from "@/lib/omni/replay-protection"
import { normalizeVoiceNumberRecord, resolveTwilioFallbackVoice, resolveVoiceTtsProvider } from "@/lib/omni/voice-config"
import { verifyVoiceWebhookSignature } from "@/lib/omni/voice-provider"
import { renderVoicePrompt } from "@/lib/omni/voice-renderer"
import {
    escapeXml,
    getOmniChannelConfig,
    getPublicRequestUrl,
    getRequestOrigin,
    normalizePhoneNumber,
    normalizeVoiceIntegrationConfig,
    upsertContactGraph,
    upsertCallbackRequest,
    upsertOmniSession,
} from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

function xmlResponse(body: string) {
    return new NextResponse(body, {
        headers: {
            "Content-Type": "text/xml; charset=utf-8",
        },
    })
}

function buildTurnAction(req: Request, params: Record<string, string>) {
    const search = new URLSearchParams(params)
    return `${getRequestOrigin(req)}/api/omni/channels/voice/turn?${search.toString()}`
}

function shouldEndConversation(transcript: string) {
    return /(tesekkur|teşekkür|sag ol|sağ ol|goodbye|bye|gorusuruz|görüşürüz|tamam bu kadar|that's all)/i.test(transcript)
}

function buildVoiceTurnFallbackResponse() {
    return "Su anda net bir yanit olusturamiyorum. Isterseniz daha sonra tekrar deneyebilir veya geri arama talebi birakabilirsiniz."
}

function resolveVoiceTurnDisposition(params: { callbackRequested: boolean; endedByUser: boolean; usedFallback: boolean }) {
    if (params.callbackRequested) return "callback_requested"
    if (params.endedByUser) return "completed_by_user"
    if (params.usedFallback) return "assistant_fallback"
    return "in_progress"
}

export async function POST(req: Request) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Voice service is unavailable.</Say></Response>`)
    }

    const url = new URL(req.url)
    const chatbotId = url.searchParams.get("chatbotId") || ""
    const sessionId = url.searchParams.get("sessionId") || ""
    const voiceNumberId = url.searchParams.get("voiceNumberId") || ""
    const callbackId = url.searchParams.get("callbackId") || ""
    const emptyAttempt = url.searchParams.get("empty") === "1"

    if (!chatbotId || !sessionId || !voiceNumberId) {
        return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Voice routing is incomplete.</Say><Hangup/></Response>`)
    }

    const formData = await req.formData()
    const transcript = String(formData.get("SpeechResult") || "").trim()
    const callSid = String(formData.get("CallSid") || sessionId.replace(/^voice-/, ""))
    const from = normalizePhoneNumber(String(formData.get("From") || "").trim())
    const config = await getOmniChannelConfig(adminDb, chatbotId)
    const integration = normalizeVoiceIntegrationConfig(config.voiceIntegration)
    const formEntries = Array.from(formData.entries()).flatMap(([key, value]) => (typeof value === "string" ? [[key, value] as [string, string]] : []))

    if (!integration.authToken || !verifyVoiceWebhookSignature({
        requestUrl: getPublicRequestUrl(req),
        formEntries,
        signatureHeader: req.headers.get("x-twilio-signature"),
        authToken: integration.authToken,
    })) {
        await logOmniAuditEvent({
            chatbotId,
            channel: "voice",
            eventType: "voice.webhook_signature",
            result: "denied",
            source: "api/omni/channels/voice/turn",
            message: "Invalid Twilio webhook signature",
            metadata: {
                sessionId,
                callSid,
                voiceNumberId,
            },
        })
        return new Response("Forbidden", { status: 403 })
    }

    const sessionSnapshot = await adminDb.collection("chat_sessions").doc(sessionId).get()
    const sessionData = sessionSnapshot.exists ? sessionSnapshot.data() || {} : {}
    const existingMessages = Array.isArray(sessionData.messages) ? sessionData.messages : []
    const contact =
        from
            ? await upsertContactGraph(adminDb, {
                  chatbotId,
                  channel: "voice",
                  canonicalContactId: sessionData.canonicalContactId || null,
                  contactKey: from,
                  displayName: sessionData.visitorName || from,
                  verifiedPhone: from,
              })
            : null

    const voiceNumberSnapshot = await adminDb.collection("voice_numbers").doc(voiceNumberId).get()
    const voiceNumber = normalizeVoiceNumberRecord(
        voiceNumberSnapshot.exists ? { id: voiceNumberId, ...(voiceNumberSnapshot.data() || {}) } : { id: voiceNumberId, chatbotId }
    )
    const locale = voiceNumber.defaultLocale || sessionData.channelMeta?.locale || "tr-TR"
    const ttsProvider = resolveVoiceTtsProvider(voiceNumber, integration)
    const twilioFallbackVoice = resolveTwilioFallbackVoice(voiceNumber)

    const buildContinueResponse = async (spokenResponse: string) => {
        const action = buildTurnAction(req, {
            chatbotId,
            sessionId,
            voiceNumberId,
            ...(callbackId ? { callbackId } : {}),
        })
        const responsePrompt = await renderVoicePrompt({
            chatbotId,
            text: spokenResponse,
            locale,
            ttsProvider,
            twilioFallbackVoice,
            elevenLabsVoiceId: voiceNumber.elevenLabsVoiceId,
            elevenLabsModelId: voiceNumber.elevenLabsModelId,
            source: "api/omni/channels/voice/turn",
            metadata: {
                sessionId,
                callSid,
                voiceNumberId,
                promptType: "response",
            },
        })
        const gatherPrompt = await renderVoicePrompt({
            chatbotId,
            text: "Baska bir konuda da yardimci olabilirim.",
            locale,
            ttsProvider,
            twilioFallbackVoice,
            elevenLabsVoiceId: voiceNumber.elevenLabsVoiceId,
            elevenLabsModelId: voiceNumber.elevenLabsModelId,
            source: "api/omni/channels/voice/turn",
            metadata: {
                sessionId,
                callSid,
                voiceNumberId,
                promptType: "gather",
            },
        })
        return xmlResponse(
            `<?xml version="1.0" encoding="UTF-8"?>` +
                `<Response>` +
                responsePrompt.twimlFragment +
                `<Gather input="speech" speechTimeout="auto" speechModel="phone_call" action="${escapeXml(action)}" method="POST" language="${escapeXml(locale)}">` +
                gatherPrompt.twimlFragment +
                `</Gather>` +
                `<Redirect method="POST">${escapeXml(action)}&empty=1</Redirect>` +
                `</Response>`
        )
    }

    const buildHangupResponse = async (spokenResponse: string) => {
        const prompt = await renderVoicePrompt({
            chatbotId,
            text: spokenResponse,
            locale,
            ttsProvider,
            twilioFallbackVoice,
            elevenLabsVoiceId: voiceNumber.elevenLabsVoiceId,
            elevenLabsModelId: voiceNumber.elevenLabsModelId,
            source: "api/omni/channels/voice/turn",
            metadata: {
                sessionId,
                callSid,
                voiceNumberId,
                promptType: "hangup",
            },
        })

        return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response>${prompt.twimlFragment}<Hangup/></Response>`)
    }

    const replay = await claimOmniWebhookEvent(adminDb, {
        chatbotId,
        channel: "voice",
        source: "api/omni/channels/voice/turn",
        eventKey: `turn:${callSid}:${existingMessages.length}:${emptyAttempt ? "empty" : "speech"}:${transcript || "__empty__"}`,
        metadata: {
            sessionId,
            callSid,
            voiceNumberId,
            emptyAttempt,
        },
    })

    if (replay.duplicate) {
        const lastAssistantMessage = [...existingMessages].reverse().find((message: any) => message?.role === "assistant")?.content
        const duplicateMessage = lastAssistantMessage || "Ayni voice webhook tekrar geldi. Mevcut gorusmeyi kaldigimiz yerden surdurebiliriz."

        await logOmniAuditEvent({
            chatbotId,
            channel: "voice",
            eventType: "voice.webhook_replay",
            result: "success",
            source: "api/omni/channels/voice/turn",
            message: "Duplicate voice turn callback ignored",
            metadata: {
                sessionId,
                callSid,
                voiceNumberId,
                emptyAttempt,
            },
        })

        if (emptyAttempt) {
            return buildHangupResponse(duplicateMessage)
        }

        return buildContinueResponse(duplicateMessage)
    }

    if (!transcript) {
        const message = emptyAttempt
            ? "Sizi duyamadim. Isterseniz daha sonra tekrar arayabilir veya bir geri arama talebi birakabilirsiniz."
            : "Sizi tam duyamadim. Lutfen tekrar eder misiniz?"
        const noSpeechCount = Number(sessionData.channelMeta?.noSpeechCount || 0) + 1

        if (emptyAttempt && from && voiceNumber.callbackEnabled !== false) {
            await upsertCallbackRequest(adminDb, {
                id: callbackId || sessionId,
                chatbotId,
                contactKey: from,
                canonicalContactId: contact?.id || sessionData.canonicalContactId || null,
                displayName: from,
                sourceSessionId: sessionId,
                sourceChannel: "voice",
                priority: "normal",
                status: "pending",
                resolutionStatus: "waiting",
                voiceNumberId,
                notes: "Auto-created after empty speech capture on voice call.",
            })

            await upsertOmniSession(adminDb, {
                sessionId,
                chatbotId,
                channel: "voice",
                contactKey: from,
                canonicalContactId: contact?.id || sessionData.canonicalContactId || null,
                handoffStatus: "callback_requested",
                lastDisposition: "callback_requested",
                transcriptSummary: "No speech captured. Callback ticket created automatically.",
                channelMeta: {
                    callSid,
                    voiceNumberId,
                    locale,
                    callbackId: callbackId || null,
                    noSpeechCount,
                    carrierProvider: voiceNumber.carrierProvider,
                    routingMode: voiceNumber.routingMode || "twilio_direct",
                    ttsProvider,
                },
                assistantProfileId: "omni-default",
            })

            await logOmniAuditEvent({
                chatbotId,
                channel: "voice",
                eventType: "voice.empty_speech",
                result: "error",
                source: "api/omni/channels/voice/turn",
                message: "Empty speech capture repeated. Callback ticket created automatically.",
                metadata: {
                    sessionId,
                    callSid,
                    voiceNumberId,
                    noSpeechCount,
                    callbackId: callbackId || sessionId,
                },
            })

            await logOmniAuditEvent({
                chatbotId,
                channel: "voice",
                eventType: "voice.callback_requested",
                result: "success",
                source: "api/omni/channels/voice/turn",
                message: "Callback requested after repeated empty speech capture.",
                metadata: {
                    sessionId,
                    callSid,
                    voiceNumberId,
                    callbackId: callbackId || sessionId,
                },
            })

            return buildHangupResponse(message)
        }

        await upsertOmniSession(adminDb, {
            sessionId,
            chatbotId,
            channel: "voice",
            contactKey: from || sessionData.contactKey || null,
            canonicalContactId: contact?.id || sessionData.canonicalContactId || null,
            handoffStatus: emptyAttempt ? sessionData.handoffStatus || null : null,
            lastDisposition: emptyAttempt ? "no_speech_hangup" : "awaiting_repeat",
            transcriptSummary: emptyAttempt ? "No speech captured. Call ended without transcript." : "No speech captured. Asked caller to repeat.",
            channelMeta: {
                callSid,
                voiceNumberId,
                locale,
                callbackId: callbackId || null,
                noSpeechCount,
                carrierProvider: voiceNumber.carrierProvider,
                routingMode: voiceNumber.routingMode || "twilio_direct",
                ttsProvider,
            },
            assistantProfileId: sessionData.assistantProfileId || "omni-default",
        })

        await logOmniAuditEvent({
            chatbotId,
            channel: "voice",
            eventType: "voice.empty_speech",
            result: emptyAttempt ? "error" : "success",
            source: "api/omni/channels/voice/turn",
            message: emptyAttempt ? "Empty speech capture ended the call." : "Empty speech capture prompted a repeat request.",
            metadata: {
                sessionId,
                callSid,
                voiceNumberId,
                noSpeechCount,
                emptyAttempt,
            },
        })

        if (emptyAttempt) {
            return buildHangupResponse(message)
        }

        return buildContinueResponse(message)
    }

    const userMessage = {
        id: `${callSid}-user-${Date.now()}`,
        role: "user",
        content: transcript,
        createdAt: new Date().toISOString(),
        externalId: `${callSid}-user-${Date.now()}`,
    }

    let spokenResponse = ""
    let assistantProfileId = sessionData.assistantProfileId || "omni-default"
    let shouldOfferCallback = detectVoiceCallbackIntent(transcript)
    let usedFallback = false

    try {
        const turn = await generateOmniVoiceTurn({
            chatbotId,
            transcript,
            contactKey: from || sessionData.contactKey || null,
            messages: existingMessages,
            language: locale.startsWith("tr") ? "tr" : "en",
        })

        spokenResponse = turn.spokenResponse || buildVoiceTurnFallbackResponse()
        assistantProfileId = turn.assistantProfileId || assistantProfileId
        shouldOfferCallback = shouldOfferCallback || turn.shouldOfferCallback
        usedFallback = !Boolean(turn.spokenResponse)
    } catch (error) {
        spokenResponse = buildVoiceTurnFallbackResponse()
        usedFallback = true

        await logOmniAuditEvent({
            chatbotId,
            channel: "voice",
            eventType: "voice.turn_error",
            result: "error",
            source: "api/omni/channels/voice/turn",
            message: error instanceof Error ? error.message : "Voice turn generation failed",
            metadata: {
                sessionId,
                callSid,
                voiceNumberId,
                transcript,
            },
        })
    }

    let handoffStatus: string | null = null
    let callbackRequested = false
    const endedByUser = shouldEndConversation(transcript)

    if (shouldOfferCallback && from && voiceNumber.callbackEnabled !== false) {
        await upsertCallbackRequest(adminDb, {
            id: callbackId || sessionId,
            chatbotId,
            contactKey: from,
            canonicalContactId: contact?.id || sessionData.canonicalContactId || null,
            displayName: from,
            sourceSessionId: sessionId,
            sourceChannel: "voice",
            priority: "normal",
            status: "pending",
            resolutionStatus: "open",
            voiceNumberId,
            notes: `Requested during voice call: ${transcript}`,
        })
        spokenResponse = `${spokenResponse} Geri arama talebinizi kaydettim.`.trim()
        handoffStatus = "callback_requested"
        callbackRequested = true

        await logOmniAuditEvent({
            chatbotId,
            channel: "voice",
            eventType: "voice.callback_requested",
            result: "success",
            source: "api/omni/channels/voice/turn",
            message: "Callback requested during voice conversation.",
            metadata: {
                sessionId,
                callSid,
                voiceNumberId,
                callbackId: callbackId || sessionId,
                transcript,
            },
        })
    }

    const lastDisposition = resolveVoiceTurnDisposition({
        callbackRequested,
        endedByUser,
        usedFallback,
    })

    const assistantMessage = {
        id: `${callSid}-assistant-${Date.now()}`,
        role: "assistant",
        content: spokenResponse,
        createdAt: new Date().toISOString(),
        externalId: `${callSid}-assistant-${Date.now()}`,
    }

    const recentTurns = [...existingMessages, userMessage, assistantMessage]
        .slice(-6)
        .map((message: any) => `${message.role === "assistant" ? "Assistant" : "User"}: ${message.content}`)
        .join(" ")

    await upsertOmniSession(adminDb, {
        sessionId,
        chatbotId,
        channel: "voice",
        contactKey: from || sessionData.contactKey || null,
        canonicalContactId: contact?.id || sessionData.canonicalContactId || null,
        channelMeta: {
            callSid,
            voiceNumberId,
            locale,
            callbackId: callbackId || null,
            carrierProvider: voiceNumber.carrierProvider,
            routingMode: voiceNumber.routingMode || "twilio_direct",
            ttsProvider,
        },
        message: userMessage,
        transcriptSummary: recentTurns,
        lastDisposition,
        handoffStatus,
        assistantProfileId,
    })

    await upsertOmniContactMemory(adminDb, {
        chatbotId,
        contactKey: from || sessionData.contactKey || null,
        canonicalContactId: contact?.id || sessionData.canonicalContactId || null,
        displayName: sessionData.visitorName || from || null,
        channel: "voice",
        sourceSessionId: sessionId,
        preferredLanguage: locale,
        userMessage: transcript,
        assistantReply: spokenResponse,
        lastDisposition,
    })

    await upsertOmniSession(adminDb, {
        sessionId,
        chatbotId,
        channel: "voice",
        contactKey: from || sessionData.contactKey || null,
        canonicalContactId: contact?.id || sessionData.canonicalContactId || null,
        channelMeta: {
            callSid,
            voiceNumberId,
            locale,
            callbackId: callbackId || null,
            carrierProvider: voiceNumber.carrierProvider,
            routingMode: voiceNumber.routingMode || "twilio_direct",
            ttsProvider,
        },
        message: assistantMessage,
        transcriptSummary: recentTurns,
        lastDisposition,
        handoffStatus,
        assistantProfileId,
    })

    await logOmniAuditEvent({
        chatbotId,
        channel: "voice",
        eventType: endedByUser ? "voice.turn_completed" : "voice.turn_response",
        result: usedFallback ? "error" : "success",
        source: "api/omni/channels/voice/turn",
        message: endedByUser ? "Voice conversation completed by caller." : "Voice turn response generated.",
        metadata: {
            sessionId,
            callSid,
            voiceNumberId,
            lastDisposition,
            usedFallback,
            callbackRequested,
            assistantProfileId,
        },
    })

    if (endedByUser) {
        return buildHangupResponse(spokenResponse)
    }

    return buildContinueResponse(spokenResponse)
}
