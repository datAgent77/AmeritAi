"use client"

import IntegrationPage from "@/components/integration-page"
import { useAuth } from "@/context/AuthContext"

export default function IntegrationsPage() {
    const { user } = useAuth()

    if (!user) return null

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Integration</h1>
                <p className="text-muted-foreground">Add the chatbot widget to your website with a simple code snippet.</p>
            </div>
            <IntegrationPage userId={user.uid} />
        </div>
    )
}
