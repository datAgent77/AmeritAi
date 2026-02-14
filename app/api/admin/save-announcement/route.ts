import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb();
        const adminAuth = getAdminAuth();

        if (!adminDb || !adminAuth) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 });
        }

        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Check Super Admin
        const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        const userData = userDoc.data();
        const tokenRole = (decodedToken as any).role;
        const isSuperAdmin =
            userData?.role === 'SUPER_ADMIN' ||
            tokenRole === 'SUPER_ADMIN' ||
            tokenRole === 'super_admin';

        if (!isSuperAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { isActive, message } = body;

        await adminDb.collection('settings').doc('announcement').set({
            isActive: isActive || false,
            message: message || "",
            updatedAt: new Date(),
            updatedBy: decodedToken.email
        }, { merge: true });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[Save Announcement API] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
