import { cn } from "@/lib/utils"
import type { V2SourceSummary } from "@/lib/v2/types"

interface V2SummaryRailProps {
  title: string
  items: V2SourceSummary[]
  footer?: React.ReactNode
  className?: string
}

export function V2SummaryRail({ title, items, footer, className }: V2SummaryRailProps) {
  return (
    <aside className={cn("v2-card h-fit p-5", className)}>
      <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-4 text-sm">
            <div>
              <div className="font-medium text-zinc-900">{item.label}</div>
              {item.helper ? <div className="mt-1 text-xs text-zinc-500">{item.helper}</div> : null}
            </div>
            <div className="text-right font-semibold text-zinc-900">{item.value}</div>
          </div>
        ))}
      </div>
      {footer ? <div className="mt-6 border-t border-zinc-100 pt-4">{footer}</div> : null}
    </aside>
  )
}
