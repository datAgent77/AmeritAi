import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }

        const { sessionId, isPaused } = await req.json();

        if (!sessionId || isPaused === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const sessionRef = adminDb.collection("chat_sessions").doc(sessionId);

        // Verify session exists
        const sessionSnap = await sessionRef.get();
        if (!sessionSnap.exists) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
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
