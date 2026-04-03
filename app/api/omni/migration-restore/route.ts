import { NextResponse } from "next/server"
import { getOmniMigrationSnapshot } from "@/lib/omni/migration-snapshots"
import { authorizeOmniRequest, authorizedForOmniPermission, jsonError, sanitizeObject } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const body = await req.json()
    const chatbotId = body.chatbotId
    const snapshotId = body.snapshotId

    if (!chatbotId) {
        return jsonError("chatbotId is required", 400)
    }

    if (!snapshotId) {
        return jsonError("snapshotId is required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "settings.manage")) {
        return jsonError("Forbidden", 403)
    }

    const snapshot = await getOmniMigrationSnapshot(authz.adminDb, snapshotId)
    if (!snapshot || snapshot.chatbotId !== chatbotId) {
        return jsonError("Migration snapshot not found", 404)
    }

    const now = new Date()
    const restorePayload = sanitizeObject({
        chatbotId,
        whatsapp: snapshot.config?.whatsapp || {},
        assistantCore: snapshot.config?.assistantCore || {},
        operations: snapshot.config?.operations || {},
        migration: {
            ...(snapshot.config?.migration || {}),
            lastRestoredAt: now,
            lastRestoredSnapshotId: snapshotId,
            lastRestoreAction: snapshot.action,
        },
        updatedAt: now,
    })

    const configRef = authz.adminDb.collection("omni_channel_configs").doc(chatbotId)
    await configRef.set(restorePayload, {
        mergeFields: ["chatbotId", "whatsapp", "assistantCore", "operations", "migration", "updatedAt"],
    })

    const restoredConfigSnapshot = await configRef.get()
    const restoredConfig = restoredConfigSnapshot.exists ? restoredConfigSnapshot.data() || {} : { chatbotId }

    await authz.adminDb.collection("omni_migration_snapshots").doc(snapshotId).set(
        {
            restoredAt: now,
            restoreCount: (snapshot.restoreCount || 0) + 1,
            lastRestoreBy: authz.callerUid,
        },
        { merge: true }
    )

    return NextResponse.json({
        ok: true,
        snapshotId,
        restoredSections: ["whatsapp", "assistantCore", "operations", "migration"],
        whatsapp: restoredConfig.whatsapp || {},
        assistantCore: restoredConfig.assistantCore || {},
        operations: restoredConfig.operations || {},
        migration: restoredConfig.migration || {},
    })
}
