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
            console.log("Delete Tenant API: Unauthorized - App-level role check failed");
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

        // Prevent deleting yourself
        if (userId === decodedToken.uid) {
            return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
        }

        // 1. Delete Auth User
        try {
            await adminAuth.deleteUser(userId);
            console.log(`Successfully deleted user ${userId} from Auth`);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                console.log(`User ${userId} not found in Auth, proceeding to delete data.`);
            } else {
                console.error("Error deleting auth user:", error);
            }
        }

        // 2. Delete Firestore Data
        const batch = adminDb.batch();

        // Delete User Data
        const userRef = adminDb.collection("users").doc(userId);
        batch.delete(userRef);

        // Delete Chatbot Settings
        const chatbotRef = adminDb.collection("chatbots").doc(userId);
        batch.delete(chatbotRef);

        await batch.commit();

        // Batch delete collections
        const deleteCollection = async (collectionName: string, queryField: string) => {
            try {
                const q = adminDb!.collection(collectionName).where(queryField, "==", userId);
                const snapshot = await q.get();

                if (snapshot.empty) return;

                const batch = adminDb!.batch();
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                console.log(`Deleted ${snapshot.size} documents from ${collectionName}`);
            } catch (error) {
                console.error(`Error deleting from ${collectionName}:`, error);
                // Continue even if this collection fails
            }
        };

        try {
            await deleteCollection("knowledge_docs", "chatbotId");
        } catch (e) {
            console.error("Failed to delete knowledge_docs:", e);
        }

        try {
            await deleteCollection("assistant_training_entries", "chatbotId");
        } catch (e) {
            console.error("Failed to delete assistant_training_entries:", e);
        }

        try {
            await deleteCollection("chat_sessions", "chatbotId");
        } catch (e) {
            console.error("Failed to delete chat_sessions:", e);
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Error deleting tenant:", error);
        return NextResponse.json({ error: error.message || "Failed to delete tenant" }, { status: 500 });
    }
}
