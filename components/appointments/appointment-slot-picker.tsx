"use client"

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { enUS, tr } from "date-fns/locale"
import { CalendarDays, Clock } from "lucide-react"

import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { formatDateString, parseDateString } from "@/lib/appointment-scheduling"

interface AppointmentSlotPickerProps {
    chatbotId: string
    date: string
    time: string
    onDateChange: (value: string) => void
    onTimeChange: (value: string) => void
    onSettingsLoaded?: (appointmentTypes: string[]) => void
    dateLabel?: string
    timeLabel?: string
    datePlaceholder?: string
    timePlaceholder?: string
    buttonClassName?: string
    contentClassName?: string
    disabled?: boolean
}

interface AvailabilityResponse {
    availableDates: string[]
    slotsByDate: Record<string, string[]>
    allSlotsByDate: Record<string, string[]>
}

function getPickerCopy(language: string) {
    return language === "tr"
        ? {
            datePlaceholder: "Tarih seçin",
            timePlaceholder: "Saat seçin",
            selectDateFirst: "Önce tarih seçin.",
            noSlots: "Bu gün için boş saat yok.",
            noAvailability: "Yakın tarihlerde uygun slot bulunamadı.",
        }
        : {
            datePlaceholder: "Select date",
            timePlaceholder: "Select time",
            selectDateFirst: "Select a date first.",
            noSlots: "No open times for this day.",
            noAvailability: "No available slots found in the next period.",
        }
}

