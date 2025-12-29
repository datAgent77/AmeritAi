export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(request: Request) {
    try {
        // Verify authentication via Authorization header
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];

        // Verify the token using Admin SDK
        const { getAuth } = await import("firebase-admin/auth");
        const decodedToken = await getAuth().verifyIdToken(token);

        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
        }

        // Check if user has admin role in Firestore
        const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userData = userDoc.data();
        if (userData?.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }

        // Get query parameters
        const url = new URL(request.url);
        const includeArchived = url.searchParams.get("includeArchived") === "true";

        // Fetch all users using Admin SDK (bypasses client security rules)
        const usersSnapshot = await adminDb.collection("users").get();
        let users = usersSnapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
            id: doc.id,
            ...doc.data()
        }));

        // Filter out archived users unless explicitly requested
        if (!includeArchived) {
            users = users.filter((user: any) => !user.isArchived);
        }

        return NextResponse.json({ users });
    } catch (error: any) {
        console.error("Error fetching users:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch users" },
            { status: 500 }
        );
    }
}
