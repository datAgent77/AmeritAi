"use client"

import { PartnerSupportCenterContent } from "@/components/partner-support-center-content"

export default function AdminTenantHelpCenterPage({ params }: { params: { userId: string } }) {
    return (
        <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-8">
            <PartnerSupportCenterContent targetUserId={params.userId} />
        </div>
    )
}
