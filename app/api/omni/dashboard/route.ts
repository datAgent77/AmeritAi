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
    toIsoOrNull,
    toMillis,
} from "@/lib/omni/server-utils"
import type { OmniAuditLogRecord } from "@/lib/omni/audit-log"
import type { OmniDeliveryAttemptRecord } from "@/lib/omni/types"

export const dynamic = "force-dynamic"

type DashboardChannel = "voice" | "whatsapp" | "instagram"

function isPublicOrigin(origin: string) {
    return !/localhost|127\.0\.0\.1/i.test(origin)
}

function compactStrings(values: Array<string | null>) {
    return values.filter((value): value is string => Boolean(value))
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

function buildChannelReadiness(params: {
    publicOrigin: boolean
    voice: any
    voiceNumbers: any[]
    whatsapp: any
    instagram: any
}) {
    const voiceReadiness = buildVoiceReadiness({
        publicOrigin: params.publicOrigin,
        integration: params.voice,
        voiceNumbers: params.voiceNumbers,
    })
    return {
        voice: {
            enabled: voiceReadiness.enabled,
            ready: voiceReadiness.ready,
            blockers: voiceReadiness.blockers,
        },
        whatsapp: {
            enabled: params.whatsapp.enabled,
            ready:
                params.publicOrigin &&
                params.whatsapp.enabled &&
                Boolean(params.whatsapp.phoneNumberId) &&
                Boolean(params.whatsapp.accessTokenRef) &&
                Boolean(params.whatsapp.appSecretRef) &&
                Boolean(params.whatsapp.verifyToken),
            blockers: compactStrings([
                params.publicOrigin ? null : "Public URL gerekli",
                params.whatsapp.enabled ? null : "Channel disabled",
                params.whatsapp.phoneNumberId ? null : "phoneNumberId eksik",
                params.whatsapp.accessTokenRef ? null : "access token eksik",
                params.whatsapp.appSecretRef ? null : "app secret eksik",
                params.whatsapp.verifyToken ? null : "verify token eksik",
            ]),
        },
        instagram: {
            enabled: params.instagram.enabled,
            ready:
                params.publicOrigin &&
                params.instagram.enabled &&
                Boolean(params.instagram.accountId) &&
                Boolean(params.instagram.pageId) &&
                Boolean(params.instagram.accessTokenRef) &&
                Boolean(params.instagram.appSecretRef) &&
                Boolean(params.instagram.verifyToken),
            blockers: compactStrings([
                params.publicOrigin ? null : "Public URL gerekli",
                params.instagram.enabled ? null : "Channel disabled",
                params.instagram.accountId ? null : "accountId eksik",
                params.instagram.pageId ? null : "pageId eksik",
                params.instagram.accessTokenRef ? null : "access token eksik",
                params.instagram.appSecretRef ? null : "app secret eksik",
                params.instagram.verifyToken ? null : "verify token eksik",
            ]),
        },
    }
}

function isOpenCallback(record: any) {
    return record?.resolutionStatus !== "completed" && record?.status !== "resolved"
}

function isLeadOpen(status?: string | null) {
    return status === "new" || status === "contacted" || status === "qualified"
}

function isAppointmentPending(status?: string | null) {
    return status === "pending" || status === "confirmed"
}

function summarizeChannelActivity(
    channel: DashboardChannel,
    channelReadiness: { enabled: boolean; ready: boolean; blockers: string[] },
    callbacks: any[],
    auditLogs: OmniAuditLogRecord[],
    deliveryAttempts: OmniDeliveryAttemptRecord[]
) {
    const channelCallbacks = callbacks.filter((callback) => callback.sourceChannel === channel && isOpenCallback(callback))
    const channelAuditLogs = auditLogs.filter((log) => log.channel === channel)
    const channelDeliveryAttempts = deliveryAttempts.filter((attempt) => attempt.channel === channel)

    return {
        enabled: channelReadiness.enabled,
        ready: channelReadiness.ready,
        blockers: channelReadiness.blockers,
        openCallbacks: channelCallbacks.length,
        failedDeliveries: channelDeliveryAttempts.filter((attempt) => attempt.status === "failed").length,
        lastAuditAt: channelAuditLogs[0]?.createdAt || null,
        lastDeliveryAt: channelDeliveryAttempts[0]?.createdAt || null,
    }
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
    if (!authorizedForOmniPermission(authz, "dashboard.view")) {
        return jsonError("Forbidden", 403)
    }

    const origin = getRequestOrigin(req)
    const publicOrigin = isPublicOrigin(origin)
    const config = await getOmniChannelConfig(authz.adminDb, chatbotId)
    const voiceIntegration = normalizeVoiceIntegrationConfig(config.voiceIntegration)
    const whatsapp = normalizeWhatsApp(config.whatsapp)
    const instagram = normalizeInstagram(config.instagram)

    const [voiceNumbersSnapshot, callbacksSnapshot, appointmentsSnapshot, leadsSnapshot, contactsSnapshot, auditLogs, deliveryAttempts] =
        await Promise.all([
            authz.adminDb.collection("voice_numbers").where("chatbotId", "==", chatbotId).get(),
            authz.adminDb.collection("callback_requests").where("chatbotId", "==", chatbotId).get(),
            authz.adminDb.collection("appointments").where("chatbotId", "==", chatbotId).get(),
            authz.adminDb.collection("leads").where("chatbotId", "==", chatbotId).get(),
            authz.adminDb.collection("contact_graph").where("chatbotId", "==", chatbotId).get(),
            listOmniAuditEvents(authz.adminDb, { chatbotId, limit: 30 }),
            listOmniDeliveryAttempts(authz.adminDb, { chatbotId, limit: 30 }),
        ])

    const voiceNumbers = normalizeVoiceNumberRecords(voiceNumbersSnapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) })))
    const channelReadiness = buildChannelReadiness({
        publicOrigin,
        voice: voiceIntegration,
        voiceNumbers,
        whatsapp,
        instagram,
    })

    const callbacks = callbacksSnapshot.docs
        .map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) }))
        .sort((left: any, right: any) => {
            const leftDue = toMillis(left.dueAt || left.updatedAt || left.createdAt)
            const rightDue = toMillis(right.dueAt || right.updatedAt || right.createdAt)
            return leftDue - rightDue
        })
    const appointments = appointmentsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) }))
    const leads = leadsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) }))
    const contacts = contactsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) }))

    const now = Date.now()
    const openCallbacks = callbacks.filter(isOpenCallback)
    const overdueCallbacks = openCallbacks.filter((callback: any) => {
        const dueAt = toMillis(callback.dueAt)
        return dueAt > 0 && dueAt < now
    })
    const dueTodayCallbacks = openCallbacks.filter((callback: any) => {
        const dueAt = toMillis(callback.dueAt)
        return dueAt > now && dueAt <= now + 24 * 60 * 60 * 1000
    })
    const pendingAppointments = appointments.filter((appointment: any) => isAppointmentPending(appointment.status))
    const openLeads = leads.filter((lead: any) => isLeadOpen(lead.status))
    const manualMergeReview = contacts.filter((contact: any) => contact.manualMergeReview === true).length
    const exhaustedRetries = deliveryAttempts.filter((attempt: OmniDeliveryAttemptRecord) => attempt.retryState === "exhausted").length

    const enabledChannels = (Object.keys(channelReadiness) as DashboardChannel[]).filter((channel) => channelReadiness[channel].enabled)
    const readyChannels = enabledChannels.filter((channel) => channelReadiness[channel].ready)
    const blockedChannels = enabledChannels.filter((channel) => !channelReadiness[channel].ready)

    const recentCriticalEvents = auditLogs
        .filter((log: OmniAuditLogRecord) => log.result === "error" || log.result === "denied")
        .slice(0, 6)
        .map((log: OmniAuditLogRecord) => ({
            id: log.id,
            channel: log.channel,
            eventType: log.eventType,
            result: log.result,
            message: log.message || null,
            createdAt: log.createdAt || null,
        }))

    const recentCallbackQueue = openCallbacks.slice(0, 6).map((callback: any) => ({
        id: callback.id,
        displayName: callback.displayName || null,
        sourceChannel: callback.sourceChannel || "voice",
        status: callback.status || "pending",
        resolutionStatus: callback.resolutionStatus || "open",
        owner: callback.owner || null,
        priority: callback.priority || "normal",
        dueAt: toIsoOrNull(callback.dueAt),
    }))

    const nextActions: Array<{ id: string; href: string }> = []
    if (!publicOrigin) nextActions.push({ id: "public_url", href: "/omni/settings" })
    if (blockedChannels.includes("voice")) nextActions.push({ id: "voice_setup", href: "/omni/channels/voice-calls" })
    if (blockedChannels.includes("whatsapp")) nextActions.push({ id: "whatsapp_setup", href: "/omni/channels/whatsapp" })
    if (blockedChannels.includes("instagram")) nextActions.push({ id: "instagram_setup", href: "/omni/channels/instagram-dm" })
    if (overdueCallbacks.length > 0) nextActions.push({ id: "callback_sla", href: "/omni/operations/callback-queue" })
    if (exhaustedRetries > 0) nextActions.push({ id: "delivery_retry_review", href: "/omni/operations/delivery-monitor" })
    if (manualMergeReview > 0) nextActions.push({ id: "contact_review", href: "/omni/operations/contacts" })
    if (nextActions.length === 0) nextActions.push({ id: "run_smoke", href: "/omni/settings" })

    const lastActivityAt =
        [auditLogs[0]?.createdAt || null, deliveryAttempts[0]?.createdAt || null]
            .filter(Boolean)
            .sort((left, right) => toMillis(right) - toMillis(left))[0] || null

    return NextResponse.json({
        generatedAt: new Date().toISOString(),
        baseUrl: origin,
        publicOrigin,
        summary: {
            readinessScore: enabledChannels.length === 0 ? 100 : Math.round((readyChannels.length / enabledChannels.length) * 100),
            overallReady: blockedChannels.length === 0,
            attentionRequired: overdueCallbacks.length > 0 || exhaustedRetries > 0 || recentCriticalEvents.length > 0 || manualMergeReview > 0,
            enabledChannels,
            readyChannels,
            blockedChannels,
            openCallbacks: openCallbacks.length,
            overdueCallbacks: overdueCallbacks.length,
            dueTodayCallbacks: dueTodayCallbacks.length,
            pendingAppointments: pendingAppointments.length,
            openLeads: openLeads.length,
            manualMergeReview,
            exhaustedRetries,
            lastActivityAt,
        },
        channels: {
            voice: summarizeChannelActivity("voice", channelReadiness.voice, callbacks, auditLogs, deliveryAttempts),
            whatsapp: summarizeChannelActivity("whatsapp", channelReadiness.whatsapp, callbacks, auditLogs, deliveryAttempts),
            instagram: summarizeChannelActivity("instagram", channelReadiness.instagram, callbacks, auditLogs, deliveryAttempts),
        },
        pipeline: {
            callbacks: {
                open: openCallbacks.length,
                overdue: overdueCallbacks.length,
                dueToday: dueTodayCallbacks.length,
            },
            appointments: {
                pending: pendingAppointments.length,
                completed: appointments.filter((appointment: any) => appointment.status === "completed").length,
            },
            leads: {
                open: openLeads.length,
                qualified: leads.filter((lead: any) => lead.status === "qualified").length,
                converted: leads.filter((lead: any) => lead.status === "converted").length,
            },
        },
        recentCriticalEvents,
        recentCallbackQueue,
        nextActions,
    })
}
