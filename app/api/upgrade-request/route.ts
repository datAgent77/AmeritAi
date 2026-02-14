import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendUpgradeRequestToAdmin } from "@/lib/email-service";
import { createNotification } from "@/lib/notification-service";
import { FieldValue } from "firebase-admin/firestore";

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

        // Persist request for cross-page visibility
        const upgradeRequestRef = await adminDb.collection("upgrade_requests").add({
            userId,
            email: userData.email || "",
            name: userData.companyName || userData.displayName || "",
            requestedPlan: targetPlan,
            currentPlan,
            status: "pending",
            source: "console",
            createdAt: FieldValue.serverTimestamp(),
        });

        await adminDb.collection("users").doc(userId).set({
            lastUpgradeRequest: {
                targetPlan,
                status: "pending",
                source: "console",
                requestedAt: FieldValue.serverTimestamp(),
            }
        }, { merge: true });

        // Create in-app notifications for all super admins
        try {
            const superAdminSnapshot = await adminDb
                .collection("users")
                .where("role", "==", "SUPER_ADMIN")
                .get();

            if (!superAdminSnapshot.empty) {
                const customerEmail = userData.email || "unknown@tenant.local";
                const targetPlanLabel = String(targetPlan).toUpperCase();
                const currentPlanLabel = String(currentPlan).toUpperCase();

                await Promise.all(
                    superAdminSnapshot.docs.map((superAdminDoc) =>
                        createNotification({
                            userId: superAdminDoc.id,
                            type: "upgrade_request",
                            title: "Yeni Yükseltme Talebi",
                            message: `${customerEmail} kullanıcısı ${targetPlanLabel} planına yükseltme talebi gönderdi.`,
                            metadata: {
                                customerId: userId,
                                customerEmail,
                                currentPlan: currentPlanLabel,
                                targetPlan: targetPlanLabel,
                                requestId: upgradeRequestRef.id,
                                source: "upgrade_request_api",
                                eventType: "upgrade_request",
                            },
                        })
                    )
                );
            }
        } catch (notificationError) {
            // Non-blocking: request is already persisted and email was sent.
            console.error("Failed to create super admin notification for upgrade request:", notificationError);
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
