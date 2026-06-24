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

function buildGatherAction(params: Record<string, string>, req: Request) {
    const search = new URLSearchParams(params)
    return `${getRequestOrigin(req)}/api/omni/channels/voice/turn?${search.toString()}`
}

export async function POST(req: Request) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Voice service is unavailable.</Say></Response>`)
    }

    const formData = await req.formData()
    const callSid = String(formData.get("CallSid") || `call-${Date.now()}`)
    const from = normalizePhoneNumber(String(formData.get("From") || "").trim())
    const called = normalizePhoneNumber(String(formData.get("Called") || "").trim())
    const fromCity = String(formData.get("FromCity") || "").trim()

    const numberSnapshot = await adminDb.collection("voice_numbers").where("phoneNumber", "==", called).limit(1).get()

    if (numberSnapshot.empty) {
        return xmlResponse(
            `<?xml version="1.0" encoding="UTF-8"?><Response><Say>${escapeXml("This voice number is not configured yet.")}</Say><Hangup/></Response>`
        )
    }

    const numberDoc = numberSnapshot.docs[0]
    const voiceNumber = normalizeVoiceNumberRecord({
        id: numberDoc.id,
        ...(numberDoc.data() || {}),
    })

    if (voiceNumber.routingStatus === "paused") {
        return xmlResponse(
            `<?xml version="1.0" encoding="UTF-8"?><Response><Say>${escapeXml("This voice line is temporarily paused. Please try again later.")}</Say><Hangup/></Response>`
        )
    }

    const chatbotId = voiceNumber.chatbotId as string
    const sessionId = `voice-${callSid}`
    const locale = voiceNumber.defaultLocale || "tr-TR"
    const config = await getOmniChannelConfig(adminDb, chatbotId)
    const integration = normalizeVoiceIntegrationConfig(config.voiceIntegration)
    const channelEnabled = resolveVoiceChannelEnabled({ integration, voiceNumbers: [voiceNumber] })
    const ttsProvider = resolveVoiceTtsProvider(voiceNumber, integration)
    const twilioFallbackVoice = resolveTwilioFallbackVoice(voiceNumber)
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
            source: "api/omni/channels/voice/inbound",
            message: "Invalid Twilio webhook signature",
            metadata: {
                voiceNumberId: numberDoc.id,
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

    const contact = from
        ? await upsertContactGraph(adminDb, {
              chatbotId,
              channel: "voice",
              contactKey: from,
              displayName: from,
              verifiedPhone: from,
          })
        : null

    await upsertOmniSession(adminDb, {
        sessionId,
        chatbotId,
        channel: "voice",
        contactKey: from || null,
        canonicalContactId: contact?.id || null,
        channelMeta: {
            callSid,
            dialedNumber: called,
            callerCity: fromCity || null,
            providerNumberId: resolveProviderNumberId(voiceNumber),
            twilioNumberSid: voiceNumber.twilioNumberSid || null,
            voiceNumberId: numberDoc.id,
            locale,
            carrierProvider: voiceNumber.carrierProvider,
            routingMode: voiceNumber.routingMode || "twilio_direct",
            ttsProvider,
        },
        lastDisposition: "in_progress",
        assistantProfileId: "omni-default",
    })

    const greetingMessage = voiceNumber.greetingMessage || "Merhaba, AmeritAI sesli asistana hos geldiniz. Size nasil yardimci olabilirim?"
    const gatherAction = buildGatherAction(
        {
            chatbotId,
            sessionId,
            voiceNumberId: numberDoc.id,
        },
        req
    )
    const greetingPrompt = await renderVoicePrompt({
        chatbotId,
        text: greetingMessage,
        locale,
        ttsProvider,
        twilioFallbackVoice,
        elevenLabsVoiceId: voiceNumber.elevenLabsVoiceId,
        elevenLabsModelId: voiceNumber.elevenLabsModelId,
        source: "api/omni/channels/voice/inbound",
        metadata: {
            callSid,
            voiceNumberId: numberDoc.id,
            promptType: "greeting",
        },
    })
    const gatherPrompt = await renderVoicePrompt({
        chatbotId,
        text: "Konusun, sizi dinliyorum.",
        locale,
        ttsProvider,
        twilioFallbackVoice,
        elevenLabsVoiceId: voiceNumber.elevenLabsVoiceId,
        elevenLabsModelId: voiceNumber.elevenLabsModelId,
        source: "api/omni/channels/voice/inbound",
        metadata: {
            callSid,
            voiceNumberId: numberDoc.id,
            promptType: "gather",
        },
    })

    await logOmniAuditEvent({
        chatbotId,
        channel: "voice",
        eventType: "voice.carrier_routing",
        result: "success",
        source: "api/omni/channels/voice/inbound",
        message: "Voice inbound routed successfully",
        metadata: {
            callSid,
            voiceNumberId: numberDoc.id,
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
            `<Gather input="speech" speechTimeout="auto" speechModel="phone_call" action="${escapeXml(gatherAction)}" method="POST" language="${escapeXml(locale)}">` +
            gatherPrompt.twimlFragment +
            `</Gather>` +
            `<Redirect method="POST">${escapeXml(gatherAction)}&empty=1</Redirect>` +
            `</Response>`
    )
}
