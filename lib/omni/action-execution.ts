import type {
    OmniActionExecutionRequest,
    OmniActionExecutionResult,
    OmniChannel,
    OmniOperationsSettings,
} from "@/lib/omni/types"
import { ASSISTANT_CAPABILITIES } from "@/lib/omni/assistant-capabilities"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { createOmniAppointment, getOmniAppointmentSettings } from "@/lib/omni/appointments"
import { createOmniLead, serializeOmniLead } from "@/lib/omni/leads"
import { getOmniChannelConfig, normalizePhoneNumber, upsertCallbackRequest, upsertContactGraph } from "@/lib/omni/server-utils"

const DEFAULT_ACTION_CATALOG = Array.from(
    new Set([...ASSISTANT_CAPABILITIES.flatMap((capability) => capability.allowedActions), "check_business_hours"])
)

function inferChannel(value?: string | null): OmniChannel {
    if (value === "voice" || value === "whatsapp" || value === "instagram") {
        return value
    }
    return "web"
}

function normalizeActionId(value?: string | null): OmniActionExecutionRequest["actionId"] {
    switch (value) {
        case "create_callback_request":
        case "create_appointment":
        case "create_lead":
        case "check_business_hours":
        case "handoff_to_human":
        case "call_staff":
        case "request_bill":
            return value
        default:
            throw new Error("Unsupported action")
    }
}

function normalizeOperations(config: any): OmniOperationsSettings {
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
        teamMembers: Array.isArray(config?.teamMembers) ? config.teamMembers : [],
    }
}

async function upsertActionContactIdentity(adminDb: any, request: OmniActionExecutionRequest) {
    const payload = request.payload || {}
    const channel = inferChannel(request.sourceChannel)
    const email = String(payload.email || payload.customerEmail || "").trim().toLowerCase()
    const rawPhone = String(payload.phone || payload.customerPhone || request.contactKey || "").trim()
    const phone = rawPhone ? normalizePhoneNumber(rawPhone) || rawPhone : ""
    const displayName = String(payload.displayName || payload.name || payload.customerName || "").trim() || null
    const rawContactKey =
        request.contactKey ||
        payload.contactKey ||
        (channel === "instagram" ? String(request.contactKey || "").trim() : "") ||
        phone ||
        email ||
        null

    const contact = await upsertContactGraph(adminDb, {
        chatbotId: request.chatbotId,
        channel,
        canonicalContactId: request.canonicalContactId || null,
        contactKey: rawContactKey,
        displayName,
        verifiedPhone: channel === "voice" ? phone || null : null,
        whatsappNumber: channel === "whatsapp" ? phone || null : null,
        email: email || null,
        instagramHandle: channel === "instagram" ? String(request.contactKey || rawContactKey || "").trim() || null : null,
        notes: `Contact updated via ${request.actionId}`,
    })

    return {
        channel,
        email,
        phone,
        displayName,
        contactKey: contact.contactKey || rawContactKey,
        canonicalContactId: contact.id || request.canonicalContactId || null,
    }
}

async function ensureActionEnabled(adminDb: any, chatbotId: string, actionId: string) {
    const config = await getOmniChannelConfig(adminDb, chatbotId)
    const enabledActions = Array.isArray(config?.assistantCore?.enabledActions) && config.assistantCore.enabledActions.length > 0
        ? config.assistantCore.enabledActions
        : DEFAULT_ACTION_CATALOG

    if (!enabledActions.includes(actionId)) {
        throw new Error(`Action ${actionId} is disabled for this tenant`)
    }
}

