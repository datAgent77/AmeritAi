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

    if (!chatbotId || !sourceId) {
        return jsonError("chatbotId and sourceId are required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "operations.manage")) {
        return jsonError("Forbidden", 403)
    }

    const sourceRef = authz.adminDb.collection("contact_graph").doc(sourceId)
    const sourceSnapshot = await sourceRef.get()
    if (!sourceSnapshot.exists) {
        return jsonError("source contact not found", 404)
    }

    const source = sourceSnapshot.data() || {}
    const targetId = source.mergedInto
    if (!targetId) {
        return jsonError("source contact is not merged", 400)
    }

    const targetRef = authz.adminDb.collection("contact_graph").doc(targetId)
    const targetSnapshot = await targetRef.get()
    if (!targetSnapshot.exists) {
        return jsonError("target contact not found", 404)
    }

    const target = targetSnapshot.data() || {}
    const now = new Date()
    const sourceKeys = unique([
        source.contactKey || null,
        normalizePhoneNumber(source.verifiedPhone || null),
        normalizePhoneNumber(source.whatsappNumber || null),
        source.email || null,
        source.instagramHandle || null,
    ])

    await Promise.all([
        sourceRef.set(
            {
                mergedInto: null,
                updatedAt: now,
            },
            { merge: true }
        ),
        targetRef.set(
            {
                linkedContactIds: (target.linkedContactIds || []).filter((id: string) => id !== sourceId),
                linkedContactKeys: (target.linkedContactKeys || []).filter((key: string) => !sourceKeys.includes(key)),
                updatedAt: now,
            },
            { merge: true }
        ),
    ])

    const [nextSourceSnapshot, nextTargetSnapshot] = await Promise.all([sourceRef.get(), targetRef.get()])

    return NextResponse.json({
        source: serializeContact(sourceId, nextSourceSnapshot.data() || {}),
        target: serializeContact(targetId, nextTargetSnapshot.data() || {}),
    })
}
