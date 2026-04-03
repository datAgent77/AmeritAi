import type { OmniSmokeRunAction, OmniSmokeRunChannel, OmniSmokeRunRecord, OmniSmokeRunResult } from "@/lib/omni/types"
import { toIsoOrNull, toMillis } from "@/lib/omni/server-utils"

interface RecordOmniSmokeRunInput {
    chatbotId: string
    channel: OmniSmokeRunChannel
    provider: string
    action: OmniSmokeRunAction
    result: OmniSmokeRunResult
    source: string
    message?: string | null
    target?: string | null
    metadata?: Record<string, unknown>
}

function serializeOmniSmokeRun(data: Record<string, any>, id?: string): OmniSmokeRunRecord {
    return {
        id,
        chatbotId: data.chatbotId,
        channel: data.channel,
        provider: data.provider,
        action: data.action,
        result: data.result,
        source: data.source,
        message: data.message || null,
        target: data.target || null,
        metadata: data.metadata || {},
        createdAt: toIsoOrNull(data.createdAt),
    }
}

export async function recordOmniSmokeRun(adminDb: any, input: RecordOmniSmokeRunInput): Promise<OmniSmokeRunRecord> {
    const payload = {
        chatbotId: input.chatbotId,
        channel: input.channel,
        provider: input.provider,
        action: input.action,
        result: input.result,
        source: input.source,
        message: input.message || null,
        target: input.target || null,
        metadata: input.metadata || {},
        createdAt: new Date(),
    }

    const docRef = await adminDb.collection("omni_smoke_runs").add(payload)
    return serializeOmniSmokeRun(payload, docRef.id)
}

export async function listOmniSmokeRuns(
    adminDb: any,
    params: {
        chatbotId: string
        channel?: OmniSmokeRunChannel | null
        action?: OmniSmokeRunAction | null
        result?: OmniSmokeRunResult | null
        limit?: number
    }
) {
    let query: any = adminDb.collection("omni_smoke_runs").where("chatbotId", "==", params.chatbotId)
    if (params.channel) {
        query = query.where("channel", "==", params.channel)
    }

    const snapshot = await query.limit(Math.min(params.limit || 30, 100)).get()
    return snapshot.docs
        .map((doc: any) => serializeOmniSmokeRun(doc.data() || {}, doc.id))
        .filter((run: OmniSmokeRunRecord) => (params.action ? run.action === params.action : true))
        .filter((run: OmniSmokeRunRecord) => (params.result ? run.result === params.result : true))
        .sort((left: OmniSmokeRunRecord, right: OmniSmokeRunRecord) => toMillis(right.createdAt) - toMillis(left.createdAt))
}
