export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

// Default subscription values for new/existing users without subscription data
const DEFAULT_SUBSCRIPTION = {
    planId: 'trial',
    billingStatus: 'free',
    trialDays: 14,
    trialEndsAt: null,
    paidSince: null,
    messageLimitOverride: null,
    moduleOverrides: null,
    isPriority: false,
    isFrozen: false,
    adminNotes: '',
    // Billing fields
    billingPeriod: 'monthly',           // 'monthly' | 'yearly'
    nextInvoiceDate: null,              // When to create invoice
    nextPaymentDueDate: null,           // When payment is due
    lastInvoiceDate: null,              // Last invoice created
    lastPaymentDate: null,              // Last payment received
    invoiceAmount: null,                // Amount in smallest currency unit
    currency: 'TRY',                    // Currency code
    reminderDaysBefore: 3,              // Days before to send reminder
    invoiceReminderSent: false,         // Has invoice reminder been sent?
    paymentReminderSent: false          // Has payment reminder been sent?
};

// GET: Fetch customer subscription data
export async function GET(request: Request) {
    try {
        // Verify authentication
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const { getAuth } = await import("firebase-admin/auth");
        const decodedToken = await getAuth().verifyIdToken(token);

        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
        }

        // Verify SUPER_ADMIN role
        const callerDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        if (!callerDoc.exists || callerDoc.data()?.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
        }

        // Get target user ID from query
        const url = new URL(request.url);
        const targetUserId = url.searchParams.get("userId");

        if (!targetUserId) {
            return NextResponse.json({ error: "userId parameter is required" }, { status: 400 });
        }

        // Fetch target user data
        const targetUserDoc = await adminDb.collection("users").doc(targetUserId).get();
        if (!targetUserDoc.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const targetUserData = targetUserDoc.data();

        // Return user info with subscription (use defaults if not set)
        const subscription = targetUserData?.subscription || DEFAULT_SUBSCRIPTION;

        return NextResponse.json({
            user: {
                id: targetUserDoc.id,
                email: targetUserData?.email,
                createdAt: targetUserData?.createdAt,
                role: targetUserData?.role,
                isActive: targetUserData?.isActive,
                isArchived: targetUserData?.isArchived
            },
            subscription: {
                ...DEFAULT_SUBSCRIPTION,
                ...subscription
            }
        });

    } catch (error: any) {
        console.error("Error fetching customer admin data:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch customer data" },
            { status: 500 }
        );
    }
}

// PUT: Update customer subscription data
export async function PUT(request: Request) {
    try {
        // Verify authentication
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const { getAuth } = await import("firebase-admin/auth");
        const decodedToken = await getAuth().verifyIdToken(token);

        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
        }

        // Verify SUPER_ADMIN role
        const callerDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        if (!callerDoc.exists || callerDoc.data()?.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
        }

        // Parse request body
        const body = await request.json();
        const { userId, subscription } = body;

        if (!userId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 });
        }

        if (!subscription) {
            return NextResponse.json({ error: "subscription data is required" }, { status: 400 });
        }

        // Validate target user exists
        const targetUserDoc = await adminDb.collection("users").doc(userId).get();
        if (!targetUserDoc.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Prepare subscription update with timestamp
        const subscriptionUpdate = {
            ...subscription,
            updatedAt: new Date().toISOString(),
            updatedBy: decodedToken.uid
        };

        // Update user document with new subscription data
        await adminDb.collection("users").doc(userId).update({
            subscription: subscriptionUpdate
        });

        return NextResponse.json({
            success: true,
            message: "Customer subscription updated successfully",
            subscription: subscriptionUpdate
        });

    } catch (error: any) {
        console.error("Error updating customer admin data:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update customer data" },
            { status: 500 }
        );
    }
}
