import type {
    OmniDeliveryAttemptRecord,
    OmniDeliveryDirection,
    OmniDeliveryErrorClass,
    OmniDeliveryRetryMode,
    OmniDeliveryRetryState,
    OmniDeliveryStatus,
    OmniProviderChannel,
} from "@/lib/omni/types"
import { toIsoOrNull, toMillis } from "@/lib/omni/server-utils"

export const OMNI_AUTO_RETRY_BACKOFF_MINUTES = [5, 15, 60] as const
export const OMNI_MAX_AUTO_RETRY_ATTEMPTS = OMNI_AUTO_RETRY_BACKOFF_MINUTES.length + 1

interface RecordDeliveryAttemptInput {
    chatbotId: string
    channel: OmniProviderChannel
    provider: string
    direction: OmniDeliveryDirection
    source: string
    status: OmniDeliveryStatus
    sessionId?: string | null
    callbackId?: string | null
    destination?: string | null
    payloadText?: string | null
    providerMessageId?: string | null
    providerTargetId?: string | null
    voiceNumberId?: string | null
    retryEligible?: boolean
    retryOfAttemptId?: string | null
    attemptNumber?: number
    errorClass?: OmniDeliveryErrorClass | null
    errorMessage?: string | null
    metadata?: Record<string, unknown>
}

function trimPayloadText(value?: string | null) {
    if (!value) return null
    const normalized = value.trim()
    if (!normalized) return null
    return normalized.slice(0, 1000)
}

export function classifyOmniDeliveryError(errorLike: unknown): OmniDeliveryErrorClass {
    const message = typeof errorLike === "string"
        ? errorLike
        : errorLike instanceof Error
          ? errorLike.message
          : JSON.stringify(errorLike || "")

    const normalized = message.toLowerCase()
    if (!normalized) return "unknown"

    if (
        normalized.includes("not configured") ||
        normalized.includes("missing") ||
        normalized.includes("required") ||
        normalized.includes("incomplete") ||
        normalized.includes("invalid phone number") ||
        normalized.includes("no active voice number")
    ) {
        return "config"
    }

    if (
        normalized.includes("unauthorized") ||
        normalized.includes("forbidden") ||
        normalized.includes("permission") ||
        normalized.includes("invalid oauth") ||
        normalized.includes("auth token") ||
        normalized.includes("signature")
    ) {
        return "auth"
    }

    if (
        normalized.includes("rate limit") ||
        normalized.includes("too many requests") ||
        normalized.includes("throttl") ||
        normalized.includes("429")
    ) {
        return "rate_limit"
    }

    if (
        normalized.includes("fetch failed") ||
        normalized.includes("network") ||
        normalized.includes("timeout") ||
        normalized.includes("timed out") ||
        normalized.includes("socket") ||
        normalized.includes("econn")
    ) {
        return "network"
    }

    if (
        normalized.includes("delivery failed") ||
        normalized.includes("meta") ||
        normalized.includes("graph") ||
        normalized.includes("twilio") ||
        normalized.includes("provider")
    ) {
        return "provider"
    }

    return "unknown"
}

export function isDeliveryRetryEligible(errorClass?: OmniDeliveryErrorClass | null, channel?: OmniProviderChannel) {
    if (channel === "voice") {
        return false
    }

    return errorClass === "provider" || errorClass === "network" || errorClass === "rate_limit" || errorClass === "unknown"
}

export function serializeOmniDeliveryAttempt(data: Record<string, any>, id?: string): OmniDeliveryAttemptRecord {
    return {
        id,
        chatbotId: data.chatbotId,
        channel: data.channel,
        provider: data.provider,
        direction: data.direction,
        source: data.source,
        status: data.status,
        sessionId: data.sessionId || null,
        callbackId: data.callbackId || null,
        destination: data.destination || null,
        payloadText: data.payloadText || null,
        providerMessageId: data.providerMessageId || null,
        providerTargetId: data.providerTargetId || null,
        voiceNumberId: data.voiceNumberId || null,
        retryEligible: Boolean(data.retryEligible),
        retryOfAttemptId: data.retryOfAttemptId || null,
        attemptNumber: Number(data.attemptNumber || 1),
        errorClass: data.errorClass || null,
        errorMessage: data.errorMessage || null,
        retryMode: data.retryMode || "none",
        retryState: data.retryState || "none",
        nextRetryAt: toIsoOrNull(data.nextRetryAt),
        lastRetryAt: toIsoOrNull(data.lastRetryAt),
        maxRetryAttempts: Number(data.maxRetryAttempts || OMNI_MAX_AUTO_RETRY_ATTEMPTS),
        metadata: data.metadata || {},
        createdAt: toIsoOrNull(data.createdAt),
    }
}

async function resolveAttemptNumber(adminDb: any, input: RecordDeliveryAttemptInput) {
    if (input.attemptNumber && Number.isFinite(input.attemptNumber) && input.attemptNumber > 0) {
        return Math.floor(input.attemptNumber)
    }

    if (!input.retryOfAttemptId) {
        return 1
    }

    const retrySnapshot = await adminDb.collection("omni_delivery_attempts").doc(input.retryOfAttemptId).get()
    if (!retrySnapshot.exists) {
        return 2
    }

    const retryData = retrySnapshot.data() || {}
    const retryNumber = Number(retryData.attemptNumber || 1)
    return Number.isFinite(retryNumber) && retryNumber > 0 ? retryNumber + 1 : 2
}

