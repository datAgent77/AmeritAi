"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("relative p-4", className)}
            classNames={{
                months: "flex flex-col gap-4",
                month: "space-y-4",
                month_caption: "pointer-events-none relative flex h-8 w-full items-center border-b border-border/60 pb-3 pt-1 pr-20",
                caption: "pointer-events-none relative flex items-center border-b border-border/60 pb-3 pt-1 pr-20",
                caption_label: "pl-1 text-sm font-semibold tracking-tight",
                nav: "pointer-events-auto absolute right-4 top-4 z-20 flex items-center gap-1",
                button_previous: cn(
                    buttonVariants({ variant: "outline" }),
                    "pointer-events-auto h-8 w-8 shrink-0 rounded-md border-border/70 bg-background p-0 text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                ),
                button_next: cn(
                    buttonVariants({ variant: "outline" }),
                    "pointer-events-auto h-8 w-8 shrink-0 rounded-md border-border/70 bg-background p-0 text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                ),
                table: "w-full border-collapse",
                weekdays: "flex w-full",
                weekday:
                    "w-10 rounded-md pb-2 text-center text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground",
                week: "mt-1 flex w-full",
                day: "h-10 w-10 p-0 text-center text-sm [&:has([aria-selected].day-range-end)]:rounded-r-lg [&:has([aria-selected].day-outside)]:bg-accent/40 first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg focus-within:relative focus-within:z-20",
                day_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-10 w-10 rounded-lg p-0 font-medium text-foreground aria-selected:opacity-100 aria-selected:bg-primary aria-selected:text-primary-foreground hover:aria-selected:bg-primary"
                ),
                range_end: "day-range-end",
                selected: "shadow-sm",
                today: "bg-accent/70 text-accent-foreground",
                outside:
                    "day-outside text-muted-foreground opacity-45 aria-selected:bg-accent/40 aria-selected:text-muted-foreground aria-selected:opacity-60",
                disabled: "text-muted-foreground opacity-50",
                range_middle:
                    "aria-selected:bg-accent aria-selected:text-accent-foreground",
                hidden: "invisible",
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation }) => {
                    return orientation === "left" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                }
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
