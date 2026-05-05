"use client"

import { useAuth } from "@/context/AuthContext"
import { HumanHandoffSettingsForm } from "@/components/modules/handoff/human-handoff-settings-form"

export default function AgentsPage() {
    const { user } = useAuth()

    if (!user) return null

    return <HumanHandoffSettingsForm targetUserId={user.uid} mode="agents" />
}
