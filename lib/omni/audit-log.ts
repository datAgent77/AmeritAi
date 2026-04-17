import { getAdminDb } from "@/lib/firebase-admin"
import { toIsoOrNull, toMillis } from "@/lib/omni/server-utils"

export type OmniAuditResult = "success" | "error" | "denied" | "blocked"
export type OmniAuditChannel = "voice" | "whatsapp" | "instagram" | "messenger" | "web"

export interface OmniAuditEventInput {
    chatbotId: string
    channel: OmniAuditChannel
    eventType: string
    result: OmniAuditResult
    source: string
    message?: string | null
    metadata?: Record<string, unknown>
}

export interface OmniAuditLogRecord extends OmniAuditEventInput {
    id?: string
    createdAt?: string | null
}

export async function logOmniAuditEvent(input: OmniAuditEventInput): Promise<void> {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) return

        await adminDb.collection("omni_audit_logs").add({
            chatbotId: input.chatbotId,
            channel: input.channel,
            eventType: input.eventType,
            result: input.result,
            source: input.source,
            message: input.message || null,
            metadata: input.metadata || {},
            createdAt: new Date(),
        })
    } catch (error) {
        console.warn("[OmniAudit] Failed to write event:", error)
    }
}

function serializeOmniAuditEvent(data: Record<string, any>, id?: string): OmniAuditLogRecord {
    return {
        id,
        chatbotId: data.chatbotId,
        channel: data.channel,
        eventType: data.eventType,
        result: data.result,
        source: data.source,
        message: data.message || null,
        metadata: data.metadata || {},
        createdAt: toIsoOrNull(data.createdAt),
    }
}

export async function listOmniAuditEvents(
    adminDb: any,
    params: {
        chatbotId: string
        channel?: OmniAuditChannel | null
        result?: OmniAuditResult | null
        eventPrefix?: string | null
        sourcePrefix?: string | null
        limit?: number
    }
) {
    let query: any = adminDb.collection("omni_audit_logs").where("chatbotId", "==", params.chatbotId)
    if (params.channel) {
        query = query.where("channel", "==", params.channel)
    }

    const snapshot = await query.limit(Math.min(params.limit || 20, 100)).get()
    return snapshot.docs
        .map((doc: any) => serializeOmniAuditEvent(doc.data() || {}, doc.id))
        .filter((log: OmniAuditLogRecord) => (params.result ? String(log.result || "") === params.result : true))
        .filter((log: OmniAuditLogRecord) =>
            params.eventPrefix ? String(log.eventType || "").startsWith(params.eventPrefix) : true
        )
        .filter((log: OmniAuditLogRecord) =>
            params.sourcePrefix ? String(log.source || "").startsWith(params.sourcePrefix) : true
        )
        .sort((left: OmniAuditLogRecord, right: OmniAuditLogRecord) => toMillis(right.createdAt) - toMillis(left.createdAt))
}
