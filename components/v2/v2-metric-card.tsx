import { cn } from "@/lib/utils"

interface V2MetricCardProps {
  label: string
  value: string | number
  helper?: string
  className?: string
}

export function V2MetricCard({ label, value, helper, className }: V2MetricCardProps) {
  return (
    <div className={cn("v2-card px-5 py-5", className)}>
      <div className="text-sm font-medium text-zinc-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">{value}</div>
      {helper ? <div className="mt-2 text-xs text-zinc-500">{helper}</div> : null}
    </div>
  )
}
