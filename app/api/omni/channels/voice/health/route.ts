import { NextResponse } from "next/server"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { recordOmniSmokeRun } from "@/lib/omni/smoke-runs"
import { buildVoiceReadiness, normalizeVoiceNumberRecords } from "@/lib/omni/voice-config"
import { authorizeOmniRequest, authorizedForOmniPermission, getOmniChannelConfig, jsonError, normalizeVoiceIntegrationConfig } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const body = await req.json()
    const chatbotId = body.chatbotId

    if (!chatbotId) {
        return jsonError("chatbotId is required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "channels.manage")) {
        return jsonError("Forbidden", 403)
    }

    const config = await getOmniChannelConfig(authz.adminDb, chatbotId)
    const integration = normalizeVoiceIntegrationConfig(config.voiceIntegration)
    const voiceNumbersSnapshot = await authz.adminDb.collection("voice_numbers").where("chatbotId", "==", chatbotId).get()
    const voiceNumbers = normalizeVoiceNumberRecords(voiceNumbersSnapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) })))
    const readiness = buildVoiceReadiness({
        publicOrigin: !/localhost|127\.0\.0\.1/i.test(new URL(req.url).origin),
        integration,
        voiceNumbers,
    })

    if (!readiness.enabled) {
        await recordOmniSmokeRun(authz.adminDb, {
            chatbotId,
            channel: "voice",
            provider: "twilio",
            action: "health_check",
            result: "blocked",
            source: "api/omni/channels/voice/health",
            message: "Voice channel is disabled",
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "voice",
            eventType: "voice.health_check",
            result: "blocked",
            source: "api/omni/channels/voice/health",
            message: "Voice channel is disabled",
        })
        return NextResponse.json({
            ok: true,
            provider: "twilio",
            enabled: false,
            skipped: true,
            message: "Voice channel is disabled",
            readiness,
            checkedAt: new Date().toISOString(),
        })
    }

    if (!integration.accountSid || !integration.authToken) {
        await recordOmniSmokeRun(authz.adminDb, {
            chatbotId,
            channel: "voice",
            provider: "twilio",
            action: "health_check",
            result: "error",
            source: "api/omni/channels/voice/health",
            message: "Twilio credentials are not configured",
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "voice",
            eventType: "voice.health_check",
            result: "error",
            source: "api/omni/channels/voice/health",
            message: "Twilio credentials are not configured",
        })
        return jsonError("Twilio credentials are not configured", 400)
    }

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${integration.accountSid}.json`, {
        headers: {
            Authorization: `Basic ${Buffer.from(`${integration.accountSid}:${integration.authToken}`).toString("base64")}`,
        },
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
        await recordOmniSmokeRun(authz.adminDb, {
            chatbotId,
            channel: "voice",
            provider: "twilio",
            action: "health_check",
            result: "error",
            source: "api/omni/channels/voice/health",
            message: data?.message || "Twilio credential check failed",
            metadata: {
                status: response.status,
                accountSid: integration.accountSid,
            },
        })
        await logOmniAuditEvent({
            chatbotId,
            channel: "voice",
            eventType: "voice.health_check",
            result: "error",
            source: "api/omni/channels/voice/health",
            message: data?.message || "Twilio credential check failed",
            metadata: {
                status: response.status,
                accountSid: integration.accountSid,
            },
        })
        return NextResponse.json(
            {
                ok: false,
                provider: "twilio",
                status: response.status,
                message: data?.message || "Twilio credential check failed",
            },
            { status: 400 }
        )
    }

    await recordOmniSmokeRun(authz.adminDb, {
        chatbotId,
        channel: "voice",
        provider: "twilio",
        action: "health_check",
        result: "success",
        source: "api/omni/channels/voice/health",
        message: "Twilio credentials verified",
        metadata: {
            accountSid: data?.sid || integration.accountSid,
            accountStatus: data?.status || null,
        },
    })
    await logOmniAuditEvent({
        chatbotId,
        channel: "voice",
        eventType: "voice.health_check",
        result: "success",
        source: "api/omni/channels/voice/health",
        message: "Twilio credentials verified",
        metadata: {
            accountSid: data?.sid || integration.accountSid,
            accountStatus: data?.status || null,
        },
    })

    return NextResponse.json({
        ok: true,
        provider: "twilio",
        accountSid: data?.sid || integration.accountSid,
        accountName: data?.friendly_name || null,
        accountStatus: data?.status || null,
        readiness,
        checkedAt: new Date().toISOString(),
    })
}
