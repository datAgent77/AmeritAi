"use client"

import { GuidedSettingsForm } from "@/components/modules/guided/guided-settings-form"

export default function AdminGuidedModulePage({ params }: { params: { userId: string } }) {
    return <GuidedSettingsForm targetUserId={params.userId} />
}
