import { cn } from "@/lib/utils"

interface V2EmptyStateProps {
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function V2EmptyState({ title, description, action, className }: V2EmptyStateProps) {
  return (
    <div className={cn("flex min-h-[260px] flex-col items-center justify-center rounded-[28px] border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center", className)}>
      <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
      <p className="mt-3 max-w-md text-sm leading-6 text-zinc-500">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
