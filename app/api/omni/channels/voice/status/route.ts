import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { claimOmniWebhookEvent } from "@/lib/omni/replay-protection"
import { recordOmniSmokeRun } from "@/lib/omni/smoke-runs"
import { verifyVoiceWebhookSignature } from "@/lib/omni/voice-provider"
import {
    getOmniChannelConfig,
    getPublicRequestUrl,
    jsonError,
    normalizeVoiceIntegrationConfig,
    upsertCallbackRequest,
    upsertOmniSession,
} from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

function normalizeVoiceStatusDisposition(callStatus: string) {
    if (callStatus === "completed") return "completed"
    if (callStatus === "in-progress" || callStatus === "answered") return "active"
    if (callStatus === "queued" || callStatus === "initiated" || callStatus === "ringing") return "scheduled"
    if (callStatus === "busy" || callStatus === "no-answer") return "missed"
    if (callStatus === "canceled") return "canceled"
    if (callStatus === "failed") return "failed"
    return callStatus || "unknown"
}

function mapVoiceCallbackState(callStatus: string) {
    if (callStatus === "completed") {
        return {
            status: "resolved" as const,
            resolutionStatus: "completed" as const,
        }
    }

    if (callStatus === "in-progress" || callStatus === "answered") {
        return {
            status: "in_progress" as const,
            resolutionStatus: "waiting" as const,
        }
    }

    if (callStatus === "queued" || callStatus === "initiated" || callStatus === "ringing") {
        return {
            status: "scheduled" as const,
            resolutionStatus: "waiting" as const,
        }
    }

    return {
        status: "pending" as const,
        resolutionStatus: "waiting" as const,
    }
}

function mapVoiceAuditResult(callStatus: string) {
    return callStatus === "failed" || callStatus === "busy" || callStatus === "no-answer" || callStatus === "canceled" ? "error" : "success"
}

