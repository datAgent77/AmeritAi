import { NextResponse } from "next/server"
import { listOmniAuditEvents } from "@/lib/omni/audit-log"
import { listOmniDeliveryAttempts } from "@/lib/omni/delivery-attempts"
import { buildVoiceReadiness, normalizeVoiceNumberRecords } from "@/lib/omni/voice-config"
import {
    authorizeOmniRequest,
    authorizedForOmniPermission,
    getOmniChannelConfig,
    getRequestOrigin,
    jsonError,
    normalizeVoiceIntegrationConfig,
    toMillis,
} from "@/lib/omni/server-utils"
import type { OmniAuditChannel, OmniAuditLogRecord } from "@/lib/omni/audit-log"
import type { OmniDeliveryAttemptRecord, OmniDeliveryErrorClass, OmniProviderChannel } from "@/lib/omni/types"

export const dynamic = "force-dynamic"

type ReportChannel = Extract<OmniAuditChannel, "voice" | "whatsapp" | "instagram">

function isPublicOrigin(origin: string) {
    return !/localhost|127\.0\.0\.1/i.test(origin)
}

function normalizeWhatsApp(config: any) {
    return {
        enabled: config?.enabled === true,
        phoneNumberId: config?.phoneNumberId || null,
        accessTokenRef: config?.accessTokenRef || null,
        appSecretRef: config?.appSecretRef || null,
        verifyToken: config?.verifyToken || null,
    }
}

function normalizeInstagram(config: any) {
    return {
        enabled: config?.enabled === true,
        accountId: config?.accountId || null,
        pageId: config?.pageId || null,
        accessTokenRef: config?.accessTokenRef || null,
        appSecretRef: config?.appSecretRef || null,
        verifyToken: config?.verifyToken || null,
    }
}

function countProvisioningStatuses(tasks: any[]) {
    return tasks.reduce(
        (accumulator, task) => {
            const status = task?.status === "done" || task?.status === "blocked" || task?.status === "in_progress" ? task.status : "todo"
            accumulator.total += 1
            if (status === "done") accumulator.done += 1
            if (status === "blocked") accumulator.blocked += 1
            if (status === "in_progress") accumulator.inProgress += 1
            if (status === "todo") accumulator.todo += 1
            return accumulator
        },
        { total: 0, todo: 0, inProgress: 0, blocked: 0, done: 0 }
    )
}

function summarizeAuditChannel(logs: OmniAuditLogRecord[], channel: ReportChannel) {
    const channelLogs = logs.filter((log) => log.channel === channel)
    return {
        total: channelLogs.length,
        success: channelLogs.filter((log) => log.result === "success").length,
        error: channelLogs.filter((log) => log.result === "error").length,
        denied: channelLogs.filter((log) => log.result === "denied").length,
        lastEventAt: channelLogs[0]?.createdAt || null,
    }
}

function summarizeDeliveryChannel(attempts: OmniDeliveryAttemptRecord[], channel: Extract<OmniProviderChannel, ReportChannel>) {
    const channelAttempts = attempts.filter((attempt) => attempt.channel === channel)
    return {
        total: channelAttempts.length,
        success: channelAttempts.filter((attempt) => attempt.status === "success").length,
        failed: channelAttempts.filter((attempt) => attempt.status === "failed").length,
        retryEligible: channelAttempts.filter((attempt) => attempt.retryEligible).length,
        exhaustedRetries: channelAttempts.filter((attempt) => attempt.retryState === "exhausted").length,
        lastAttemptAt: channelAttempts[0]?.createdAt || null,
    }
}

