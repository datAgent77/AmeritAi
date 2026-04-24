import { NextResponse } from "next/server"
import { authorizeOmniAppRequest } from "@/lib/omni-app/server"
import { authorizedForOmniPermission, toIsoOrNull, toMillis } from "@/lib/omni/server-utils"
import type { CallbackRequestRecord, ContactGraphRecord } from "@/lib/omni/types"

export const dynamic = "force-dynamic"

function collectSignatures(contact: any) {
    return new Set(
        [
            contact.id,
            contact.contactKey,
            contact.verifiedPhone,
            contact.whatsappNumber,
            contact.email,
            ...(Array.isArray(contact.linkedContactKeys) ? contact.linkedContactKeys : []),
        ]
            .filter(Boolean)
            .map((value) => String(value).trim().toLowerCase())
    )
}

function matchesContact(record: any, signatures: Set<string>) {
    const values = [
        record?.contactId,
        record?.canonicalContactId,
        record?.contactKey,
        record?.phone,
        record?.verifiedPhone,
        record?.whatsappNumber,
        record?.email,
        record?.visitorEmail,
    ]
        .filter(Boolean)
        .map((value) => String(value).trim().toLowerCase())

    return values.some((value) => signatures.has(value))
}

type UserLeadRecord = {
    id: string
    status?: string | null
    contactId?: string | null
    canonicalContactId?: string | null
    contactKey?: string | null
    phone?: string | null
    verifiedPhone?: string | null
    whatsappNumber?: string | null
    email?: string | null
    visitorEmail?: string | null
}

type UserAppointmentRecord = {
    id: string
    status?: string | null
    contactId?: string | null
    canonicalContactId?: string | null
    contactKey?: string | null
    phone?: string | null
    verifiedPhone?: string | null
    whatsappNumber?: string | null
    email?: string | null
    visitorEmail?: string | null
}

type UserSummaryRow = {
    id: string
    displayName: string | null
    primaryIdentity: string | null
    linkedChannels: string[]
    leadCount: number
    appointmentCount: number
    callbackCount: number
    requiresReview: boolean
    lastInteractionAt: string | null
    sortValue: number
}

export async function GET(req: Request) {
    const authz = await authorizeOmniAppRequest(req)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "operations.view")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const [contactsSnapshot, leadsSnapshot, appointmentsSnapshot, callbacksSnapshot] = await Promise.all([
        authz.adminDb.collection("contact_graph").where("chatbotId", "==", authz.chatbotId).get(),
        authz.adminDb.collection("leads").where("chatbotId", "==", authz.chatbotId).get(),
        authz.adminDb.collection("appointments").where("chatbotId", "==", authz.chatbotId).get(),
        authz.adminDb.collection("callback_requests").where("chatbotId", "==", authz.chatbotId).get(),
    ])

    const leads = leadsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) })) as UserLeadRecord[]
    const appointments = appointmentsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) })) as UserAppointmentRecord[]
    const callbacks = callbacksSnapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) })) as CallbackRequestRecord[]

    const items = contactsSnapshot.docs
        .map((doc: any) => {
            const contact = { id: doc.id, ...(doc.data() || {}) } as ContactGraphRecord & { id: string }
            const signatures = collectSignatures(contact)
            const leadCount = leads.filter((lead: UserLeadRecord) => matchesContact(lead, signatures) && ["new", "contacted", "qualified"].includes(String(lead.status || ""))).length
            const appointmentCount = appointments.filter((appointment: UserAppointmentRecord) => matchesContact(appointment, signatures) && ["pending", "confirmed"].includes(String(appointment.status || ""))).length
            const callbackCount = callbacks.filter(
                (callback: CallbackRequestRecord) => matchesContact(callback, signatures) && callback.resolutionStatus !== "completed" && callback.status !== "resolved"
            ).length

            return {
                id: contact.id,
                displayName: contact.displayName || null,
                primaryIdentity: contact.email || contact.verifiedPhone || contact.whatsappNumber || contact.contactKey || null,
                linkedChannels: Array.isArray(contact.linkedChannels) ? contact.linkedChannels : [],
                leadCount,
                appointmentCount,
                callbackCount,
                requiresReview: contact.manualMergeReview === true || Boolean(contact.mergedInto),
                lastInteractionAt: toIsoOrNull(contact.lastInteractionAt || contact.updatedAt),
                sortValue: toMillis(contact.lastInteractionAt || contact.updatedAt),
            }
        })
        .sort((left: UserSummaryRow, right: UserSummaryRow) => right.sortValue - left.sortValue)

    return NextResponse.json({
        summary: {
            total: items.length,
            reviewCount: items.filter((item: UserSummaryRow) => item.requiresReview).length,
            openLeads: items.reduce((sum: number, item: UserSummaryRow) => sum + item.leadCount, 0),
            openAppointments: items.reduce((sum: number, item: UserSummaryRow) => sum + item.appointmentCount, 0),
        },
        items: items.map(({ sortValue, ...item }: UserSummaryRow) => item),
    })
}
