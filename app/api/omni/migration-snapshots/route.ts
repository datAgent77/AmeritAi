import { NextResponse } from "next/server"
import { listOmniMigrationSnapshots } from "@/lib/omni/migration-snapshots"
import { authorizeOmniRequest, authorizedForOmniPermission, jsonError } from "@/lib/omni/server-utils"
import type { OmniMigrationSnapshotRecord } from "@/lib/omni/types"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const chatbotId = searchParams.get("chatbotId")
    const limit = Math.min(Number(searchParams.get("limit") || "8"), 20)

    if (!chatbotId) {
        return jsonError("chatbotId is required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "settings.view")) {
        return jsonError("Forbidden", 403)
    }

    const snapshots = await listOmniMigrationSnapshots(authz.adminDb, {
        chatbotId,
        limit,
    })

    return NextResponse.json({
        snapshots: snapshots.map((snapshot: OmniMigrationSnapshotRecord) => ({
            ...snapshot,
            configSummary: {
                whatsappPhoneNumberId: String(snapshot.config?.whatsapp?.phoneNumberId || "") || null,
                hasBrandVoicePrompt: Boolean(snapshot.config?.assistantCore?.brandVoicePrompt),
                workspaceLabel: String(snapshot.config?.operations?.workspaceLabel || "") || null,
            },
        })),
        summary: {
            total: snapshots.length,
            restored: snapshots.filter((snapshot: OmniMigrationSnapshotRecord) => Boolean(snapshot.restoredAt)).length,
        },
    })
}
