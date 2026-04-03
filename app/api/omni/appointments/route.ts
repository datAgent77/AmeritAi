import { NextResponse } from "next/server"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { createOmniAppointment, getAppointmentScheduledMillis, serializeOmniAppointment } from "@/lib/omni/appointments"
import { authorizeOmniRequest, authorizedForOmniPermission, getOmniChannelConfig, jsonError, toMillis, upsertContactGraph } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

function sortAppointments(left: any, right: any) {
    const leftOpen = left.status !== "completed" && left.status !== "cancelled"
    const rightOpen = right.status !== "completed" && right.status !== "cancelled"

    if (leftOpen !== rightOpen) {
        return leftOpen ? -1 : 1
    }

    if (leftOpen) {
        return getAppointmentScheduledMillis(left) - getAppointmentScheduledMillis(right)
    }

    return toMillis(right.updatedAt || right.createdAt) - toMillis(left.updatedAt || left.createdAt)
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const chatbotId = searchParams.get("chatbotId")
    const status = searchParams.get("status")

    if (!chatbotId) {
        return jsonError("chatbotId is required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "operations.view")) {
        return jsonError("Forbidden", 403)
    }

    const snapshot = await authz.adminDb.collection("appointments").where("chatbotId", "==", chatbotId).get()
    const appointments = snapshot.docs
        .map((doc: any) => serializeOmniAppointment(doc.id, doc.data() || {}))
        .filter((appointment: ReturnType<typeof serializeOmniAppointment>) => !status || appointment.status === status)
        .sort(sortAppointments)

    return NextResponse.json({ appointments })
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
    if (!authorizedForOmniPermission(authz, "operations.manage")) {
        return jsonError("Forbidden", 403)
    }

    try {
        const config = await getOmniChannelConfig(authz.adminDb, chatbotId)
        const operations = config.operations || {}
        const contact = await upsertContactGraph(authz.adminDb, {
            chatbotId,
            channel: body.sourceChannel || "web",
            canonicalContactId: body.canonicalContactId || null,
            contactKey: body.contactKey || body.customerPhone || body.customerEmail || null,
            displayName: body.customerName || null,
            verifiedPhone: body.sourceChannel === "voice" ? body.customerPhone || null : null,
            whatsappNumber: body.sourceChannel === "whatsapp" ? body.customerPhone || null : null,
            email: body.customerEmail || null,
            notes: "Contact updated during Omni appointment creation.",
        })
        const appointment = await createOmniAppointment(authz.adminDb, {
            chatbotId,
            customerName: body.customerName || null,
            customerEmail: body.customerEmail || null,
            customerPhone: body.customerPhone || null,
            date: body.date,
            time: body.time,
            type: body.type || null,
            notes: body.notes || null,
            status: body.status || "pending",
            source: body.source || "manual",
            sourceChannel: body.sourceChannel || "web",
            sourceSessionId: body.sourceSessionId || body.sessionId || null,
            sessionId: body.sessionId || body.sourceSessionId || null,
            contactKey: contact.contactKey || body.contactKey || null,
            canonicalContactId: contact.id || body.canonicalContactId || null,
            assignedTo: body.assignedTo || operations.appointmentAssignee || operations.defaultAssignee || null,
        })

        await logOmniAuditEvent({
            chatbotId,
            channel: body.sourceChannel || "web",
            eventType: "appointments.create",
            result: "success",
            source: "omni_appointments_route",
            metadata: { appointmentId: appointment.id },
        })

        return NextResponse.json({ appointment }, { status: 201 })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create appointment"
        await logOmniAuditEvent({
            chatbotId,
            channel: body.sourceChannel || "web",
            eventType: "appointments.create",
            result: "error",
            source: "omni_appointments_route",
            message,
        })
        return jsonError(message, 400)
    }
}
