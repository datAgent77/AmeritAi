"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { tr, enUS } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useLanguage } from "@/context/LanguageContext"

interface DatePickerProps {
    date: Date | undefined
    setDate: (date: Date | undefined) => void
    label?: string
    placeholder?: string
}

export function DatePicker({ date, setDate, label, placeholder }: DatePickerProps) {
    const { language } = useLanguage()
    const locale = language === 'tr' ? tr : enUS
    const [open, setOpen] = React.useState(false)

    const handleSelect = (selectedDate: Date | undefined) => {
        setDate(selectedDate)
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "h-10 min-w-[168px] justify-start rounded-lg border-border/70 bg-background px-3 text-left font-medium shadow-sm sm:min-w-[184px]",
                        !date && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "d MMM yyyy", { locale }) : <span>{placeholder || "Pick a date"}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={10} className="w-[320px] rounded-xl border border-border/70 p-0 shadow-xl">
                <Calendar
                    className="w-full"
                    mode="single"
                    selected={date}
                    onSelect={handleSelect}
                    initialFocus
                    locale={locale}
                />
            </PopoverContent>
        </Popover>
    )
}
