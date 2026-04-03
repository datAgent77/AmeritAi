import { NextResponse } from "next/server"
import { getOmniContactMemory } from "@/lib/omni/memory"
import { authorizeOmniRequest, authorizedForOmniPermission, jsonError, normalizePhoneNumber, resolveOmniContactIdentity, toIsoOrNull, toMillis } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

function unique(values: Array<string | null | undefined>) {
    return Array.from(new Set(values.filter(Boolean))) as string[]
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const chatbotId = searchParams.get("chatbotId")
    const contactId = searchParams.get("contactId")
    const contactKey = searchParams.get("contactKey")

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

    let rawContact: any = null
    if (contactId) {
        const contactSnapshot = await authz.adminDb.collection("contact_graph").doc(contactId).get()
        if (contactSnapshot.exists) {
            rawContact = contactSnapshot.data() || null
        }
    }

    const identity = await resolveOmniContactIdentity(authz.adminDb, {
        chatbotId,
        canonicalContactId: contactId || rawContact?.canonicalContactId || null,
        contactKey: contactKey || rawContact?.contactKey || null,
        verifiedPhone: rawContact?.verifiedPhone || null,
        whatsappNumber: rawContact?.whatsappNumber || null,
        email: rawContact?.email || null,
        instagramHandle: rawContact?.instagramHandle || null,
    })
    const contact = identity.contact || rawContact
    const canonicalContactId = identity.canonicalContactId || rawContact?.canonicalContactId || contactId || null
    const relatedContactIds = unique([
        canonicalContactId,
        contactId || null,
        ...(contact?.linkedContactIds || []),
        ...(rawContact?.linkedContactIds || []),
    ])

    const keys = unique([
        contactKey || null,
        contact?.contactKey || null,
        rawContact?.contactKey || null,
        normalizePhoneNumber(contact?.verifiedPhone || null),
        normalizePhoneNumber(rawContact?.verifiedPhone || null),
        normalizePhoneNumber(contact?.whatsappNumber || null),
        normalizePhoneNumber(rawContact?.whatsappNumber || null),
        contact?.email || null,
        rawContact?.email || null,
        contact?.instagramHandle || null,
        rawContact?.instagramHandle || null,
        ...(contact?.linkedContactKeys || []),
        ...(rawContact?.linkedContactKeys || []),
    ])

    if (keys.length === 0 && relatedContactIds.length === 0) {
        return NextResponse.json({ timeline: [], keys, canonicalContactId, relatedContactIds })
    }

    const sessionMap = new Map<string, any>()
    const callbackMap = new Map<string, any>()

    if (relatedContactIds.length > 0) {
        const [canonicalSessions, canonicalCallbacks] = await Promise.all([
            Promise.all(
                relatedContactIds.map((id) =>
                    authz.adminDb.collection("chat_sessions").where("chatbotId", "==", chatbotId).where("canonicalContactId", "==", id).limit(50).get()
                )
            ),
            Promise.all(
                relatedContactIds.map((id) =>
                    authz.adminDb.collection("callback_requests").where("chatbotId", "==", chatbotId).where("canonicalContactId", "==", id).limit(50).get()
                )
            ),
        ])

        canonicalSessions.flatMap((snapshot: any) => snapshot.docs).forEach((doc: any) => {
            sessionMap.set(doc.id, { id: doc.id, ...doc.data() })
        })

        canonicalCallbacks.flatMap((snapshot: any) => snapshot.docs).forEach((doc: any) => {
            callbackMap.set(doc.id, { id: doc.id, ...doc.data() })
        })
    }

    for (const key of keys) {
        const sessionSnapshot = await authz.adminDb.collection("chat_sessions").where("chatbotId", "==", chatbotId).where("contactKey", "==", key).limit(25).get()
        sessionSnapshot.docs.forEach((doc: any) => {
            sessionMap.set(doc.id, { id: doc.id, ...doc.data() })
        })

        const callbackSnapshot = await authz.adminDb.collection("callback_requests").where("chatbotId", "==", chatbotId).where("contactKey", "==", key).limit(25).get()
        callbackSnapshot.docs.forEach((doc: any) => {
            callbackMap.set(doc.id, { id: doc.id, ...doc.data() })
        })
    }

    const [appointmentsSnapshot, leadsSnapshot] = await Promise.all([
        authz.adminDb.collection("appointments").where("chatbotId", "==", chatbotId).limit(250).get(),
        authz.adminDb.collection("leads").where("chatbotId", "==", chatbotId).limit(250).get(),
    ])

    const matchesKey = (value?: string | null) => {
        if (!value) return false
        const normalized = normalizePhoneNumber(value) || String(value).trim().toLowerCase()
        return keys.includes(normalized) || keys.includes(String(value).trim().toLowerCase()) || keys.includes(String(value))
    }

    const appointmentItems = appointmentsSnapshot.docs
        .map((doc: any) => ({ id: doc.id, ...doc.data() }))
        .filter((appointment: Record<string, any>) =>
            (appointment.canonicalContactId && relatedContactIds.includes(appointment.canonicalContactId)) ||
            matchesKey(appointment.contactKey) ||
            matchesKey(appointment.customerEmail) ||
            matchesKey(appointment.customerPhone) ||
            (contactId && appointment.sourceSessionId && sessionMap.has(appointment.sourceSessionId)) ||
            (contactId && appointment.sessionId && sessionMap.has(appointment.sessionId))
        )

    const leadItems = leadsSnapshot.docs
        .map((doc: any) => ({ id: doc.id, ...doc.data() }))
        .filter((lead: Record<string, any>) =>
            (lead.canonicalContactId && relatedContactIds.includes(lead.canonicalContactId)) ||
            matchesKey(lead.contactKey) ||
            matchesKey(lead.email) ||
            matchesKey(lead.phone) ||
            (contactId && lead.sourceSessionId && sessionMap.has(lead.sourceSessionId))
        )

    const timeline = [
        ...Array.from(sessionMap.values()).map((session) => ({
            id: session.id,
            type: "session",
            channel: session.channel || "web",
            title: session.visitorName || session.contactKey || session.id,
            subtitle: session.transcriptSummary || session.lastDisposition || "Conversation activity",
            status: session.lastDisposition || null,
            createdAt: toIsoOrNull(session.createdAt),
            updatedAt: toIsoOrNull(session.updatedAt),
            sourceSessionId: session.id,
        })),
        ...Array.from(callbackMap.values()).map((callback) => ({
            id: callback.id,
            type: "callback",
            channel: callback.sourceChannel || "voice",
            title: callback.displayName || callback.contactKey || callback.id,
            subtitle: callback.notes || callback.status || "Callback activity",
            status: callback.resolutionStatus || callback.status || null,
            createdAt: toIsoOrNull(callback.createdAt),
            updatedAt: toIsoOrNull(callback.updatedAt),
            sourceSessionId: callback.sourceSessionId || null,
        })),
        ...appointmentItems.map((appointment: Record<string, any>) => ({
            id: appointment.id,
            type: "appointment",
            channel: appointment.sourceChannel || "web",
            title: appointment.customerName || appointment.contactKey || appointment.id,
            subtitle: `${appointment.date || "No date"} ${appointment.time || ""}`.trim(),
            status: appointment.status || null,
            createdAt: toIsoOrNull(appointment.createdAt),
            updatedAt: toIsoOrNull(appointment.updatedAt),
            sourceSessionId: appointment.sourceSessionId || appointment.sessionId || null,
        })),
        ...leadItems.map((lead: Record<string, any>) => ({
            id: lead.id,
            type: "lead",
            channel: lead.sourceChannel || "web",
            title: lead.name || lead.contactKey || lead.id,
            subtitle: lead.source || "Lead activity",
            status: lead.assignedTo || null,
            createdAt: toIsoOrNull(lead.createdAt),
            updatedAt: toIsoOrNull(lead.updatedAt),
            sourceSessionId: lead.sourceSessionId || null,
        })),
    ].sort((left, right) => toMillis(right.updatedAt || right.createdAt) - toMillis(left.updatedAt || left.createdAt))

    let memory = null
    if (canonicalContactId) {
        memory = await getOmniContactMemory(authz.adminDb, chatbotId, contact?.contactKey || contactKey || canonicalContactId, {
            canonicalContactId,
        })
    }
    for (const key of keys) {
        if (memory) break
        memory = await getOmniContactMemory(authz.adminDb, chatbotId, key)
    }

    return NextResponse.json({ timeline, keys, canonicalContactId, relatedContactIds, memory })
}
