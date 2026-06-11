
import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

/**
 * NOTE: This endpoint is a STUB. It does not yet persist or process campaign
 * state. Previously it accepted unauthenticated requests and returned
 * `{ success: true }`, which is misleading. It now requires a valid Firebase
 * ID token and clearly reports that the action is not implemented so callers
 * do not assume work was done. Replace with real logic before exposing in UI.
 */
export async function POST(req: NextRequest) {
    try {
        const adminAuth = getAdminAuth();
        if (!adminAuth) {
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }

        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        try {
            await adminAuth.verifyIdToken(authHeader.split("Bearer ")[1]);
        } catch {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const { action } = body || {};

        // TODO: implement campaign state management.
        return NextResponse.json(
            { success: false, implemented: false, message: `Campaign action '${action ?? "unknown"}' is not implemented yet` },
            { status: 501 }
        );
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
