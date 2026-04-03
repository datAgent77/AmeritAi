import type { OmniAppointmentRecord, OmniAppointmentSettings } from "@/lib/omni/types"
import { normalizePhoneNumber, toIsoOrNull, toMillis } from "@/lib/omni/server-utils"

export const DEFAULT_OMNI_APPOINTMENT_SETTINGS: OmniAppointmentSettings = {
    workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    workingHoursStart: "09:00",
    workingHoursEnd: "18:00",
    appointmentDuration: 30,
    googleCalendarConnected: false,
    outlookCalendarConnected: false,
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[0-9+\-() ]{6,20}$/
const APPOINTMENT_MAX_DAYS_AHEAD = 365

function parseTimeToMinutes(value: string): number | null {
    if (!/^\d{2}:\d{2}$/.test(value)) {
        return null
    }

    const [hourStr, minuteStr] = value.split(":")
    const hour = Number(hourStr)
    const minute = Number(minuteStr)

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return null
    }

    return hour * 60 + minute
}

function getDayCode(date: Date): string {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    return days[date.getDay()]
}

function normalizeEmail(value?: string | null) {
    const normalized = String(value || "").trim().toLowerCase()
    return normalized || ""
}

function normalizeText(value: unknown, fallback = "") {
    return String(value || fallback).trim()
}

function normalizeAppointmentStatus(value?: string | null): OmniAppointmentRecord["status"] {
    if (value === "confirmed" || value === "cancelled" || value === "completed") {
        return value
    }
    return "pending"
}

function normalizeAppointmentSource(value?: string | null): OmniAppointmentRecord["source"] {
    if (value === "google" || value === "outlook" || value === "manual" || value === "omni") {
        return value
    }
    return "chatbot"
}

function buildAppointmentDateTime(date: string, time: string) {
    return new Date(`${date}T${time}:00`)
}

