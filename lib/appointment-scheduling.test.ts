import { expect, test } from "vitest"

import {
    buildAvailabilityWindow,
    isAppointmentSlotAvailable,
    listAvailableTimeSlots,
} from "@/lib/appointment-scheduling"

test("lists half-hour slots inside working hours", () => {
    const slots = listAvailableTimeSlots({
        date: "2026-04-21",
        settings: {
            workingDays: ["Tue"],
            workingHoursStart: "09:00",
            workingHoursEnd: "10:30",
            appointmentDuration: 30,
        },
        appointments: [],
        now: new Date("2026-04-20T08:00:00"),
    })

    expect(slots).toEqual(["09:00", "09:30", "10:00"])
})

test("blocks overlapping slots, not just exact duplicates", () => {
    const settings = {
        workingDays: ["Tue"],
        workingHoursStart: "09:00",
        workingHoursEnd: "12:00",
        appointmentDuration: 60,
    }

    const appointments = [
        {
            id: "appt-1",
            date: "2026-04-21",
            time: "09:30",
            status: "confirmed",
        },
    ]

    expect(isAppointmentSlotAvailable({
        date: "2026-04-21",
        time: "09:00",
        settings,
        appointments,
        now: new Date("2026-04-20T08:00:00"),
    })).toBe(false)

    expect(isAppointmentSlotAvailable({
        date: "2026-04-21",
        time: "10:30",
        settings,
        appointments,
        now: new Date("2026-04-20T08:00:00"),
    })).toBe(true)
})

test("builds availability only for configured working days", () => {
    const availability = buildAvailabilityWindow({
        startDate: new Date("2026-04-20T00:00:00"),
        days: 3,
        settings: {
            workingDays: ["Mon", "Wed"],
            workingHoursStart: "09:00",
            workingHoursEnd: "10:00",
            appointmentDuration: 30,
        },
        appointments: [],
        now: new Date("2026-04-19T08:00:00"),
    })

    expect(availability).toEqual([
        { date: "2026-04-20", slots: ["09:00", "09:30"] },
        { date: "2026-04-21", slots: [] },
        { date: "2026-04-22", slots: ["09:00", "09:30"] },
    ])
})
