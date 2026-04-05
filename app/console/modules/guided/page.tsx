"use client"

import { useAuth } from "@/context/AuthContext"
import { GuidedSettingsForm } from "@/components/modules/guided/guided-settings-form"

export default function GuidedModulePage() {
    const { user } = useAuth()

    if (!user) return null

    return <GuidedSettingsForm targetUserId={user.uid} />
}
