import { NextResponse } from "next/server"
import { sendAppointmentConfirmationEmail } from "@/lib/email-service"
import { logOmniAuditEvent } from "@/lib/omni/audit-log"
import { serializeOmniAppointment } from "@/lib/omni/appointments"
import { authorizeOmniRequest, authorizedForOmniPermission, jsonError } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
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

    const docRef = authz.adminDb.collection("appointments").doc(id)
    const snapshot = await docRef.get()
    if (!snapshot.exists) {
        return jsonError("Appointment not found", 404)
    }

    const existing = snapshot.data() || {}
    if (String(existing.chatbotId || "") !== chatbotId) {
        return jsonError("Appointment does not belong to this tenant", 403)
    }

    await docRef.set(
        {
            status: "confirmed",
            confirmedAt: new Date(),
            updatedAt: new Date(),
        },
        { merge: true }
    )

    let emailSent = false
    if (existing.customerEmail) {
        const chatbotSnap = await authz.adminDb.collection("chatbots").doc(chatbotId).get()
        const chatbotData = chatbotSnap.exists ? chatbotSnap.data() || {} : {}
        emailSent = await sendAppointmentConfirmationEmail({
            customerEmail: existing.customerEmail,
            customerName: existing.customerName || "Değerli Müşterimiz",
            date: existing.date,
            time: existing.time,
            companyName: chatbotData.companyName || chatbotData.name || "Vion AI",
            notes: existing.notes,
        })
    }

    const refreshed = await docRef.get()
    const appointment = serializeOmniAppointment(id, refreshed.data() || {})

    await logOmniAuditEvent({
        chatbotId,
        channel: existing.sourceChannel || "web",
        eventType: "appointments.confirm",
        result: "success",
        source: "omni_appointments_route",
        metadata: { appointmentId: id, emailSent },
    })

    return NextResponse.json({
        appointment,
        emailSent,
    })
}
