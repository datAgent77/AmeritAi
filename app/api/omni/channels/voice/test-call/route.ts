import { NextResponse } from "next/server"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { classifyOmniDeliveryError, recordOmniDeliveryAttempt } from "@/lib/omni/delivery-attempts"
import { recordOmniSmokeRun } from "@/lib/omni/smoke-runs"
import { normalizeVoiceNumberRecord, resolveByocTrunkSid, resolveVoiceChannelEnabled, resolveVoiceRoutingMode } from "@/lib/omni/voice-config"
import { createVoiceOutboundCall } from "@/lib/omni/voice-provider"
import {
    authorizeOmniRequest,
    authorizedForOmniPermission,
    getOmniChannelConfig,
    getRequestOrigin,
    jsonError,
    normalizePhoneNumber,
    normalizeVoiceIntegrationConfig,
} from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const body = await req.json()
    const chatbotId = body.chatbotId
    const to = normalizePhoneNumber(body.to || "")
    const voiceNumberId = body.voiceNumberId || ""

    if (!chatbotId || !to || !voiceNumberId) {
        return jsonError("chatbotId, to and voiceNumberId are required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "channels.manage")) {
        return jsonError("Forbidden", 403)
    }

    const voiceNumberSnapshot = await authz.adminDb.collection("voice_numbers").doc(voiceNumberId).get()
    if (!voiceNumberSnapshot.exists) {
        return jsonError("voice number not found", 404)
    }

    const voiceNumber = normalizeVoiceNumberRecord({
        id: voiceNumberId,
        ...(voiceNumberSnapshot.data() || {}),
    })
    const from = normalizePhoneNumber(voiceNumber.phoneNumber || "")
    if (!from) {
        return jsonError("voice number is missing a valid phone number", 400)
    }

    const config = await getOmniChannelConfig(authz.adminDb, chatbotId)
    const integration = normalizeVoiceIntegrationConfig(config.voiceIntegration)
    const channelEnabled = resolveVoiceChannelEnabled({ integration, voiceNumbers: [voiceNumber] })
    const routingMode = resolveVoiceRoutingMode(voiceNumber)
    const byocTrunkSid = resolveByocTrunkSid(voiceNumber, integration)
    if (!channelEnabled) {
        const attempt = await recordOmniDeliveryAttempt(authz.adminDb, {
            chatbotId,
            channel: "voice",
            provider: "twilio",
            direction: "outbound",
            source: "api/omni/channels/voice/test-call",
            status: "failed",
            destination: to,
            voiceNumberId,
            payloadText: "Voice test call",
            retryEligible: false,
            errorClass: "config",
            errorMessage: "Voice channel is disabled",
            metadata: {
                from,
                testCall: true,
            },
        })
        await recordOmniSmokeRun(authz.adminDb, {
            chatbotId,
            channel: "voice",
            provider: "twilio",
            action: "test_call",
            result: "blocked",
            source: "api/omni/channels/voice/test-call",
            message: "Voice channel is disabled",
            target: to,
            metadata: {
                voiceNumberId,
                deliveryAttemptId: attempt.id || null,
            },
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "voice",
            eventType: "voice.test_call",
            result: "blocked",
            source: "api/omni/channels/voice/test-call",
            message: "Voice channel is disabled",
            metadata: {
                deliveryAttemptId: attempt.id || null,
            },
        })
        return jsonError("Voice channel is disabled", 400)
    }

    if (!integration.accountSid || !integration.authToken) {
        const attempt = await recordOmniDeliveryAttempt(authz.adminDb, {
            chatbotId,
            channel: "voice",
            provider: "twilio",
            direction: "outbound",
            source: "api/omni/channels/voice/test-call",
            status: "failed",
            destination: to,
            voiceNumberId,
            payloadText: "Voice test call",
            retryEligible: false,
            errorClass: "config",
            errorMessage: "Twilio credentials are not configured",
            metadata: {
                from,
                testCall: true,
            },
        })
        await recordOmniSmokeRun(authz.adminDb, {
            chatbotId,
            channel: "voice",
            provider: "twilio",
            action: "test_call",
            result: "error",
            source: "api/omni/channels/voice/test-call",
            message: "Twilio credentials are not configured",
            target: to,
            metadata: {
                voiceNumberId,
                deliveryAttemptId: attempt.id || null,
            },
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "voice",
            eventType: "voice.test_call",
            result: "error",
            source: "api/omni/channels/voice/test-call",
            message: "Twilio credentials are not configured",
            metadata: {
                deliveryAttemptId: attempt.id || null,
            },
        })
        return jsonError("Twilio credentials are not configured", 400)
    }

    if (routingMode === "twilio_byoc" && !byocTrunkSid) {
        const attempt = await recordOmniDeliveryAttempt(authz.adminDb, {
            chatbotId,
            channel: "voice",
            provider: "twilio",
            direction: "outbound",
            source: "api/omni/channels/voice/test-call",
            status: "failed",
            destination: to,
            voiceNumberId,
            payloadText: "Voice test call",
            retryEligible: false,
            errorClass: "config",
            errorMessage: "BYOC trunk SID is not configured for this voice number",
            metadata: {
                from,
                routingMode,
                testCall: true,
            },
        })
        await recordOmniSmokeRun(authz.adminDb, {
            chatbotId,
            channel: "voice",
            provider: "twilio",
            action: "test_call",
            result: "error",
            source: "api/omni/channels/voice/test-call",
            message: "BYOC trunk SID is not configured for this voice number",
            target: to,
            metadata: {
                voiceNumberId,
                deliveryAttemptId: attempt.id || null,
            },
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "voice",
            eventType: "voice.byoc_missing",
            result: "error",
            source: "api/omni/channels/voice/test-call",
            message: "BYOC trunk SID is not configured for this voice number",
            metadata: {
                voiceNumberId,
                deliveryAttemptId: attempt.id || null,
            },
        })
        return jsonError("BYOC trunk SID is not configured for this voice number", 400)
    }

    const origin = getRequestOrigin(req)
    const twimlUrl = `${origin}/api/omni/channels/voice/test-call/twiml?chatbotId=${encodeURIComponent(chatbotId)}&voiceNumberId=${encodeURIComponent(voiceNumberId)}`
    const statusUrl =
        `${origin}/api/omni/channels/voice/status?testCall=1` +
        `&chatbotId=${encodeURIComponent(chatbotId)}` +
        `&voiceNumberId=${encodeURIComponent(voiceNumberId)}`

    try {
        const call = await createVoiceOutboundCall({
            accountSid: integration.accountSid,
            authToken: integration.authToken,
            to,
            from,
            url: twimlUrl,
            statusCallback: statusUrl,
            byocTrunkSid: routingMode === "twilio_byoc" ? byocTrunkSid : null,
        })

        const attempt = await recordOmniDeliveryAttempt(authz.adminDb, {
            chatbotId,
            channel: "voice",
            provider: "twilio",
            direction: "outbound",
            source: "api/omni/channels/voice/test-call",
            status: "success",
            destination: to,
            payloadText: "Voice test call",
            providerMessageId: call?.sid || null,
            providerTargetId: from,
            voiceNumberId,
            retryEligible: false,
            metadata: {
                from,
                twimlUrl,
                statusUrl,
                testCall: true,
                routingMode,
                byocTrunkSid: routingMode === "twilio_byoc" ? byocTrunkSid : null,
            },
        })

        await recordOmniSmokeRun(authz.adminDb, {
            chatbotId,
            channel: "voice",
            provider: "twilio",
            action: "test_call",
            result: "success",
            source: "api/omni/channels/voice/test-call",
            message: "Voice test call started",
            target: to,
            metadata: {
                from,
                callSid: call?.sid || null,
                voiceNumberId,
                deliveryAttemptId: attempt.id || null,
            },
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "voice",
            eventType: "voice.test_call",
            result: "success",
            source: "api/omni/channels/voice/test-call",
            message: "Voice test call started",
            metadata: {
                to,
                from,
                voiceNumberId,
                callSid: call?.sid || null,
                deliveryAttemptId: attempt.id || null,
            },
        })

        return NextResponse.json({
            ok: true,
            call: {
                sid: call?.sid || null,
                status: call?.status || "queued",
                to,
                from,
            },
            deliveryAttemptId: attempt.id || null,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to start voice test call"
        const attempt = await recordOmniDeliveryAttempt(authz.adminDb, {
            chatbotId,
            channel: "voice",
            provider: "twilio",
            direction: "outbound",
            source: "api/omni/channels/voice/test-call",
            status: "failed",
            destination: to,
            payloadText: "Voice test call",
            providerTargetId: from,
            voiceNumberId,
            retryEligible: false,
            errorClass: classifyOmniDeliveryError(error),
            errorMessage: message,
            metadata: {
                testCall: true,
            },
        })
        await recordOmniSmokeRun(authz.adminDb, {
            chatbotId,
            channel: "voice",
            provider: "twilio",
            action: "test_call",
            result: "error",
            source: "api/omni/channels/voice/test-call",
            message,
            target: to,
            metadata: {
                voiceNumberId,
                deliveryAttemptId: attempt.id || null,
            },
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "voice",
            eventType: "voice.test_call",
            result: "error",
            source: "api/omni/channels/voice/test-call",
            message,
            metadata: {
                to,
                voiceNumberId,
                deliveryAttemptId: attempt.id || null,
            },
        })
        return NextResponse.json({ error: message, deliveryAttemptId: attempt.id || null }, { status: 400 })
    }
}
