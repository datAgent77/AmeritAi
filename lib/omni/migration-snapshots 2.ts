import type { OmniMigrationSnapshotRecord } from "@/lib/omni/types"
import { toIsoOrNull, toMillis } from "@/lib/omni/server-utils"

function serializeOmniMigrationSnapshot(data: Record<string, any>, id?: string): OmniMigrationSnapshotRecord {
    return {
        id,
        chatbotId: data.chatbotId,
        source: data.source || "migration-sync",
        action: data.action || "run_all",
        applied: Array.isArray(data.applied) ? data.applied : [],
        config: {
            whatsapp: data.config?.whatsapp || {},
            assistantCore: data.config?.assistantCore || {},
            operations: data.config?.operations || {},
            migration: data.config?.migration || {},
        },
        createdAt: toIsoOrNull(data.createdAt),
        restoredAt: toIsoOrNull(data.restoredAt),
        restoreCount: Number.isFinite(Number(data.restoreCount)) ? Number(data.restoreCount) : 0,
        lastRestoreBy: data.lastRestoreBy || null,
    }
}

export async function listOmniMigrationSnapshots(
    adminDb: any,
    params: {
        chatbotId: string
        limit?: number
    }
) {
    const snapshot = await adminDb.collection("omni_migration_snapshots").where("chatbotId", "==", params.chatbotId).limit(Math.min(params.limit || 10, 50)).get()
    return snapshot.docs
        .map((doc: any) => serializeOmniMigrationSnapshot(doc.data() || {}, doc.id))
        .sort((left: OmniMigrationSnapshotRecord, right: OmniMigrationSnapshotRecord) => toMillis(right.createdAt) - toMillis(left.createdAt))
}

export async function getOmniMigrationSnapshot(adminDb: any, snapshotId: string) {
    const snapshot = await adminDb.collection("omni_migration_snapshots").doc(snapshotId).get()
    if (!snapshot.exists) {
        return null
    }

    return serializeOmniMigrationSnapshot(snapshot.data() || {}, snapshot.id)
}