function normalizeOptionalDate(value: any) {
    if (!value) return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function getAppointmentScheduledMillis(record: Pick<OmniAppointmentRecord, "date" | "time" | "createdAt">) {
    const scheduledAt = buildAppointmentDateTime(record.date, record.time)
    if (!Number.isNaN(scheduledAt.getTime())) {
        return scheduledAt.getTime()
    }
    return toMillis(record.createdAt)
}

export function serializeOmniAppointment(id: string, data: Record<string, any>): OmniAppointmentRecord {
    return {
        id,
        chatbotId: String(data.chatbotId || ""),
        customerName: String(data.customerName || "Guest"),
        customerEmail: String(data.customerEmail || ""),
        customerPhone: String(data.customerPhone || ""),
        date: String(data.date || ""),
        time: String(data.time || ""),
        type: String(data.type || "Consultation"),
        status: normalizeAppointmentStatus(data.status),
        source: normalizeAppointmentSource(data.source),
        sourceChannel: data.sourceChannel || null,
        sourceSessionId: data.sourceSessionId || data.sessionId || null,
        sessionId: data.sessionId || data.sourceSessionId || null,
        contactKey: data.contactKey || null,
        canonicalContactId: data.canonicalContactId || null,
        assignedTo: data.assignedTo || null,
        notes: data.notes || null,
        createdAt: toIsoOrNull(data.createdAt),
        updatedAt: toIsoOrNull(data.updatedAt),
        confirmedAt: toIsoOrNull(data.confirmedAt),
    }
}

export async function getOmniAppointmentSettings(adminDb: any, chatbotId: string): Promise<OmniAppointmentSettings> {
    const snapshot = await adminDb.collection("appointments_settings").doc(chatbotId).get()
    const stored = snapshot.exists ? snapshot.data() || {} : {}

    return {
        ...DEFAULT_OMNI_APPOINTMENT_SETTINGS,
        ...stored,
        workingDays: Array.isArray(stored.workingDays) && stored.workingDays.length > 0
            ? stored.workingDays
            : DEFAULT_OMNI_APPOINTMENT_SETTINGS.workingDays,
    }
}

async function ensureAppointmentsEnabled(adminDb: any, chatbotId: string) {
    const [chatbotSnap, userSnap] = await Promise.all([
        adminDb.collection("chatbots").doc(chatbotId).get(),
        adminDb.collection("users").doc(chatbotId).get(),
    ])

    if (!chatbotSnap.exists) {
        throw new Error("Chatbot not found")
    }

    const userData = userSnap.exists ? userSnap.data() || {} : {}
    if (userData?.isActive === false) {
        throw new Error("Account is inactive")
    }

    const chatbotData = chatbotSnap.data() || {}
    const enabled = chatbotData.enableAppointments === true || userData.enableAppointments === true
    if (!enabled) {
        throw new Error("Appointments are disabled for this tenant")
    }

    return {
        chatbotData,
        userData,
    }
}

async function validateAppointmentInput(adminDb: any, params: {
    chatbotId: string
    appointmentId?: string
    customerEmail: string
    customerPhone: string
    date: string
    time: string
}) {
    await ensureAppointmentsEnabled(adminDb, params.chatbotId)
    const settings = await getOmniAppointmentSettings(adminDb, params.chatbotId)

    if (!/^\d{4}-\d{2}-\d{2}$/.test(params.date) || !/^\d{2}:\d{2}$/.test(params.time)) {
        throw new Error("Invalid date or time format")
    }

    const appointmentDateTime = buildAppointmentDateTime(params.date, params.time)
    if (Number.isNaN(appointmentDateTime.getTime())) {
        throw new Error("Invalid appointment date or time")
    }

    const now = Date.now()
    if (appointmentDateTime.getTime() < now - 5 * 60 * 1000) {
        throw new Error("Appointment must be in the future")
    }

    if (appointmentDateTime.getTime() > now + APPOINTMENT_MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000) {
        throw new Error("Appointment date is too far in the future")
    }

    if (!settings.workingDays.includes(getDayCode(appointmentDateTime))) {
        throw new Error("Selected day is outside working days")
    }

    const appointmentMinutes = parseTimeToMinutes(params.time)
    const startMinutes = parseTimeToMinutes(settings.workingHoursStart)
    const endMinutes = parseTimeToMinutes(settings.workingHoursEnd)
    if (
        appointmentMinutes === null ||
        startMinutes === null ||
        endMinutes === null ||
        appointmentMinutes < startMinutes ||
        appointmentMinutes > endMinutes
    ) {
        throw new Error("Selected time is outside working hours")
    }

    const existingSameDay = await adminDb.collection("appointments")
        .where("chatbotId", "==", params.chatbotId)
        .where("date", "==", params.date)
        .limit(200)
        .get()

    const hasDuplicate = existingSameDay.docs.some((doc: any) => {
        if (params.appointmentId && doc.id === params.appointmentId) {
            return false
        }

        const data = doc.data() || {}
        const sameTime = String(data.time || "") === params.time
        const sameEmail = params.customerEmail && normalizeEmail(data.customerEmail) === params.customerEmail
        const samePhone = params.customerPhone && normalizePhoneNumber(data.customerPhone) === params.customerPhone
        return sameTime && (sameEmail || samePhone) && data.status !== "cancelled"
    })

    if (hasDuplicate) {
        throw new Error("An appointment already exists for this date and time")
    }

    return settings
}

export async function createOmniAppointment(adminDb: any, input: {
    chatbotId: string
    customerName?: string | null
    customerEmail?: string | null
    customerPhone?: string | null
    date: string
    time: string
    type?: string | null
    notes?: string | null
    status?: OmniAppointmentRecord["status"]
    source?: OmniAppointmentRecord["source"]
    sourceChannel?: OmniAppointmentRecord["sourceChannel"]
    sourceSessionId?: string | null
    sessionId?: string | null
    contactKey?: string | null
    canonicalContactId?: string | null
    assignedTo?: string | null
}) {
    const customerEmail = normalizeEmail(input.customerEmail)
    const rawPhone = normalizeText(input.customerPhone)
    const customerPhone = rawPhone ? normalizePhoneNumber(rawPhone) || rawPhone : ""

    if (!customerEmail && !customerPhone) {
        throw new Error("At least one contact field is required")
    }

    if (customerEmail && !EMAIL_PATTERN.test(customerEmail)) {
        throw new Error("Invalid email address")
    }

    if (rawPhone && !PHONE_PATTERN.test(rawPhone)) {
        throw new Error("Invalid phone number")
    }

    await validateAppointmentInput(adminDb, {
        chatbotId: input.chatbotId,
        customerEmail,
        customerPhone,
        date: input.date,
        time: input.time,
    })

    const appointmentDoc = {
        chatbotId: input.chatbotId,
        customerName: normalizeText(input.customerName, "Guest").slice(0, 120) || "Guest",
        customerEmail,
        customerPhone,
        date: input.date,
        time: input.time,
        type: normalizeText(input.type, "Consultation").slice(0, 120) || "Consultation",
        notes: normalizeText(input.notes).slice(0, 1000) || "",
        status: normalizeAppointmentStatus(input.status),
        source: normalizeAppointmentSource(input.source),
        sourceChannel: input.sourceChannel || null,
        sourceSessionId: input.sourceSessionId || input.sessionId || null,
        sessionId: input.sessionId || input.sourceSessionId || "",
        contactKey: input.contactKey || customerPhone || customerEmail || null,
        canonicalContactId: input.canonicalContactId || null,
        assignedTo: normalizeText(input.assignedTo) || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        confirmedAt: input.status === "confirmed" ? new Date() : null,
    }

    const docRef = await adminDb.collection("appointments").add(appointmentDoc)
    return serializeOmniAppointment(docRef.id, appointmentDoc)
}

export async function updateOmniAppointment(adminDb: any, input: {
    id: string
    chatbotId: string
    customerName?: string | null
    customerEmail?: string | null
    customerPhone?: string | null
    date?: string | null
    time?: string | null
    type?: string | null
    notes?: string | null
    status?: OmniAppointmentRecord["status"]
    sourceChannel?: OmniAppointmentRecord["sourceChannel"]
    sourceSessionId?: string | null
    sessionId?: string | null
    contactKey?: string | null
    canonicalContactId?: string | null
    assignedTo?: string | null
}) {
    const docRef = adminDb.collection("appointments").doc(input.id)
    const snapshot = await docRef.get()
    if (!snapshot.exists) {
        throw new Error("Appointment not found")
    }

    const existing = snapshot.data() || {}
    if (String(existing.chatbotId || "") !== input.chatbotId) {
        throw new Error("Appointment does not belong to this tenant")
    }

    const nextEmail = input.customerEmail === undefined ? normalizeEmail(existing.customerEmail) : normalizeEmail(input.customerEmail)
    const rawPhone = input.customerPhone === undefined ? normalizeText(existing.customerPhone) : normalizeText(input.customerPhone)
    const nextPhone = rawPhone ? normalizePhoneNumber(rawPhone) || rawPhone : ""
    const nextDate = normalizeText(input.date ?? existing.date)
    const nextTime = normalizeText(input.time ?? existing.time)

    if (!nextEmail && !nextPhone) {
        throw new Error("At least one contact field is required")
    }

    if (nextEmail && !EMAIL_PATTERN.test(nextEmail)) {
        throw new Error("Invalid email address")
    }

    if (rawPhone && !PHONE_PATTERN.test(rawPhone)) {
        throw new Error("Invalid phone number")
    }

    await validateAppointmentInput(adminDb, {
        chatbotId: input.chatbotId,
        appointmentId: input.id,
        customerEmail: nextEmail,
        customerPhone: nextPhone,
        date: nextDate,
        time: nextTime,
    })

    const nextStatus = normalizeAppointmentStatus(input.status || existing.status)
    const confirmedAt = nextStatus === "confirmed"
        ? normalizeOptionalDate(existing.confirmedAt) || new Date()
        : existing.confirmedAt || null
    const nextContactKey = input.contactKey ?? existing.contactKey ?? (nextPhone || nextEmail || null)

    const nextDoc = {
        customerName: normalizeText(input.customerName ?? existing.customerName, "Guest").slice(0, 120) || "Guest",
        customerEmail: nextEmail,
        customerPhone: nextPhone,
        date: nextDate,
        time: nextTime,
        type: normalizeText(input.type ?? existing.type, "Consultation").slice(0, 120) || "Consultation",
        notes: normalizeText(input.notes ?? existing.notes).slice(0, 1000) || "",
        status: nextStatus,
        sourceChannel: input.sourceChannel ?? existing.sourceChannel ?? null,
        sourceSessionId: input.sourceSessionId ?? existing.sourceSessionId ?? existing.sessionId ?? null,
        sessionId: input.sessionId ?? existing.sessionId ?? existing.sourceSessionId ?? "",
        contactKey: nextContactKey,
        canonicalContactId: input.canonicalContactId ?? existing.canonicalContactId ?? null,
        assignedTo: normalizeText(input.assignedTo ?? existing.assignedTo) || null,
        updatedAt: new Date(),
        confirmedAt,
    }

    await docRef.set(nextDoc, { merge: true })
    const nextSnapshot = await docRef.get()
    return serializeOmniAppointment(input.id, nextSnapshot.data() || {})
}
