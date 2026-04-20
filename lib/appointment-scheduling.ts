export interface AppointmentSchedulingSettings {
    workingDays: string[]
    workingHoursStart: string
    workingHoursEnd: string
    appointmentDuration: number
}

export interface AppointmentSchedulingRecord {
    id?: string
    date: string
    time: string
    status?: string | null
}

export interface AppointmentAvailabilityDay {
    date: string
    slots: string[]
}

export const APPOINTMENT_SLOT_INTERVAL_MINUTES = 30

export const DEFAULT_APPOINTMENT_SCHEDULING_SETTINGS: AppointmentSchedulingSettings = {
    workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    workingHoursStart: "09:00",
    workingHoursEnd: "18:00",
    appointmentDuration: 30,
}

export function normalizeAppointmentSchedulingSettings(
    settings?: Partial<AppointmentSchedulingSettings> | null
): AppointmentSchedulingSettings {
    const workingDays = Array.isArray(settings?.workingDays) && settings!.workingDays.length > 0
        ? settings!.workingDays
        : DEFAULT_APPOINTMENT_SCHEDULING_SETTINGS.workingDays

    const appointmentDuration = Number(settings?.appointmentDuration)

    return {
        workingDays,
        workingHoursStart: typeof settings?.workingHoursStart === "string" && settings.workingHoursStart
            ? settings.workingHoursStart
            : DEFAULT_APPOINTMENT_SCHEDULING_SETTINGS.workingHoursStart,
        workingHoursEnd: typeof settings?.workingHoursEnd === "string" && settings.workingHoursEnd
            ? settings.workingHoursEnd
            : DEFAULT_APPOINTMENT_SCHEDULING_SETTINGS.workingHoursEnd,
        appointmentDuration: Number.isFinite(appointmentDuration) && appointmentDuration > 0
            ? appointmentDuration
            : DEFAULT_APPOINTMENT_SCHEDULING_SETTINGS.appointmentDuration,
    }
}

export function parseTimeToMinutes(value: string): number | null {
    if (!/^\d{2}:\d{2}$/.test(value)) {
        return null
    }

    const [hourValue, minuteValue] = value.split(":")
    const hour = Number(hourValue)
    const minute = Number(minuteValue)

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return null
    }

    return hour * 60 + minute
}

export function getDayCode(date: Date): string {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    return days[date.getDay()]
}

export function parseDateString(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    if (!match) {
        return null
    }

    const [, yearValue, monthValue, dayValue] = match
    const year = Number(yearValue)
    const month = Number(monthValue)
    const day = Number(dayValue)
    const date = new Date(year, month - 1, day, 0, 0, 0, 0)

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null
    }

    return date
}

export function formatDateString(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

export function buildAppointmentDateTime(dateValue: string, timeValue: string): Date | null {
    const date = parseDateString(dateValue)
    const minutes = parseTimeToMinutes(timeValue)

    if (!date || minutes === null) {
        return null
    }

    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    const appointmentDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hours,
        remainingMinutes,
        0,
        0
    )

    if (
        appointmentDate.getFullYear() !== date.getFullYear() ||
        appointmentDate.getMonth() !== date.getMonth() ||
        appointmentDate.getDate() !== date.getDate() ||
        appointmentDate.getHours() !== hours ||
        appointmentDate.getMinutes() !== remainingMinutes
    ) {
        return null
    }

    return appointmentDate
}

function formatMinutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}`
}

function normalizeRecords(records: AppointmentSchedulingRecord[]) {
    return records.filter((record) => record.status !== "cancelled")
}

export function listAvailableTimeSlots(params: {
    date: string
    settings?: Partial<AppointmentSchedulingSettings> | null
    appointments?: AppointmentSchedulingRecord[]
    now?: Date
    excludeAppointmentId?: string
}): string[] {
    const date = parseDateString(params.date)
    if (!date) {
        return []
    }

    const settings = normalizeAppointmentSchedulingSettings(params.settings)
    if (!settings.workingDays.includes(getDayCode(date))) {
        return []
    }

    const startMinutes = parseTimeToMinutes(settings.workingHoursStart)
    const endMinutes = parseTimeToMinutes(settings.workingHoursEnd)
    if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
        return []
    }

    const durationMinutes = settings.appointmentDuration
    const records = normalizeRecords(params.appointments || [])
    const dailyAppointments = records
        .filter((record) => record.date === params.date && record.id !== params.excludeAppointmentId)
        .map((record) => {
            const start = buildAppointmentDateTime(record.date, record.time)
            if (!start) {
                return null
            }

            const end = new Date(start)
            end.setMinutes(end.getMinutes() + durationMinutes)

            return {
                id: record.id,
                start,
                end,
            }
        })
        .filter((record): record is { id?: string; start: Date; end: Date } => Boolean(record))

    const now = params.now || new Date()
    const slots: string[] = []

    for (
        let candidateMinutes = startMinutes;
        candidateMinutes + durationMinutes <= endMinutes;
        candidateMinutes += APPOINTMENT_SLOT_INTERVAL_MINUTES
    ) {
        const candidateTime = formatMinutesToTime(candidateMinutes)
        const candidateStart = buildAppointmentDateTime(params.date, candidateTime)
        if (!candidateStart || candidateStart.getTime() <= now.getTime()) {
            continue
        }

        const candidateEnd = new Date(candidateStart)
        candidateEnd.setMinutes(candidateEnd.getMinutes() + durationMinutes)

        const hasOverlap = dailyAppointments.some((record) =>
            candidateStart.getTime() < record.end.getTime() &&
            candidateEnd.getTime() > record.start.getTime()
        )

        if (!hasOverlap) {
            slots.push(candidateTime)
        }
    }

    return slots
}

export function listAllTimeSlots(params: {
    date: string
    settings?: Partial<AppointmentSchedulingSettings> | null
    now?: Date
}): string[] {
    const date = parseDateString(params.date)
    if (!date) {
        return []
    }

    const settings = normalizeAppointmentSchedulingSettings(params.settings)
    if (!settings.workingDays.includes(getDayCode(date))) {
        return []
    }

    const startMinutes = parseTimeToMinutes(settings.workingHoursStart)
    const endMinutes = parseTimeToMinutes(settings.workingHoursEnd)
    if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
        return []
    }

    const durationMinutes = settings.appointmentDuration
    const now = params.now || new Date()
    const slots: string[] = []

    for (
        let candidateMinutes = startMinutes;
        candidateMinutes + durationMinutes <= endMinutes;
        candidateMinutes += APPOINTMENT_SLOT_INTERVAL_MINUTES
    ) {
        const candidateTime = formatMinutesToTime(candidateMinutes)
        const candidateStart = buildAppointmentDateTime(params.date, candidateTime)
        if (!candidateStart || candidateStart.getTime() <= now.getTime()) {
            continue
        }
        slots.push(candidateTime)
    }

    return slots
}

export function isAppointmentSlotAvailable(params: {
    date: string
    time: string
    settings?: Partial<AppointmentSchedulingSettings> | null
    appointments?: AppointmentSchedulingRecord[]
    now?: Date
    excludeAppointmentId?: string
}): boolean {
    return listAvailableTimeSlots({
        date: params.date,
        settings: params.settings,
        appointments: params.appointments,
        now: params.now,
        excludeAppointmentId: params.excludeAppointmentId,
    }).includes(params.time)
}

export function buildAvailabilityWindow(params: {
    startDate: Date
    days: number
    settings?: Partial<AppointmentSchedulingSettings> | null
    appointments?: AppointmentSchedulingRecord[]
    now?: Date
}): AppointmentAvailabilityDay[] {
    const totalDays = Number.isFinite(params.days) ? Math.max(1, Math.floor(params.days)) : 1
    const days: AppointmentAvailabilityDay[] = []

    for (let index = 0; index < totalDays; index += 1) {
        const date = new Date(
            params.startDate.getFullYear(),
            params.startDate.getMonth(),
            params.startDate.getDate() + index,
            0,
            0,
            0,
            0
        )
        const dateKey = formatDateString(date)
        const slots = listAvailableTimeSlots({
            date: dateKey,
            settings: params.settings,
            appointments: params.appointments,
            now: params.now,
        })

        days.push({
            date: dateKey,
            slots,
        })
    }

    return days
}
