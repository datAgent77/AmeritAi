import { expect, test } from "vitest"
import {
    generateICalContent,
    getGoogleCalendarLink,
    getOutlookCalendarLink,
    type ICalEventData,
} from "@/lib/ical-generator"

const baseEvent: ICalEventData = {
    appointmentId: "appt-1",
    customerName: "Jane Doe",
    customerEmail: "jane@example.com",
    companyName: "AmeritAI",
    date: "2026-04-20",
    time: "09:30",
    durationMinutes: 60,
}

test("builds calendar links with stable local start and end times", () => {
    const googleLink = getGoogleCalendarLink(baseEvent)
    const outlookLink = getOutlookCalendarLink(baseEvent)

    expect(googleLink).not.toBeNull()
    expect(outlookLink).not.toBeNull()

    const googleUrl = new URL(googleLink!)
    const outlookUrl = new URL(outlookLink!)

    expect(googleUrl.searchParams.get("dates")).toBe("20260420T093000/20260420T103000")
    expect(outlookUrl.searchParams.get("startdt")).toBe("2026-04-20T09:30:00")
    expect(outlookUrl.searchParams.get("enddt")).toBe("2026-04-20T10:30:00")
})

test("returns null links for invalid legacy appointment date values", () => {
    const invalidEvent = {
        ...baseEvent,
        date: "2026-02-31",
    }

    expect(getGoogleCalendarLink(invalidEvent)).toBeNull()
    expect(getOutlookCalendarLink(invalidEvent)).toBeNull()
})

test("throws for invalid iCal payloads instead of generating corrupt content", () => {
    expect(() => generateICalContent({
        ...baseEvent,
        time: "25:00",
    })).toThrow("Invalid appointment date or time")
})
