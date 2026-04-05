import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { authorizeTargetAccess } from "@/lib/api-auth";

export const dynamic = 'force-dynamic';

type AnyRecord = Record<string, any>;

function toMillis(value: any): number {
    if (!value) return 0;
    if (typeof value === "string" || typeof value === "number" || value instanceof Date) {
        const ms = new Date(value).getTime();
        return Number.isFinite(ms) ? ms : 0;
    }
    if (typeof value?.toDate === "function") {
        const ms = value.toDate().getTime();
        return Number.isFinite(ms) ? ms : 0;
    }
    if (typeof value?._seconds === "number") {
        return value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1_000_000);
    }
    if (typeof value?.seconds === "number") {
        return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1_000_000);
    }
    return 0;
}

function toIsoOrNull(value: any): string | null {
    const ms = toMillis(value);
    if (!ms) return null;
    return new Date(ms).toISOString();
}

function normalizeMessage(message: AnyRecord): AnyRecord {
    return {
        ...message,
        createdAt: toIsoOrNull(message?.createdAt) || message?.createdAt || null
    };
}

export async function GET(req: Request) {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 });
        }

        const { searchParams } = new URL(req.url);
        const chatbotId = searchParams.get("chatbotId");
        const limitParam = searchParams.get("limit");
        const parsedLimit = limitParam ? parseInt(limitParam, 10) : 50;
        const sessionLimit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 200) : 50;

        if (!chatbotId) {
            return NextResponse.json({ error: "Chatbot ID is required" }, { status: 400 });
        }

        const authz = await authorizeTargetAccess(req, chatbotId);
        if (!authz.ok) {
            return authz.response;
        }

        let querySnapshot;
        try {
            // Fast path for larger datasets (requires index in some projects).
            querySnapshot = await adminDb.collection("chat_sessions")
                .where("chatbotId", "==", chatbotId)
                .orderBy("createdAt", "desc")
                .limit(Math.max(sessionLimit * 3, 100))
                .get();
        } catch (error: any) {
            // Fallback path without orderBy to avoid dropping sessions when index is missing.
            if (error?.code !== 9 && error?.code !== "failed-precondition") {
                throw error;
            }
            querySnapshot = await adminDb.collection("chat_sessions")
                .where("chatbotId", "==", chatbotId)
                .get();
        }

        const sessions = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const rawMessages = Array.isArray(data.messages) ? data.messages : [];
            const messages = rawMessages.map(normalizeMessage);
            const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
            const createdAtIso = toIsoOrNull(data.createdAt) || data.createdAt || null;
            const lastMessageTimeIso = toIsoOrNull(lastMessage?.createdAt) || createdAtIso;

            return {
                id: doc.id,
                chatbotId: data.chatbotId,
                createdAt: createdAtIso,
                messages: messages,
                lastMessage: lastMessage?.content || "",
                lastMessageTime: lastMessageTimeIso,
                isPaused: data.isPaused || false,
                visitorEmail: data.visitorEmail || null,
                visitorName: data.visitorName || null,
                channel: data.channel || "web",
                contactKey: data.contactKey || null,
                canonicalContactId: data.canonicalContactId || null,
                channelMeta: data.channelMeta || null,
                transcriptSummary: data.transcriptSummary || null,
                lastDisposition: data.lastDisposition || null,
                assistantProfileId: data.assistantProfileId || null
            };
        });

        // Sort by last message time (newest first)
        sessions.sort((a: any, b: any) => {
            const dateA = toMillis(a.lastMessageTime);
            const dateB = toMillis(b.lastMessageTime);
            return dateB - dateA;
        });

        return NextResponse.json({ sessions: sessions.slice(0, sessionLimit) });

    } catch (error: any) {
        console.error("Error fetching chat sessions:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
