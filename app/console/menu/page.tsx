
"use client"

import { MenuManager } from "@/components/menu-manager"
import { useLanguage } from "@/context/LanguageContext"

export default function MenuPage() {
    const { t } = useLanguage()

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold tracking-tight">{t('menuManagement') || 'Menu Management'}</h2>
            </div>
            <MenuManager />
        </div>
    )
}
