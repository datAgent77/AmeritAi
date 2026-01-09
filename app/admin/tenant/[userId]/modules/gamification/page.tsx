"use client"

import { useParams } from "next/navigation"
import { GamificationSettingsForm } from "@/components/modules/gamification/gamification-settings-form"

export default function TenantGamificationPage() {
    const params = useParams()
    const userId = params.userId as string

    return (
        <GamificationSettingsForm
            targetUserId={userId}
            isSuperAdmin={true}
        />
    )
}
