import { NextResponse } from "next/server"
import { updateOmniLead } from "@/lib/omni/leads"
import { authorizeOmniRequest, authorizedForOmniPermission, jsonError, upsertContactGraph } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const body = await req.json()
    const chatbotId = body.chatbotId

    if (!chatbotId || !id) {
        return jsonError("chatbotId and lead id are required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "operations.manage")) {
        return jsonError("Forbidden", 403)
    }

    try {
        const existingSnapshot = await authz.adminDb.collection("leads").doc(id).get()
        const existing = existingSnapshot.exists ? existingSnapshot.data() || {} : {}
        const sourceChannel = body.sourceChannel || existing.sourceChannel || "web"
        const contact =
            body.canonicalContactId || body.contactKey || body.phone || body.email
                ? await upsertContactGraph(authz.adminDb, {
                      chatbotId,
                      channel: sourceChannel,
                      canonicalContactId: body.canonicalContactId || existing.canonicalContactId || null,
                      contactKey: body.contactKey || body.phone || body.email || existing.contactKey || null,
                      displayName: body.name || existing.name || null,
                      verifiedPhone: sourceChannel === "voice" ? body.phone || existing.phone || null : null,
                      whatsappNumber: sourceChannel === "whatsapp" ? body.phone || existing.phone || null : null,
                      email: body.email || existing.email || null,
                      instagramHandle: sourceChannel === "instagram" ? body.contactKey || existing.contactKey || null : null,
                      notes: "Contact updated during Omni lead update.",
                  })
                : null

        const lead = await updateOmniLead(authz.adminDb, {
            id,
            chatbotId,
            name: body.name,
            email: body.email,
            phone: body.phone,
            source: body.source,
            status: body.status,
            sourceChannel,
            sourceSessionId: body.sourceSessionId,
            contactKey: contact?.contactKey || body.contactKey,
            canonicalContactId: contact?.id || body.canonicalContactId,
            assignedTo: body.assignedTo,
            notes: body.notes,
            customFields: body.customFields,
        })

        return NextResponse.json({ lead })
    } catch (error) {
        return jsonError(error instanceof Error ? error.message : "Failed to update lead", 400)
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const chatbotId = searchParams.get("chatbotId")

    if (!chatbotId || !id) {
        return jsonError("chatbotId and lead id are required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "operations.manage")) {
        return jsonError("Forbidden", 403)
    }

    const docRef = authz.adminDb.collection("leads").doc(id)
    const snapshot = await docRef.get()
    if (!snapshot.exists) {
        return jsonError("Lead not found", 404)
    }

    const existing = snapshot.data() || {}
    if (String(existing.chatbotId || "") !== chatbotId) {
        return jsonError("Lead does not belong to this tenant", 403)
    }

    await docRef.delete()
    return NextResponse.json({ ok: true })
}
