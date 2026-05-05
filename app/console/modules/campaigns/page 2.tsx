"use client"

import { useAuth } from "@/context/AuthContext"
import { CampaignManagerForm } from "@/components/modules/campaigns/campaign-manager-form"

export default function CampaignManagerPage() {
    const { user } = useAuth()

    if (!user) return null

    return (
        <CampaignManagerForm
            targetUserId={user.uid}
            isSuperAdmin={false}
        />
    )
}
