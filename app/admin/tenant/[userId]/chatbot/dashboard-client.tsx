"use client"

import { DashboardStats } from "@/components/dashboard-stats"
import { useLanguage } from "@/context/LanguageContext"
import { format } from "date-fns"
import { tr, enUS } from "date-fns/locale"
import { useAuth } from "@/context/AuthContext"

interface TenantDashboardClientProps {
    userId: string
    companyName?: string
}

export function TenantDashboardClient({ userId, companyName }: TenantDashboardClientProps) {
    const { t, language } = useLanguage()
    const { user } = useAuth()
    const locale = language === 'tr' ? tr : enUS
    const today = format(new Date(), "d MMMM yyyy, EEEE", { locale })

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
