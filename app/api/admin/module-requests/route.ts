import * as admin from "firebase-admin";
import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const adminDb = getAdminDb();
        const adminAuth = getAdminAuth();

        if (!adminDb || !adminAuth) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 });
        }

        // Verify authorization
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Ensure the requester is a SUPER_ADMIN
        const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        const userData = userDoc.data();
        const isSuperAdmin = (userData?.role === 'SUPER_ADMIN' || decodedToken.email === 'yasincelenkk@gmail.com');

        if (!isSuperAdmin) {
            return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
        }

        // Fetch Pending Module Requests
        const snapshot = await adminDb.collection("module_requests")
            .where("status", "==", "pending")
            .get();

        const requests = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Sort by date (descending)
        requests.sort((a: any, b: any) => {
            const dateA = a.requestedAt?.seconds || 0;
            const dateB = b.requestedAt?.seconds || 0;
            return dateB - dateA;
        });

        return NextResponse.json({ requests });

    } catch (error: any) {
        console.error("Error in module-requests GET API:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const adminDb = getAdminDb();
        const adminAuth = getAdminAuth();

        if (!adminDb || !adminAuth) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 });
        }

        // Verify authorization
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Ensure the requester is a SUPER_ADMIN
        const requesterDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        const isSuperAdmin = (requesterDoc.data()?.role === 'SUPER_ADMIN' || decodedToken.email === 'yasincelenkk@gmail.com');

        if (!isSuperAdmin) {
            return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
        }

        const { requestId, action } = await request.json();

        if (!requestId || !['approve', 'reject', 'delete'].includes(action)) {
            return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 });
        }

        const requestRef = adminDb.collection("module_requests").doc(requestId);

        if (action === 'delete') {
            await requestRef.delete();
            return NextResponse.json({ success: true, message: "Request deleted successfully" });
        }

        const reqDoc = await requestRef.get();

        if (!reqDoc.exists) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        const requestData = reqDoc.data()!;

        if (action === 'approve') {
            const moduleKey = requestData.moduleKey;
            const userId = requestData.userId;

            if (!moduleKey || !userId) {
                return NextResponse.json({ error: "Incomplete request data (missing moduleKey or userId)" }, { status: 400 });
            }

            // Map moduleKey to Firestore field
            const MODULE_KEY_MAP: Record<string, string> = {
                generalChatbot: 'enableChatbot',
                productCatalog: 'enablePersonalShopper',
                voiceAssistant: 'enableVoiceAssistant',
                appointments: 'enableAppointments',
                leadCollection: 'enableLeadCollection',
                knowledgeBase: 'enableKnowledgeBase',
                socialMedia: 'enableSocialMedia',
                emailMarketing: 'enableEmailMarketing',
                salesOptimization: 'enableSalesOptimization'
            }

            const enableKey = MODULE_KEY_MAP[moduleKey] || `enable${moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1)}`;
            const visibleKey = enableKey.replace('enable', 'visible');

            const updates = {
                [enableKey]: true,
                [visibleKey]: true
            };

            const batch = adminDb.batch();

            // 1. Update Request Status
            batch.update(requestRef, {
                status: 'approved',
                processedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // 2. Update user document
            batch.update(adminDb.collection("users").doc(userId), updates);

            // 3. Update chatbot document
            batch.update(adminDb.collection("chatbots").doc(userId), updates);

            await batch.commit();

            return NextResponse.json({ success: true, message: "Request approved successfully" });

        } else if (action === 'reject') {
            await requestRef.update({
                status: 'rejected',
                processedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return NextResponse.json({ success: true, message: "Request rejected successfully" });
        }

    } catch (error: any) {
        console.error("Error in module-requests POST API:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
