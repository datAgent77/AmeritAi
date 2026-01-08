"use client"

import { useAuth } from "@/context/AuthContext"
import { SalesOptimizationSettingsForm } from "@/components/modules/sales/sales-optimization-settings-form"

export default function SalesOptimizationPage() {
    const { user } = useAuth()

    if (!user) return null

    return (
        <SalesOptimizationSettingsForm
            targetUserId={user.uid}
            isSuperAdmin={false}
        />
    )
}
