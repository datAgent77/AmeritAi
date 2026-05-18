import { normalizePhoneNumber, upsertContactGraph } from "@/lib/vion-web-session"
import { upsertCallbackRequest, type VionChannel } from "@/lib/vion-callbacks"
import type { GuidedSkillActionId } from "@/lib/guided-skills/types"

export interface VionGuidedActionRequest {
    chatbotId: string
    actionId: GuidedSkillActionId
    sourceChannel?: string | null
    sourceSessionId?: string | null
    contactKey?: string | null
    canonicalContactId?: string | null
    payload?: Record<string, any> | null
}

export interface VionGuidedActionResult {
    actionId: GuidedSkillActionId
    recordType: string
    record: Record<string, any>
    message: string
}

type VionOperationsSettings = {
    defaultAssignee?: string | null
    callbackAssignee?: string | null
    appointmentAssignee?: string | null
    leadAssignee?: string | null
    callbackSlaHours?: number
}

function inferChannel(value?: string | null): VionChannel {
    if (value === "voice" || value === "whatsapp" || value === "instagram" || value === "messenger") {
        return value
    }
    return "web"
}

function normalizeActionId(value?: string | null): GuidedSkillActionId {
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
            throw new Error("Unsupported guided action")
    }
}

function normalizeOperations(config: any): VionOperationsSettings {
    const operations = config?.operations || {}
    return {
        defaultAssignee: operations.defaultAssignee || "",
        callbackAssignee: operations.callbackAssignee || "",
        appointmentAssignee: operations.appointmentAssignee || "",
        leadAssignee: operations.leadAssignee || "",
        callbackSlaHours: typeof operations.callbackSlaHours === "number" ? operations.callbackSlaHours : 4,
    }
}

async function getRuntimeConfig(adminDb: any, chatbotId: string) {
    const [channelConfigSnapshot, chatbotSnapshot] = await Promise.all([
        adminDb.collection("omni_channel_configs").doc(chatbotId).get().catch(() => null),
        adminDb.collection("chatbots").doc(chatbotId).get().catch(() => null),
    ])

    return {
        ...(chatbotSnapshot?.exists ? chatbotSnapshot.data() || {} : {}),
        ...(channelConfigSnapshot?.exists ? channelConfigSnapshot.data() || {} : {}),
    }
}

