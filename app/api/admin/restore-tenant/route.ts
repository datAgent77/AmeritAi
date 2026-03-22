import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { authorizeTargetAccess } from "@/lib/api-auth";
import { isSuperAdminRole } from "@/lib/user-roles";

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb();
        const adminAuth = getAdminAuth();

        if (!adminDb || !adminAuth) {
            console.warn("Firebase Admin SDK not initialized. Environment variables missing?");
            return NextResponse.json({
                error: "Server misconfigured",
                code: "ADMIN_SDK_MISSING"
            }, { status: 503 });
        }

        // Verify authorization
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: "Unauthorized - No token provided" }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];

        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(idToken);
        } catch (error) {
            console.error("Token verification failed:", error);
            return NextResponse.json({ error: "Unauthorized - Invalid token" }, { status: 401 });
        }

        // Verify Caller is SUPER_ADMIN
        const callerDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        const callerData = callerDoc.data();

        const tokenRole = (decodedToken as any).role;
        const isSuperAdmin = isSuperAdminRole(callerData?.role) || isSuperAdminRole(tokenRole);

        if (!isSuperAdmin) {
            console.log("Restore Tenant API: Unauthorized - App-level role check failed");
            return NextResponse.json({ error: "Unauthorized - SUPER_ADMIN role required" }, { status: 403 });
        }

        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        const authz = await authorizeTargetAccess(req, userId);
        if (!authz.ok) {
            return authz.response;
        }
        if (!authz.isSuperAdmin) {
            return NextResponse.json({ error: "Unauthorized - SUPER_ADMIN role required" }, { status: 403 });
        }

        // Check if user exists
        const userDoc = await adminDb.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userData = userDoc.data();
        if (!userData?.isArchived) {
            return NextResponse.json({ error: "User is not archived" }, { status: 400 });
        }

        // 1. Update Firestore - remove archived status
        await adminDb.collection("users").doc(userId).update({
            isArchived: false,
            archivedAt: null,
            archivedBy: null,
            restoredAt: new Date().toISOString(),
            restoredBy: decodedToken.uid
        });
        console.log(`Successfully restored user ${userId} in Firestore`);

        // 2. Enable Firebase Auth account
        try {
            await adminAuth.updateUser(userId, { disabled: false });
            console.log(`Successfully enabled auth for user ${userId}`);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                console.log(`User ${userId} not found in Auth, continuing.`);
            } else {
                console.error("Error enabling auth user:", error);
                // Don't fail the request - Firestore update succeeded
            }
        }

        return NextResponse.json({
            success: true,
            message: "Tenant restored successfully"
        });

    } catch (error: any) {
        console.error("Error restoring tenant:", error);
        return NextResponse.json({ error: error.message || "Failed to restore tenant" }, { status: 500 });
    }
}
