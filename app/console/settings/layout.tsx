"use client"

import { usePathname } from "next/navigation"
import { SubpageSidebar } from "@/components/subpage-sidebar"
import { useLanguage } from "@/context/LanguageContext"
import { CreditCard, Code, Bell } from "lucide-react"

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { t } = useLanguage()

    const settingsMenuItems = [
        {
            id: "subscription",
            label: t('subscription') || "Abonelik",
            href: "/console/settings/subscription",
            icon: <CreditCard className="w-4 h-4" />
        },
        {
            id: "developers",
            label: t('developers') || "Geliştiriciler",
            href: "/console/settings/developers",
            icon: <Code className="w-4 h-4" />
        },
        {
            id: "notifications",
            label: t('notificationSettings') || "Bildirimler",
            href: "/console/settings/notifications",
            icon: <Bell className="w-4 h-4" />
        },
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
