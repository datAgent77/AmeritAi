import type { OmniChannel, OmniContactMemoryRecord, OmniCustomerMemorySettings } from "@/lib/omni/types"
import { normalizePhoneNumber, resolveOmniContactIdentity, sanitizeObject, toIsoOrNull, toMillis } from "@/lib/omni/server-utils"

const DEFAULT_MEMORY_SETTINGS: OmniCustomerMemorySettings = {
    enabled: true,
    maxFacts: 5,
    storePreferences: true,
    storeOpenIssues: true,
    storeConversationSummary: true,
}

function normalizeMemorySettings(input?: OmniCustomerMemorySettings | null): OmniCustomerMemorySettings {
    return {
        enabled: input?.enabled !== false,
        maxFacts: typeof input?.maxFacts === "number" ? Math.max(1, Math.min(input.maxFacts, 10)) : DEFAULT_MEMORY_SETTINGS.maxFacts,
        storePreferences: input?.storePreferences !== false,
        storeOpenIssues: input?.storeOpenIssues !== false,
        storeConversationSummary: input?.storeConversationSummary !== false,
    }
}

function memoryDocId(chatbotId: string, canonicalContactId: string) {
    const normalized = String(canonicalContactId).trim().toLowerCase()
    return `${chatbotId}:memory:${normalized.replace(/[^a-z0-9+:_-]/gi, "-")}`
}

function uniqueStrings(values: Array<string | null | undefined>, maxItems = 5) {
    return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean))).slice(0, maxItems)
}

