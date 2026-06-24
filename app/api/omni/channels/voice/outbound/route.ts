import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { normalizeVoiceNumberRecord, resolveProviderNumberId, resolveTwilioFallbackVoice, resolveVoiceChannelEnabled, resolveVoiceTtsProvider } from "@/lib/omni/voice-config"
import { verifyVoiceWebhookSignature } from "@/lib/omni/voice-provider"
import { renderVoicePrompt } from "@/lib/omni/voice-renderer"
import {
    escapeXml,
    getOmniChannelConfig,
    getPublicRequestUrl,
    getRequestOrigin,
    normalizePhoneNumber,
    normalizeVoiceIntegrationConfig,
    upsertCallbackRequest,
    upsertContactGraph,
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

export async function POST(req: Request) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Voice service is unavailable.</Say></Response>`)
    }

    const url = new URL(req.url)
    const chatbotId = url.searchParams.get("chatbotId") || ""
    const callbackId = url.searchParams.get("callbackId") || ""
    const voiceNumberId = url.searchParams.get("voiceNumberId") || ""

    if (!chatbotId || !callbackId || !voiceNumberId) {
        return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Voice routing is incomplete.</Say><Hangup/></Response>`)
    }

    const formData = await req.formData()
    const callSid = String(formData.get("CallSid") || `call-${Date.now()}`)
    const to = normalizePhoneNumber(String(formData.get("To") || "").trim())
    const from = normalizePhoneNumber(String(formData.get("From") || "").trim())
    const sessionId = `voice-${callSid}`

    const callbackSnapshot = await adminDb.collection("callback_requests").doc(callbackId).get()
    const callback = callbackSnapshot.exists ? callbackSnapshot.data() || {} : {}
    const voiceNumberSnapshot = await adminDb.collection("voice_numbers").doc(voiceNumberId).get()
    const voiceNumber = normalizeVoiceNumberRecord(
        voiceNumberSnapshot.exists ? { id: voiceNumberId, ...(voiceNumberSnapshot.data() || {}) } : { id: voiceNumberId, chatbotId }
    )
    const config = await getOmniChannelConfig(adminDb, chatbotId)
    const integration = normalizeVoiceIntegrationConfig(config.voiceIntegration)
    const channelEnabled = resolveVoiceChannelEnabled({ integration, voiceNumbers: [voiceNumber] })
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
            source: "api/omni/channels/voice/outbound",
            message: "Invalid Twilio webhook signature",
            metadata: {
                callbackId,
                voiceNumberId,
                callSid,
            },
        })
        return new Response("Forbidden", { status: 403 })
    }

    if (!channelEnabled) {
        return xmlResponse(
            `<?xml version="1.0" encoding="UTF-8"?><Response><Say>${escapeXml("This voice line is currently disabled.")}</Say><Hangup/></Response>`
        )
    }

    const locale = voiceNumber.defaultLocale || "tr-TR"
    const ttsProvider = resolveVoiceTtsProvider(voiceNumber, integration)
    const twilioFallbackVoice = resolveTwilioFallbackVoice(voiceNumber)
    const contactKey = normalizePhoneNumber(String(callback.contactKey || to || "").trim())
    const greeting = voiceNumber.greetingMessage || "Merhaba, talep ettiginiz geri arama icin ariyorum. Ben AmeritAI sesli asistanim."
    const continuePrompt = "Uygunsaniz devam edebiliriz. Sizi dinliyorum."

    const contact =
        contactKey
            ? await upsertContactGraph(adminDb, {
                  chatbotId,
                  channel: "voice",
                  contactKey,
                  displayName: callback.displayName || contactKey,
                  verifiedPhone: contactKey,
              })
            : null

    await upsertOmniSession(adminDb, {
        sessionId,
        chatbotId,
        channel: "voice",
        contactKey: contactKey || null,
        canonicalContactId: contact?.id || callback.canonicalContactId || null,
        visitorName: callback.displayName || null,
        channelMeta: {
            callSid,
            callbackId,
            outbound: true,
            voiceNumberId,
            dialedNumber: contactKey || null,
            fromNumber: from || null,
            locale,
            providerNumberId: resolveProviderNumberId(voiceNumber),
            carrierProvider: voiceNumber.carrierProvider,
            routingMode: voiceNumber.routingMode || "twilio_direct",
            ttsProvider,
        },
        lastDisposition: "outbound_in_progress",
        handoffStatus: "callback_requested",
        assistantProfileId: "omni-default",
    })

    await upsertCallbackRequest(adminDb, {
        id: callbackId,
        chatbotId,
        contactKey: contactKey || callback.contactKey || null,
        canonicalContactId: contact?.id || callback.canonicalContactId || null,
        displayName: callback.displayName || contactKey || null,
        sourceSessionId: sessionId,
        sourceChannel: "voice",
        status: "in_progress",
        resolutionStatus: "waiting",
        voiceNumberId,
        activeCallSid: callSid,
        lastAttemptAt: new Date(),
        notes: callback.notes || "Outbound callback in progress.",
    })

    const turnAction = buildTurnAction(req, {
        chatbotId,
        sessionId,
        voiceNumberId,
        callbackId,
    })
    const greetingPrompt = await renderVoicePrompt({
        chatbotId,
        text: greeting,
        locale,
        ttsProvider,
        twilioFallbackVoice,
        elevenLabsVoiceId: voiceNumber.elevenLabsVoiceId,
        elevenLabsModelId: voiceNumber.elevenLabsModelId,
        source: "api/omni/channels/voice/outbound",
        metadata: {
            callSid,
            callbackId,
            voiceNumberId,
            promptType: "greeting",
        },
    })
    const continueVoicePrompt = await renderVoicePrompt({
        chatbotId,
        text: continuePrompt,
        locale,
        ttsProvider,
        twilioFallbackVoice,
        elevenLabsVoiceId: voiceNumber.elevenLabsVoiceId,
        elevenLabsModelId: voiceNumber.elevenLabsModelId,
        source: "api/omni/channels/voice/outbound",
        metadata: {
            callSid,
            callbackId,
            voiceNumberId,
            promptType: "gather",
        },
    })

    await logOmniAuditEvent({
        chatbotId,
        channel: "voice",
        eventType: "voice.carrier_routing",
        result: "success",
        source: "api/omni/channels/voice/outbound",
        message: "Voice outbound routed successfully",
        metadata: {
            callSid,
            callbackId,
            voiceNumberId,
            carrierProvider: voiceNumber.carrierProvider,
            routingMode: voiceNumber.routingMode || "twilio_direct",
            ttsProvider,
            providerNumberId: resolveProviderNumberId(voiceNumber),
        },
    })

    return xmlResponse(
        `<?xml version="1.0" encoding="UTF-8"?>` +
            `<Response>` +
            greetingPrompt.twimlFragment +
            `<Gather input="speech" speechTimeout="auto" speechModel="phone_call" action="${escapeXml(turnAction)}" method="POST" language="${escapeXml(locale)}">` +
            continueVoicePrompt.twimlFragment +
            `</Gather>` +
            `<Redirect method="POST">${escapeXml(turnAction)}&empty=1</Redirect>` +
            `</Response>`
    )
}
