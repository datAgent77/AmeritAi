"use client"

import { useParams } from "next/navigation"
import { EngagementSettingsForm } from "@/components/modules/engagement/engagement-settings-form"

export default function TenantEngagementPage() {
    const params = useParams()
    const userId = params.userId as string

    return (
        <EngagementSettingsForm
            targetUserId={userId}
            isSuperAdmin={true}
        />
    )
}
