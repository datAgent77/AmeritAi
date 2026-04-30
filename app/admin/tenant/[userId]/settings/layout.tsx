"use client"

import { useParams } from "next/navigation"
import { SubpageSidebar } from "@/components/subpage-sidebar"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { CreditCard, Bell, Bot, UserCog } from "lucide-react"


export default function TenantSettingsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { t } = useLanguage()
    const { role } = useAuth()
    const params = useParams()
    const userId = params.userId as string
    const isSuperAdmin = role === "SUPER_ADMIN"
    const canViewTenantSettings = role === "SUPER_ADMIN" || role === "AGENCY_ADMIN"

    const settingsMenuItems = [
        ...(canViewTenantSettings ? [{
            id: "customer-admin",
            label: t('subscription') || "Abonelik",
            href: `/admin/tenant/${userId}/settings/customer-admin`,
            icon: <CreditCard className="w-4 h-4" />
        }] : []),
        {
            id: "ai",
            label: t('aiConfiguration') || "AI Yapılandırması",
            href: `/admin/tenant/${userId}/settings/ai`,
            icon: <Bot className="w-4 h-4" />
        },
        {
            id: "notifications",
            label: t('notificationSettings') || "Bildirimler",
            href: `/admin/tenant/${userId}/settings/notifications`,
            icon: <Bell className="w-4 h-4" />
        },
        // Super Admin Only
        ...(isSuperAdmin ? [
            {
                id: "account",
                label: t('accountSettings') || "Hesap Ayarları",
                href: `/admin/tenant/${userId}/settings/account`,
                icon: <UserCog className="w-4 h-4" />
            }
        ] : [])

    ]

    return (
        <div className="flex h-full bg-white">
            <SubpageSidebar
                title={t('settings') || "Ayarlar"}
                items={settingsMenuItems}
            />
            <div className="flex-1 p-8 bg-white overflow-auto">
                {children}
            </div>
        </div>
    )
}
