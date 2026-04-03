import { NextResponse } from "next/server"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { classifyOmniDeliveryError, recordOmniDeliveryAttempt } from "@/lib/omni/delivery-attempts"
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
    upsertCallbackRequest,
} from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const body = await req.json()
    const chatbotId = body.chatbotId
    const id = body.id

    if (!chatbotId || !id) {
        return jsonError("chatbotId and id are required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "operations.manage")) {
        return jsonError("Forbidden", 403)
    }

    const callbackSnapshot = await authz.adminDb.collection("callback_requests").doc(id).get()
    if (!callbackSnapshot.exists) {
        return jsonError("callback request not found", 404)
    }

    const callback = callbackSnapshot.data() || {}
    const to = normalizePhoneNumber(body.to || callback.contactKey || "")
    if (!to) {
        return jsonError("callback contact must resolve to a phone number", 400)
    }

    const voiceNumberSnapshot = body.voiceNumberId
        ? await authz.adminDb.collection("voice_numbers").doc(body.voiceNumberId).get()
        : null

    let voiceNumberDoc = voiceNumberSnapshot && voiceNumberSnapshot.exists ? voiceNumberSnapshot : null
    if (!voiceNumberDoc) {
        const activeNumbers = await authz.adminDb
            .collection("voice_numbers")
            .where("chatbotId", "==", chatbotId)
            .where("routingStatus", "==", "active")
            .limit(1)
            .get()

        if (activeNumbers.empty) {
            return jsonError("no active voice number configured", 400)
        }

        voiceNumberDoc = activeNumbers.docs[0]
    }

    const voiceNumber = normalizeVoiceNumberRecord({
        id: voiceNumberDoc.id,
        ...(voiceNumberDoc.data() || {}),
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
            source: "api/omni/callbacks/execute",
            status: "failed",
            callbackId: id,
            destination: to,
            voiceNumberId: voiceNumberDoc.id,
            payloadText: "Manual outbound callback",
            retryEligible: false,
            errorClass: "config",
            errorMessage: "Voice channel is disabled",
            metadata: {
                from,
            },
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "voice",
            eventType: "voice.callback_execute",
            result: "error",
            source: "api/omni/callbacks/execute",
            message: "Voice channel is disabled",
            metadata: {
                callbackId: id,
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
            source: "api/omni/callbacks/execute",
            status: "failed",
            callbackId: id,
            destination: to,
            voiceNumberId: voiceNumberDoc.id,
            payloadText: "Manual outbound callback",
            retryEligible: false,
            errorClass: "config",
            errorMessage: "Twilio credentials are not configured for this tenant",
            metadata: {
                from,
            },
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "voice",
            eventType: "voice.callback_execute",
            result: "error",
            source: "api/omni/callbacks/execute",
            message: "Twilio credentials are not configured for this tenant",
            metadata: {
                callbackId: id,
                deliveryAttemptId: attempt.id || null,
            },
        })
        return jsonError("Twilio credentials are not configured for this tenant", 400)
    }

    if (routingMode === "twilio_byoc" && !byocTrunkSid) {
        const attempt = await recordOmniDeliveryAttempt(authz.adminDb, {
            chatbotId,
            channel: "voice",
            provider: "twilio",
            direction: "outbound",
            source: "api/omni/callbacks/execute",
            status: "failed",
            callbackId: id,
            destination: to,
            voiceNumberId: voiceNumberDoc.id,
            payloadText: "Manual outbound callback",
            retryEligible: false,
            errorClass: "config",
            errorMessage: "BYOC trunk SID is not configured for this voice number",
            metadata: {
                from,
                routingMode,
            },
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "voice",
            eventType: "voice.byoc_missing",
            result: "error",
            source: "api/omni/callbacks/execute",
            message: "BYOC trunk SID is not configured for this voice number",
            metadata: {
                callbackId: id,
                deliveryAttemptId: attempt.id || null,
            },
        })
        return jsonError("BYOC trunk SID is not configured for this voice number", 400)
    }

    const origin = getRequestOrigin(req)
    const outboundUrl = `${origin}/api/omni/channels/voice/outbound?chatbotId=${encodeURIComponent(chatbotId)}&callbackId=${encodeURIComponent(id)}&voiceNumberId=${encodeURIComponent(voiceNumberDoc.id)}`
    const statusUrl = `${origin}/api/omni/channels/voice/status?callbackId=${encodeURIComponent(id)}`

    try {
        const call = await createVoiceOutboundCall({
            accountSid: integration.accountSid,
            authToken: integration.authToken,
            to,
            from,
            url: outboundUrl,
            statusCallback: statusUrl,
            byocTrunkSid: routingMode === "twilio_byoc" ? byocTrunkSid : null,
        })

        const attempt = await recordOmniDeliveryAttempt(authz.adminDb, {
            chatbotId,
            channel: "voice",
            provider: "twilio",
            direction: "outbound",
            source: "api/omni/callbacks/execute",
            status: "success",
            callbackId: id,
            destination: to,
            payloadText: "Manual outbound callback",
            providerMessageId: call?.sid || null,
            providerTargetId: from,
            voiceNumberId: voiceNumberDoc.id,
            retryEligible: false,
            metadata: {
                outboundUrl,
                statusUrl,
                routingMode,
                byocTrunkSid: routingMode === "twilio_byoc" ? byocTrunkSid : null,
            },
        })

        const request = await upsertCallbackRequest(authz.adminDb, {
            id,
            chatbotId,
            contactKey: to,
            canonicalContactId: callback.canonicalContactId || null,
            displayName: callback.displayName || to,
            owner: callback.owner || null,
            priority: callback.priority || "normal",
            status: "scheduled",
            dueAt: callback.dueAt || null,
            sourceSessionId: callback.sourceSessionId || null,
            sourceChannel: "voice",
            resolutionStatus: "waiting",
            voiceNumberId: voiceNumberDoc.id,
            activeCallSid: call?.sid || null,
            lastAttemptAt: new Date(),
            notes: callback.notes || "Manual outbound callback initiated.",
        })

        await logOmniAuditEvent({
            chatbotId,
            channel: "voice",
            eventType: "voice.callback_execute",
            result: "success",
            source: "api/omni/callbacks/execute",
            message: "Manual outbound callback initiated",
            metadata: {
                callbackId: id,
                callSid: call?.sid || null,
                deliveryAttemptId: attempt.id || null,
            },
        })

        return NextResponse.json({
            request,
            call: {
                sid: call?.sid || null,
                status: call?.status || "queued",
                to,
                from,
            },
            deliveryAttemptId: attempt.id || null,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to start callback call"
        const attempt = await recordOmniDeliveryAttempt(authz.adminDb, {
            chatbotId,
            channel: "voice",
            provider: "twilio",
            direction: "outbound",
            source: "api/omni/callbacks/execute",
            status: "failed",
            callbackId: id,
            destination: to,
            payloadText: "Manual outbound callback",
            providerTargetId: from,
            voiceNumberId: voiceNumberDoc.id,
            retryEligible: false,
            errorClass: classifyOmniDeliveryError(error),
            errorMessage: message,
            metadata: {
                outboundUrl,
                statusUrl,
            },
        })

        await logOmniAuditEvent({
            chatbotId,
            channel: "voice",
            eventType: "voice.callback_execute",
            result: "error",
            source: "api/omni/callbacks/execute",
            message,
            metadata: {
                callbackId: id,
                deliveryAttemptId: attempt.id || null,
            },
        })

        return NextResponse.json({ error: message, deliveryAttemptId: attempt.id || null }, { status: 400 })
    }
}
