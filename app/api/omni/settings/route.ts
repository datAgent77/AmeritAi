import { NextResponse } from "next/server"
import { buildVoiceReadiness, normalizeVoiceNumberRecords } from "@/lib/omni/voice-config"
import {
    authorizeOmniRequest,
    authorizedForOmniPermission,
    getOmniChannelConfig,
    getRequestOrigin,
    jsonError,
    mergeOmniChannelConfig,
    normalizeVoiceIntegrationConfig,
} from "@/lib/omni/server-utils"
import type { OmniOperationsSettings, OmniProvisioningTask, OmniTeamMember } from "@/lib/omni/types"

function isPublicOrigin(origin: string) {
    return !/localhost|127\.0\.0\.1/i.test(origin)
}

function normalizeWhatsApp(config: any) {
    return {
        enabled: config?.enabled === true,
        businessAccountId: config?.businessAccountId || null,
        phoneNumberId: config?.phoneNumberId || null,
        displayNumber: config?.displayNumber || null,
        accessTokenRef: config?.accessTokenRef || null,
        appSecretRef: config?.appSecretRef || null,
        verifyToken: config?.verifyToken || null,
        webhookStatus: config?.webhookStatus || "disconnected",
        defaultReplyMode: config?.defaultReplyMode || "assistant",
        setupStatus: config?.setupStatus || "not_started",
        setupStage: config?.setupStage || "prerequisites",
        connectionMode: config?.connectionMode || "tenant_meta_app",
        lastHealthCheckAt: config?.lastHealthCheckAt || null,
        lastSetupError: config?.lastSetupError || null,
    }
}

function normalizeInstagram(config: any) {
    return {
        enabled: config?.enabled === true,
        accountId: config?.accountId || null,
        pageId: config?.pageId || null,
        appId: config?.appId || null,
        accessTokenRef: config?.accessTokenRef || null,
        appSecretRef: config?.appSecretRef || null,
        verifyToken: config?.verifyToken || null,
        webhookStatus: config?.webhookStatus || "disconnected",
        defaultReplyMode: config?.defaultReplyMode || "assistant",
        setupStatus: config?.setupStatus || "not_started",
        setupStage: config?.setupStage || "prerequisites",
        connectionMode: config?.connectionMode || "tenant_meta_app",
        lastHealthCheckAt: config?.lastHealthCheckAt || null,
        lastSetupError: config?.lastSetupError || null,
    }
}

function normalizeMessenger(config: any) {
    return {
        enabled: config?.enabled === true,
        pageId: config?.pageId || null,
        appId: config?.appId || null,
        accessTokenRef: config?.accessTokenRef || null,
        appSecretRef: config?.appSecretRef || null,
        verifyToken: config?.verifyToken || null,
        webhookStatus: config?.webhookStatus || "disconnected",
        defaultReplyMode: config?.defaultReplyMode || "assistant",
        setupStatus: config?.setupStatus || "not_started",
        setupStage: config?.setupStage || "prerequisites",
        connectionMode: config?.connectionMode || "tenant_meta_app",
        lastHealthCheckAt: config?.lastHealthCheckAt || null,
        lastSetupError: config?.lastSetupError || null,
    }
}

function normalizeWeb(config: any) {
    return {
        enabled: config?.enabled !== false,
    }
}

function normalizeOperations(config: any): OmniOperationsSettings {
    const rawMembers = Array.isArray(config?.teamMembers) ? config.teamMembers : []
    const teamMembers: OmniTeamMember[] = rawMembers
        .map((member: any, index: number) => {
            const name = String(member?.name || "").trim()
            const email = String(member?.email || "").trim()
            const id = String(email || name || member?.id || `member-${index + 1}`).trim()
            if (!id || !name) {
                return null
            }

            return {
                id,
                name,
                email: email || null,
                role: member?.role === "manager" || member?.role === "operations" || member?.role === "support" || member?.role === "sales" ? member.role : "operations",
                active: member?.active !== false,
            }
        })
        .filter(Boolean) as OmniTeamMember[]

    return {
        workspaceLabel: config?.workspaceLabel || "",
        defaultAssignee: config?.defaultAssignee || "",
        callbackAssignee: config?.callbackAssignee || "",
        appointmentAssignee: config?.appointmentAssignee || "",
        leadAssignee: config?.leadAssignee || "",
        escalationEmail: config?.escalationEmail || "",
        escalationPhone: config?.escalationPhone || "",
        callbackSlaHours: typeof config?.callbackSlaHours === "number" ? config.callbackSlaHours : 4,
        reviewMode: config?.reviewMode === "human_review" ? "human_review" : "assistant",
        notes: config?.notes || "",
        teamMembers,
    }
}

