"use client"

import { AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { InstagramDMStatusPayload } from "@/lib/integrations/instagram-dm/types"

export function InstagramDMRecoveryBanner({ status }: { status: InstagramDMStatusPayload }) {
    if (!["reauth_required", "degraded", "failed"].includes(status.config.state)) {
        return null
    }

    return (
        <Alert className="border-rose-200 bg-rose-50 text-rose-900">
            <AlertTriangle className="text-rose-700" />
            <AlertTitle>Instagram bağlantısı ilgi bekliyor</AlertTitle>
            <AlertDescription className="text-rose-800">
                <p>{status.config.preflightResult?.failureReason || status.stateMessage}</p>
            </AlertDescription>
        </Alert>
    )
}