export async function POST(req: Request) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return jsonError("Firebase Admin SDK not initialized", 500)
    }

    const url = new URL(req.url)
    const testCall = url.searchParams.get("testCall") === "1"
    const chatbotIdFromUrl = url.searchParams.get("chatbotId") || ""
    const voiceNumberIdFromUrl = url.searchParams.get("voiceNumberId") || ""
    const callbackIdFromUrl = url.searchParams.get("callbackId") || ""
    const formData = await req.formData()
    const callSid = String(formData.get("CallSid") || "").trim()
    const callStatus = String(formData.get("CallStatus") || "completed").trim()
    const callDuration = String(formData.get("CallDuration") || "").trim()

    if (!callSid) {
        return jsonError("CallSid is required", 400)
    }

    const sessionId = `voice-${callSid}`
    const sessionSnapshot = await adminDb.collection("chat_sessions").doc(sessionId).get()

    if (!sessionSnapshot.exists) {
        if (!testCall || !chatbotIdFromUrl) {
            return NextResponse.json({ ok: true, ignored: true })
        }

        const config = await getOmniChannelConfig(adminDb, chatbotIdFromUrl)
        const integration = normalizeVoiceIntegrationConfig(config.voiceIntegration)
        const formEntries = Array.from(formData.entries()).flatMap(([key, value]) => (typeof value === "string" ? [[key, value] as [string, string]] : []))

        if (!integration.authToken || !verifyVoiceWebhookSignature({
            requestUrl: getPublicRequestUrl(req),
            formEntries,
            signatureHeader: req.headers.get("x-twilio-signature"),
            authToken: integration.authToken,
        })) {
            await logOmniAuditEvent({
                chatbotId: chatbotIdFromUrl,
                channel: "voice",
                eventType: "voice.test_call_signature",
                result: "denied",
                source: "api/omni/channels/voice/status",
                message: "Invalid Twilio webhook signature on test call status callback",
                metadata: {
                    callSid,
                    voiceNumberId: voiceNumberIdFromUrl || null,
                },
            })
            return new Response("Forbidden", { status: 403 })
        }

        const statusResult =
            callStatus === "failed" || callStatus === "busy" || callStatus === "no-answer" || callStatus === "canceled"
                ? "error"
                : "success"

        await recordOmniSmokeRun(adminDb, {
            chatbotId: chatbotIdFromUrl,
            channel: "voice",
            provider: "twilio",
            action: "test_call_status",
            result: statusResult,
            source: "api/omni/channels/voice/status",
            message: `Test call status updated: ${callStatus}`,
            target: voiceNumberIdFromUrl || null,
            metadata: {
                callSid,
                callStatus,
                callDuration: callDuration || null,
                voiceNumberId: voiceNumberIdFromUrl || null,
            },
        })

        await logOmniAuditEvent({
            chatbotId: chatbotIdFromUrl,
            channel: "voice",
            eventType: "voice.test_call_status",
            result: statusResult,
            source: "api/omni/channels/voice/status",
            message: `Test call status updated: ${callStatus}`,
            metadata: {
                callSid,
                callStatus,
                callDuration: callDuration || null,
                voiceNumberId: voiceNumberIdFromUrl || null,
            },
        })

        return NextResponse.json({ ok: true, ignored: true })
    }

    const sessionData = sessionSnapshot.data() || {}
    const chatbotId = sessionData.chatbotId as string
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
            source: "api/omni/channels/voice/status",
            message: "Invalid Twilio webhook signature",
            metadata: {
                sessionId,
                callSid,
            },
        })
        return new Response("Forbidden", { status: 403 })
    }

    const replay = await claimOmniWebhookEvent(adminDb, {
        chatbotId,
        channel: "voice",
        source: "api/omni/channels/voice/status",
        eventKey: `status:${callSid}:${callStatus}:${callDuration || ""}`,
        metadata: {
            sessionId,
            callSid,
            callStatus,
            callDuration: callDuration || null,
        },
    })

    if (replay.duplicate) {
        await logOmniAuditEvent({
            chatbotId,
            channel: "voice",
            eventType: "voice.webhook_replay",
            result: "success",
            source: "api/omni/channels/voice/status",
            message: "Duplicate voice status callback ignored",
            metadata: {
                sessionId,
                callSid,
                callStatus,
            },
        })
        return NextResponse.json({ ok: true, ignored: true })
    }

    const callbackId = callbackIdFromUrl || sessionData.channelMeta?.callbackId || ""
    const messages = Array.isArray(sessionData.messages) ? sessionData.messages : []
    const normalizedDisposition = normalizeVoiceStatusDisposition(callStatus)
    const summary = messages
        .slice(-6)
        .map((message: any) => `${message.role === "assistant" ? "Assistant" : "User"}: ${message.content}`)
        .join(" ")

    await upsertOmniSession(adminDb, {
        sessionId,
        chatbotId,
        channel: "voice",
        contactKey: sessionData.contactKey || null,
        canonicalContactId: sessionData.canonicalContactId || null,
        channelMeta: {
            ...(sessionData.channelMeta || {}),
            callSid,
            callStatus,
            normalizedDisposition,
            callDuration: callDuration || null,
            callbackId: callbackId || sessionData.channelMeta?.callbackId || null,
        },
        transcriptSummary: summary || `Call ended with status ${normalizedDisposition}${callDuration ? ` after ${callDuration} seconds` : ""}.`,
        lastDisposition: normalizedDisposition,
        handoffStatus: sessionData.handoffStatus || null,
        assistantProfileId: sessionData.assistantProfileId || "omni-default",
    })

    await logOmniAuditEvent({
        chatbotId,
        channel: "voice",
        eventType: "voice.call_status",
        result: mapVoiceAuditResult(callStatus),
        source: "api/omni/channels/voice/status",
        message: `Voice call status updated: ${callStatus}`,
        metadata: {
            sessionId,
            callSid,
            callStatus,
            normalizedDisposition,
            callDuration: callDuration || null,
            callbackId: callbackId || null,
        },
    })

    const callbackDocId = callbackId || sessionId
    const callbackSnapshot = await adminDb.collection("callback_requests").doc(callbackDocId).get()
    const callbackState = mapVoiceCallbackState(callStatus)

    if (callbackSnapshot.exists || sessionData.handoffStatus === "callback_requested") {
        await upsertCallbackRequest(adminDb, {
            id: callbackDocId,
            chatbotId,
            contactKey: sessionData.contactKey || null,
            canonicalContactId: sessionData.canonicalContactId || null,
            displayName: sessionData.visitorName || sessionData.contactKey || null,
            sourceSessionId: sessionId,
            sourceChannel: "voice",
            status: callbackState.status,
            resolutionStatus: callbackState.resolutionStatus,
            activeCallSid: callSid,
            voiceNumberId: sessionData.channelMeta?.voiceNumberId || null,
            lastAttemptAt: new Date(),
            notes: summary || `Call ended with status ${normalizedDisposition}.`,
        })
    }

    return NextResponse.json({ ok: true })
}
