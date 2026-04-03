import { NextResponse } from "next/server"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { updateOmniAppointment } from "@/lib/omni/appointments"
import { authorizeOmniRequest, authorizedForOmniPermission, jsonError, upsertContactGraph } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const body = await req.json()
    const chatbotId = body.chatbotId

    if (!chatbotId || !id) {
        return jsonError("chatbotId and appointment id are required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "operations.manage")) {
        return jsonError("Forbidden", 403)
    }

    try {
        const existingSnapshot = await authz.adminDb.collection("appointments").doc(id).get()
        const existing = existingSnapshot.exists ? existingSnapshot.data() || {} : {}
        const sourceChannel = body.sourceChannel || existing.sourceChannel || "web"
        const contact =
            body.canonicalContactId || body.contactKey || body.customerPhone || body.customerEmail
                ? await upsertContactGraph(authz.adminDb, {
                      chatbotId,
                      channel: sourceChannel,
                      canonicalContactId: body.canonicalContactId || existing.canonicalContactId || null,
                      contactKey: body.contactKey || body.customerPhone || body.customerEmail || existing.contactKey || null,
                      displayName: body.customerName || existing.customerName || null,
                      verifiedPhone: sourceChannel === "voice" ? body.customerPhone || existing.customerPhone || null : null,
                      whatsappNumber: sourceChannel === "whatsapp" ? body.customerPhone || existing.customerPhone || null : null,
                      email: body.customerEmail || existing.customerEmail || null,
                      instagramHandle: sourceChannel === "instagram" ? body.contactKey || existing.contactKey || null : null,
                      notes: "Contact updated during Omni appointment update.",
                  })
                : null

        const appointment = await updateOmniAppointment(authz.adminDb, {
            id,
            chatbotId,
            customerName: body.customerName,
            customerEmail: body.customerEmail,
            customerPhone: body.customerPhone,
            date: body.date,
            time: body.time,
            type: body.type,
            notes: body.notes,
            status: body.status,
            sourceChannel,
            sourceSessionId: body.sourceSessionId,
            sessionId: body.sessionId,
            contactKey: contact?.contactKey || body.contactKey,
            canonicalContactId: contact?.id || body.canonicalContactId,
            assignedTo: body.assignedTo,
        })

        await logOmniAuditEvent({
            chatbotId,
            channel: sourceChannel || appointment.sourceChannel || "web",
            eventType: "appointments.update",
            result: "success",
            source: "omni_appointments_route",
            metadata: { appointmentId: id, status: appointment.status },
        })

        return NextResponse.json({ appointment })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update appointment"
        await logOmniAuditEvent({
            chatbotId,
            channel: body.sourceChannel || "web",
            eventType: "appointments.update",
            result: "error",
            source: "omni_appointments_route",
            message,
            metadata: { appointmentId: id },
        })
        return jsonError(message, 400)
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const chatbotId = searchParams.get("chatbotId")

    if (!chatbotId || !id) {
        return jsonError("chatbotId and appointment id are required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "operations.manage")) {
        return jsonError("Forbidden", 403)
    }

    const docRef = authz.adminDb.collection("appointments").doc(id)
    const snapshot = await docRef.get()
    if (!snapshot.exists) {
        return jsonError("Appointment not found", 404)
    }

    const existing = snapshot.data() || {}
    if (String(existing.chatbotId || "") !== chatbotId) {
        return jsonError("Appointment does not belong to this tenant", 403)
    }

    await docRef.delete()

    await logOmniAuditEvent({
        chatbotId,
        channel: existing.sourceChannel || "web",
        eventType: "appointments.delete",
        result: "success",
        source: "omni_appointments_route",
        metadata: { appointmentId: id },
    })

    return NextResponse.json({ ok: true })
}
