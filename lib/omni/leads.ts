import type { LeadStatus, OmniLeadRecord } from "@/lib/omni/types"
import { normalizePhoneNumber, toIsoOrNull } from "@/lib/omni/server-utils"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[0-9+\-() ]{6,20}$/

function normalizeLeadStatus(value?: string | null): LeadStatus {
    if (value === "contacted" || value === "qualified" || value === "converted" || value === "archived") {
        return value
    }
    return "new"
}

function normalizeText(value: unknown, fallback = "") {
    return String(value || fallback).trim()
}

export function serializeOmniLead(id: string, data: Record<string, any>): OmniLeadRecord {
    return {
        id,
        chatbotId: String(data.chatbotId || ""),
        name: String(data.name || "Anonymous"),
        email: String(data.email || ""),
        phone: String(data.phone || ""),
        source: String(data.source || "Omni Action"),
        status: normalizeLeadStatus(data.status),
        sourceChannel: data.sourceChannel || null,
        sourceSessionId: data.sourceSessionId || null,
        contactKey: data.contactKey || null,
        canonicalContactId: data.canonicalContactId || null,
        assignedTo: data.assignedTo || null,
        notes: data.notes || null,
        customFields: data.customFields || {},
        createdAt: toIsoOrNull(data.createdAt),
        updatedAt: toIsoOrNull(data.updatedAt),
    }
}

export async function createOmniLead(adminDb: any, input: {
    chatbotId: string
    name?: string | null
    email?: string | null
    phone?: string | null
    source?: string | null
    status?: LeadStatus
    sourceChannel?: OmniLeadRecord["sourceChannel"]
    sourceSessionId?: string | null
    contactKey?: string | null
    canonicalContactId?: string | null
    assignedTo?: string | null
    notes?: string | null
    customFields?: Record<string, unknown>
}) {
    const email = normalizeText(input.email).toLowerCase()
    const rawPhone = normalizeText(input.phone)
    const phone = rawPhone ? normalizePhoneNumber(rawPhone) || rawPhone : ""

    if (!normalizeText(input.name) && !email && !phone) {
        throw new Error("At least one lead contact field is required")
    }

    if (email && !EMAIL_PATTERN.test(email)) {
        throw new Error("Invalid email address")
    }

    if (rawPhone && !PHONE_PATTERN.test(rawPhone)) {
        throw new Error("Invalid phone number")
    }

    const doc = {
        chatbotId: input.chatbotId,
        name: normalizeText(input.name, "Anonymous") || "Anonymous",
        email,
        phone,
        source: normalizeText(input.source, "Omni Action") || "Omni Action",
        status: normalizeLeadStatus(input.status),
        sourceChannel: input.sourceChannel || null,
        sourceSessionId: input.sourceSessionId || null,
        contactKey: input.contactKey || phone || email || null,
        canonicalContactId: input.canonicalContactId || null,
        assignedTo: normalizeText(input.assignedTo) || null,
        notes: normalizeText(input.notes) || null,
        customFields: input.customFields || {},
        createdAt: new Date(),
        updatedAt: new Date(),
    }

    const docRef = await adminDb.collection("leads").add(doc)
    return serializeOmniLead(docRef.id, doc)
}

export async function updateOmniLead(adminDb: any, input: {
    id: string
    chatbotId: string
    name?: string | null
    email?: string | null
    phone?: string | null
    source?: string | null
    status?: LeadStatus
    sourceChannel?: OmniLeadRecord["sourceChannel"]
    sourceSessionId?: string | null
    contactKey?: string | null
    canonicalContactId?: string | null
    assignedTo?: string | null
    notes?: string | null
    customFields?: Record<string, unknown>
}) {
    const docRef = adminDb.collection("leads").doc(input.id)
    const snapshot = await docRef.get()
    if (!snapshot.exists) {
        throw new Error("Lead not found")
    }

    const existing = snapshot.data() || {}
    if (String(existing.chatbotId || "") !== input.chatbotId) {
        throw new Error("Lead does not belong to this tenant")
    }

    const email = input.email === undefined ? normalizeText(existing.email).toLowerCase() : normalizeText(input.email).toLowerCase()
    const rawPhone = input.phone === undefined ? normalizeText(existing.phone) : normalizeText(input.phone)
    const phone = rawPhone ? normalizePhoneNumber(rawPhone) || rawPhone : ""

    if (!normalizeText(input.name ?? existing.name) && !email && !phone) {
        throw new Error("At least one lead contact field is required")
    }

    if (email && !EMAIL_PATTERN.test(email)) {
        throw new Error("Invalid email address")
    }

    if (rawPhone && !PHONE_PATTERN.test(rawPhone)) {
        throw new Error("Invalid phone number")
    }

    const nextDoc = {
        name: normalizeText(input.name ?? existing.name, "Anonymous") || "Anonymous",
        email,
        phone,
        source: normalizeText(input.source ?? existing.source, "Omni Action") || "Omni Action",
        status: normalizeLeadStatus(input.status ?? existing.status),
        sourceChannel: input.sourceChannel ?? existing.sourceChannel ?? null,
        sourceSessionId: input.sourceSessionId ?? existing.sourceSessionId ?? null,
        contactKey: input.contactKey ?? existing.contactKey ?? (phone || email || null),
        canonicalContactId: input.canonicalContactId ?? existing.canonicalContactId ?? null,
        assignedTo: normalizeText(input.assignedTo ?? existing.assignedTo) || null,
        notes: normalizeText(input.notes ?? existing.notes) || null,
        customFields: input.customFields ?? existing.customFields ?? {},
        updatedAt: new Date(),
    }

    await docRef.set(nextDoc, { merge: true })
    const refreshed = await docRef.get()
    return serializeOmniLead(input.id, refreshed.data() || {})
}
