"use client"

import WidgetSettings from "@/components/widget-settings/widget-settings"

export default function TenantWidgetPage({ params }: { params: { userId: string } }) {
    return <WidgetSettings userId={params.userId} />
}