async function createLead(adminDb: any, request: OmniActionExecutionRequest, operations: OmniOperationsSettings) {
    const payload = request.payload || {}
    const identity = await upsertActionContactIdentity(adminDb, request)
    const email = identity.email
    const phone = identity.phone

    if (!payload.name && !email && !phone) {
        throw new Error("At least one lead contact field is required")
    }
    const lead = await createOmniLead(adminDb, {
        chatbotId: request.chatbotId,
        name: payload.name || "Anonymous",
        email,
        phone,
        source: payload.source || `Omni ${request.sourceChannel || "web"}`,
        status: payload.status || "new",
        sourceChannel: request.sourceChannel || null,
        sourceSessionId: request.sourceSessionId || null,
        contactKey: identity.contactKey || phone || email || null,
        canonicalContactId: identity.canonicalContactId,
        assignedTo: payload.assignedTo || operations.leadAssignee || operations.defaultAssignee || null,
        notes: payload.notes || null,
        customFields: {
            ...(payload.customFields || {}),
            omniActionId: request.actionId,
        },
    })

    return serializeOmniLead(lead.id || "", lead)
}

async function createCallback(adminDb: any, request: OmniActionExecutionRequest, operations: OmniOperationsSettings, isHandoff: boolean) {
    const payload = request.payload || {}
    const identity = await upsertActionContactIdentity(adminDb, request)
    const contactKey = identity.contactKey || normalizePhoneNumber(String(payload.phone || "")) || String(payload.email || "").trim().toLowerCase() || null
    if (!contactKey) {
        throw new Error("Callback actions require a phone number or contact key")
    }

    const dueAt =
        payload.dueAt ||
        (operations.callbackSlaHours
            ? new Date(Date.now() + operations.callbackSlaHours * 60 * 60 * 1000).toISOString()
            : null)

    const record = await upsertCallbackRequest(adminDb, {
        chatbotId: request.chatbotId,
        contactKey,
        canonicalContactId: identity.canonicalContactId,
        displayName: payload.displayName || payload.name || null,
        owner: payload.owner || operations.callbackAssignee || operations.defaultAssignee || null,
        priority: payload.priority || (isHandoff ? "high" : "normal"),
        status: payload.status || "pending",
        dueAt,
        sourceSessionId: request.sourceSessionId || null,
        sourceChannel: inferChannel(request.sourceChannel),
        resolutionStatus: payload.resolutionStatus || "open",
        notes: payload.notes || (isHandoff ? "Human handoff requested by assistant." : "Callback created by assistant action."),
    })

    return record
}

