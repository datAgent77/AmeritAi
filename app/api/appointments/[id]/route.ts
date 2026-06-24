import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { sendAppointmentCancellationEmail } from "@/lib/email-service"

export const runtime = 'nodejs'

// PATCH: Update appointment status
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) {
            return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
        }

        const { id } = await params
        const body = await req.json()

        if (!id) {
            return NextResponse.json({ error: "Appointment ID is required" }, { status: 400 })
        }

        const docRef = adminDb.collection("appointments").doc(id)
        const appointmentSnap = await docRef.get()
        if (!appointmentSnap.exists) {
            return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
        }

        const chatbotId = appointmentSnap.data()?.chatbotId
        if (!chatbotId) {
            return NextResponse.json({ error: "Appointment chatbotId is missing" }, { status: 400 })
        }

        const authz = await authorizeTargetAccess(req, chatbotId)
        if (!authz.ok) {
            return authz.response
        }

        const allowedStatuses = new Set(["pending", "confirmed", "cancelled", "completed"])
        const nextStatus = body?.status

        if (typeof nextStatus !== "string" || !allowedStatuses.has(nextStatus)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 })
        }

        const appointmentData = appointmentSnap.data()!

        await docRef.update({
            status: nextStatus,
            updatedAt: new Date().toISOString()
        })

        if (nextStatus === "cancelled" && appointmentData.customerEmail) {
            try {
                const chatbotSnap = await adminDb.collection("chatbots").doc(chatbotId).get()
                const companyName: string = chatbotSnap.data()?.companyName || chatbotSnap.data()?.businessName || chatbotSnap.data()?.name || "AmeritAI"
                await sendAppointmentCancellationEmail({
                    customerEmail: appointmentData.customerEmail,
                    customerName: appointmentData.customerName || "Değerli Müşterimiz",
                    date: appointmentData.date,
                    time: appointmentData.time,
                    companyName,
                    notes: appointmentData.notes,
                })
            } catch (emailErr) {
                console.error("Appointment PATCH: cancellation email error:", emailErr)
            }
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Appointment PATCH Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// DELETE: Delete an appointment
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) {
            return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
        }

        const { id } = await params

        if (!id) {
            return NextResponse.json({ error: "Appointment ID is required" }, { status: 400 })
        }

        const docRef = adminDb.collection("appointments").doc(id)
        const appointmentSnap = await docRef.get()
        if (!appointmentSnap.exists) {
            return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
        }

        const chatbotId = appointmentSnap.data()?.chatbotId
        if (!chatbotId) {
            return NextResponse.json({ error: "Appointment chatbotId is missing" }, { status: 400 })
        }

        const authz = await authorizeTargetAccess(req, chatbotId)
        if (!authz.ok) {
            return authz.response
        }

        await docRef.delete()

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Appointment DELETE Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
