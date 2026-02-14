import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { authorizeTargetAccess } from "@/lib/api-auth";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 });
        }

        const { searchParams } = new URL(req.url);
        const chatbotId = searchParams.get("chatbotId");
        const limitParam = searchParams.get("limit");
        const sessionLimit = limitParam ? parseInt(limitParam) : 50;

        if (!chatbotId) {
            return NextResponse.json({ error: "Chatbot ID is required" }, { status: 400 });
        }

        const authz = await authorizeTargetAccess(req, chatbotId);
        if (!authz.ok) {
            return authz.response;
        }

        const querySnapshot = await adminDb.collection("chat_sessions")
            .where("chatbotId", "==", chatbotId)
            .limit(sessionLimit)
            .get();

        const sessions = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const messages = data.messages || [];
            const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

            return {
                id: doc.id,
                chatbotId: data.chatbotId,
                createdAt: data.createdAt,
                messages: messages,
                lastMessage: lastMessage?.content || "",
                lastMessageTime: lastMessage?.createdAt || data.createdAt,
                isPaused: data.isPaused || false,
                visitorEmail: data.visitorEmail || null,
                visitorName: data.visitorName || null,
                channel: data.channel || "web"
            };
        });

        // Sort by last message time (newest first)
        sessions.sort((a: any, b: any) => {
            const dateA = new Date(a.lastMessageTime || 0).getTime();
            const dateB = new Date(b.lastMessageTime || 0).getTime();
            return dateB - dateA;
        });

        return NextResponse.json({ sessions });

    } catch (error: any) {
        console.error("Error fetching chat sessions:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
