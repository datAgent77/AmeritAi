import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

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
        await docRef.update(body)

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
        await docRef.delete()

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Appointment DELETE Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
