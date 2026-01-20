import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendUpgradeRequestToAdmin } from "@/lib/email-service";

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const { getAuth } = await import("firebase-admin/auth");
        const decodedToken = await getAuth().verifyIdToken(token);
        const userId = decodedToken.uid;

        const body = await request.json();
        const { targetPlan } = body;

        if (!targetPlan) {
            return NextResponse.json({ error: "Target plan is required" }, { status: 400 });
        }

        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
        }

        // Fetch user data
        const userDoc = await adminDb.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userData = userDoc.data()!;
        const currentPlan = userData.planId || 'starter';
        
        // Prevent spam: Check last request time
        // We can add a simple timestamp check here if needed, but for now we trust the client logic + auth
        
        // Send email to admin
        const emailSent = await sendUpgradeRequestToAdmin({
            customerEmail: userData.email,
            customerName: userData.companyName || userData.displayName || 'İsimsiz Müşteri',
            currentUserParams: {
                userId,
                currentPlan
            },
            targetPlan
        });

        if (!emailSent) {
            return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "Upgrade request sent successfully"
        });

    } catch (error: any) {
        console.error("Upgrade Request Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to process upgrade request" },
            { status: 500 }
        );
    }
}
