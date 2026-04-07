"use client"

import { PartnerSupportCenterContent } from "@/components/partner-support-center-content"

export default function AdminTenantHelpCenterPage({ params }: { params: { userId: string } }) {
    return <PartnerSupportCenterContent targetUserId={params.userId} />
}
