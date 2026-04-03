import { NextResponse } from "next/server"
import { authorizeOmniRequest, authorizedForOmniPermission, jsonError, normalizePhoneNumber, toIsoOrNull } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

function unique(values: Array<string | null | undefined>) {
    return Array.from(new Set(values.filter(Boolean))) as string[]
}

function serializeContact(id: string, data: any) {
    return {
        id,
        ...data,
        createdAt: toIsoOrNull(data.createdAt),
        updatedAt: toIsoOrNull(data.updatedAt),
        lastInteractionAt: toIsoOrNull(data.lastInteractionAt),
    }
}

export async function POST(req: Request) {
    const body = await req.json()
    const chatbotId = body.chatbotId
    const sourceId = body.sourceId
    const targetId = body.targetId

    if (!chatbotId || !sourceId || !targetId) {
        return jsonError("chatbotId, sourceId, and targetId are required", 400)
    }

    if (sourceId === targetId) {
        return jsonError("sourceId and targetId must be different", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "operations.manage")) {
        return jsonError("Forbidden", 403)
    }

    const sourceRef = authz.adminDb.collection("contact_graph").doc(sourceId)
    const targetRef = authz.adminDb.collection("contact_graph").doc(targetId)
    const [sourceSnapshot, targetSnapshot] = await Promise.all([sourceRef.get(), targetRef.get()])

    if (!sourceSnapshot.exists || !targetSnapshot.exists) {
        return jsonError("source or target contact not found", 404)
    }

    const source = sourceSnapshot.data() || {}
    const target = targetSnapshot.data() || {}
    const now = new Date()

    const nextTarget = {
        displayName: target.displayName || source.displayName || null,
        contactKey: target.contactKey || source.contactKey || source.verifiedPhone || source.whatsappNumber || source.email || source.instagramHandle || null,
        verifiedPhone: target.verifiedPhone || source.verifiedPhone || null,
        whatsappNumber: target.whatsappNumber || source.whatsappNumber || null,
        email: target.email || source.email || null,
        instagramHandle: target.instagramHandle || source.instagramHandle || null,
        linkedChannels: unique([...(target.linkedChannels || []), ...(source.linkedChannels || [])]),
        linkedContactIds: unique([...(target.linkedContactIds || []), ...(source.linkedContactIds || []), sourceId]),
        linkedContactKeys: unique([
            ...(target.linkedContactKeys || []),
            ...(source.linkedContactKeys || []),
            target.contactKey || null,
            source.contactKey || null,
            normalizePhoneNumber(target.verifiedPhone || null),
            normalizePhoneNumber(source.verifiedPhone || null),
            normalizePhoneNumber(target.whatsappNumber || null),
            normalizePhoneNumber(source.whatsappNumber || null),
            target.email || null,
            source.email || null,
            target.instagramHandle || null,
            source.instagramHandle || null,
        ]),
        notes: [target.notes, source.notes].filter(Boolean).join("\n\n").trim() || null,
        manualMergeReview: false,
        updatedAt: now,
        lastInteractionAt: source.lastInteractionAt || target.lastInteractionAt || now,
    }

    const nextSource = {
        mergedInto: targetId,
        manualMergeReview: false,
        updatedAt: now,
    }

    await Promise.all([
        targetRef.set(nextTarget, { merge: true }),
        sourceRef.set(nextSource, { merge: true }),
    ])

    const [nextSourceSnapshot, nextTargetSnapshot] = await Promise.all([sourceRef.get(), targetRef.get()])

    return NextResponse.json({
        target: serializeContact(targetId, nextTargetSnapshot.data() || {}),
        source: serializeContact(sourceId, nextSourceSnapshot.data() || {}),
    })
}
