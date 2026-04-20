"use client"

import { useAuth } from "@/context/AuthContext"
import { EcommerceIntegrationsPanel } from "@/components/integrations/ecommerce/EcommerceIntegrationsPanel"
import { Loader2 } from "lucide-react"

export default function EcommerceConnectionsPage() {
    const { user } = useAuth()

    if (!user?.uid) {
        return (
            <div className="flex min-h-[260px] items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="p-8">
            <EcommerceIntegrationsPanel chatbotId={user.uid} />
        </div>
    )
}
