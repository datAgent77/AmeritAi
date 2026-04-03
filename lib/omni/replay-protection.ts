import crypto from "crypto"
import { sanitizeObject, toIsoOrNull } from "@/lib/omni/server-utils"
import type { OmniChannel } from "@/lib/omni/types"

interface ClaimWebhookEventInput {
    chatbotId: string
    channel: OmniChannel
    source: string
    eventKey: string
    ttlHours?: number
    metadata?: Record<string, unknown>
}

interface ClaimedWebhookEvent {
    id: string
    chatbotId: string
    channel: OmniChannel
    source: string
    eventKey: string
    metadata?: Record<string, unknown>
    createdAt?: string | null
    expiresAt?: string | null
}

function webhookEventId(chatbotId: string, channel: OmniChannel, eventKey: string) {
    const digest = crypto.createHash("sha1").update(`${chatbotId}:${channel}:${eventKey}`).digest("hex")
    return `${channel}-${digest}`
}

export async function claimOmniWebhookEvent(adminDb: any, input: ClaimWebhookEventInput): Promise<{ duplicate: boolean; record: ClaimedWebhookEvent }> {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + (input.ttlHours || 72) * 60 * 60 * 1000)
    const id = webhookEventId(input.chatbotId, input.channel, input.eventKey)
    const docRef = adminDb.collection("omni_webhook_events").doc(id)

    const payload = sanitizeObject({
        chatbotId: input.chatbotId,
        channel: input.channel,
        source: input.source,
        eventKey: input.eventKey,
        metadata: input.metadata || {},
        createdAt: now,
        expiresAt,
    })

    try {
        await docRef.create(payload)
        return {
            duplicate: false,
            record: {
                id,
                chatbotId: input.chatbotId,
                channel: input.channel,
                source: input.source,
                eventKey: input.eventKey,
                metadata: input.metadata || {},
                createdAt: now.toISOString(),
                expiresAt: expiresAt.toISOString(),
            },
        }
    } catch (error) {
        const snapshot = await docRef.get()
        const data = snapshot.exists ? snapshot.data() || {} : {}
        return {
            duplicate: true,
            record: {
                id,
                chatbotId: data.chatbotId || input.chatbotId,
                channel: data.channel || input.channel,
                source: data.source || input.source,
                eventKey: data.eventKey || input.eventKey,
                metadata: data.metadata || input.metadata || {},
                createdAt: toIsoOrNull(data.createdAt) || now.toISOString(),
                expiresAt: toIsoOrNull(data.expiresAt) || expiresAt.toISOString(),
            },
        }
    }
}
