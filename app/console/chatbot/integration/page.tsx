"use client"

import IntegrationPage from "@/components/integration-page"
import { useAuth } from "@/context/AuthContext"

export default function IntegrationsPage() {
    const { user } = useAuth()

    if (!user) return null

    return (
        <div className="p-8 h-full">
            <IntegrationPage userId={user.uid} />
        </div>
    )
}
