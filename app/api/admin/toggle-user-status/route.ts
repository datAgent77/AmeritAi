import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { authorizeTargetAccess } from "@/lib/api-auth";

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
        await adminAuth.verifyIdToken(token);

        const body = await req.json();
        const { userId, isActive } = body;

        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        const authz = await authorizeTargetAccess(req, userId, { enforcePartnerWorkspaceCapability: false });
        if (!authz.ok) {
            return authz.response;
        }
        if (!authz.isSuperAdmin && !authz.isAgencyAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await adminDb.collection('users').doc(userId).update({
            isActive: isActive
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[Toggle User Status API] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
