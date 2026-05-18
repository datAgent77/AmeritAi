export type VionChannel = "web" | "whatsapp" | "instagram" | "messenger" | "voice"
export type CallbackPriority = "low" | "normal" | "high" | "urgent"
export type CallbackRequestStatus = "pending" | "assigned" | "in_progress" | "resolved" | "closed"
export type CallbackResolutionStatus = "open" | "in_progress" | "completed" | "cancelled"

export interface CallbackRequestRecord {
    id?: string
    chatbotId: string
    contactKey?: string | null
    canonicalContactId?: string | null
    displayName?: string | null
    owner?: string | null
    priority?: CallbackPriority
    status?: CallbackRequestStatus
    dueAt?: string | null
    sourceSessionId?: string | null
    sourceChannel?: VionChannel
    resolutionStatus?: CallbackResolutionStatus
    notes?: string | null
    triggerSource?: "user_request" | "assistant_trigger" | null
    notificationEmail?: string | null
    emailNotifiedAt?: string | null
    inAppNotifiedAt?: string | null
    [key: string]: unknown
}

function sanitizeObject<T extends Record<string, unknown>>(value: T): T {
    return Object.fromEntries(
        Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
    ) as T
}

export function toIsoOrNull(value: unknown): string | null {
    if (!value) return null
    if (typeof value === "string") return value
    if (value instanceof Date) return value.toISOString()
    if (typeof (value as { toDate?: () => Date }).toDate === "function") {
        return (value as { toDate: () => Date }).toDate().toISOString()
    }
    if (typeof (value as { seconds?: number }).seconds === "number") {
        return new Date((value as { seconds: number }).seconds * 1000).toISOString()
    }
    const parsed = new Date(value as string | number)
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null
}

function dateOrNull(value: unknown) {
    if (value === undefined) return undefined
    if (!value) return null
    return value instanceof Date ? value : new Date(value as string | number)
}

export async function upsertCallbackRequest(
    adminDb: any,
    params: {
        id?: string
        chatbotId: string
        contactKey?: string | null
        canonicalContactId?: string | null
        displayName?: string | null
        owner?: string | null
        priority?: CallbackPriority
        status?: CallbackRequestStatus
        dueAt?: string | Date | null
        sourceSessionId?: string | null
        sourceChannel: VionChannel
        resolutionStatus?: CallbackResolutionStatus
        notes?: string | null
        triggerSource?: CallbackRequestRecord["triggerSource"]
        notificationEmail?: string | null
        emailNotifiedAt?: string | Date | null
        inAppNotifiedAt?: string | Date | null
    }
): Promise<CallbackRequestRecord> {
    const docId = params.id || params.sourceSessionId || adminDb.collection("callback_requests").doc().id
    const docRef = adminDb.collection("callback_requests").doc(docId)
    const snapshot = await docRef.get()
    const existing = snapshot.exists ? snapshot.data() || {} : {}
    const now = new Date()

    const nextRecord = sanitizeObject({
        chatbotId: params.chatbotId,
        contactKey: params.contactKey ?? existing.contactKey ?? null,
        canonicalContactId: params.canonicalContactId ?? existing.canonicalContactId ?? null,
        displayName: params.displayName ?? existing.displayName ?? null,
        owner: params.owner ?? existing.owner ?? null,
        priority: params.priority ?? existing.priority ?? "normal",
        status: params.status ?? existing.status ?? "pending",
        dueAt: params.dueAt === undefined ? existing.dueAt || null : dateOrNull(params.dueAt),
        sourceSessionId: params.sourceSessionId ?? existing.sourceSessionId ?? null,
        sourceChannel: params.sourceChannel ?? existing.sourceChannel ?? "web",
        resolutionStatus: params.resolutionStatus ?? existing.resolutionStatus ?? "open",
        notes: params.notes ?? existing.notes ?? null,
        triggerSource: params.triggerSource ?? existing.triggerSource ?? null,
        notificationEmail: params.notificationEmail ?? existing.notificationEmail ?? null,
        emailNotifiedAt: params.emailNotifiedAt === undefined ? existing.emailNotifiedAt || null : dateOrNull(params.emailNotifiedAt),
        inAppNotifiedAt: params.inAppNotifiedAt === undefined ? existing.inAppNotifiedAt || null : dateOrNull(params.inAppNotifiedAt),
        createdAt: existing.createdAt || now,
        updatedAt: now,
    })

    await docRef.set(nextRecord, { merge: true })

    return {
        id: docId,
        ...nextRecord,
        createdAt: toIsoOrNull(nextRecord.createdAt),
        updatedAt: toIsoOrNull(nextRecord.updatedAt),
        dueAt: toIsoOrNull(nextRecord.dueAt),
        emailNotifiedAt: toIsoOrNull(nextRecord.emailNotifiedAt),
        inAppNotifiedAt: toIsoOrNull(nextRecord.inAppNotifiedAt),
    } as CallbackRequestRecord
}