export function AppointmentSlotPicker({
    chatbotId,
    date,
    time,
    onDateChange,
    onTimeChange,
    onSettingsLoaded,
    dateLabel,
    timeLabel,
    datePlaceholder,
    timePlaceholder,
    buttonClassName,
    contentClassName,
    disabled = false,
}: AppointmentSlotPickerProps) {
    const { language } = useLanguage()
    const locale = language === "tr" ? tr : enUS
    const copy = getPickerCopy(language)
    const [dateOpen, setDateOpen] = useState(false)
    const [timeOpen, setTimeOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState("")
    const [availability, setAvailability] = useState<AvailabilityResponse>({
        availableDates: [],
        slotsByDate: {},
        allSlotsByDate: {},
    })

    useEffect(() => {
        let cancelled = false

        async function loadAvailability() {
            setIsLoading(true)
            setError("")

            try {
                const response = await fetch(
                    `/api/appointments/availability?chatbotId=${encodeURIComponent(chatbotId)}&days=120`,
                    { cache: "no-store" }
                )
                const payload = await response.json()

                if (!response.ok) {
                    throw new Error(payload.error || "Failed to load appointment availability")
                }

                if (cancelled) {
                    return
                }

                setAvailability({
                    availableDates: Array.isArray(payload.availableDates) ? payload.availableDates : [],
                    slotsByDate: payload.slotsByDate && typeof payload.slotsByDate === "object" ? payload.slotsByDate : {},
                    allSlotsByDate: payload.allSlotsByDate && typeof payload.allSlotsByDate === "object" ? payload.allSlotsByDate : {},
                })

                if (onSettingsLoaded && Array.isArray(payload.settings?.appointmentTypes)) {
                    onSettingsLoaded(payload.settings.appointmentTypes)
                }
            } catch (fetchError: any) {
                if (!cancelled) {
                    setAvailability({ availableDates: [], slotsByDate: {}, allSlotsByDate: {} })
                    setError(fetchError?.message || "Failed to load availability")
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false)
                }
            }
        }

        if (chatbotId) {
            loadAvailability()
        }

        return () => {
            cancelled = true
        }
    }, [chatbotId])

    const availableDatesSet = useMemo(() => new Set(availability.availableDates), [availability.availableDates])
    const selectedDate = useMemo(() => parseDateString(date), [date])
    const selectedSlots = useMemo(() => availability.slotsByDate[date] || [], [availability.slotsByDate, date])
    const allSlots = useMemo(() => availability.allSlotsByDate[date] || selectedSlots, [availability.allSlotsByDate, date, selectedSlots])
    const availableSlotsSet = useMemo(() => new Set(selectedSlots), [selectedSlots])
    const lastAvailableDate = useMemo(() => {
        const lastDateKey = availability.availableDates[availability.availableDates.length - 1]
        return lastDateKey ? parseDateString(lastDateKey) : undefined
    }, [availability.availableDates])

    useEffect(() => {
        if (!date) {
            if (time) {
                onTimeChange("")
            }
            return
        }

        if (time && !selectedSlots.includes(time)) {
            onTimeChange("")
        }
    }, [date, onTimeChange, selectedSlots, time])

    const formattedDateLabel = selectedDate
        ? format(selectedDate, "d MMMM yyyy", { locale })
        : (datePlaceholder || copy.datePlaceholder)

    const formattedTimeLabel = time || timePlaceholder || copy.timePlaceholder

    const handleDateSelect = (selectedValue: Date | undefined) => {
        if (!selectedValue) {
            return
        }

        const nextDate = formatDateString(selectedValue)
        onDateChange(nextDate)
        if (!(availability.slotsByDate[nextDate] || []).includes(time)) {
            onTimeChange("")
        }
        setDateOpen(false)
        setTimeOpen(true)
    }

    return (
        <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
                {dateLabel ? <div className="text-sm font-medium text-foreground">{dateLabel}</div> : null}
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={disabled}
                            className={cn(
                                "h-11 w-full justify-start rounded-lg border-border/70 bg-background px-3 text-left font-normal shadow-sm",
                                !selectedDate && "text-muted-foreground",
                                buttonClassName
                            )}
                        >
                            <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
                            <span className="truncate">{formattedDateLabel}</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent
                        align="start"
                        sideOffset={8}
                        className={cn("w-[320px] rounded-xl border border-border/70 p-0 shadow-xl", contentClassName)}
                    >
                        {isLoading ? (
                            <div className="space-y-3 p-4">
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-[280px] w-full" />
                            </div>
                        ) : availability.availableDates.length === 0 ? (
                            <div className="p-4 text-sm text-muted-foreground">
                                {error || copy.noAvailability}
                            </div>
                        ) : (
                            <Calendar
                                mode="single"
                                locale={locale}
                                selected={selectedDate ?? undefined}
                                onSelect={handleDateSelect}
                                disabled={(day) => !availableDatesSet.has(formatDateString(day))}
                                fromDate={parseDateString(availability.availableDates[0]) ?? new Date()}
                                toDate={lastAvailableDate ?? undefined}
                                initialFocus
                                className="w-full"
                            />
                        )}
                    </PopoverContent>
                </Popover>
            </div>

            <div className="space-y-2">
                {timeLabel ? <div className="text-sm font-medium text-foreground">{timeLabel}</div> : null}
                <Popover open={timeOpen} onOpenChange={setTimeOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={disabled}
                            className={cn(
                                "h-11 w-full justify-start rounded-lg border-border/70 bg-background px-3 text-left font-normal shadow-sm",
                                !time && "text-muted-foreground",
                                buttonClassName
                            )}
                        >
                            <Clock className="mr-2 h-4 w-4 shrink-0" />
                            <span className="truncate">{formattedTimeLabel}</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent
                        align="start"
                        sideOffset={8}
                        className={cn("w-[320px] rounded-xl border border-border/70 p-0 shadow-xl", contentClassName)}
                    >
                        <div className="border-b border-border/60 px-4 py-3">
                            <div className="text-sm font-semibold">
                                {timeLabel || (language === "tr" ? "Saat" : "Time")}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {selectedDate
                                    ? format(selectedDate, "d MMMM yyyy", { locale })
                                    : copy.selectDateFirst}
                            </div>
                        </div>
                        {isLoading ? (
                            <div className="space-y-2 p-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : !date ? (
                            <div className="p-4 text-sm text-muted-foreground">{copy.selectDateFirst}</div>
                        ) : allSlots.length === 0 ? (
                            <div className="p-4 text-sm text-muted-foreground">{copy.noSlots}</div>
                        ) : (
                            <ScrollArea className="max-h-72">
                                <div className="grid grid-cols-3 gap-2 p-4">
                                    {allSlots.map((slot) => {
                                        const isAvailable = availableSlotsSet.has(slot)
                                        const isSelected = slot === time
                                        return (
                                            <Button
                                                key={slot}
                                                type="button"
                                                variant={isSelected ? "default" : "outline"}
                                                disabled={!isAvailable}
                                                className={cn(
                                                    "h-10 rounded-lg",
                                                    !isAvailable && "line-through opacity-40 cursor-not-allowed"
                                                )}
                                                onClick={() => {
                                                    if (!isAvailable) return
                                                    onTimeChange(slot)
                                                    setTimeOpen(false)
                                                }}
                                            >
                                                {slot}
                                            </Button>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                        )}
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    )
}
