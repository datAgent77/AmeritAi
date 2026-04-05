import { NextResponse } from "next/server"
import { DEFAULT_OMNI_APPOINTMENT_SETTINGS, getOmniAppointmentSettings } from "@/lib/omni/appointments"
import { authorizeOmniRequest, authorizedForOmniPermission, jsonError } from "@/lib/omni/server-utils"

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
    if (!authorizedForOmniPermission(authz, "operations.view")) {
        return jsonError("Forbidden", 403)
    }

    const settings = await getOmniAppointmentSettings(authz.adminDb, chatbotId)
    return NextResponse.json({ settings })
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

    const nextSettings = {
        workingDays: Array.isArray(body.workingDays) && body.workingDays.length > 0
            ? body.workingDays
            : DEFAULT_OMNI_APPOINTMENT_SETTINGS.workingDays,
        workingHoursStart: body.workingHoursStart || DEFAULT_OMNI_APPOINTMENT_SETTINGS.workingHoursStart,
        workingHoursEnd: body.workingHoursEnd || DEFAULT_OMNI_APPOINTMENT_SETTINGS.workingHoursEnd,
        appointmentDuration: Number(body.appointmentDuration) || DEFAULT_OMNI_APPOINTMENT_SETTINGS.appointmentDuration,
        googleCalendarConnected: body.googleCalendarConnected ?? DEFAULT_OMNI_APPOINTMENT_SETTINGS.googleCalendarConnected,
        outlookCalendarConnected: body.outlookCalendarConnected ?? DEFAULT_OMNI_APPOINTMENT_SETTINGS.outlookCalendarConnected,
    }

    await authz.adminDb.collection("appointments_settings").doc(chatbotId).set(nextSettings, { merge: true })
    return NextResponse.json({ settings: nextSettings })
}
