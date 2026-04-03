import { NextResponse } from "next/server"
import {
    authorizeOmniRequest,
    authorizedForOmniPermission,
    getOmniChannelConfig,
    jsonError,
    toIsoOrNull,
    toMillis,
    upsertCallbackRequest,
    upsertContactGraph,
} from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

async function syncCallbackContact(adminDb: any, body: Record<string, any>) {
    if (!body.chatbotId) return null

    const contactKey = body.contactKey || null
    const canonicalContactId = body.canonicalContactId || null
    if (!contactKey && !canonicalContactId) {
        return null
    }

    const sourceChannel = body.sourceChannel || "voice"
    return upsertContactGraph(adminDb, {
        chatbotId: body.chatbotId,
        channel: sourceChannel,
        canonicalContactId,
        contactKey,
        displayName: body.displayName || null,
        verifiedPhone: sourceChannel === "voice" ? contactKey : null,
        whatsappNumber: sourceChannel === "whatsapp" ? contactKey : null,
        instagramHandle: sourceChannel === "instagram" ? contactKey : null,
        notes: "Contact updated during Omni callback workflow.",
    })
}

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

    const snapshot = await authz.adminDb.collection("callback_requests").where("chatbotId", "==", chatbotId).get()
    const requests = snapshot.docs
        .map((doc: any) => {
            const data = doc.data() || {}
            return {
                id: doc.id,
                ...data,
                createdAt: toIsoOrNull(data.createdAt),
                updatedAt: toIsoOrNull(data.updatedAt),
                dueAt: toIsoOrNull(data.dueAt),
                lastAttemptAt: toIsoOrNull(data.lastAttemptAt),
            }
        })
        .sort((left: any, right: any) => toMillis(right.updatedAt || right.createdAt) - toMillis(left.updatedAt || left.createdAt))

    return NextResponse.json({ requests })
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
    const dueAt =
        body.dueAt ||
        (typeof operations.callbackSlaHours === "number"
            ? new Date(Date.now() + operations.callbackSlaHours * 60 * 60 * 1000).toISOString()
            : null)
    const contact = await syncCallbackContact(authz.adminDb, body)

    const request = await upsertCallbackRequest(authz.adminDb, {
        chatbotId,
        contactKey: contact?.contactKey || body.contactKey || null,
        canonicalContactId: contact?.id || body.canonicalContactId || null,
        displayName: body.displayName || null,
        owner: body.owner || operations.callbackAssignee || operations.defaultAssignee || null,
        priority: body.priority || "normal",
        status: body.status || "pending",
        dueAt,
        sourceSessionId: body.sourceSessionId || null,
        sourceChannel: body.sourceChannel || "voice",
        resolutionStatus: body.resolutionStatus || "open",
        notes: body.notes || null,
    })

    return NextResponse.json({ request })
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

    const contact = await syncCallbackContact(authz.adminDb, body)

    const request = await upsertCallbackRequest(authz.adminDb, {
        id,
        chatbotId,
        contactKey: contact?.contactKey || body.contactKey,
        canonicalContactId: contact?.id || body.canonicalContactId,
        displayName: body.displayName,
        owner: body.owner,
        priority: body.priority,
        status: body.status,
        dueAt: body.dueAt,
        sourceSessionId: body.sourceSessionId,
        sourceChannel: body.sourceChannel || "voice",
        resolutionStatus: body.resolutionStatus,
        notes: body.notes,
    })

    return NextResponse.json({ request })
}
