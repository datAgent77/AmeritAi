"use client"

import { AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { WhatsAppBizStatusPayload } from "@/lib/integrations/whatsapp-business/types"

export function WhatsAppBizRecoveryBanner({ status }: { status: WhatsAppBizStatusPayload }) {
    if (!["reauth_required", "degraded", "failed"].includes(status.config.state)) {
        return null
    }

    return (
        <Alert className="border-rose-200 bg-rose-50 text-rose-900">
            <AlertTriangle className="text-rose-700" />
            <AlertTitle>WhatsApp Business bağlantısı ilgi bekliyor</AlertTitle>
            <AlertDescription className="text-rose-800">
                <p>{status.config.preflightResult?.failureReason || status.stateMessage}</p>
            </AlertDescription>
        </Alert>
    )
}
