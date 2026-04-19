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

function toICalDate(date: string, time: string): string {
    // Returns "YYYYMMDDTHHmmss" (local, no Z — avoids TZ issues for attendee)
    const [y, m, d] = date.split("-")
    const [hh, mm] = time.split(":")
    return `${y}${m}${d}T${hh}${mm}00`
}

function addMinutes(iCalDate: string, minutes: number): string {
    const y = parseInt(iCalDate.slice(0, 4))
    const mo = parseInt(iCalDate.slice(4, 6)) - 1
    const d = parseInt(iCalDate.slice(6, 8))
    const h = parseInt(iCalDate.slice(9, 11))
    const m = parseInt(iCalDate.slice(11, 13))
    const dt = new Date(y, mo, d, h, m)
    dt.setMinutes(dt.getMinutes() + minutes)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`
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

    const dtStart = toICalDate(date, time)
    const dtEnd = addMinutes(dtStart, durationMinutes)
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`

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

export function getGoogleCalendarLink(data: ICalEventData): string {
    const { companyName, date, time, durationMinutes = 60, notes = "", location = "" } = data

    const dtStart = toICalDate(date, time)
    const dtEnd = addMinutes(dtStart, durationMinutes)

    const params = new URLSearchParams({
        action: "TEMPLATE",
        text: `Randevu — ${companyName}`,
        dates: `${dtStart}/${dtEnd}`,
        details: notes || `${companyName} ile randevu`,
        location: location,
    })

    return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function getOutlookCalendarLink(data: ICalEventData): string {
    const { companyName, date, time, durationMinutes = 60, notes = "" } = data

    // Outlook expects ISO8601 local time: "2024-03-15T10:00:00"
    const startDt = `${date}T${time}:00`
    const endDate = new Date(`${date}T${time}:00`)
    endDate.setMinutes(endDate.getMinutes() + durationMinutes)
    const endDt = endDate.toISOString().slice(0, 19)

    const params = new URLSearchParams({
        subject: `Randevu — ${companyName}`,
        startdt: startDt,
        enddt: endDt,
        body: notes || `${companyName} ile randevu`,
    })

    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}
