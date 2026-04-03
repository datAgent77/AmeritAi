import { NextResponse } from "next/server"
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

const DAY_MS = 24 * 60 * 60 * 1000

interface AnalyticsSession {
    id: string
    channel: string
    createdAt: number
    updatedAt: number
    lastDisposition: string
    handoffStatus: string | null
    messageCount: number
}

interface AnalyticsCallback {
    id: string
    sourceChannel: string
    status: string
    resolutionStatus: string
    updatedAt: number
    createdAt: number
}

interface AnalyticsContact {
    id: string
    lastInteractionAt: number
    mergedInto: string | null
    manualMergeReview: boolean
    linkedChannels: string[]
}

interface AnalyticsAudit {
    id: string
    channel: string
    eventType: string
    result: string
    message: string | null
    createdAt: number
}

interface AnalyticsDelivery {
    id: string
    channel: string
    status: string
    retryEligible: boolean
    retryState: string | null
    errorClass: string | null
    createdAt: number
}

function isPublicOrigin(origin: string) {
    return !/localhost|127\.0\.0\.1/i.test(origin)
}

function normalizeWeb(config: any) {
    return {
        enabled: config?.enabled !== false,
    }
}

function normalizeWhatsApp(config: any) {
    return {
        enabled: config?.enabled === true,
        phoneNumberId: config?.phoneNumberId || null,
        accessTokenRef: config?.accessTokenRef || null,
        appSecretRef: config?.appSecretRef || null,
        verifyToken: config?.verifyToken || null,
        webhookStatus: config?.webhookStatus || "disconnected",
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
        webhookStatus: config?.webhookStatus || "disconnected",
    }
}

function getLastActivityAt(channel: string, sessions: AnalyticsSession[], callbacks: AnalyticsCallback[], audits: AnalyticsAudit[], deliveries: AnalyticsDelivery[]) {
    const candidates = [
        ...sessions.filter((session) => session.channel === channel).map((session) => session.updatedAt || session.createdAt),
        ...callbacks.filter((callback) => callback.sourceChannel === channel).map((callback) => callback.updatedAt || callback.createdAt),
        ...audits.filter((audit) => audit.channel === channel).map((audit) => audit.createdAt),
        ...deliveries.filter((delivery) => delivery.channel === channel).map((delivery) => delivery.createdAt),
    ].filter((value) => value > 0)

    if (candidates.length === 0) return null
    return toIsoOrNull(Math.max(...candidates))
}

function startOfDay(timestamp: number) {
    const date = new Date(timestamp)
    date.setHours(0, 0, 0, 0)
    return date.getTime()
}

function formatDay(timestamp: number) {
    return new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date(timestamp))
}

