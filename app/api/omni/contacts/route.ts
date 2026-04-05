import { NextResponse } from "next/server"
import { authorizeOmniRequest, authorizedForOmniPermission, jsonError, toIsoOrNull, toMillis, upsertContactGraph } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const chatbotId = searchParams.get("chatbotId")

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

    const snapshot = await authz.adminDb.collection("contact_graph").where("chatbotId", "==", chatbotId).get()
    const contacts = snapshot.docs
        .map((doc: any) => {
            const data = doc.data() || {}
            return {
                id: doc.id,
                ...data,
                createdAt: toIsoOrNull(data.createdAt),
                updatedAt: toIsoOrNull(data.updatedAt),
                lastInteractionAt: toIsoOrNull(data.lastInteractionAt),
            }
        })
        .sort((left: any, right: any) => toMillis(right.lastInteractionAt || right.updatedAt) - toMillis(left.lastInteractionAt || left.updatedAt))

    return NextResponse.json({ contacts })
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

    const contact = await upsertContactGraph(authz.adminDb, {
        chatbotId,
        channel: body.channel || "web",
        contactKey: body.contactKey || null,
        displayName: body.displayName || null,
        verifiedPhone: body.verifiedPhone || null,
        whatsappNumber: body.whatsappNumber || null,
        email: body.email || null,
        instagramHandle: body.instagramHandle || null,
        notes: body.notes || null,
        manualMergeReview: body.manualMergeReview ?? false,
    })

    return NextResponse.json({ contact })
}

export async function PATCH(req: Request) {
    const body = await req.json()
    const chatbotId = body.chatbotId
    const id = body.id

    if (!chatbotId || !id) {
        return jsonError("chatbotId and id are required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "operations.manage")) {
        return jsonError("Forbidden", 403)
    }

    const docRef = authz.adminDb.collection("contact_graph").doc(id)
    const snapshot = await docRef.get()
    if (!snapshot.exists) {
        return jsonError("contact not found", 404)
    }

    const existing = snapshot.data() || {}
    const contact = await upsertContactGraph(authz.adminDb, {
        chatbotId,
        channel: body.channel || existing.linkedChannels?.[0] || "web",
        canonicalContactId: id,
        contactKey: body.contactKey ?? existing.contactKey ?? null,
        displayName: body.displayName ?? existing.displayName ?? null,
        verifiedPhone: body.verifiedPhone ?? existing.verifiedPhone ?? null,
        whatsappNumber: body.whatsappNumber ?? existing.whatsappNumber ?? null,
        email: body.email ?? existing.email ?? null,
        instagramHandle: body.instagramHandle ?? existing.instagramHandle ?? null,
        notes: body.notes ?? existing.notes ?? null,
        manualMergeReview: body.manualMergeReview ?? existing.manualMergeReview ?? false,
    })

    await docRef.set(
        {
            mergedInto: body.mergedInto ?? existing.mergedInto ?? null,
            linkedContactIds: body.linkedContactIds ?? existing.linkedContactIds ?? [],
            linkedContactKeys: body.linkedContactKeys ?? contact.linkedContactKeys ?? existing.linkedContactKeys ?? [],
            updatedAt: new Date(),
            lastInteractionAt: body.lastInteractionAt ? new Date(body.lastInteractionAt) : existing.lastInteractionAt || new Date(),
        },
        { merge: true }
    )

    const nextSnapshot = await docRef.get()
    const next = nextSnapshot.data() || {}

    return NextResponse.json({
        contact: {
            id,
            ...next,
            createdAt: toIsoOrNull(next.createdAt),
            updatedAt: toIsoOrNull(next.updatedAt),
            lastInteractionAt: toIsoOrNull(next.lastInteractionAt),
        },
    })
}
