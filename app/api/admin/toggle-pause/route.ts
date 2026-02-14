import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { authorizeTargetAccess } from "@/lib/api-auth";

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }

        const { sessionId, isPaused, chatbotId } = await req.json();

        if (!sessionId || !chatbotId || isPaused === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const authz = await authorizeTargetAccess(req, chatbotId);
        if (!authz.ok) {
            return authz.response;
        }

        const sessionRef = adminDb.collection("chat_sessions").doc(sessionId);

        // Verify session exists
        const sessionSnap = await sessionRef.get();
        if (!sessionSnap.exists) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        if (sessionSnap.data()?.chatbotId !== chatbotId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await sessionRef.update({
            isPaused: isPaused
        });

        return NextResponse.json({ success: true, isPaused });

    } catch (error) {
        console.error("Toggle Pause Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
