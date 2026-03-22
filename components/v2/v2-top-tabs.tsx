"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { V2NavItem } from "@/lib/v2/types"

interface V2TopTabsProps {
  items: V2NavItem[]
  className?: string
}

export function V2TopTabs({ items, className }: V2TopTabsProps) {
  const pathname = usePathname()

  return (
    <nav className={cn("flex items-center gap-1 overflow-x-auto pb-1", className)} aria-label="Sections">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "v2-top-tab whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-600 hover:bg-white hover:text-zinc-900"
            )}
          >
            {item.label}
            {item.badge ? <span className="ml-2 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600">{item.badge}</span> : null}
          </Link>
        )
      })}
    </nav>
  )
}
