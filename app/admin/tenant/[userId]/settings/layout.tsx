"use client"

import { useParams } from "next/navigation"
import { SubpageSidebar } from "@/components/subpage-sidebar"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { CreditCard, Code, Bell, Bot, ShieldCheck, UserCog } from "lucide-react"


export default function TenantSettingsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { t } = useLanguage()
    const { role } = useAuth()
    const params = useParams()
    const userId = params.userId as string

    const settingsMenuItems = [
        {
            id: "subscription",
            label: t('subscription') || "Abonelik",
            href: `/admin/tenant/${userId}/settings/subscription`,
            icon: <CreditCard className="w-4 h-4" />
        },
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
        ...(role === 'SUPER_ADMIN' ? [
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
