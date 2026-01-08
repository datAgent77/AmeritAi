"use client"

import { useParams } from "next/navigation"
import { SalesOptimizationSettingsForm } from "@/components/modules/sales/sales-optimization-settings-form"

export default function TenantSalesOptimizationPage() {
    const params = useParams()
    const userId = params.userId as string

    return (
        <SalesOptimizationSettingsForm
            targetUserId={userId}
            isSuperAdmin={true}
        />
    )
}
