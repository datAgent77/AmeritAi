"use client"

import { UnifiedInbox } from "@/components/unified-inbox"
import { useAuth } from "@/context/AuthContext"

export default function ChatsPage() {
    const { user } = useAuth()

    if (!user) return null

    return (
        <div className="p-6 space-y-6 h-full">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Unified Inbox</h2>
                <p className="text-muted-foreground">
                    Manage conversations from all connected channels in one place.
                </p>
            </div>
            <UnifiedInbox userId={user.uid} showOmniFeatures={false} />
        </div>
    )
}