function truncateSentence(value?: string | null, maxLength = 120) {
    const normalized = String(value || "").replace(/\s+/g, " ").trim()
    if (!normalized) return ""
    return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1).trim()}…` : normalized
}

function selectFirstTruthy<T>(values: T[]) {
    for (const value of values) {
        if (Array.isArray(value)) {
            if (value.length > 0) return value
            continue
        }
        if (value) return value
    }
    return null
}

function mergeMemoryRecords(
    chatbotId: string,
    canonicalContactId: string,
    fallbackContactKey: string | null,
    records: Array<Record<string, any>>
): OmniContactMemoryRecord {
    const sorted = records
        .slice()
        .sort((left, right) => toMillis(right.updatedAt || right.lastInteractionAt || right.createdAt) - toMillis(left.updatedAt || left.lastInteractionAt || left.createdAt))

    const maxFacts = Math.max(
        5,
        ...sorted.map((record) =>
            Math.max(
                Array.isArray(record.preferences) ? record.preferences.length : 0,
                Array.isArray(record.openIssues) ? record.openIssues.length : 0,
                Array.isArray(record.recentTopics) ? record.recentTopics.length : 0
            )
        )
    )

    const preferences = uniqueStrings(sorted.flatMap((record) => (Array.isArray(record.preferences) ? record.preferences : [])), maxFacts)
    const openIssues = uniqueStrings(sorted.flatMap((record) => (Array.isArray(record.openIssues) ? record.openIssues : [])), maxFacts)
    const recentTopics = uniqueStrings(sorted.flatMap((record) => (Array.isArray(record.recentTopics) ? record.recentTopics : [])), maxFacts)
    const sourceSessionIds = uniqueStrings(sorted.flatMap((record) => (Array.isArray(record.sourceSessionIds) ? record.sourceSessionIds : [])), maxFacts)

    const displayName = selectFirstTruthy(sorted.map((record) => record.displayName)) || null
    const preferredLanguage = selectFirstTruthy(sorted.map((record) => record.preferredLanguage)) || null
    const lastChannel = selectFirstTruthy(sorted.map((record) => record.lastChannel)) || null
    const lastDisposition = selectFirstTruthy(sorted.map((record) => record.lastDisposition)) || null
    const contactKey = selectFirstTruthy(sorted.map((record) => record.contactKey)) || fallbackContactKey || ""
    const summary =
        buildSummary({
            displayName,
            preferences,
            openIssues,
            recentTopics,
            preferredLanguage,
        }) ||
        selectFirstTruthy(sorted.map((record) => record.summary)) ||
        null

    const earliestCreatedAt = sorted.reduce<number | null>((earliest, record) => {
        const millis = toMillis(record.createdAt)
        if (!millis) return earliest
        return earliest === null ? millis : Math.min(earliest, millis)
    }, null)
    const latestUpdatedAt = sorted.reduce<number | null>((latest, record) => {
        const millis = toMillis(record.updatedAt)
        if (!millis) return latest
        return latest === null ? millis : Math.max(latest, millis)
    }, null)
    const latestInteractionAt = sorted.reduce<number | null>((latest, record) => {
        const millis = toMillis(record.lastInteractionAt || record.updatedAt)
        if (!millis) return latest
        return latest === null ? millis : Math.max(latest, millis)
    }, null)

    return {
        id: memoryDocId(chatbotId, canonicalContactId),
        chatbotId,
        contactKey,
        canonicalContactId,
        displayName,
        preferredLanguage,
        summary,
        preferences,
        openIssues,
        recentTopics,
        lastChannel,
        lastDisposition,
        sourceSessionIds,
        createdAt: earliestCreatedAt ? new Date(earliestCreatedAt).toISOString() : null,
        updatedAt: latestUpdatedAt ? new Date(latestUpdatedAt).toISOString() : null,
        lastInteractionAt: latestInteractionAt ? new Date(latestInteractionAt).toISOString() : null,
    }
}

function extractPreferenceFacts(text: string) {
    const normalized = text
        .split(/[.!?]/)
        .map((item) => item.trim())
        .filter(Boolean)

    return normalized
        .filter((sentence) => /(prefer|likes?|interested in|wants|needs|tercih|istiyor|ilgileniyor|seviyor)/i.test(sentence))
        .map((sentence) => truncateSentence(sentence, 100))
}

function extractIssueFacts(text: string) {
    const normalized = text
        .split(/[.!?]/)
        .map((item) => item.trim())
        .filter(Boolean)

    return normalized
        .filter((sentence) => /(problem|issue|error|not working|callback|geri ara|iptal|şikayet|sorun)/i.test(sentence))
        .map((sentence) => truncateSentence(sentence, 100))
}

export async function getOmniContactMemory(
    adminDb: any,
    chatbotId: string,
    contactKey?: string | null,
    options?: {
        channel?: OmniChannel | null
        canonicalContactId?: string | null
        email?: string | null
        phone?: string | null
        instagramHandle?: string | null
    }
): Promise<OmniContactMemoryRecord | null> {
    const identity = await resolveOmniContactIdentity(adminDb, {
        chatbotId,
        canonicalContactId: options?.canonicalContactId || null,
        channel: options?.channel || null,
        contactKey: contactKey || null,
        verifiedPhone: options?.phone || null,
        whatsappNumber: options?.channel === "whatsapp" ? options?.phone || null : null,
        email: options?.email || null,
        instagramHandle: options?.instagramHandle || null,
    })
    const legacyContactId = normalizePhoneNumber(contactKey || "") || String(contactKey || "").trim().toLowerCase()
    const resolvedContactId = identity.canonicalContactId || legacyContactId
    if (!resolvedContactId) return null

    const relatedContactIds = uniqueStrings([resolvedContactId, legacyContactId, ...(identity.contact?.linkedContactIds || [])], 25)
    const snapshots = await Promise.all(
        relatedContactIds.map((id) => adminDb.collection("omni_contact_memory").doc(memoryDocId(chatbotId, id)).get())
    )
    const records = snapshots
        .filter((snapshot: any) => snapshot.exists)
        .map((snapshot: any) => snapshot.data() || {})

    if (records.length === 0) return null

    return mergeMemoryRecords(
        chatbotId,
        resolvedContactId,
        identity.contact?.contactKey || legacyContactId || null,
        records
    )
}

function buildSummary(params: {
    displayName?: string | null
    preferences: string[]
    openIssues: string[]
    recentTopics: string[]
    preferredLanguage?: string | null
}) {
    const lines = [
        params.displayName ? `Name: ${params.displayName}` : null,
        params.preferredLanguage ? `Language: ${params.preferredLanguage}` : null,
        params.preferences.length ? `Preferences: ${params.preferences.join(" | ")}` : null,
        params.openIssues.length ? `Open issues: ${params.openIssues.join(" | ")}` : null,
        params.recentTopics.length ? `Recent topics: ${params.recentTopics.join(" | ")}` : null,
    ].filter(Boolean)

    return lines.join("\n")
}

export async function upsertOmniContactMemory(
    adminDb: any,
    params: {
        chatbotId: string
        contactKey?: string | null
        canonicalContactId?: string | null
        displayName?: string | null
        channel: OmniChannel
        sourceSessionId?: string | null
        preferredLanguage?: string | null
        userMessage?: string | null
        assistantReply?: string | null
        lastDisposition?: string | null
        settings?: OmniCustomerMemorySettings | null
    }
): Promise<OmniContactMemoryRecord | null> {
    const identity = await resolveOmniContactIdentity(adminDb, {
        chatbotId: params.chatbotId,
        canonicalContactId: params.canonicalContactId || null,
        channel: params.channel,
        contactKey: params.contactKey || null,
    })
    const normalizedKey = normalizePhoneNumber(params.contactKey || "") || String(params.contactKey || "").trim().toLowerCase()
    const resolvedContactId = identity.canonicalContactId || normalizedKey
    if (!resolvedContactId) return null

    const settings = normalizeMemorySettings(params.settings)
    if (!settings.enabled) return null

    const docRef = adminDb.collection("omni_contact_memory").doc(memoryDocId(params.chatbotId, resolvedContactId))
    const snapshot = await docRef.get()
    const existing = snapshot.exists ? snapshot.data() || {} : {}
    const maxFacts = settings.maxFacts || 5

    const nextPreferences = settings.storePreferences
        ? uniqueStrings(
              [
                  ...(Array.isArray(existing.preferences) ? existing.preferences : []),
                  ...extractPreferenceFacts(String(params.userMessage || "")),
              ],
              maxFacts
          )
        : Array.isArray(existing.preferences)
          ? existing.preferences
          : []

    const nextOpenIssues = settings.storeOpenIssues
        ? uniqueStrings(
              [
                  ...(Array.isArray(existing.openIssues) ? existing.openIssues : []),
                  ...extractIssueFacts(String(params.userMessage || "")),
                  params.lastDisposition === "callback_requested" ? "Callback requested" : null,
              ],
              maxFacts
          )
        : Array.isArray(existing.openIssues)
          ? existing.openIssues
          : []

    const nextTopics = uniqueStrings(
        [
            ...(Array.isArray(existing.recentTopics) ? existing.recentTopics : []),
            truncateSentence(params.userMessage, 80),
            truncateSentence(params.assistantReply, 80),
        ],
        maxFacts
    )

    const summary = settings.storeConversationSummary
        ? buildSummary({
              displayName: params.displayName || existing.displayName || null,
              preferences: nextPreferences,
              openIssues: nextOpenIssues,
              recentTopics: nextTopics,
              preferredLanguage: params.preferredLanguage || existing.preferredLanguage || null,
          })
        : existing.summary || null

    const now = new Date()
    const payload = sanitizeObject({
        chatbotId: params.chatbotId,
        contactKey: normalizedKey || identity.contact?.contactKey || null,
        canonicalContactId: resolvedContactId,
        displayName: params.displayName || existing.displayName || null,
        preferredLanguage: params.preferredLanguage || existing.preferredLanguage || null,
        summary: summary || null,
        preferences: nextPreferences,
        openIssues: nextOpenIssues,
        recentTopics: nextTopics,
        lastChannel: params.channel || existing.lastChannel || null,
        lastDisposition: params.lastDisposition || existing.lastDisposition || null,
        sourceSessionIds: uniqueStrings([...(existing.sourceSessionIds || []), params.sourceSessionId || null], maxFacts),
        createdAt: existing.createdAt || now,
        updatedAt: now,
        lastInteractionAt: now,
    })

    await docRef.set(payload, { merge: true })
    return getOmniContactMemory(adminDb, params.chatbotId, normalizedKey, {
        channel: params.channel,
        canonicalContactId: resolvedContactId,
    })
}
