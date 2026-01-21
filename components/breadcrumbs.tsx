"use client"

import { usePathname } from "next/navigation"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import React from "react"

import { useLanguage } from "@/context/LanguageContext"

export function Breadcrumbs() {
    const pathname = usePathname()
    const { t } = useLanguage()
    const segments = (pathname || "").split("/").filter((segment) => segment !== "")

    // Don't show breadcrumbs on the home page or platform page
    if (pathname === "/" || pathname === "/platform") return null

    // Segments to skip in breadcrumbs (they are redundant in the UI)
    const skipSegments = ["console", "dashboard", "platform", "tenant"]

    // Check if this is a tenant admin route
    const isTenantRoute = pathname?.includes('/admin/tenant/')

    // Get tenant userId from URL if on tenant route
    const getTenantIdFromPath = () => {
        const match = pathname?.match(/\/admin\/tenant\/([^\/]+)/)
        return match ? match[1] : null
    }
    const tenantId = getTenantIdFromPath()

    return (
        <Breadcrumb className="hidden md:flex">
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink href="/platform">{t('platformTitle') || "Platform"}</BreadcrumbLink>
                </BreadcrumbItem>
                {segments.map((segment, index) => {
                    // Skip redundant segments
                    if (skipSegments.includes(segment)) return null

                    // If this is the tenantId segment, show "Tenant" as label
                    const isTenantIdSegment = isTenantRoute && tenantId && segment === tenantId

                    // Special case: Inject "Modules" before "shopper"
                    const showModulesLink = segment === "shopper" || segment === "copywriter" || segment === "lead-finder"

                    const href = `/${segments.slice(0, index + 1).join("/")}`
                    const isLast = index === segments.length - 1

                    // Better labels for common routes
                    const labelMap: Record<string, string> = {
                        "chatbot": "AI Chatbot",
                        "shopper": "AI Personal Shopper",
                        "copywriter": "AI Copywriter",
                        "analytics": "Analytics",
                        "knowledge": t('knowledgeBase'),
                        "branding": t('branding'),
                        "integration": "Integrations",
                        "chats": t('chats'),
                        "leads": t('leads'),
                        "tenants": t('tenants'),
                        "admin": t('tenants'), // Map /admin to Tenants
                        "profile": t('profile'),
                        "widget": "Widget",
                        "catalog": t('productCatalog'),
                        "settings": t('settings'),
                        "modules": t('modules') || "Modules",
                        "appointments": t('appointments') || "Appointments",
                        "customer-admin": t('customerAdmin') || "Abonelik yönetimi",
                        "subscriptions": t('subscriptions') || "Abonelikler",
                        "behavior": t('behavior') || "Davranış"
                    }

                    // Skip "leads" and "voice" if the previous segment is "modules"
                    // These modules don't have a main page, so we don't want a broken link
                    const prevSegment = segments[index - 1]
                    if (prevSegment === "modules" && (segment === "leads" || segment === "voice")) {
                        return null
                    }

                    // For tenant ID segment, just show "Tenant"
                    let title = isTenantIdSegment
                        ? "Tenant"
                        : (labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1))

                    return (
                        <React.Fragment key={href}>
                            {showModulesLink && (
                                <>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbLink href="/console/modules">{t('modules') || "Modules"}</BreadcrumbLink>
                                    </BreadcrumbItem>
                                </>
                            )}
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                {isLast ? (
                                    <BreadcrumbPage>{title}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink href={href}>{title}</BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                        </React.Fragment>
                    )
                })}
            </BreadcrumbList>
        </Breadcrumb>
    )
}
