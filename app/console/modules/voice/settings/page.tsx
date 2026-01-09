"use client"

import { useAuth } from "@/context/AuthContext"
import { VoiceSettingsForm } from "@/components/modules/voice/voice-settings-form"

export default function VoiceSettingsPage() {
    const { user } = useAuth()

    if (!user) return null

    return (
        <VoiceSettingsForm
            targetUserId={user.uid}
            isSuperAdmin={false}
        />
    )
}