async function upsertActionContactIdentity(adminDb: any, request: VionGuidedActionRequest) {
    const payload = request.payload || {}
    const channel = inferChannel(request.sourceChannel)
    const email = String(payload.email || payload.customerEmail || "").trim().toLowerCase()
    const rawPhone = String(payload.phone || payload.customerPhone || request.contactKey || "").trim()
    const phone = rawPhone ? normalizePhoneNumber(rawPhone) || rawPhone : ""
    const displayName = String(payload.displayName || payload.name || payload.customerName || "").trim() || null
    const rawContactKey = request.contactKey || payload.contactKey || phone || email || null

    const contact = await upsertContactGraph(adminDb, {
        chatbotId: request.chatbotId,
        channel,
        canonicalContactId: request.canonicalContactId || null,
        contactKey: rawContactKey,
        displayName,
        verifiedPhone: channel === "voice" ? phone || null : null,
        whatsappNumber: channel === "whatsapp" ? phone || null : null,
        email: email || null,
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

async function createLead(adminDb: any, request: VionGuidedActionRequest, operations: VionOperationsSettings) {
    const payload = request.payload || {}
    const identity = await upsertActionContactIdentity(adminDb, request)
    const email = identity.email
    const phone = identity.phone

    if (!payload.name && !email && !phone) {
        throw new Error("At least one lead contact field is required")
    }

    const record = {
        chatbotId: request.chatbotId,
        name: payload.name || identity.displayName || "Anonymous",
        email,
        phone,
        source: payload.source || `Vion ${request.sourceChannel || "web"}`,
        status: payload.status || "new",
        sourceChannel: request.sourceChannel || null,
        sourceSessionId: request.sourceSessionId || null,
        sessionId: request.sourceSessionId || null,
        contactKey: identity.contactKey || phone || email || null,
        canonicalContactId: identity.canonicalContactId,
        assignedTo: payload.assignedTo || operations.leadAssignee || operations.defaultAssignee || null,
        notes: payload.notes || null,
        customFields: {
            ...(payload.customFields || {}),
            guidedActionId: request.actionId,
        },
        createdAt: new Date(),
    }

    const docRef = await adminDb.collection("leads").add(record)
    return { id: docRef.id, ...record }
}

async function createCallback(adminDb: any, request: VionGuidedActionRequest, operations: VionOperationsSettings, isHandoff: boolean) {
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

    return upsertCallbackRequest(adminDb, {
        chatbotId: request.chatbotId,
        contactKey,
        canonicalContactId: identity.canonicalContactId,
        displayName: payload.displayName || payload.name || identity.displayName || null,
        owner: payload.owner || operations.callbackAssignee || operations.defaultAssignee || null,
        priority: payload.priority || (isHandoff ? "high" : "normal"),
        status: payload.status || "pending",
        dueAt,
        sourceSessionId: request.sourceSessionId || null,
        sourceChannel: inferChannel(request.sourceChannel),
        resolutionStatus: payload.resolutionStatus || "open",
        notes: payload.notes || (isHandoff ? "Human handoff requested by assistant." : "Callback created by guided action."),
    })
}

async function createAppointment(adminDb: any, request: VionGuidedActionRequest, operations: VionOperationsSettings) {
    const payload = request.payload || {}
    const identity = await upsertActionContactIdentity(adminDb, request)
    const record = {
        chatbotId: request.chatbotId,
        customerName: payload.customerName || payload.name || identity.displayName || null,
        customerEmail: identity.email || payload.customerEmail || payload.email || null,
        customerPhone: identity.phone || payload.customerPhone || payload.phone || null,
        date: String(payload.date || ""),
        time: String(payload.time || ""),
        type: payload.type || null,
        notes: payload.notes || null,
        status: payload.status || "pending",
        source: payload.source || "vion",
        sourceChannel: inferChannel(request.sourceChannel),
        sourceSessionId: request.sourceSessionId || null,
        sessionId: request.sourceSessionId || null,
        contactKey: identity.contactKey || payload.contactKey || null,
        canonicalContactId: identity.canonicalContactId,
        assignedTo: payload.assignedTo || operations.appointmentAssignee || operations.defaultAssignee || null,
        createdAt: new Date(),
        updatedAt: new Date(),
    }
    const docRef = await adminDb.collection("appointments").add(record)
    return { id: docRef.id, ...record }
}

async function checkBusinessHours(adminDb: any, chatbotId: string) {
    const snapshot = await adminDb.collection("appointments_settings").doc(chatbotId).get().catch(() => null)
    const settings = snapshot?.exists ? snapshot.data() || {} : {}
    const workingDays = Array.isArray(settings.workingDays)
        ? settings.workingDays
        : ["Mon", "Tue", "Wed", "Thu", "Fri"]
    const start = String(settings.workingHoursStart || "09:00")
    const end = String(settings.workingHoursEnd || "18:00")
    const now = new Date()
    const localDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getDay()]
    const [hour, minute] = [now.getHours(), now.getMinutes()]
    const currentMinutes = hour * 60 + minute
    const [startHour, startMinute] = start.split(":").map((part) => Number(part))
    const [endHour, endMinute] = end.split(":").map((part) => Number(part))
    const startMinutes = startHour * 60 + (startMinute || 0)
    const endMinutes = endHour * 60 + (endMinute || 0)
    const openNow = workingDays.includes(localDay) && currentMinutes >= startMinutes && currentMinutes <= endMinutes

    return {
        ...settings,
        workingDays,
        workingHoursStart: start,
        workingHoursEnd: end,
        openNow,
    }
}

export async function executeVionGuidedAction(adminDb: any, request: VionGuidedActionRequest): Promise<VionGuidedActionResult> {
    const actionId = normalizeActionId(request.actionId)
    const config = await getRuntimeConfig(adminDb, request.chatbotId)
    const operations = normalizeOperations(config)

    switch (actionId) {
        case "create_appointment": {
            const appointment = await createAppointment(adminDb, request, operations)
            return { actionId, recordType: "appointment", record: appointment, message: "Appointment created" }
        }
        case "create_lead": {
            const lead = await createLead(adminDb, request, operations)
            return { actionId, recordType: "lead", record: lead, message: "Lead created" }
        }
        case "create_callback_request": {
            const callback = await createCallback(adminDb, request, operations, false)
            return { actionId, recordType: "callback", record: callback, message: "Callback request created" }
        }
        case "handoff_to_human": {
            const callback = await createCallback(adminDb, request, operations, true)
            return { actionId, recordType: "callback", record: callback, message: "Human handoff queued" }
        }
        case "call_staff":
        case "request_bill": {
            const payload = request.payload || {}
            const identity = await upsertActionContactIdentity(adminDb, request)
            const masaNo = payload.masaNo || payload.tableNo || "QR"
            const docRef = await adminDb.collection("waiter_requests").add({
                chatbotId: request.chatbotId,
                masaNo,
                type: actionId,
                status: "pending",
                createdAt: new Date().toISOString(),
                sessionId: request.sourceSessionId || null,
                contactKey: identity.contactKey,
                canonicalContactId: identity.canonicalContactId,
                note: payload.note || null,
            })
            return {
                actionId,
                recordType: "waiter_request",
                record: { id: docRef.id, masaNo, type: actionId },
                message: actionId === "call_staff" ? "Garson cagrildi" : "Hesap istendi",
            }
        }
        case "check_business_hours": {
            const record = await checkBusinessHours(adminDb, request.chatbotId)
            return {
                actionId,
                recordType: "business_hours",
                record,
                message: record.openNow ? "Business is currently open" : "Business is currently closed",
            }
        }
    }
}
