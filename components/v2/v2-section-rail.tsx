import { cn } from "@/lib/utils"

interface V2SectionRailItem {
  id: string
  label: string
  description?: string
  active?: boolean
  onClick?: () => void
}

interface V2SectionRailProps {
  title: string
  items: V2SectionRailItem[]
  footer?: React.ReactNode
  className?: string
}

export function V2SectionRail({ title, items, footer, className }: V2SectionRailProps) {
  return (
    <aside className={cn("v2-card flex h-full flex-col gap-3 p-3", className)}>
      <div className="px-1">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={cn(
              "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
              item.active
                ? "border-zinc-900 bg-zinc-50 shadow-sm"
                : "border-transparent bg-zinc-50/60 hover:border-zinc-200 hover:bg-white"
            )}
          >
            <div className="text-sm font-medium text-zinc-900">{item.label}</div>
            {item.description ? <p className="mt-1 text-xs leading-5 text-zinc-500">{item.description}</p> : null}
          </button>
        ))}
      </div>
      {footer ? <div className="mt-auto pt-2">{footer}</div> : null}
    </aside>
  )
}
