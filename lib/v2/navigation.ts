import type { V2NavItem } from "@/lib/v2/types"

function withTenantTarget(path: string, targetUserId?: string, owner: "admin" | "agency" = "admin") {
  if (!targetUserId) return path
  return `/v2/${owner}/tenant/${targetUserId}${path}`
}

export function getTenantV2Tabs(targetUserId?: string, owner: "admin" | "agency" = "admin"): V2NavItem[] {
  return [
    { label: "Playground", href: withTenantTarget("/playground", targetUserId, owner), exact: true },
    { label: "Chat logs", href: withTenantTarget("/chat-logs", targetUserId, owner) },
    { label: "Data sources", href: withTenantTarget("/data-sources", targetUserId, owner) },
    { label: "Analytics", href: withTenantTarget("/analytics", targetUserId, owner) },
    { label: "People", href: withTenantTarget("/people", targetUserId, owner) },
    { label: "Insights", href: withTenantTarget("/insights", targetUserId, owner) },
    { label: "Install", href: withTenantTarget("/install", targetUserId, owner) },
    { label: "Settings", href: withTenantTarget("/settings", targetUserId, owner) },
  ]
}

export function getConsoleV2Tabs(): V2NavItem[] {
  return getTenantV2Tabs().map((tab) => ({ ...tab, href: `/v2/console${tab.href}` }))
}

export function getAdminV2Tabs(): V2NavItem[] {
  return [
    { label: "Overview", href: "/v2/admin/overview" },
    { label: "Customers", href: "/v2/admin/customers" },
    { label: "Agencies", href: "/v2/admin/agencies" },
  ]
}

export function getAgencyV2Tabs(): V2NavItem[] {
  return [
    { label: "Overview", href: "/v2/agency/overview" },
    { label: "Customers", href: "/v2/agency/customers" },
  ]
}

export function getPublicV2Tabs(): V2NavItem[] {
  return [
    { label: "Overview", href: "/v2", exact: true },
    { label: "Pricing", href: "/v2/pricing" },
    { label: "Products", href: "/v2/products" },
    { label: "Industries", href: "/v2/industries" },
    { label: "Contact", href: "/v2/contact" },
  ]
}

export function getSettingsV2Tabs(basePath = "/v2/console/settings"): V2NavItem[] {
  return [
    { label: "Company", href: `${basePath}/company` },
    { label: "Account", href: `${basePath}/account` },
    { label: "Subscription", href: `${basePath}/subscription` },
    { label: "Notifications", href: `${basePath}/notifications` },
    { label: "Developers", href: `${basePath}/developers` },
    { label: "Modules", href: `${basePath}/modules` },
  ]
}
