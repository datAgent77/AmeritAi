import type { GuidedSkillClientEvent, GuidedSkillMessageUi } from "@/lib/guided-skills/types"

export interface ChatSessionMessageRecord {
    id: string
    role: string
    content: string
    createdAt: string
    sentiment?: string
    externalId?: string
    guidedUi?: GuidedSkillMessageUi | null
    guidedEvent?: GuidedSkillClientEvent | null
}

export interface HydratedChatSessionMessage extends Omit<ChatSessionMessageRecord, "createdAt"> {
    createdAt: Date
}

function toIsoString(value: unknown) {
    if (!value) return new Date().toISOString()
    if (typeof value === "string") return value
    if (value instanceof Date) return value.toISOString()
    if (typeof (value as { toDate?: () => Date }).toDate === "function") {
        return (value as { toDate: () => Date }).toDate().toISOString()
    }
    return new Date().toISOString()
}

function asObject(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function stripUndefinedDeep<T>(value: T): T {
    if (Array.isArray(value)) {
        return value
            .map((item) => stripUndefinedDeep(item))
            .filter((item) => item !== undefined) as T
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .filter(([, item]) => item !== undefined)
                .map(([key, item]) => [key, stripUndefinedDeep(item)])
                .filter(([, item]) => item !== undefined)
        ) as T
    }

    return value
}

export function normalizeChatSessionMessage(message: unknown): ChatSessionMessageRecord | null {
    const record = asObject(message)
    const role = String(record.role || "").trim()
    const content = typeof record.content === "string" ? record.content : ""
    if (!role) return null

    return stripUndefinedDeep({
        id: String(record.id || `${Date.now()}`).trim(),
        role,
        content,
        createdAt: toIsoString(record.createdAt),
        sentiment: typeof record.sentiment === "string" ? record.sentiment : undefined,
        externalId: typeof record.externalId === "string" ? record.externalId : undefined,
        guidedUi: record.guidedUi && typeof record.guidedUi === "object" ? (record.guidedUi as GuidedSkillMessageUi) : undefined,
        guidedEvent: record.guidedEvent && typeof record.guidedEvent === "object" ? (record.guidedEvent as GuidedSkillClientEvent) : undefined,
    })
}

export function hydrateChatSessionMessage(message: unknown): HydratedChatSessionMessage | null {
    const normalized = normalizeChatSessionMessage(message)
    if (!normalized) return null
    return {
        ...normalized,
        createdAt: new Date(normalized.createdAt),
    }
}