const DEFAULT_PROVISIONING_TASKS: OmniProvisioningTask[] = [
    { id: "voice_webhooks", channel: "voice", label: "Voice call control webhooks", status: "todo", owner: "", notes: "" },
    { id: "voice_numbers", channel: "voice", label: "Carrier number routing", status: "todo", owner: "", notes: "" },
    { id: "voice_rendering", channel: "voice", label: "Voice rendering setup", status: "todo", owner: "", notes: "" },
    { id: "whatsapp_meta", channel: "whatsapp", label: "Meta WhatsApp app setup", status: "todo", owner: "", notes: "" },
    { id: "instagram_meta", channel: "instagram", label: "Instagram DM app setup", status: "todo", owner: "", notes: "" },
    { id: "messenger_meta", channel: "messenger", label: "Facebook Messenger page setup", status: "todo", owner: "", notes: "" },
]

function normalizeProvisioning(config: any): OmniProvisioningTask[] {
    const rawTasks = Array.isArray(config) ? config : []
    const merged = DEFAULT_PROVISIONING_TASKS.map((defaultTask) => {
        const match = rawTasks.find((task: any) => String(task?.id || "") === defaultTask.id) || {}
        return {
            ...defaultTask,
            status:
                match?.status === "done" || match?.status === "blocked" || match?.status === "in_progress"
                    ? match.status
                    : "todo",
            owner: String(match?.owner || defaultTask.owner || "").trim() || "",
            notes: String(match?.notes || defaultTask.notes || "").trim() || "",
            updatedAt: match?.updatedAt || null,
        }
    })

    const customTasks = rawTasks
        .filter((task: any) => !DEFAULT_PROVISIONING_TASKS.some((defaultTask) => defaultTask.id === String(task?.id || "")))
        .map((task: any, index: number) => {
            const id = String(task?.id || `custom-task-${index + 1}`).trim()
            const label = String(task?.label || "").trim()
            const channel =
                task?.channel === "voice" || task?.channel === "instagram" || task?.channel === "messenger"
                    ? task.channel
                    : "whatsapp"
            if (!id || !label) {
                return null
            }

            return {
                id,
                label,
                channel,
                status:
                    task?.status === "done" || task?.status === "blocked" || task?.status === "in_progress"
                        ? task.status
                        : "todo",
                owner: String(task?.owner || "").trim() || "",
                notes: String(task?.notes || "").trim() || "",
                updatedAt: task?.updatedAt || null,
            }
        })
        .filter(Boolean) as OmniProvisioningTask[]

    return [...merged, ...customTasks]
}

