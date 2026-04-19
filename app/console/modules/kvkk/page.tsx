"use client"

import { useAuth } from "@/context/AuthContext"
import { KvkkConsentSettingsForm } from "@/components/modules/kvkk/kvkk-consent-settings-form"

export default function KvkkModulePage() {
    const { user } = useAuth()

    if (!user) return null

    return <KvkkConsentSettingsForm targetUserId={user.uid} />
}
