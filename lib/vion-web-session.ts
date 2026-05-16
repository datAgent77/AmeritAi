import type { GuidedSkillState } from "@/lib/guided-skills/types"
import { appendChatSessionMessage } from "@/lib/chat-session-messages"

type VionChannel = "web" | "whatsapp" | "instagram" | "messenger" | "voice"

type ContactAliasInput = {
    aliasType: string
    aliasValue: string
    verified?: boolean
    sourceChannel?: VionChannel | null
}

type ContactGraphRecord = {
    id: string
    chatbotId: string
    canonicalContactId?: string | null
    contactKey?: string | null
    displayName?: string | null
    verifiedPhone?: string | null
    whatsappNumber?: string | null
    email?: string | null
    linkedChannels?: VionChannel[]
    linkedContactKeys?: string[]
    [key: string]: any
}

export function normalizePhoneNumber(value?: string | null) {
    if (!value) return null
    const cleaned = value.replace(/[^\d+]/g, "")
    return cleaned || null
}

function uniqueStrings(values: Array<string | null | undefined>) {
    return Array.from(new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))) as string[]
}

function sanitizeDocSegment(value?: string | null, fallback = "unknown") {
    const normalized = String(value || "").trim()
    if (!normalized) return fallback
    return normalized.replace(/[^a-zA-Z0-9+@._:-]/g, "-")
}

function sanitizeObject<T extends Record<string, any>>(value: T): T {
    return Object.fromEntries(
        Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
    ) as T
}

function buildContactDocId(params: {
    chatbotId: string
    verifiedPhone?: string | null
    whatsappNumber?: string | null
    email?: string | null
    contactKey?: string | null
}) {
    const phone = normalizePhoneNumber(params.verifiedPhone || params.whatsappNumber || null)
    if (phone) return `${params.chatbotId}:phone:${sanitizeDocSegment(phone)}`
    if (params.email) return `${params.chatbotId}:email:${sanitizeDocSegment(params.email.toLowerCase())}`
    return `${params.chatbotId}:web:${sanitizeDocSegment(params.contactKey)}`
}

export async function upsertContactGraph(
    adminDb: any,
    params: {
        chatbotId: string
        channel: VionChannel
        canonicalContactId?: string | null
        contactKey?: string | null
        displayName?: string | null
        verifiedPhone?: string | null
        whatsappNumber?: string | null
        email?: string | null
        aliases?: ContactAliasInput[]
        notes?: string | null
    }
): Promise<ContactGraphRecord> {
    const docId =
        params.canonicalContactId ||
        buildContactDocId({
            chatbotId: params.chatbotId,
            verifiedPhone: params.verifiedPhone,
            whatsappNumber: params.whatsappNumber,
            email: params.email,
            contactKey: params.contactKey,
        })
    const docRef = adminDb.collection("contact_graph").doc(docId)
    const snapshot = await docRef.get()
    const existing = snapshot.exists ? snapshot.data() || {} : {}
    const now = new Date()
    const phone = normalizePhoneNumber(params.verifiedPhone || params.whatsappNumber || null)
    const email = params.email ? params.email.toLowerCase() : null
    const aliasValues = Array.isArray(params.aliases) ? params.aliases.map((alias) => alias.aliasValue) : []
    const contactKey = params.contactKey || existing.contactKey || phone || email || null

    const nextRecord = sanitizeObject({
        chatbotId: params.chatbotId,
        canonicalContactId: docId,
        contactKey,
        displayName: params.displayName || existing.displayName || null,
        verifiedPhone: normalizePhoneNumber(params.verifiedPhone) || existing.verifiedPhone || null,
        whatsappNumber: normalizePhoneNumber(params.whatsappNumber) || existing.whatsappNumber || null,
        email: email || existing.email || null,
        linkedChannels: Array.from(new Set([...(existing.linkedChannels || []), params.channel])),
        linkedContactKeys: uniqueStrings([
            ...(existing.linkedContactKeys || []),
            ...aliasValues,
            contactKey,
            phone,
            email,
        ]),
        notes: params.notes ?? existing.notes ?? null,
        createdAt: existing.createdAt || now,
        updatedAt: now,
        lastInteractionAt: now,
    })

    await docRef.set(nextRecord, { merge: true })
    return { id: docId, ...nextRecord }
}

export async function upsertWebChatSession(
    adminDb: any,
    params: {
        sessionId: string
        chatbotId: string
        channel: VionChannel
        contactKey?: string | null
        canonicalContactId?: string | null
        channelMeta?: Record<string, unknown> | null
        visitorName?: string | null
        visitorEmail?: string | null
        message?: Record<string, unknown> | null
        transcriptSummary?: string | null
        lastDisposition?: string | null
        assistantProfileId?: string | null
        handoffStatus?: string | null
        guidedSkillState?: GuidedSkillState | null
    }
) {
    const sessionRef = adminDb.collection("chat_sessions").doc(params.sessionId)
    const snapshot = await sessionRef.get()
    const existing = snapshot.exists ? snapshot.data() || {} : {}
    const existingMessages = Array.isArray(existing.messages) ? existing.messages : []

    await sessionRef.set(
        sanitizeObject({
            chatbotId: params.chatbotId,
            channel: params.channel,
            contactKey: params.contactKey || existing.contactKey || null,
            canonicalContactId: params.canonicalContactId ?? existing.canonicalContactId ?? null,
            channelMeta: {
                ...(existing.channelMeta || {}),
                ...(params.channelMeta || {}),
            },
            visitorName: params.visitorName || existing.visitorName || null,
            visitorEmail: params.visitorEmail || existing.visitorEmail || null,
            assistantProfileId: params.assistantProfileId || existing.assistantProfileId || null,
            transcriptSummary: params.transcriptSummary ?? existing.transcriptSummary ?? null,
            handoffStatus: params.handoffStatus ?? existing.handoffStatus ?? null,
            lastDisposition: params.lastDisposition ?? existing.lastDisposition ?? null,
            guidedSkillState: params.guidedSkillState === undefined ? existing.guidedSkillState ?? null : params.guidedSkillState,
            createdAt: existing.createdAt || new Date(),
            updatedAt: new Date(),
            messages: appendChatSessionMessage(existingMessages, params.message),
        }),
        { merge: true }
    )
}
