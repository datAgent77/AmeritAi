"use client"

import { UnifiedInbox } from "@/components/unified-inbox"
import { useAuth } from "@/context/AuthContext"
import { useOmniAccount } from "@/context/OmniAccountContext"

export function OmniUnifiedInboxPanel() {
    const { user } = useAuth()
    const { activeAccountId: chatbotId } = useOmniAccount()

    if (!user || !chatbotId) {
        return null
    }

    return <UnifiedInbox userId={chatbotId} />
}
