import { getAdminDb } from "@/lib/firebase-admin";

export type EventResult = "success" | "error" | "denied";

export interface EventActor {
    uid?: string;
    role?: string;
    ip?: string;
    user_agent?: string;
}

export interface PlatformEventLogInput {
    event_type: string;
    actor: EventActor;
    source_module: string;
    result: EventResult;
    target?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

function getRequesterIp(req: Request): string {
    return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || req.headers.get("x-real-ip")
        || "unknown";
}

export function buildActorFromRequest(
    req: Request,
    actorOverrides: Partial<EventActor> = {}
): EventActor {
    return {
        ip: getRequesterIp(req),
        user_agent: req.headers.get("user-agent") || "unknown",
        ...actorOverrides
    };
}

/**
 * Writes platform-level event logs for audit and outcome analytics.
 * Non-blocking by design: any failure is swallowed.
 */
export async function logPlatformEvent(input: PlatformEventLogInput): Promise<void> {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) return;

        await adminDb.collection("platform_event_logs").add({
            ...input,
            created_at: new Date().toISOString()
        });
    } catch (error) {
        console.warn("[EventLog] Failed to write event:", error);
    }
}
