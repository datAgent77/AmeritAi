"use client"

import * as React from "react"
import { useMemo } from "react"
import { CalendarIcon, ChevronRight } from "lucide-react"
import { addDays, format, subDays, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, startOfYear, endOfYear, subYears } from "date-fns"
import { tr, enUS } from "date-fns/locale"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useLanguage } from "@/context/LanguageContext"

interface DateRangePickerProps {
    date: DateRange | undefined
    setDate: (date: DateRange | undefined) => void
    enabled?: boolean
}

export function DateRangePicker({
    date,
    setDate,
    enabled = true,
}: DateRangePickerProps) {
    const { language, t } = useLanguage()
    const [open, setOpen] = React.useState(false)
    const [tempDate, setTempDate] = React.useState<DateRange | undefined>(date)
    const [compare, setCompare] = React.useState(false)

    const [selectedPresetLabel, setSelectedPresetLabel] = React.useState<string>("")

    const locale = language === 'tr' ? tr : enUS

    React.useEffect(() => {
        if (open) {
            setTempDate(date)
        }
    }, [open, date])

    const presets = useMemo(() => [
        { label: t('custom'), getValue: () => undefined },
        { label: t('today'), getValue: () => ({ from: new Date(), to: new Date() }) },
        { label: t('yesterday'), getValue: () => { const yesterday = subDays(new Date(), 1); return { from: yesterday, to: yesterday } } },
        { label: t('thisWeek'), getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: new Date() }), hasSeparator: true },

        { label: t('last7Days'), getValue: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
        { label: t('lastWeek'), getValue: () => { const start = startOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 }); const end = endOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 }); return { from: start, to: end } }, hasSeparator: true },

        { label: t('last28Days'), getValue: () => ({ from: subDays(new Date(), 27), to: new Date() }) },
        { label: t('last30Days'), getValue: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
        { label: t('thisMonth'), getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
        { label: t('lastMonth'), getValue: () => { const last = subMonths(new Date(), 1); return { from: startOfMonth(last), to: endOfMonth(last) } }, hasSeparator: true },

        { label: t('last90Days'), getValue: () => ({ from: subDays(new Date(), 89), to: new Date() }) },
        { label: t('thisYear'), getValue: () => ({ from: startOfYear(new Date()), to: new Date() }) },
        { label: t('lastYear'), getValue: () => { const last = subYears(new Date(), 1); return { from: startOfYear(last), to: endOfYear(last) } } }
    ], [t])

    // Detect current preset
    React.useEffect(() => {
        if (date?.from && date?.to) {
            const matchingPreset = presets.find(p => {
                const val = p.getValue()
                if (!val) return false
                return format(val.from!, 'yyyy-MM-dd') === format(date.from!, 'yyyy-MM-dd') &&
                    format(val.to!, 'yyyy-MM-dd') === format(date.to!, 'yyyy-MM-dd')
            })

            if (matchingPreset) {
                setSelectedPresetLabel(matchingPreset.label)
            } else {
                setSelectedPresetLabel(t('custom'))
            }
        }
    }, [date, t, presets])


    const handleApply = () => {
        setDate(tempDate)
        setOpen(false)
    }

    const handleCancel = () => {
        setOpen(false)
    }

    const handlePresetClick = (preset: { label: string, getValue: () => DateRange | undefined }) => {
        const val = preset.getValue()
        if (val) {
            setTempDate(val)
        }
    }

    const formatDateInput = (d?: Date) => d ? format(d, "d MMM yyyy", { locale }) : ""

    const isPresetSelected = (presetValue?: DateRange) => {
        if (!presetValue && !tempDate) return true; // Custom? logic might vary
        if (!tempDate || !presetValue) return false;
        return format(tempDate.from!, 'yyyy-MM-dd') === format(presetValue.from!, 'yyyy-MM-dd') &&
            format(tempDate.to!, 'yyyy-MM-dd') === format(presetValue.to!, 'yyyy-MM-dd')
    }

    return (
        <div className={cn("grid gap-2", !enabled && "opacity-50 pointer-events-none")}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-auto min-w-[260px] justify-between text-left font-normal bg-background hover:bg-accent/50 border-input h-auto py-2",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <div className="flex items-center">
                            <CalendarIcon className="mr-2 h-5 w-5 text-muted-foreground" />
                            <div className="flex flex-col items-start leading-none gap-1">
                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                                    {selectedPresetLabel || t('dateRange')}
                                </span>
                                <span className="text-[15px] font-medium text-foreground">
                                    {date?.from ? (
                                        date.to ? (
                                            <>
                                                {format(date.from, "d MMM yyyy", { locale })} -{" "}
                                                {format(date.to, "d MMM yyyy", { locale })}
                                            </>
                                        ) : (
                                            format(date.from, "d MMM yyyy", { locale })
                                        )
                                    ) : (
                                        <span>{t('pickDate')}</span>
                                    )}
                                </span>
                            </div>
                        </div>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
                    <div className="flex flex-col md:flex-row h-[600px] md:h-auto max-h-[85vh]">
                        {/* Presets Sidebar */}
                        <div className="w-[240px] flex flex-col border-r border-border overflow-y-auto shrink-0 bg-background py-2">
                            {presets.map((preset, index) => {
                                const isSelected = isPresetSelected(preset.getValue())
                                return (
                                    <div key={preset.label}>
                                        <Button
                                            variant="ghost"
                                            className={cn(
                                                "w-full justify-start font-normal px-4 py-2 h-9 text-sm rounded-none relative",
                                                isSelected
                                                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"
                                                    : "hover:bg-muted/50 text-foreground"
                                            )}
                                            onClick={() => handlePresetClick(preset)}
                                        >
                                            {isSelected && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                                            )}
                                            <span>{preset.label}</span>
                                        </Button>
                                        {/* @ts-ignore */}
                                        {preset.hasSeparator && <Separator className="my-1" />}
                                    </div>
                                )
                            })}

                            {/* Compare Toggle */}
                            <div className="p-4 border-t border-border mt-auto">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="compare-mode" className="text-sm font-medium">{t('compare')}</Label>
                                    <Switch
                                        id="compare-mode"
                                        checked={compare}
                                        onCheckedChange={setCompare}
                                        disabled
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Calendar & Actions */}
                        <div className="flex flex-col w-[320px] sm:w-[500px] md:w-auto">

                            {/* Date Inputs Header */}
                            <div className="flex items-center gap-4 p-4 border-b border-border">
                                <div className="grid gap-1.5 flex-1">
                                    <Label className="text-xs text-muted-foreground">{t('startDate')}</Label>
                                    <div className="relative">
                                        <Input
                                            readOnly
                                            value={formatDateInput(tempDate?.from)}
                                            className="h-10 text-sm focus-visible:ring-blue-500 border-input"
                                        />
                                    </div>
                                </div>
                                <span className="text-muted-foreground mt-6">–</span>
                                <div className="grid gap-1.5 flex-1">
                                    <Label className="text-xs text-muted-foreground">{t('endDate')}</Label>
                                    <div className="relative">
                                        <Input
                                            readOnly
                                            value={formatDateInput(tempDate?.to)}
                                            className="h-10 text-sm focus-visible:ring-blue-500 border-input"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable Calendars */}
                            <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-white dark:bg-background">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={tempDate?.from}
                                    selected={tempDate}
                                    onSelect={setTempDate}
                                    numberOfMonths={2}
                                    locale={locale}
                                    className="w-full"
                                    classNames={{
                                        months: "flex flex-col space-y-4",
                                        month: "space-y-4",
                                        caption: "flex justify-center pt-1 relative items-center mb-4",
                                        caption_label: "text-base font-semibold",
                                        table: "w-full border-collapse space-y-1",
                                        head_row: "flex w-full justify-between mb-2",
                                        head_cell: "text-muted-foreground rounded-md w-10 font-medium text-[0.8rem]",
                                        row: "flex w-full mt-2 justify-between",
                                        cell: cn(
                                            "h-10 w-10 text-center text-sm p-0 relative",
                                            "[&:has([aria-selected].day-range-end)]:rounded-r-md",
                                            "[&:has([aria-selected].day-outside)]:bg-blue-50/50",
                                            "[&:has([aria-selected])]:bg-blue-50", // Range middle bg
                                            "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                                            "focus-within:relative focus-within:z-20"
                                        ),
                                        day: cn(
                                            "h-10 w-10 p-0 font-normal aria-selected:opacity-100 hover:bg-slate-100 rounded-full"
                                        ),
                                        day_selected:
                                            "bg-blue-50 text-slate-900", // Default selected (middle)
                                        day_range_start: "bg-blue-600 text-white hover:bg-blue-700 hover:text-white rounded-full opacity-100", // Circle
                                        day_range_end: "bg-blue-600 text-white hover:bg-blue-700 hover:text-white rounded-full opacity-100", // Circle
                                        day_today: "bg-accent text-accent-foreground font-bold",
                                        day_outside:
                                            "text-muted-foreground opacity-50 aria-selected:bg-blue-50/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                                        day_disabled: "text-muted-foreground opacity-50",
                                        day_range_middle:
                                            "aria-selected:bg-blue-50 aria-selected:text-slate-900 rounded-none", // Rectangle middle
                                        day_hidden: "invisible",
                                    }}
                                />
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center justify-end gap-2 p-3 border-t border-border bg-background">
                                <Button variant="ghost" onClick={handleCancel} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                    {t('cancel')}
                                </Button>
                                <Button onClick={handleApply} className="bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-full">
                                    {t('apply')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
