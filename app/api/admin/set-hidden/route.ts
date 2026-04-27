import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { authorizeTargetAccess } from "@/lib/api-auth";

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }

        const { sessionId, isHidden, chatbotId } = await req.json();

        if (!sessionId || !chatbotId || isHidden === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const authz = await authorizeTargetAccess(req, chatbotId);
        if (!authz.ok) {
            return authz.response;
        }

        const sessionRef = adminDb.collection("chat_sessions").doc(sessionId);
        const sessionSnap = await sessionRef.get();
        if (!sessionSnap.exists) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }
        if (sessionSnap.data()?.chatbotId !== chatbotId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await sessionRef.update({
            isHidden: isHidden === true,
        });

        return NextResponse.json({ success: true, isHidden: isHidden === true });
    } catch (error) {
        console.error("Set Hidden Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