function summarizeErrorClasses(attempts: OmniDeliveryAttemptRecord[]) {
    return attempts.reduce(
        (accumulator: Record<OmniDeliveryErrorClass, number>, attempt) => {
            if (attempt.errorClass) {
                accumulator[attempt.errorClass] += 1
            }
            return accumulator
        },
        {
            config: 0,
            auth: 0,
            rate_limit: 0,
            provider: 0,
            network: 0,
            unknown: 0,
        }
    )
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const chatbotId = searchParams.get("chatbotId")

    if (!chatbotId) {
        return jsonError("chatbotId is required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "settings.view")) {
        return jsonError("Forbidden", 403)
    }

    const origin = getRequestOrigin(req)
    const publicOrigin = isPublicOrigin(origin)
    const config = await getOmniChannelConfig(authz.adminDb, chatbotId)
    const voiceIntegration = normalizeVoiceIntegrationConfig(config.voiceIntegration)
    const whatsapp = normalizeWhatsApp(config.whatsapp)
    const instagram = normalizeInstagram(config.instagram)

    const voiceNumbersSnapshot = await authz.adminDb.collection("voice_numbers").where("chatbotId", "==", chatbotId).get()
    const voiceNumbers = normalizeVoiceNumberRecords(voiceNumbersSnapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) })))
    const voiceReadiness = buildVoiceReadiness({
        publicOrigin,
        integration: voiceIntegration,
        voiceNumbers,
    })

    const channelReadiness = {
        voice: {
            enabled: voiceReadiness.enabled,
            ready: voiceReadiness.ready,
            blockers: voiceReadiness.blockers,
            carrierConfigured: voiceReadiness.carrierConfigured,
            callControlConfigured: voiceReadiness.callControlConfigured,
            renderingConfigured: voiceReadiness.renderingConfigured,
            defaultRoutingMode: voiceReadiness.defaultRoutingMode,
        },
        whatsapp: {
            enabled: whatsapp.enabled,
            ready:
                publicOrigin &&
                whatsapp.enabled &&
                Boolean(whatsapp.phoneNumberId) &&
                Boolean(whatsapp.accessTokenRef) &&
                Boolean(whatsapp.appSecretRef) &&
                Boolean(whatsapp.verifyToken),
            blockers: [
                publicOrigin ? null : "Public URL gerekli",
                whatsapp.enabled ? null : "Channel disabled",
                whatsapp.phoneNumberId ? null : "phoneNumberId eksik",
                whatsapp.accessTokenRef ? null : "access token eksik",
                whatsapp.appSecretRef ? null : "app secret eksik",
                whatsapp.verifyToken ? null : "verify token eksik",
            ].filter(Boolean),
        },
        instagram: {
            enabled: instagram.enabled,
            ready:
                publicOrigin &&
                instagram.enabled &&
                Boolean(instagram.accountId) &&
                Boolean(instagram.pageId) &&
                Boolean(instagram.accessTokenRef) &&
                Boolean(instagram.appSecretRef) &&
                Boolean(instagram.verifyToken),
            blockers: [
                publicOrigin ? null : "Public URL gerekli",
                instagram.enabled ? null : "Channel disabled",
                instagram.accountId ? null : "accountId eksik",
                instagram.pageId ? null : "pageId eksik",
                instagram.accessTokenRef ? null : "access token eksik",
                instagram.appSecretRef ? null : "app secret eksik",
                instagram.verifyToken ? null : "verify token eksik",
            ].filter(Boolean),
        },
    }

    const provisioningSummary = countProvisioningStatuses(Array.isArray(config.provisioning) ? config.provisioning : [])
    const auditLogs = await listOmniAuditEvents(authz.adminDb, { chatbotId, limit: 100 })
    const deliveryAttempts = await listOmniDeliveryAttempts(authz.adminDb, { chatbotId, limit: 100 })

    const recentCriticalEvents = auditLogs
        .filter((log: OmniAuditLogRecord) => log.result === "error" || log.result === "denied")
        .slice(0, 6)
    const failedDeliveryAttempts = deliveryAttempts.filter((attempt: OmniDeliveryAttemptRecord) => attempt.status === "failed")
    const recentDeliveryFailures = failedDeliveryAttempts.slice(0, 6)
    const enabledChannels = (Object.keys(channelReadiness) as ReportChannel[]).filter((channel) => channelReadiness[channel].enabled)
    const readyChannels = enabledChannels.filter((channel) => channelReadiness[channel].ready)
    const blockedChannels = enabledChannels.filter((channel) => !channelReadiness[channel].ready)
    const lastAuditAt = auditLogs.length > 0 ? auditLogs[0].createdAt : null
    const lastDeliveryAt = deliveryAttempts.length > 0 ? deliveryAttempts[0].createdAt : null
    const lastActivityAt =
        [lastAuditAt, lastDeliveryAt]
            .filter(Boolean)
            .sort((left, right) => toMillis(right) - toMillis(left))[0] || null

    return NextResponse.json({
        generatedAt: new Date().toISOString(),
        baseUrl: origin,
        publicOrigin,
        overallReady: blockedChannels.length === 0,
        attentionRequired:
            recentCriticalEvents.length > 0 || recentDeliveryFailures.length > 0 || provisioningSummary.blocked > 0 || provisioningSummary.todo > 0,
        readinessScore: enabledChannels.length === 0 ? 100 : Math.round((readyChannels.length / enabledChannels.length) * 100),
        enabledChannels,
        readyChannels,
        blockedChannels,
        lastActivityAt,
        provisioningSummary,
        channels: {
            voice: {
                ...channelReadiness.voice,
                audit: summarizeAuditChannel(auditLogs, "voice"),
                delivery: summarizeDeliveryChannel(deliveryAttempts, "voice"),
            },
            whatsapp: {
                ...channelReadiness.whatsapp,
                audit: summarizeAuditChannel(auditLogs, "whatsapp"),
                delivery: summarizeDeliveryChannel(deliveryAttempts, "whatsapp"),
            },
            instagram: {
                ...channelReadiness.instagram,
                audit: summarizeAuditChannel(auditLogs, "instagram"),
                delivery: summarizeDeliveryChannel(deliveryAttempts, "instagram"),
            },
        },
        auditSummary: {
            total: auditLogs.length,
            success: auditLogs.filter((log: OmniAuditLogRecord) => log.result === "success").length,
            error: auditLogs.filter((log: OmniAuditLogRecord) => log.result === "error").length,
            denied: auditLogs.filter((log: OmniAuditLogRecord) => log.result === "denied").length,
            recentCriticalEvents,
        },
        deliverySummary: {
            total: deliveryAttempts.length,
            success: deliveryAttempts.filter((attempt: OmniDeliveryAttemptRecord) => attempt.status === "success").length,
            failed: failedDeliveryAttempts.length,
            retryEligible: deliveryAttempts.filter((attempt: OmniDeliveryAttemptRecord) => attempt.retryEligible).length,
            exhaustedRetries: deliveryAttempts.filter((attempt: OmniDeliveryAttemptRecord) => attempt.retryState === "exhausted").length,
            errorClassCounts: summarizeErrorClasses(deliveryAttempts),
            recentFailures: recentDeliveryFailures,
        },
    })
}
