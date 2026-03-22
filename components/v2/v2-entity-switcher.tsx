"use client"

import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface V2EntitySwitcherProps {
  title: string
  subtitle?: string
  className?: string
}

export function V2EntitySwitcher({ title, subtitle, className }: V2EntitySwitcherProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-w-0 items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-left shadow-sm transition-colors hover:border-zinc-300",
        className
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700">
        {title.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-zinc-900">{title}</div>
        {subtitle ? <div className="truncate text-xs text-zinc-500">{subtitle}</div> : null}
      </div>
      <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
    </button>
  )
}
