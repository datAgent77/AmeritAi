"use client"

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { CheckCircle2, CircleAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export interface MetaChannelSetupStep {
    id: string
    title: string
    description: string
    complete: boolean
    icon?: LucideIcon
}

interface MetaChannelSetupChecklistProps {
    title: string
    description: string
    steps: MetaChannelSetupStep[]
    completeLabel: string
    pendingLabel: string
}

export function MetaChannelSetupChecklist({
    title,
    description,
    steps,
    completeLabel,
    pendingLabel,
}: MetaChannelSetupChecklistProps) {
    const completedCount = steps.filter((step) => step.complete).length
    const progressValue = steps.length ? Math.round((completedCount / steps.length) * 100) : 0

    return (
        <Card className="rounded-lg border-border/80 shadow-sm">
            <CardHeader className="gap-4 pb-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-lg">{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                    <Badge variant="outline" className="w-fit rounded-full px-3 py-1 text-xs font-medium">
                        {completedCount}/{steps.length}
                    </Badge>
                </div>
                <Progress value={progressValue} className="h-2 rounded-full bg-muted/60" />
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {steps.map((step, index) => {
                    const StepIcon = step.icon ?? (step.complete ? CheckCircle2 : CircleAlert)
                    return (
                        <div
                            key={step.id}
                            className={cn(
                                "rounded-lg border p-4 transition-colors",
                                step.complete ? "border-emerald-200 bg-emerald-50/70" : "border-border/80 bg-muted/25"
                            )}
                        >
                            <div className="mb-3 flex items-start justify-between gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-background text-xs font-semibold text-muted-foreground">
                                    {index + 1}
                                </div>
                                <Badge
                                    variant={step.complete ? "outline" : "secondary"}
                                    className={cn(
                                        "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                                        step.complete ? "border-emerald-300 text-emerald-700" : "text-muted-foreground"
                                    )}
                                >
                                    {step.complete ? completeLabel : pendingLabel}
                                </Badge>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <StepIcon
                                        className={cn(
                                            "h-4 w-4",
                                            step.complete ? "text-emerald-600" : "text-amber-600"
                                        )}
                                    />
                                    <p className="text-sm font-semibold text-foreground">{step.title}</p>
                                </div>
                                <p className="text-sm leading-6 text-muted-foreground">{step.description}</p>
                            </div>
                        </div>
                    )
                })}
            </CardContent>
        </Card>
    )
}

interface MetaChannelFormSectionProps {
    title: string
    description: string
    children: ReactNode
}

export function MetaChannelFormSection({ title, description, children }: MetaChannelFormSectionProps) {
    return (
        <section className="space-y-4">
            <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
            {children}
        </section>
    )
}
