"use client"

import { KvkkConsentSettingsForm } from "@/components/modules/kvkk/kvkk-consent-settings-form"

export default function AdminTenantKvkkModulePage({ params }: { params: { userId: string } }) {
    return <KvkkConsentSettingsForm targetUserId={params.userId} />
}
