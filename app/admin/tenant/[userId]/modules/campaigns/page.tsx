"use client"

import { useParams } from "next/navigation"
import { CampaignManagerForm } from "@/components/modules/campaigns/campaign-manager-form"

export default function TenantCampaignManagerPage() {
    const params = useParams()
    const userId = params.userId as string

    return (
        <CampaignManagerForm
            targetUserId={userId}
            isSuperAdmin={true}
        />
    )
}
