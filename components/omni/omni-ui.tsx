"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

export function OmniPageHero({
    title,
    description,
    badge,
    scope,
    actions,
}: {
    title: string
    description: string
    badge?: string
    scope?: string | null
    actions?: ReactNode
}) {
    return (
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
                {badge ? <Badge variant="outline">{badge}</Badge> : null}
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
                    <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p>
                    {scope ? <p className="mt-3 text-xs text-muted-foreground">Account: {scope}</p> : null}
                </div>
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
    )
}

export function OmniMetricTile({
    label,
    value,
    note,
    action,
    className,
}: {
    label: string
    value: ReactNode
    note?: ReactNode
    action?: ReactNode
    className?: string
    tone?: "default" | "success" | "warning" | "danger"
    icon?: ReactNode
}) {
    return (
        <Card className={className}>
            <CardHeader className="pb-2">
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-2xl">{value}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
                {note ? <div>{note}</div> : null}
                {action}
            </CardContent>
        </Card>
    )
}

export function OmniSectionHeader({
    title,
    description,
    action,
}: {
    title: string
    description?: string
    action?: ReactNode
}) {
    return (
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
                <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
                {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
            </div>
            {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
        </div>
    )
}

export function OmniStateShell({
    title,
    description,
    tone = "default",
    action,
}: {
    title: string
    description?: string
    tone?: "default" | "warning"
    action?: ReactNode
}) {
    return (
        <Card className={cn(tone === "warning" && "border-amber-200 bg-amber-50/60")}>
            <CardContent className="p-10">
                <div className="space-y-4">
                    <div className={cn("text-base font-medium", tone === "warning" ? "text-amber-900" : "text-foreground")}>
                        {title}
                    </div>
                    {description ? (
                        <p className={cn("text-sm", tone === "warning" ? "text-amber-800" : "text-muted-foreground")}>
                            {description}
                        </p>
                    ) : null}
                    {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
                </div>
            </CardContent>
        </Card>
    )
}

export function OmniSectionCard({
    title,
    description,
    action,
    className,
    children,
}: {
    title: string
    description?: string
    action?: ReactNode
    className?: string
    children: ReactNode
}) {
    return (
        <Card className={className}>
            <CardHeader>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <CardTitle>{title}</CardTitle>
                        {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
                    </div>
                    {action}
                </div>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    )
}
