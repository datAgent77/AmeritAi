import { cn } from "@/lib/utils"

interface V2CanvasCardProps {
  title?: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function V2CanvasCard({ title, description, action, children, className }: V2CanvasCardProps) {
  return (
    <section className={cn("v2-card overflow-hidden", className)}>
      {(title || description || action) ? (
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5">
          <div>
            {title ? <h3 className="text-lg font-semibold text-zinc-900">{title}</h3> : null}
            {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className="px-6 py-5">{children}</div>
    </section>
  )
}
