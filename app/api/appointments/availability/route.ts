import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import {
    buildAvailabilityWindow,
    DEFAULT_APPOINTMENT_SCHEDULING_SETTINGS,
    normalizeAppointmentSchedulingSettings,
    listAllTimeSlots,
} from "@/lib/appointment-scheduling"

export const runtime = "nodejs"

const DEFAULT_LOOKAHEAD_DAYS = 120

function parseDaysParam(value: string | null): number {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) {
        return DEFAULT_LOOKAHEAD_DAYS
    }

    return Math.min(180, Math.max(14, Math.floor(parsed)))
}

export async function GET(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) {
            return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
        }

        const { searchParams } = new URL(req.url)
        const chatbotId = searchParams.get("chatbotId")

        if (!chatbotId) {
            return NextResponse.json({ error: "chatbotId is required" }, { status: 400 })
        }

        const days = parseDaysParam(searchParams.get("days"))
        const startDate = new Date()
        startDate.setHours(0, 0, 0, 0)

        const [chatbotSnap, userSnap, settingsSnap, appointmentsSnap] = await Promise.all([
            adminDb.collection("chatbots").doc(chatbotId).get(),
            adminDb.collection("users").doc(chatbotId).get(),
            adminDb.collection("appointments_settings").doc(chatbotId).get(),
            adminDb.collection("appointments").where("chatbotId", "==", chatbotId).get(),
        ])

        if (!chatbotSnap.exists) {
            return NextResponse.json({ error: "Chatbot not found" }, { status: 404 })
        }

        const userData = userSnap.exists ? userSnap.data() || {} : {}
        if (userData?.isActive === false) {
            return NextResponse.json({ error: "Account is inactive" }, { status: 403 })
        }

        const chatbotData = chatbotSnap.data() || {}
        const isAppointmentsEnabled =
            chatbotData.enableAppointments === true ||
            userData.enableAppointments === true

        if (!isAppointmentsEnabled) {
            return NextResponse.json({ error: "Appointments are disabled for this chatbot" }, { status: 403 })
        }

        const rawSettings = settingsSnap.exists ? settingsSnap.data() || {} : {}
        const settings = normalizeAppointmentSchedulingSettings(
            settingsSnap.exists ? rawSettings : DEFAULT_APPOINTMENT_SCHEDULING_SETTINGS
        )
        const appointmentTypes = Array.isArray(rawSettings.appointmentTypes)
            ? rawSettings.appointmentTypes
            : undefined

        const appointments = appointmentsSnap.docs.map((doc) => {
            const data = doc.data() || {}
            return {
                id: doc.id,
                date: String(data.date || ""),
                time: String(data.time || ""),
                status: typeof data.status === "string" ? data.status : null,
            }
        })

        const availabilityWindow = buildAvailabilityWindow({
            startDate,
            days,
            settings,
            appointments,
            now: new Date(),
        })

        const allSlotsByDate: Record<string, string[]> = {}
        for (const day of availabilityWindow) {
            allSlotsByDate[day.date] = listAllTimeSlots({ date: day.date, settings, now: new Date() })
        }
        const availability = availabilityWindow.filter((day) => day.slots.length > 0)
        const selectableDates = availabilityWindow
            .filter((day) => (allSlotsByDate[day.date] || []).length > 0)
            .map((day) => day.date)

        return NextResponse.json({
            settings: { ...settings, ...(appointmentTypes ? { appointmentTypes } : {}) },
            intervalMinutes: 30,
            availability,
            availableDates: selectableDates,
            slotsByDate: Object.fromEntries(availabilityWindow.map((day) => [day.date, day.slots])),
            allSlotsByDate,
        })
    } catch (error: any) {
        console.error("Appointments availability GET error:", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}
