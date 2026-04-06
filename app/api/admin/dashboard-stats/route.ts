import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        console.log("[Stats API] Starting request");

        const adminDb = getAdminDb();
        const adminAuth = getAdminAuth();

        // 1. Check Server Configuration
        if (!adminAuth || !adminDb) {
            console.error("[Stats API] Firebase Admin SDK not initialized. Missing env vars?");
            return NextResponse.json({
                error: "Server Configuration Error: Firebase Admin not initialized. Check FIREBASE_PRIVATE_KEY."
            }, { status: 500 });
        }

        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized: Missing Bearer token" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (e: any) {
            console.error("[Stats API] Token verification failed:", e);
            return NextResponse.json({ error: `Token Verification Failed: ${e.message}` }, { status: 401 });
        }

        // Check if user exists
        const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "User not found in database" }, { status: 404 });
        }
        const userData = userDoc.data();

        const requesterEmail = decodedToken.email;
        const tokenRole = (decodedToken as any).role;
        const isSuperAdmin =
            userData?.role === 'SUPER_ADMIN' ||
            tokenRole === 'SUPER_ADMIN' ||
            tokenRole === 'super_admin';

        console.log(`[Stats API] Requester: ${requesterEmail}, Role: ${userData?.role}, isSuperAdmin: ${isSuperAdmin}`);

        // Fetch Announcement Settings (server-side to bypass rules)
        // Announcement is public for all authenticated users
        let announcement = { isActive: false, message: "" };
        try {
            const announcementDoc = await adminDb.collection('settings').doc('announcement').get();
            if (announcementDoc.exists) {
                const data = announcementDoc.data();
                announcement = {
                    isActive: data?.isActive || false,
                    message: data?.message || ""
                };
            }
        } catch (annError: any) {
            console.warn("[Stats API] Failed to fetch announcement:", annError.message);
        }

        // If not super admin, return only announcement (hide stats)
        if (!isSuperAdmin) {
            return NextResponse.json({
                users: [],
                stats: {
                    totalTenants: 0,
                    activeTenants: 0,
                    totalChatbots: 0,
                    totalChatSessions: 0
                },
                recentActivity: [],
                announcement
            });
        }

        console.log("[Stats API] Fetching data...");

        // Check for includeArchived parameter
        const url = new URL(request.url);
        const includeArchived = url.searchParams.get('includeArchived') === 'true';

        // Fetch Data safely
        let users = [];
        let totalChatbots = 0;
        let totalChatSessions = 0;

        try {
            const usersSnapshot = await adminDb.collection('users').get();
            const allUsers = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Filter out archived users unless includeArchived is true
            users = includeArchived
                ? allUsers
                : allUsers.filter((u: any) => u.isArchived !== true);

            // Firestore native count aggregation requires no memory allocations and executes instantly
            const chatbotsCountQuery = await adminDb.collection('chatbots').count().get();
            totalChatbots = chatbotsCountQuery.data().count;

            const sessionsCountQuery = await adminDb.collection('chat_sessions').count().get();
            totalChatSessions = sessionsCountQuery.data().count;
        } catch (dbError: any) {
            console.error("[Stats API] DB Fetch Error:", dbError);
            throw new Error(`DB Fetch Error: ${dbError.message}`);
        }

        const tenants = users.filter((u: any) => u.role === 'TENANT_ADMIN');
        const activeTenants = tenants.filter((u: any) => u.isActive).length;

        // Recent Activity
        const recentActivity = users
            .sort((a: any, b: any) => {
                const dateA = a.createdAt?.seconds ? a.createdAt.seconds : 0;
                const dateB = b.createdAt?.seconds ? b.createdAt.seconds : 0;
                return dateB - dateA;
            })
            .slice(0, 8)
            .map((u: any) => ({
                id: u.id,
                type: 'user_created',
                userEmail: u.email,
                timestamp: u.createdAt
            }));

        return NextResponse.json({
            users,
            stats: {
                totalTenants: tenants.length,
                activeTenants,
                totalChatbots,
                totalChatSessions
            },
            recentActivity,
            announcement
        });
    } catch (error: any) {
        console.error("[Stats API] Internal Error:", error);
        return NextResponse.json({
            error: `Internal Server Error: ${error.message}`,
            details: error.stack
        }, { status: 500 });
    }
}
