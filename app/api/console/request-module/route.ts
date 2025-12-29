import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: Request) {
    try {
        const adminAuth = getAdminAuth();
        const adminDb = getAdminDb();

        if (!adminAuth || !adminDb) {
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        let decodedToken;

        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (error) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const data = await request.json();
        const { moduleKey, moduleName, industry } = data;

        if (!moduleKey) {
            return NextResponse.json({ error: "Missing moduleKey" }, { status: 400 });
        }

        // Add request to Firestore using Admin SDK
        await adminDb.collection("module_requests").add({
            userId: decodedToken.uid,
            userEmail: decodedToken.email,
            moduleKey,
            moduleName: moduleName || moduleKey,
            status: 'pending',
            requestedAt: FieldValue.serverTimestamp(),
            industry: industry || 'other'
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Error creating module request:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
