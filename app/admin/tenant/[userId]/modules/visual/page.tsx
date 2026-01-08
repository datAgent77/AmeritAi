"use client"

import { useParams } from "next/navigation"
import { VisualDiagnosisTool } from "@/components/modules/visual/visual-diagnosis-tool"

export default function TenantVisualPage() {
    const params = useParams()
    const userId = params.userId as string

    return (
        <VisualDiagnosisTool
            targetUserId={userId}
            isSuperAdmin={true}
        />
    )
}