export async function recordOmniDeliveryAttempt(adminDb: any, input: RecordDeliveryAttemptInput): Promise<OmniDeliveryAttemptRecord> {
    const attemptNumber = await resolveAttemptNumber(adminDb, input)
    const resolvedErrorClass = input.errorClass ?? (input.status === "failed" ? classifyOmniDeliveryError(input.errorMessage) : null)
    const retryEligible =
        typeof input.retryEligible === "boolean"
            ? input.retryEligible
            : input.status === "failed"
              ? isDeliveryRetryEligible(resolvedErrorClass, input.channel)
              : false
    const retryMode: OmniDeliveryRetryMode =
        retryEligible && input.channel !== "voice" ? "auto" : retryEligible ? "manual" : "none"
    const retryState: OmniDeliveryRetryState =
        retryMode === "auto" && input.status === "failed"
            ? attemptNumber < OMNI_MAX_AUTO_RETRY_ATTEMPTS
                ? "pending"
                : "exhausted"
            : "none"
    const nextRetryAt =
        retryState === "pending"
            ? new Date(Date.now() + OMNI_AUTO_RETRY_BACKOFF_MINUTES[Math.max(0, attemptNumber - 1)] * 60 * 1000)
            : null

    const payload = {
        chatbotId: input.chatbotId,
        channel: input.channel,
        provider: input.provider,
        direction: input.direction,
        source: input.source,
        status: input.status,
        sessionId: input.sessionId || null,
        callbackId: input.callbackId || null,
        destination: input.destination || null,
        payloadText: trimPayloadText(input.payloadText),
        providerMessageId: input.providerMessageId || null,
        providerTargetId: input.providerTargetId || null,
        voiceNumberId: input.voiceNumberId || null,
        retryEligible,
        retryOfAttemptId: input.retryOfAttemptId || null,
        attemptNumber,
        errorClass: resolvedErrorClass || null,
        errorMessage: input.errorMessage || null,
        retryMode,
        retryState,
        nextRetryAt,
        lastRetryAt: null,
        maxRetryAttempts: OMNI_MAX_AUTO_RETRY_ATTEMPTS,
        metadata: input.metadata || {},
        createdAt: new Date(),
    }

    const docRef = await adminDb.collection("omni_delivery_attempts").add(payload)
    return serializeOmniDeliveryAttempt(payload, docRef.id)
}

export async function updateOmniDeliveryAttemptRetryState(
    adminDb: any,
    id: string,
    patch: {
        retryState?: OmniDeliveryRetryState
        nextRetryAt?: Date | null
        lastRetryAt?: Date | null
        metadata?: Record<string, unknown>
    }
) {
    const docRef = adminDb.collection("omni_delivery_attempts").doc(id)
    const snapshot = await docRef.get()
    if (!snapshot.exists) {
        return null
    }

    const existing = snapshot.data() || {}
    const nextRecord = {
        retryState: patch.retryState ?? existing.retryState ?? "none",
        nextRetryAt: patch.nextRetryAt === undefined ? existing.nextRetryAt || null : patch.nextRetryAt,
        lastRetryAt: patch.lastRetryAt === undefined ? existing.lastRetryAt || null : patch.lastRetryAt,
        metadata: {
            ...(existing.metadata || {}),
            ...(patch.metadata || {}),
        },
        updatedAt: new Date(),
    }

    await docRef.set(nextRecord, { merge: true })
    return serializeOmniDeliveryAttempt(
        {
            ...existing,
            ...nextRecord,
        },
        id
    )
}

export async function getOmniDeliveryAttempt(adminDb: any, id: string) {
    const snapshot = await adminDb.collection("omni_delivery_attempts").doc(id).get()
    if (!snapshot.exists) {
        return null
    }

    return serializeOmniDeliveryAttempt(snapshot.data() || {}, id)
}

export async function listOmniDeliveryAttempts(
    adminDb: any,
    params: {
        chatbotId: string
        channel?: OmniProviderChannel | null
        status?: OmniDeliveryStatus | null
        errorClass?: OmniDeliveryErrorClass | null
        limit?: number
    }
) {
    let query: any = adminDb.collection("omni_delivery_attempts").where("chatbotId", "==", params.chatbotId)

    if (params.channel) {
        query = query.where("channel", "==", params.channel)
    }

    if (params.status) {
        query = query.where("status", "==", params.status)
    }

    if (params.errorClass) {
        query = query.where("errorClass", "==", params.errorClass)
    }

    const snapshot = await query.limit(Math.min(params.limit || 40, 100)).get()
    return snapshot.docs
        .map((doc: any) => serializeOmniDeliveryAttempt(doc.data() || {}, doc.id))
        .sort((left: OmniDeliveryAttemptRecord, right: OmniDeliveryAttemptRecord) => toMillis(right.createdAt) - toMillis(left.createdAt))
}
