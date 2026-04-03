import { NextResponse } from "next/server"
import { createOmniLead, serializeOmniLead } from "@/lib/omni/leads"
import { authorizeOmniRequest, authorizedForOmniPermission, getOmniChannelConfig, jsonError, toMillis, upsertContactGraph } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const chatbotId = searchParams.get("chatbotId")
    const status = searchParams.get("status")

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

    const snapshot = await authz.adminDb.collection("leads").where("chatbotId", "==", chatbotId).get()
    const leads = snapshot.docs
        .map((doc: any) => serializeOmniLead(doc.id, doc.data() || {}))
        .filter((lead: ReturnType<typeof serializeOmniLead>) => !status || lead.status === status)
        .sort(
            (left: ReturnType<typeof serializeOmniLead>, right: ReturnType<typeof serializeOmniLead>) =>
                toMillis(right.updatedAt || right.createdAt) - toMillis(left.updatedAt || left.createdAt)
        )

    return NextResponse.json({ leads })
}

export async function POST(req: Request) {
    const body = await req.json()
    const chatbotId = body.chatbotId

    if (!chatbotId) {
        return jsonError("chatbotId is required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "operations.manage")) {
        return jsonError("Forbidden", 403)
    }

    const config = await getOmniChannelConfig(authz.adminDb, chatbotId)
    const operations = config.operations || {}

    try {
        const contact = await upsertContactGraph(authz.adminDb, {
            chatbotId,
            channel: body.sourceChannel || "web",
            canonicalContactId: body.canonicalContactId || null,
            contactKey: body.contactKey || body.phone || body.email || null,
            displayName: body.name || null,
            verifiedPhone: body.sourceChannel === "voice" ? body.phone || null : null,
            whatsappNumber: body.sourceChannel === "whatsapp" ? body.phone || null : null,
            email: body.email || null,
            notes: "Contact updated during Omni lead creation.",
        })
        const lead = await createOmniLead(authz.adminDb, {
            chatbotId,
            name: body.name || "Anonymous",
            email: body.email || null,
            phone: body.phone || null,
            source: body.source || "Omni Lead Desk",
            status: body.status || "new",
            sourceChannel: body.sourceChannel || "web",
            sourceSessionId: body.sourceSessionId || null,
            contactKey: contact.contactKey || body.contactKey || null,
            canonicalContactId: contact.id || body.canonicalContactId || null,
            assignedTo: body.assignedTo || operations.leadAssignee || operations.defaultAssignee || null,
            notes: body.notes || null,
            customFields: body.customFields || {},
        })

        return NextResponse.json({ lead }, { status: 201 })
    } catch (error) {
        return jsonError(error instanceof Error ? error.message : "Failed to create lead", 400)
    }
}