function incrementCounter(record: Record<string, number>, key: string) {
    record[key] = (record[key] || 0) + 1
}

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const chatbotId = searchParams.get("chatbotId")
    const days = Math.min(Math.max(Number(searchParams.get("days") || "30"), 7), 180)

    if (!chatbotId) {
        return jsonError("chatbotId is required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "analytics.view")) {
        return jsonError("Forbidden", 403)
    }

    const now = Date.now()
    const rangeStart = now - days * DAY_MS
    const origin = getRequestOrigin(req)
    const publicOrigin = isPublicOrigin(origin)
    const config = await getOmniChannelConfig(authz.adminDb, chatbotId)
    const web = normalizeWeb(config.web)
    const whatsapp = normalizeWhatsApp(config.whatsapp)
    const instagram = normalizeInstagram(config.instagram)
    const voiceIntegration = normalizeVoiceIntegrationConfig(config.voiceIntegration)

    const [sessionsSnapshot, callbacksSnapshot, contactsSnapshot, auditSnapshot, deliverySnapshot, voiceNumbersSnapshot] = await Promise.all([
        authz.adminDb.collection("chat_sessions").where("chatbotId", "==", chatbotId).get(),
        authz.adminDb.collection("callback_requests").where("chatbotId", "==", chatbotId).get(),
        authz.adminDb.collection("contact_graph").where("chatbotId", "==", chatbotId).get(),
        authz.adminDb.collection("omni_audit_logs").where("chatbotId", "==", chatbotId).get(),
        authz.adminDb.collection("omni_delivery_attempts").where("chatbotId", "==", chatbotId).get(),
        authz.adminDb.collection("voice_numbers").where("chatbotId", "==", chatbotId).get(),
    ])

    const sessions: AnalyticsSession[] = sessionsSnapshot.docs.map((doc: any) => {
        const data = doc.data() || {}
        return {
            id: doc.id,
            channel: data.channel || "web",
            createdAt: toMillis(data.createdAt),
            updatedAt: toMillis(data.updatedAt),
            lastDisposition: data.lastDisposition || "unknown",
            handoffStatus: data.handoffStatus || null,
            messageCount: Array.isArray(data.messages) ? data.messages.length : 0,
        }
    })

    const recentSessions = sessions.filter((session: AnalyticsSession) => (session.updatedAt || session.createdAt || 0) >= rangeStart)
    const sessionCountsByChannel: Record<string, number> = {}
    const dispositionCounts: Record<string, number> = {}
    const dailySessions: Record<string, number> = {}

    recentSessions.forEach((session: AnalyticsSession) => {
        incrementCounter(sessionCountsByChannel, session.channel)
        incrementCounter(dispositionCounts, session.lastDisposition || "unknown")
        const activityTime = session.updatedAt || session.createdAt || now
        incrementCounter(dailySessions, formatDay(startOfDay(activityTime)))
    })

    const callbacks: AnalyticsCallback[] = callbacksSnapshot.docs.map((doc: any) => {
        const data = doc.data() || {}
        return {
            id: doc.id,
            sourceChannel: data.sourceChannel || "voice",
            status: data.status || "pending",
            resolutionStatus: data.resolutionStatus || "open",
            updatedAt: toMillis(data.updatedAt),
            createdAt: toMillis(data.createdAt),
        }
    })

    const recentCallbacks = callbacks.filter((callback: AnalyticsCallback) => (callback.updatedAt || callback.createdAt || 0) >= rangeStart)
    const callbackCountsByChannel: Record<string, number> = {}
    let openCallbacks = 0
    let resolvedCallbacks = 0

    recentCallbacks.forEach((callback: AnalyticsCallback) => {
        incrementCounter(callbackCountsByChannel, callback.sourceChannel)
        if (callback.resolutionStatus === "completed" || callback.status === "resolved") {
            resolvedCallbacks += 1
        } else {
            openCallbacks += 1
        }
    })

    const contacts: AnalyticsContact[] = contactsSnapshot.docs.map((doc: any) => {
        const data = doc.data() || {}
        return {
            id: doc.id,
            lastInteractionAt: toMillis(data.lastInteractionAt),
            mergedInto: data.mergedInto || null,
            manualMergeReview: data.manualMergeReview === true,
            linkedChannels: Array.isArray(data.linkedChannels) ? data.linkedChannels : [],
        }
    })

    const recentContacts = contacts.filter((contact: AnalyticsContact) => (contact.lastInteractionAt || 0) >= rangeStart)
    const contactsByChannel: Record<string, number> = {}
    let mergedContacts = 0
    let manualMergeReview = 0

    recentContacts.forEach((contact: AnalyticsContact) => {
        contact.linkedChannels.forEach((channel: string) => incrementCounter(contactsByChannel, channel))
        if (contact.mergedInto) mergedContacts += 1
        if (contact.manualMergeReview) manualMergeReview += 1
    })

    const audits: AnalyticsAudit[] = auditSnapshot.docs.map((doc: any) => {
        const data = doc.data() || {}
        return {
            id: doc.id,
            channel: data.channel || "web",
            eventType: data.eventType || "unknown",
            result: data.result || "success",
            message: data.message || null,
            createdAt: toMillis(data.createdAt),
        }
    })

    const recentAudits = audits.filter((audit: AnalyticsAudit) => (audit.createdAt || 0) >= rangeStart)
    const auditCountsByChannel: Record<string, number> = {}
    const auditEventCounts: Record<string, number> = {}
    const recentFailures = recentAudits
        .filter((audit: AnalyticsAudit) => audit.result !== "success")
        .sort((left: AnalyticsAudit, right: AnalyticsAudit) => right.createdAt - left.createdAt)
        .slice(0, 12)
        .map((audit: AnalyticsAudit) => ({
            id: audit.id,
            channel: audit.channel,
            eventType: audit.eventType,
            result: audit.result,
            message: audit.message,
            createdAt: toIsoOrNull(audit.createdAt),
        }))

    let auditSuccessCount = 0
    let auditFailureCount = 0
    let signatureDeniedCount = 0
    let autoReplySuccessCount = 0
    let autoReplyFailureCount = 0

    recentAudits.forEach((audit: AnalyticsAudit) => {
        incrementCounter(auditCountsByChannel, audit.channel)
        incrementCounter(auditEventCounts, audit.eventType)

        if (audit.result === "success") {
            auditSuccessCount += 1
        } else {
            auditFailureCount += 1
        }

        if (audit.eventType.includes("signature") && audit.result === "denied") {
            signatureDeniedCount += 1
        }

        if (audit.eventType.includes("auto_reply")) {
            if (audit.result === "success") autoReplySuccessCount += 1
            else autoReplyFailureCount += 1
        }
    })

    const deliveries: AnalyticsDelivery[] = deliverySnapshot.docs.map((doc: any) => {
        const data = doc.data() || {}
        return {
            id: doc.id,
            channel: data.channel || "unknown",
            status: data.status || "failed",
            retryEligible: data.retryEligible === true,
            retryState: data.retryState || null,
            errorClass: data.errorClass || null,
            createdAt: toMillis(data.createdAt),
        }
    })

    const voiceNumbers = normalizeVoiceNumberRecords(voiceNumbersSnapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) })))
    const voiceReadiness = buildVoiceReadiness({
        publicOrigin,
        integration: voiceIntegration,
        voiceNumbers,
    })

    const recentDeliveries = deliveries.filter((delivery: AnalyticsDelivery) => (delivery.createdAt || 0) >= rangeStart)
    const deliveryCountsByChannel: Record<string, number> = {}
    let deliverySuccessCount = 0
    let deliveryFailureCount = 0
    let retryableFailureCount = 0
    let exhaustedDeliveryCount = 0

    recentDeliveries.forEach((delivery: AnalyticsDelivery) => {
        incrementCounter(deliveryCountsByChannel, delivery.channel)
        if (delivery.status === "success") {
            deliverySuccessCount += 1
        } else {
            deliveryFailureCount += 1
            if (delivery.retryEligible) {
                retryableFailureCount += 1
            }
            if (delivery.retryState === "exhausted") {
                exhaustedDeliveryCount += 1
            }
        }
    })

    const timeline = Array.from({ length: days }, (_, index) => {
        const dayTimestamp = startOfDay(rangeStart + index * DAY_MS)
        const dayKey = formatDay(dayTimestamp)
        return {
            day: dayKey,
            sessions: dailySessions[dayKey] || 0,
        }
    })

    const channelStatus = {
        web: {
            enabled: web.enabled,
            state: web.enabled ? "ready" : "disabled",
            blockers: [] as string[],
            lastActivityAt: getLastActivityAt("web", sessions, callbacks, audits, deliveries),
        },
        whatsapp: {
            enabled: whatsapp.enabled,
            state:
                !whatsapp.enabled
                    ? "disabled"
                    : publicOrigin &&
                        Boolean(whatsapp.phoneNumberId) &&
                        Boolean(whatsapp.accessTokenRef) &&
                        Boolean(whatsapp.appSecretRef) &&
                        Boolean(whatsapp.verifyToken) &&
                        whatsapp.webhookStatus === "connected"
                      ? "ready"
                      : "blocked",
            blockers: [
                whatsapp.enabled ? null : "Channel disabled",
                whatsapp.enabled && !whatsapp.phoneNumberId ? "phoneNumberId" : null,
                whatsapp.enabled && !whatsapp.accessTokenRef ? "access token" : null,
                whatsapp.enabled && !whatsapp.appSecretRef ? "app secret" : null,
                whatsapp.enabled && !whatsapp.verifyToken ? "verify token" : null,
                whatsapp.enabled && whatsapp.webhookStatus !== "connected" ? `webhook: ${whatsapp.webhookStatus}` : null,
                whatsapp.enabled && !publicOrigin ? "public url" : null,
            ].filter((value): value is string => Boolean(value)),
            lastActivityAt: getLastActivityAt("whatsapp", sessions, callbacks, audits, deliveries),
        },
        instagram: {
            enabled: instagram.enabled,
            state:
                !instagram.enabled
                    ? "disabled"
                    : publicOrigin &&
                        Boolean(instagram.accountId) &&
                        Boolean(instagram.pageId) &&
                        Boolean(instagram.accessTokenRef) &&
                        Boolean(instagram.appSecretRef) &&
                        Boolean(instagram.verifyToken) &&
                        instagram.webhookStatus === "connected"
                      ? "ready"
                      : "blocked",
            blockers: [
                instagram.enabled ? null : "Channel disabled",
                instagram.enabled && !instagram.accountId ? "accountId" : null,
                instagram.enabled && !instagram.pageId ? "pageId" : null,
                instagram.enabled && !instagram.accessTokenRef ? "access token" : null,
                instagram.enabled && !instagram.appSecretRef ? "app secret" : null,
                instagram.enabled && !instagram.verifyToken ? "verify token" : null,
                instagram.enabled && instagram.webhookStatus !== "connected" ? `webhook: ${instagram.webhookStatus}` : null,
                instagram.enabled && !publicOrigin ? "public url" : null,
            ].filter((value): value is string => Boolean(value)),
            lastActivityAt: getLastActivityAt("instagram", sessions, callbacks, audits, deliveries),
        },
        voice: {
            enabled: voiceReadiness.enabled,
            state: !voiceReadiness.enabled ? "disabled" : voiceReadiness.ready ? "ready" : "blocked",
            blockers: voiceReadiness.enabled ? voiceReadiness.blockers : [],
            lastActivityAt: getLastActivityAt("voice", sessions, callbacks, audits, deliveries),
        },
    } as const

    const channelStatusSummary = {
        enabled: Object.values(channelStatus).filter((channel) => channel.enabled).length,
        ready: Object.values(channelStatus).filter((channel) => channel.state === "ready").length,
        blocked: Object.values(channelStatus).filter((channel) => channel.state === "blocked").length,
        disabled: Object.values(channelStatus).filter((channel) => channel.state === "disabled").length,
    }

    return NextResponse.json({
        range: {
            days,
            start: new Date(rangeStart).toISOString(),
            end: new Date(now).toISOString(),
        },
        overview: {
            sessions: recentSessions.length,
            contacts: recentContacts.length,
            callbacksOpen: openCallbacks,
            callbacksResolved: resolvedCallbacks,
            auditFailures: auditFailureCount,
            deliverySuccess: deliverySuccessCount,
            deliveryFailures: deliveryFailureCount,
            retryableDeliveries: retryableFailureCount,
            exhaustedDeliveries: exhaustedDeliveryCount,
            autoReplySuccess: autoReplySuccessCount,
            autoReplyFailure: autoReplyFailureCount,
            signatureDenied: signatureDeniedCount,
            channelsEnabled: channelStatusSummary.enabled,
            channelsReady: channelStatusSummary.ready,
            channelsBlocked: channelStatusSummary.blocked,
            channelsDisabled: channelStatusSummary.disabled,
        },
        channelStatus,
        channelBreakdown: {
            sessions: sessionCountsByChannel,
            callbacks: callbackCountsByChannel,
            contacts: contactsByChannel,
            audits: auditCountsByChannel,
            deliveries: deliveryCountsByChannel,
        },
        contactQuality: {
            mergedContacts,
            manualMergeReview,
        },
        dispositions: Object.entries(dispositionCounts)
            .map(([label, value]) => ({ label, value }))
            .sort((left, right) => right.value - left.value),
        auditSummary: {
            success: auditSuccessCount,
            failure: auditFailureCount,
            byEvent: Object.entries(auditEventCounts)
                .map(([label, value]) => ({ label, value }))
                .sort((left, right) => right.value - left.value),
            recentFailures,
        },
        timeline,
    })
}
