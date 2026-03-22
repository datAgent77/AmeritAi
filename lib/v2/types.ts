import type { ModuleId } from "@/lib/modules-registry"

export interface V2NavItem {
  label: string
  href: string
  badge?: string
  exact?: boolean
}

export interface V2SurfaceAdapter {
  key: string
  title: string
  description?: string
  primaryActionLabel?: string
}

export interface V2CapabilityGroup {
  id: string
  title: string
  description: string
  moduleIds: ModuleId[]
}

export interface V2SourceSummary {
  id: string
  label: string
  value: string
  helper?: string
}

export interface V2ConversationSummary {
  id: string
  title: string
  preview: string
  channel: string
  timestampLabel: string
  unread?: boolean
  paused?: boolean
}

export interface V2PersonRecord {
  id: string
  name: string
  email?: string
  phone?: string
  source?: string
  createdAtLabel?: string
  fields?: Record<string, string>
}

export interface V2UsageSnapshot {
  headline: string
  subline: string
  items: Array<{
    label: string
    value: string
    helper?: string
  }>
}
