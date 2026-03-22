"use client"

import { DashboardStats } from "@/components/dashboard-stats"
import { useLanguage } from "@/context/LanguageContext"
import { format } from "date-fns"
import { tr, enUS } from "date-fns/locale"
import { useAuth } from "@/context/AuthContext"
import { useEffect, useState } from "react"

interface TenantDashboardClientProps {
    userId: string
}

export function TenantDashboardClient({ userId }: TenantDashboardClientProps) {
    const { t, language } = useLanguage()
    const { user } = useAuth()
    const [companyName, setCompanyName] = useState("")
    const locale = language === 'tr' ? tr : enUS
    const today = format(new Date(), "d MMMM yyyy, EEEE", { locale })

    useEffect(() => {
        let cancelled = false
        const fetchCompanyName = async () => {
            try {
                const token = await user?.getIdToken()
                if (!token) return

                const response = await fetch(`/api/console/settings?chatbotId=${encodeURIComponent(userId)}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })

                if (!response.ok) return
                const data = await response.json()
                if (cancelled) return
                setCompanyName(data?.companyName || data?.displayName || "")
            } catch {
                // non-blocking
            }
        }

        fetchCompanyName()
        return () => {
            cancelled = true
        }
    }, [user, userId])

    // Use companyName if available, otherwise fallback to user display name or "User"
    const displayName = companyName || user?.displayName || "User"

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Minimal Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">
                        {t('welcomeBack')}, <span className="text-primary">{displayName}</span>
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {t('dashboardSubtitle')}
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-muted/40 px-4 py-2 rounded-full border border-border/40">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-medium text-foreground/80">{today}</span>
                    <span className="text-muted-foreground mx-2">•</span>
                    <span className="text-sm font-medium text-emerald-600">{t('systemStatus')}</span>
                </div>
            </div>

            <DashboardStats targetUserId={userId} />
        </div>
    )
}
