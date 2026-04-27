"use client"

import { HumanHandoffSettingsForm } from "@/components/modules/handoff/human-handoff-settings-form"

export default function AdminTenantAgentsPage({ params }: { params: { userId: string } }) {
    return <HumanHandoffSettingsForm targetUserId={params.userId} mode="agents" />
}