export const dynamic = "force-dynamic"

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
    const messenger = normalizeMessenger(config.messenger)
    const web = normalizeWeb(config.web)
    const operations = normalizeOperations(config.operations)
    const provisioning = normalizeProvisioning(config.provisioning)

    const voiceNumbersSnapshot = await authz.adminDb.collection("voice_numbers").where("chatbotId", "==", chatbotId).get()
    const voiceNumbers = normalizeVoiceNumberRecords(voiceNumbersSnapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) })))
    const voiceReadiness = buildVoiceReadiness({
        publicOrigin,
        integration: voiceIntegration,
        voiceNumbers,
    })

    const whatsappBlockers = [
        publicOrigin ? null : "Public URL yok. Meta webhook callback icin preview veya tunnel gerekiyor.",
        whatsapp.enabled ? null : "WhatsApp channel disabled.",
        whatsapp.phoneNumberId ? null : "WhatsApp phoneNumberId eksik.",
        whatsapp.accessTokenRef ? null : "WhatsApp access token eksik.",
        whatsapp.appSecretRef ? null : "WhatsApp app secret eksik.",
        whatsapp.verifyToken ? null : "WhatsApp verify token eksik.",
    ].filter(Boolean)

    const instagramBlockers = [
        publicOrigin ? null : "Public URL yok. Meta webhook callback icin preview veya tunnel gerekiyor.",
        instagram.enabled ? null : "Instagram DM channel disabled.",
        instagram.accountId ? null : "Instagram accountId eksik.",
        instagram.pageId ? null : "Instagram pageId eksik.",
        instagram.accessTokenRef ? null : "Instagram access token eksik.",
        instagram.appSecretRef ? null : "Instagram app secret eksik.",
        instagram.verifyToken ? null : "Instagram verify token eksik.",
    ].filter(Boolean)

    const messengerBlockers = [
        publicOrigin ? null : "Public URL yok. Meta webhook callback icin preview veya tunnel gerekiyor.",
        messenger.enabled ? null : "Messenger channel disabled.",
        messenger.pageId ? null : "Messenger pageId eksik.",
        messenger.accessTokenRef ? null : "Messenger access token eksik.",
        messenger.appSecretRef ? null : "Messenger app secret eksik.",
        messenger.verifyToken ? null : "Messenger verify token eksik.",
    ].filter(Boolean)

    return NextResponse.json({
        baseUrl: origin,
        publicOrigin,
        environmentHint: publicOrigin
            ? "Provider callbacks bu URL'ye gelebilir."
            : "Localhost provider callback alamaz. ngrok, cloudflared veya Vercel preview kullanin.",
        channels: {
            voice: {
                enabled: voiceReadiness.enabled,
                ready: voiceReadiness.ready,
                blockers: voiceReadiness.blockers,
                configuredNumbers: voiceNumbers.length,
                activeNumbers: voiceReadiness.activeNumbers,
                carrierConfigured: voiceReadiness.carrierConfigured,
                callControlConfigured: voiceReadiness.callControlConfigured,
                renderingConfigured: voiceReadiness.renderingConfigured,
                routingMode: voiceReadiness.defaultRoutingMode,
                callControlProvider: voiceReadiness.callControlProvider,
                ttsProviderDefault: voiceReadiness.ttsProviderDefault,
                webhooks: {
                    inbound: `${origin}/api/omni/channels/voice/inbound`,
                    turn: `${origin}/api/omni/channels/voice/turn`,
                    status: `${origin}/api/omni/channels/voice/status`,
                    testCall: `${origin}/api/omni/channels/voice/test-call`,
                },
            },
            whatsapp: {
                enabled: whatsapp.enabled,
                ready: whatsappBlockers.length === 0,
                blockers: whatsappBlockers,
                webhookStatus: whatsapp.webhookStatus,
                defaultReplyMode: whatsapp.defaultReplyMode,
                phoneNumberId: whatsapp.phoneNumberId,
                verifyTokenConfigured: Boolean(whatsapp.verifyToken),
                webhooks: {
                    inbound: `${origin}/api/omni/channels/whatsapp/webhook`,
                },
            },
            instagram: {
                enabled: instagram.enabled,
                ready: instagramBlockers.length === 0,
                blockers: instagramBlockers,
                webhookStatus: instagram.webhookStatus,
                defaultReplyMode: instagram.defaultReplyMode,
                pageId: instagram.pageId,
                verifyTokenConfigured: Boolean(instagram.verifyToken),
                webhooks: {
                    inbound: `${origin}/api/omni/channels/instagram/webhook`,
                },
            },
            messenger: {
                enabled: messenger.enabled,
                ready: messengerBlockers.length === 0,
                blockers: messengerBlockers,
                webhookStatus: messenger.webhookStatus,
                defaultReplyMode: messenger.defaultReplyMode,
                pageId: messenger.pageId,
                verifyTokenConfigured: Boolean(messenger.verifyToken),
                webhooks: {
                    inbound: `${origin}/api/omni/channels/messenger/webhook`,
                },
            },
            web: {
                enabled: web.enabled,
                ready: web.enabled,
                blockers: web.enabled ? [] : ["Web widget channel disabled."],
                webhooks: {},
            },
        },
        operations,
        provisioning,
        assigneeOptions: operations.teamMembers || [],
        suggestedNextSteps: publicOrigin
            ? [
                  "Voice icin carrier routing, Twilio call control ve rendering ayarlarini birlikte tamamlayin.",
                  "WhatsApp, Instagram ve Messenger icin Meta App webhook URL'lerini bu paneldeki endpoint'lerle esleyin.",
                  "Sonrasinda ilgili channel panelinden Health Check ve Test aksiyonlarini calistirin.",
              ]
            : [
                  "ngrok veya cloudflared ile local sunucuyu public hale getirin.",
                  "Alternatif olarak Vercel preview deploy alin.",
                  "Public URL hazir olduktan sonra provider webhook ayarlarini girin ve tekrar test edin.",
              ],
    })
}

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
    if (!authorizedForOmniPermission(authz, "settings.manage")) {
        return jsonError("Forbidden", 403)
    }

    const operations = normalizeOperations(body.operations || {})
    const provisioning = normalizeProvisioning(body.provisioning || [])
    const merged = await mergeOmniChannelConfig(authz.adminDb, chatbotId, {
        operations,
        provisioning,
    })

    return NextResponse.json({
        ok: true,
        operations: normalizeOperations(merged.operations),
        provisioning: normalizeProvisioning(merged.provisioning),
    })
}
