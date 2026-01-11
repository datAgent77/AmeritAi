"use client"

import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import Link from "next/link"
import React from "react"

interface SubpageSidebarItem {
    id: string
    label: string
    href: string
    icon?: React.ReactNode
    count?: number
}

interface SubpageSidebarProps {
    title: string
    items: SubpageSidebarItem[]
    className?: string
}

export function SubpageSidebar({ title, items, className }: SubpageSidebarProps) {
    const pathname = usePathname()

    return (
        <div className={cn("w-56 border-r bg-muted/30 p-4 flex-shrink-0", className)}>
            <h2 className="font-semibold mb-4 px-2">{title}</h2>
            <nav className="space-y-1">
                {items.map((item) => {
                    // Special handling for overview/home page
                    let isActive = false
                    if (item.id === 'overview') {
                        // For overview, match exact path or path ending with /knowledge
                        isActive = pathname === item.href || pathname === item.href + '/' || pathname?.endsWith('/knowledge')
                    } else {
                        // For other items, match exact or starts with
                        isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                    }
                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={cn(
                                "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors",
                                isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <span className="flex items-center gap-2">
                                {item.icon && <span>{item.icon}</span>}
                                <span>{item.label}</span>
                            </span>
                            {item.count !== undefined && (
                                <span className={cn(
                                    "text-xs",
                                    isActive
                                        ? "text-primary-foreground/70"
                                        : "text-muted-foreground"
                                )}>
                                    {item.count}
                                </span>
                            )}
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}
