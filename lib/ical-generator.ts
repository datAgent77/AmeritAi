export interface ICalEventData {
    appointmentId: string
    customerName: string
    customerEmail: string
    companyName: string
    companyEmail?: string
    date: string   // YYYY-MM-DD
    time: string   // HH:MM
    durationMinutes?: number
    notes?: string
    location?: string
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_PATTERN = /^(\d{2}):(\d{2})$/

function padDatePart(value: number): string {
    return String(value).padStart(2, "0")
}

function formatICalDate(date: Date): string {
    return `${date.getFullYear()}${padDatePart(date.getMonth() + 1)}${padDatePart(date.getDate())}T${padDatePart(date.getHours())}${padDatePart(date.getMinutes())}00`
}

function formatLocalDateTime(date: Date): string {
    return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:00`
}

function resolveCalendarEvent(
    date: string,
    time: string,
    durationMinutes: number
): {
    start: Date
    end: Date
    startICal: string
    endICal: string
    startLocalIso: string
    endLocalIso: string
} | null {
    const dateMatch = DATE_PATTERN.exec(date)
    const timeMatch = TIME_PATTERN.exec(time)

    if (!dateMatch || !timeMatch) {
        return null
    }

    const [, yearValue, monthValue, dayValue] = dateMatch
    const [, hourValue, minuteValue] = timeMatch

    const year = Number(yearValue)
    const month = Number(monthValue)
    const day = Number(dayValue)
    const hour = Number(hourValue)
    const minute = Number(minuteValue)

    if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        !Number.isInteger(day) ||
        month < 1 ||
        month > 12 ||
        day < 1 ||
        day > 31 ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
    ) {
        return null
    }

    const start = new Date(year, month - 1, day, hour, minute, 0, 0)
    if (
        start.getFullYear() !== year ||
        start.getMonth() !== month - 1 ||
        start.getDate() !== day ||
        start.getHours() !== hour ||
        start.getMinutes() !== minute
    ) {
        return null
    }

    const safeDuration = Number.isFinite(durationMinutes) && durationMinutes > 0
        ? durationMinutes
        : 60
    const end = new Date(start)
    end.setMinutes(end.getMinutes() + safeDuration)

    return {
        start,
        end,
        startICal: formatICalDate(start),
        endICal: formatICalDate(end),
        startLocalIso: formatLocalDateTime(start),
        endLocalIso: formatLocalDateTime(end),
    }
}

function escapeICalText(text: string): string {
    return text
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\n/g, "\\n")
}

export function generateICalContent(data: ICalEventData): string {
    const {
        appointmentId,
        customerName,
        customerEmail,
        companyName,
        companyEmail,
        date,
        time,
        durationMinutes = 60,
        notes = "",
        location = "",
    } = data

    const event = resolveCalendarEvent(date, time, durationMinutes)
    if (!event) {
        throw new Error("Invalid appointment date or time")
    }

    const dtStart = event.startICal
    const dtEnd = event.endICal
    const now = new Date()
    const dtstamp = `${now.getUTCFullYear()}${padDatePart(now.getUTCMonth() + 1)}${padDatePart(now.getUTCDate())}T${padDatePart(now.getUTCHours())}${padDatePart(now.getUTCMinutes())}${padDatePart(now.getUTCSeconds())}Z`

    const summary = escapeICalText(`Randevu — ${companyName}`)
    const description = escapeICalText(notes || `${companyName} ile randevu`)
    const locationEsc = escapeICalText(location)

    const organizer = companyEmail
        ? `ORGANIZER;CN=${escapeICalText(companyName)}:MAILTO:${companyEmail}`
        : `ORGANIZER;CN=${escapeICalText(companyName)}:MAILTO:noreply@getvion.com`

    return [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Vion AI//Appointment//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:REQUEST",
        "BEGIN:VEVENT",
        `UID:appointment-${appointmentId}@getvion.com`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${summary}`,
        description ? `DESCRIPTION:${description}` : "",
        locationEsc ? `LOCATION:${locationEsc}` : "",
        organizer,
        `ATTENDEE;CN=${escapeICalText(customerName)};ROLE=REQ-PARTICIPANT;RSVP=TRUE:MAILTO:${customerEmail}`,
        "STATUS:CONFIRMED",
        "SEQUENCE:0",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
        .filter(Boolean)
        .join("\r\n")
}

export function getGoogleCalendarLink(data: ICalEventData): string | null {
    const { companyName, date, time, durationMinutes = 60, notes = "", location = "" } = data

    const event = resolveCalendarEvent(date, time, durationMinutes)
    if (!event) {
        return null
    }

    const params = new URLSearchParams({
        action: "TEMPLATE",
        text: `Randevu — ${companyName}`,
        dates: `${event.startICal}/${event.endICal}`,
        details: notes || `${companyName} ile randevu`,
        location: location,
    })

    return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function getOutlookCalendarLink(data: ICalEventData): string | null {
    const { companyName, date, time, durationMinutes = 60, notes = "" } = data

    const event = resolveCalendarEvent(date, time, durationMinutes)
    if (!event) {
        return null
    }

    const params = new URLSearchParams({
        subject: `Randevu — ${companyName}`,
        startdt: event.startLocalIso,
        enddt: event.endLocalIso,
        body: notes || `${companyName} ile randevu`,
    })

    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}