export async function executeOmniAction(adminDb: any, request: OmniActionExecutionRequest): Promise<OmniActionExecutionResult> {
    const actionId = normalizeActionId(request.actionId)
    await ensureActionEnabled(adminDb, request.chatbotId, actionId)
    const config = await getOmniChannelConfig(adminDb, request.chatbotId)
    const operations = normalizeOperations(config.operations)

    try {
        switch (actionId) {
            case "create_appointment": {
                const payload = request.payload || {}
                const identity = await upsertActionContactIdentity(adminDb, request)
                const appointment = await createOmniAppointment(adminDb, {
                    chatbotId: request.chatbotId,
                    customerName: payload.customerName || payload.name || null,
                    customerEmail: identity.email || payload.customerEmail || payload.email || null,
                    customerPhone: identity.phone || payload.customerPhone || payload.phone || null,
                    date: String(payload.date || ""),
                    time: String(payload.time || ""),
                    type: payload.type || null,
                    notes: payload.notes || null,
                    status: payload.status || "pending",
                    source: payload.source || "omni",
                    sourceChannel: inferChannel(request.sourceChannel),
                    sourceSessionId: request.sourceSessionId || null,
                    sessionId: request.sourceSessionId || null,
                    contactKey: identity.contactKey || payload.contactKey || null,
                    canonicalContactId: identity.canonicalContactId,
                    assignedTo: payload.assignedTo || operations.appointmentAssignee || operations.defaultAssignee || null,
                })

                await logOmniAuditEvent({
                    chatbotId: request.chatbotId,
                    channel: inferChannel(request.sourceChannel),
                    eventType: "action.create_appointment",
                    result: "success",
                    source: "omni_action_execute",
                    metadata: { appointmentId: appointment.id },
                })

                return {
                    actionId,
                    recordType: "appointment",
                    record: appointment,
                    message: "Appointment created",
                }
            }
            case "create_lead": {
                const lead = await createLead(adminDb, request, operations)
                await logOmniAuditEvent({
                    chatbotId: request.chatbotId,
                    channel: inferChannel(request.sourceChannel),
                    eventType: "action.create_lead",
                    result: "success",
                    source: "omni_action_execute",
                    metadata: { leadId: lead.id },
                })

                return {
                    actionId,
                    recordType: "lead",
                    record: lead,
                    message: "Lead created",
                }
            }
            case "create_callback_request": {
                const callback = await createCallback(adminDb, request, operations, false)
                await logOmniAuditEvent({
                    chatbotId: request.chatbotId,
                    channel: inferChannel(request.sourceChannel),
                    eventType: "action.create_callback_request",
                    result: "success",
                    source: "omni_action_execute",
                    metadata: { callbackId: callback.id },
                })

                return {
                    actionId,
                    recordType: "callback",
                    record: callback,
                    message: "Callback request created",
                }
            }
            case "handoff_to_human": {
                const callback = await createCallback(adminDb, request, operations, true)
                await logOmniAuditEvent({
                    chatbotId: request.chatbotId,
                    channel: inferChannel(request.sourceChannel),
                    eventType: "action.handoff_to_human",
                    result: "success",
                    source: "omni_action_execute",
                    metadata: { callbackId: callback.id },
                })

                return {
                    actionId,
                    recordType: "callback",
                    record: callback,
                    message: "Human handoff queued",
                }
            }
            case "call_staff":
            case "request_bill": {
                const payload = request.payload || {}
                const identity = await upsertActionContactIdentity(adminDb, request)
                const masaNo = payload.masaNo || payload.tableNo || "QR"
                
                const record = await adminDb.collection("waiter_requests").add({
                    chatbotId: request.chatbotId,
                    masaNo,
                    type: actionId,
                    status: "pending",
                    createdAt: new Date().toISOString(),
                    sessionId: request.sourceSessionId || null,
                    contactKey: identity.contactKey,
                    canonicalContactId: identity.canonicalContactId,
                    note: payload.note || null
                })

                await logOmniAuditEvent({
                    chatbotId: request.chatbotId,
                    channel: inferChannel(request.sourceChannel),
                    eventType: `action.${actionId}`,
                    result: "success",
                    source: "omni_action_execute",
                    metadata: { requestId: record.id, masaNo },
                })

                return {
                    actionId,
                    recordType: "waiter_request",
                    record: { id: record.id, masaNo, type: actionId },
                    message: actionId === "call_staff" ? "Garson çağrıldı" : "Hesap istendi",
                }
            }
            case "check_business_hours": {
                const settings = await getOmniAppointmentSettings(adminDb, request.chatbotId)
                const now = new Date()
                const localDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getDay()]
                const [hour, minute] = [now.getHours(), now.getMinutes()]
                const currentMinutes = hour * 60 + minute
                const startParts = String(settings.workingHoursStart || "09:00").split(":")
                const endParts = String(settings.workingHoursEnd || "18:00").split(":")
                const startMinutes = Number(startParts[0]) * 60 + Number(startParts[1])
                const endMinutes = Number(endParts[0]) * 60 + Number(endParts[1])
                const openNow = settings.workingDays.includes(localDay) && currentMinutes >= startMinutes && currentMinutes <= endMinutes

                await logOmniAuditEvent({
                    chatbotId: request.chatbotId,
                    channel: inferChannel(request.sourceChannel),
                    eventType: "action.check_business_hours",
                    result: "success",
                    source: "omni_action_execute",
                    metadata: { openNow },
                })

                return {
                    actionId,
                    recordType: "business_hours",
                    record: {
                        ...settings,
                        openNow,
                    },
                    message: openNow ? "Business is currently open" : "Business is currently closed",
                }
            }
        }
    } catch (error) {
        await logOmniAuditEvent({
            chatbotId: request.chatbotId,
            channel: inferChannel(request.sourceChannel),
            eventType: `action.${actionId}`,
            result: "error",
            source: "omni_action_execute",
            message: error instanceof Error ? error.message : "Action execution failed",
        })
        throw error
    }
}
