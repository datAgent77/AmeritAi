"use client"

import { useAuth } from "@/context/AuthContext"
import { DigitalWaiterSettingsForm } from "@/components/modules/digital-waiter/digital-waiter-settings-form"

export default function DigitalWaiterPage() {
    const { user } = useAuth()

    if (!user) return null

    return (
        <DigitalWaiterSettingsForm
            targetUserId={user.uid}
            isSuperAdmin={false}
        />
    )
}
