"use client"

import { useEffect, useState } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { NotificationBell } from "@/components/notification-bell"
import { useLanguage } from "@/context/LanguageContext"
import { ProductLauncher } from "@/components/product-launcher"
import Image from "next/image"
import { usePathname } from "next/navigation"

type HeaderBranding = {
    show: boolean
    partnerName?: string
    logoUrl?: string
    placement?: "header-right"
}

export function SiteHeader({ showSidebarTrigger = true }: { showSidebarTrigger?: boolean }) {
    const { user } = useAuth()
    const { t } = useLanguage()
    const pathname = usePathname()
    const showWidgetTest = pathname?.startsWith("/console") || pathname?.startsWith("/admin/tenant/")
    const [partnerBranding, setPartnerBranding] = useState<HeaderBranding | null>(null)

    useEffect(() => {
        let cancelled = false

        const loadBranding = async () => {
            if (!user) {
                setPartnerBranding(null)
                return
            }

            try {
                const token = await user.getIdToken()
                const response = await fetch("/api/management/viewer-context", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })

                if (!response.ok) {
                    throw new Error("Failed to load viewer context")
                }

                const data = await response.json()
                if (cancelled) return
                setPartnerBranding(data?.resolvedPartnerBranding || null)
            } catch (error) {
                if (cancelled) return
                console.error("Failed to load header partner branding", error)
                setPartnerBranding(null)
            }
        }

        loadBranding()
        return () => {
            cancelled = true
        }
    }, [user])

    return (
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-6 shadow-sm w-full">
            <div className="flex items-center gap-2">
                {showSidebarTrigger && <SidebarTrigger />}
                <Breadcrumbs />
            </div>

            {/* Mobile Logo Centered */}
            <div className="absolute left-1/2 -translate-x-1/2 md:hidden">
                <Image
                    src="/vion-logo-icon-dark.png"
                    alt="Vion"
                    width={32}
                    height={32}
                    className="w-8 h-8"
                />
            </div>
            <div className="ml-auto flex items-center gap-2">
                {partnerBranding?.show && partnerBranding.logoUrl ? (
                    <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-muted/60 px-2.5 py-1.5 md:flex">
                        <div className="relative h-7 w-7 overflow-hidden rounded-full border bg-white">
                            <Image
                                src={partnerBranding.logoUrl}
                                alt={partnerBranding.partnerName || "Partner"}
                                fill
                                className="object-contain p-1"
                                unoptimized
                            />
                        </div>
                        <div className="max-w-[180px] truncate text-xs font-medium text-foreground">
                            {partnerBranding.partnerName || "Strategic Partner"}
                        </div>
                    </div>
                ) : null}
                {partnerBranding?.show && partnerBranding.logoUrl ? (
                    <div className="relative h-8 w-8 overflow-hidden rounded-full border bg-white md:hidden">
                        <Image
                            src={partnerBranding.logoUrl}
                            alt={partnerBranding.partnerName || "Partner"}
                            fill
                            className="object-contain p-1"
                            unoptimized
                        />
                    </div>
                ) : null}
                <ProductLauncher />
                {showWidgetTest ? (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/widget-test?id=${user?.uid}`, "_blank")}
                        className="hidden md:flex items-center gap-2"
                    >
                        {t('widgetTest') || "Widget Test"}
                    </Button>
                ) : null}
                <NotificationBell />
            </div>
        </header>
    )
}
