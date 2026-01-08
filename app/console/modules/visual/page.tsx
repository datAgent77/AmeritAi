"use client"

import { useAuth } from "@/context/AuthContext"
import { VisualDiagnosisTool } from "@/components/modules/visual/visual-diagnosis-tool"

export default function VisualDiagnosisPage() {
    const { user } = useAuth()

    if (!user) return null

    return (
        <VisualDiagnosisTool
            targetUserId={user.uid}
            isSuperAdmin={false}
        />
    )
}
