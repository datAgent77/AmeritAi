import { NextResponse } from "next/server"
import { listOmniAuditEvents } from "@/lib/omni/audit-log"
import { buildVoiceReadiness, normalizeVoiceNumberRecords } from "@/lib/omni/voice-config"
import {
    authorizeOmniRequest,
    authorizedForOmniPermission,
    getOmniChannelConfig,
    getRequestOrigin,
    jsonError,
    normalizeVoiceIntegrationConfig,
} from "@/lib/omni/server-utils"
import { buildOverviewPayload } from "@/lib/omni/workspace-agents"
import type { OmniOverviewFilters } from "@/lib/omni/types"

export const dynamic = "force-dynamic"

function isPublicOrigin(origin: string) {
    return !/localhost|127\\.0\\.0\\.1/i.test(origin)
}

function mapDocs(snapshot: any) {
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) }))
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

function normalizeFilters(searchParams: URLSearchParams): OmniOverviewFilters {
    const range = searchParams.get("range")
    const granularity = searchParams.get("granularity")

    return {
        range: range === "7d" || range === "90d" ? range : "30d",
        granularity: granularity === "week" ? "week" : "day",
        agentId: searchParams.get("agentId"),
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

    const filters = normalizeFilters(searchParams)
    const origin = getRequestOrigin(req)
    const publicOrigin = isPublicOrigin(origin)
    const [config, sessionsSnapshot, callbacksSnapshot, leadsSnapshot, appointmentsSnapshot, auditLogs, voiceNumbersSnapshot, accountSnapshot] =
        await Promise.all([
            getOmniChannelConfig(authz.adminDb, chatbotId),
            authz.adminDb.collection("chat_sessions").where("chatbotId", "==", chatbotId).get(),
            authz.adminDb.collection("callback_requests").where("chatbotId", "==", chatbotId).get(),
            authz.adminDb.collection("leads").where("chatbotId", "==", chatbotId).get(),
            authz.adminDb.collection("appointments").where("chatbotId", "==", chatbotId).get(),
            listOmniAuditEvents(authz.adminDb, { chatbotId, limit: 40 }),
            authz.adminDb.collection("voice_numbers").where("chatbotId", "==", chatbotId).get(),
            authz.adminDb.collection("users").doc(chatbotId).get(),
        ])

    const voiceNumbers = normalizeVoiceNumberRecords(mapDocs(voiceNumbersSnapshot))
    const voiceReadiness = buildVoiceReadiness({
        publicOrigin,
        integration: normalizeVoiceIntegrationConfig(config.voiceIntegration),
        voiceNumbers,
    })
    const whatsapp = normalizeWhatsApp(config.whatsapp)
    const instagram = normalizeInstagram(config.instagram)
    const criticalEvents = auditLogs
        .filter((log: any) => log.result === "error" || log.result === "denied")
        .slice(0, 8)
        .map((log: any) => ({
            id: log.id,
            channel: log.channel,
            eventType: log.eventType,
            message: log.message || null,
            createdAt: log.createdAt || null,
            result: log.result,
        }))

    const payload = buildOverviewPayload({
        chatbotId,
        accountName: accountSnapshot.exists ? accountSnapshot.data()?.companyName || accountSnapshot.data()?.email || null : null,
        assistantCore: config.assistantCore,
        sessions: mapDocs(sessionsSnapshot),
        callbacks: mapDocs(callbacksSnapshot),
        leads: mapDocs(leadsSnapshot),
        appointments: mapDocs(appointmentsSnapshot),
        criticalEvents,
        channelHealth: [
            {
                channel: "web",
                enabled: config?.web?.enabled !== false,
                ready: config?.web?.enabled !== false,
                blockers: [],
            },
            {
                channel: "whatsapp",
                enabled: whatsapp.enabled,
                ready:
                    publicOrigin &&
                    whatsapp.enabled &&
                    Boolean(whatsapp.phoneNumberId) &&
                    Boolean(whatsapp.accessTokenRef) &&
                    Boolean(whatsapp.appSecretRef) &&
                    Boolean(whatsapp.verifyToken),
                blockers: [
                    publicOrigin ? null : "Public URL required",
                    whatsapp.enabled ? null : "Channel disabled",
                    whatsapp.phoneNumberId ? null : "phoneNumberId missing",
                    whatsapp.accessTokenRef ? null : "access token missing",
                    whatsapp.appSecretRef ? null : "app secret missing",
                    whatsapp.verifyToken ? null : "verify token missing",
                ].filter((value): value is string => Boolean(value)),
            },
            {
                channel: "instagram",
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
                    publicOrigin ? null : "Public URL required",
                    instagram.enabled ? null : "Channel disabled",
                    instagram.accountId ? null : "accountId missing",
                    instagram.pageId ? null : "pageId missing",
                    instagram.accessTokenRef ? null : "access token missing",
                    instagram.appSecretRef ? null : "app secret missing",
                    instagram.verifyToken ? null : "verify token missing",
                ].filter((value): value is string => Boolean(value)),
            },
            {
                channel: "voice",
                enabled: voiceReadiness.enabled,
                ready: voiceReadiness.ready,
                blockers: voiceReadiness.blockers,
            },
        ],
        filters,
    })

    return NextResponse.json(payload)
}
