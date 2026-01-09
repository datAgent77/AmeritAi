"use client"

import { useParams } from "next/navigation"
import { VoiceSettingsForm } from "@/components/modules/voice/voice-settings-form"

export default function TenantVoiceSettingsPage() {
    const params = useParams()
    const userId = params.userId as string

    return (
        <VoiceSettingsForm
            targetUserId={userId}
            isSuperAdmin={true}
        />
    )
}
