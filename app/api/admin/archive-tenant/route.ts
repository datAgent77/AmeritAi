import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

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

        if (callerData?.role !== 'SUPER_ADMIN') {
            console.log("Archive Tenant API: Unauthorized - App-level role check failed");
            return NextResponse.json({ error: "Unauthorized - SUPER_ADMIN role required" }, { status: 403 });
        }

        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        // Prevent archiving yourself
        if (userId === decodedToken.uid) {
            return NextResponse.json({ error: "Cannot archive your own account" }, { status: 400 });
        }

        // Check if user exists
        const userDoc = await adminDb.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // 1. Update Firestore - mark as archived
        await adminDb.collection("users").doc(userId).update({
            isArchived: true,
            archivedAt: new Date().toISOString(),
            archivedBy: decodedToken.uid
        });
        console.log(`Successfully archived user ${userId} in Firestore`);

        // 2. Disable Firebase Auth account
        try {
            await adminAuth.updateUser(userId, { disabled: true });
            console.log(`Successfully disabled auth for user ${userId}`);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                console.log(`User ${userId} not found in Auth, continuing.`);
            } else {
                console.error("Error disabling auth user:", error);
                // Don't fail the request - Firestore update succeeded
            }
        }

        return NextResponse.json({
            success: true,
            message: "Tenant archived successfully"
        });

    } catch (error: any) {
        console.error("Error archiving tenant:", error);
        return NextResponse.json({ error: error.message || "Failed to archive tenant" }, { status: 500 });
    }
}
