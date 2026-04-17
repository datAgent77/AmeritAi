import crypto from "crypto";
import { getAdminDb } from "@/lib/firebase-admin";

const OAUTH_STATE_COLLECTION = "_oauth_states";
const DEFAULT_TTL_SECONDS = 10 * 60;

export interface OAuthStatePayload {
    provider: string;
    userId: string;
    apiKey?: string;
    apiSecret?: string;
    verifyToken?: string;
    appConfigSource?: "platform" | "tenant";
    chatbotId?: string;
    selectedChannels?: string[];
    returnPath?: string;
}

interface OAuthStateRecord extends OAuthStatePayload {
    createdAt: number;
    expiresAt: number;
}

export async function createOAuthState(payload: OAuthStatePayload, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<string> {
    const adminDb = getAdminDb();
    if (!adminDb) {
        throw new Error("Firebase Admin not initialized");
    }

    const now = Date.now();
    const stateId = crypto.randomBytes(32).toString("hex");
    const sanitizedPayload = Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined)
    ) as OAuthStatePayload;
    const record: OAuthStateRecord = {
        ...sanitizedPayload,
        createdAt: now,
        expiresAt: now + ttlSeconds * 1000
    };

    await adminDb.collection(OAUTH_STATE_COLLECTION).doc(stateId).set(record);
    return stateId;
}

export async function consumeOAuthState(stateId: string, expectedProvider: string): Promise<OAuthStatePayload | null> {
    if (!stateId) return null;

    const adminDb = getAdminDb();
    if (!adminDb) return null;

    const stateRef = adminDb.collection(OAUTH_STATE_COLLECTION).doc(stateId);
    const stateSnap = await stateRef.get();
    if (!stateSnap.exists) return null;

    const data = stateSnap.data() as Partial<OAuthStateRecord> | undefined;
    const provider = data?.provider;
    const userId = data?.userId;
    const expiresAt = typeof data?.expiresAt === "number" ? data.expiresAt : 0;

    if (expiresAt <= Date.now()) {
        await stateRef.delete().catch(() => { });
        return null;
    }

    if (provider !== expectedProvider || !userId) {
        return null;
    }

    // One-time use state token.
    await stateRef.delete().catch(() => { });

    return {
        provider,
        userId,
        apiKey: data?.apiKey,
        apiSecret: data?.apiSecret,
        verifyToken: typeof data?.verifyToken === "string" ? data.verifyToken : undefined,
        appConfigSource: data?.appConfigSource === "platform" || data?.appConfigSource === "tenant" ? data.appConfigSource : undefined,
        chatbotId: typeof data?.chatbotId === "string" ? data.chatbotId : undefined,
        selectedChannels: Array.isArray(data?.selectedChannels)
            ? data.selectedChannels.map((item) => String(item)).filter(Boolean)
            : undefined,
        returnPath: typeof data?.returnPath === "string" ? data.returnPath : undefined,
    };
}
