import { NextResponse } from "next/server"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { normalizeVoiceNumberRecord, resolveTwilioFallbackVoice, resolveVoiceTtsProvider } from "@/lib/omni/voice-config"
import { verifyVoiceWebhookSignature } from "@/lib/omni/voice-provider"
import { renderVoicePrompt } from "@/lib/omni/voice-renderer"
import {
    getOmniChannelConfig,
    getPublicRequestUrl,
    normalizeVoiceIntegrationConfig,
} from "@/lib/omni/server-utils"
import { getAdminDb } from "@/lib/firebase-admin"

export const dynamic = "force-dynamic"

function xmlResponse(body: string) {
    return new NextResponse(body, {
        headers: {
            "Content-Type": "text/xml; charset=utf-8",
        },
    })
}

export async function POST(req: Request) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Voice service is unavailable.</Say></Response>`)
    }

    const url = new URL(req.url)
    const chatbotId = url.searchParams.get("chatbotId") || ""
    const voiceNumberId = url.searchParams.get("voiceNumberId") || ""
    if (!chatbotId || !voiceNumberId) {
        return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Voice routing is incomplete.</Say><Hangup/></Response>`)
    }

    const config = await getOmniChannelConfig(adminDb, chatbotId)
    const integration = normalizeVoiceIntegrationConfig(config.voiceIntegration)
    const formData = await req.formData()
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
            eventType: "voice.test_call_signature",
            result: "denied",
            source: "api/omni/channels/voice/test-call/twiml",
            message: "Invalid Twilio webhook signature on test call TwiML request",
            metadata: {
                voiceNumberId,
            },
        })
        return new Response("Forbidden", { status: 403 })
    }

    const voiceNumberSnapshot = await adminDb.collection("voice_numbers").doc(voiceNumberId).get()
    const voiceNumber = normalizeVoiceNumberRecord(
        voiceNumberSnapshot.exists ? { id: voiceNumberId, ...(voiceNumberSnapshot.data() || {}) } : { id: voiceNumberId, chatbotId }
    )
    const locale = voiceNumber.defaultLocale || "tr-TR"
    const ttsProvider = resolveVoiceTtsProvider(voiceNumber, integration)
    const twilioFallbackVoice = resolveTwilioFallbackVoice(voiceNumber)
    const message =
        voiceNumber.greetingMessage ||
        "Bu bir Vion AI test cagrisidir. Sesli kanaliniz calisiyor. Bu aramayi simdi kapatiyorum."
    const prompt = await renderVoicePrompt({
        chatbotId,
        text: message,
        locale,
        ttsProvider,
        twilioFallbackVoice,
        elevenLabsVoiceId: voiceNumber.elevenLabsVoiceId,
        elevenLabsModelId: voiceNumber.elevenLabsModelId,
        source: "api/omni/channels/voice/test-call/twiml",
        metadata: {
            voiceNumberId,
            promptType: "test_call",
        },
    })

    return xmlResponse(
        `<?xml version="1.0" encoding="UTF-8"?>` +
            `<Response>` +
            prompt.twimlFragment +
            `<Hangup/>` +
            `</Response>`
    )
}
