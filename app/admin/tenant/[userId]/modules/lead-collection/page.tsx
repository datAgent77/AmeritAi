"use client"

import { LeadCollectionSettingsForm } from "@/components/modules/leads/lead-collection-settings-form"

interface PageProps {
    params: {
        userId: string
    }
}

export default function AdminLeadCollectionPage({ params }: PageProps) {
    return (
        <LeadCollectionSettingsForm
            targetUserId={params.userId}
            isSuperAdmin={true}
        />
    )
}
