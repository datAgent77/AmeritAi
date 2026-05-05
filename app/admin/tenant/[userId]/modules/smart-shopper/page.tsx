"use client"

import { useParams } from "next/navigation"
import { SmartShopperSettingsForm } from "@/components/modules/smart-shopper/smart-shopper-settings-form"

export default function TenantSmartShopperPage() {
    const params = useParams()
    const userId = params.userId as string

    return (
        <SmartShopperSettingsForm
            targetUserId={userId}
            isSuperAdmin={true}
        />
    )
}
