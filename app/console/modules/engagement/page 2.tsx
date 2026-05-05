"use client"

import { useAuth } from "@/context/AuthContext"
import { EngagementSettingsForm } from "@/components/modules/engagement/engagement-settings-form"

export default function EngagementPage() {
    const { user } = useAuth()

    if (!user) return null

    return (
        <EngagementSettingsForm
            targetUserId={user.uid}
            isSuperAdmin={false}
        />
    )
}
