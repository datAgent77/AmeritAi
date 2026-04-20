"use client"

import { useAuth } from "@/context/AuthContext"
import { SmartShopperSettingsForm } from "@/components/modules/smart-shopper/smart-shopper-settings-form"

export default function SmartShopperPage() {
    const { user } = useAuth()

    if (!user) return null

    return (
        <SmartShopperSettingsForm
            targetUserId={user.uid}
            isSuperAdmin={false}
        />
    )
}
