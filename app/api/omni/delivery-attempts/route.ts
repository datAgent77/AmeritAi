import { NextResponse } from "next/server"
import { listOmniDeliveryAttempts } from "@/lib/omni/delivery-attempts"
import { authorizeOmniRequest, authorizedForOmniPermission, jsonError } from "@/lib/omni/server-utils"
import type { OmniDeliveryAttemptRecord, OmniDeliveryErrorClass, OmniDeliveryStatus, OmniProviderChannel } from "@/lib/omni/types"

export const dynamic = "force-dynamic"

const PROVIDER_CHANNELS: OmniProviderChannel[] = ["whatsapp", "instagram", "voice", "telegram"]
const DELIVERY_STATUSES: OmniDeliveryStatus[] = ["success", "failed"]
const DELIVERY_ERROR_CLASSES: OmniDeliveryErrorClass[] = ["config", "auth", "rate_limit", "provider", "network", "unknown"]

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const chatbotId = searchParams.get("chatbotId")
    const channel = searchParams.get("channel")
    const status = searchParams.get("status")
    const errorClass = searchParams.get("errorClass")
    const limit = Math.min(Number(searchParams.get("limit") || "40"), 100)

    if (!chatbotId) {
        return jsonError("chatbotId is required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "operations.view")) {
        return jsonError("Forbidden", 403)
    }

    const attempts = await listOmniDeliveryAttempts(authz.adminDb, {
        chatbotId,
        channel: channel && PROVIDER_CHANNELS.includes(channel as OmniProviderChannel) ? (channel as OmniProviderChannel) : null,
        status: status && DELIVERY_STATUSES.includes(status as OmniDeliveryStatus) ? (status as OmniDeliveryStatus) : null,
        errorClass:
            errorClass && DELIVERY_ERROR_CLASSES.includes(errorClass as OmniDeliveryErrorClass)
                ? (errorClass as OmniDeliveryErrorClass)
                : null,
        limit,
    })

    const summary = attempts.reduce(
        (
            accumulator: {
                total: number
                success: number
                failed: number
                retryEligible: number
                pendingAutoRetries: number
                exhaustedRetries: number
                byChannel: Record<string, number>
            },
            attempt: OmniDeliveryAttemptRecord
        ) => {
            accumulator.total += 1
            if (attempt.status === "success") accumulator.success += 1
            if (attempt.status === "failed") accumulator.failed += 1
            if (attempt.retryEligible) accumulator.retryEligible += 1
            if (attempt.retryState === "pending" && attempt.retryMode === "auto") accumulator.pendingAutoRetries += 1
            if (attempt.retryState === "exhausted") accumulator.exhaustedRetries += 1
            accumulator.byChannel[attempt.channel] = (accumulator.byChannel[attempt.channel] || 0) + 1
            return accumulator
        },
        {
            total: 0,
            success: 0,
            failed: 0,
            retryEligible: 0,
            pendingAutoRetries: 0,
            exhaustedRetries: 0,
            byChannel: {} as Record<string, number>,
        }
    )

    return NextResponse.json({ attempts, summary })
}
