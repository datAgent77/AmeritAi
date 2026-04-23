"use client"

import WidgetSettings from "@/components/widget-settings/widget-settings"

import { useAuth } from "@/context/AuthContext"

export default function WidgetPage() {
    const { user } = useAuth()

    if (!user) return null

    return (
        <div className="h-[calc(100dvh-4rem)] min-h-0">
            <WidgetSettings userId={user.uid} />
        </div>
    )
}
