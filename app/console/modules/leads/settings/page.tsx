"use client"

import { useAuth } from "@/context/AuthContext"
import { LeadCollectionSettingsForm } from "@/components/modules/leads/lead-collection-settings-form"
import { Loader2 } from "lucide-react"

export default function LeadCollectionSettingsPage() {
    const { user } = useAuth()

    if (!user) {
        return (
            <div className="flex items-center justify-center p-8 h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return <LeadCollectionSettingsForm targetUserId={user.uid} />
}
