"use client"

import { useAuth } from "@/context/AuthContext"
import { GamificationSettingsForm } from "@/components/modules/gamification/gamification-settings-form"

export default function GamificationPage() {
    const { user } = useAuth()

    if (!user) return null

    return (
        <GamificationSettingsForm
            targetUserId={user.uid}
            isSuperAdmin={false}
        />
    )
}
