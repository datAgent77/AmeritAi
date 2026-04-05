export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { authorizeTargetAccess } from "@/lib/api-auth";

// Default subscription values for new/existing users without subscription data
const DEFAULT_SUBSCRIPTION = {
    planId: 'starter',
    status: 'trial',
    billingStatus: 'free',
    trialDays: 14,
    trialEndsAt: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    paidSince: null,
    messageLimitOverride: null,
    moduleOverrides: null,
    prioritySupport: false,
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

function normalizePlanIdFromUser(targetUserData: Record<string, any>, subscription: Record<string, any>) {
    const candidates = [
        subscription?.planId,
        targetUserData?.planId,
        targetUserData?.plan,
        targetUserData?.entitlements?.planId
    ].filter((value) => typeof value === "string" && value.trim().length > 0) as string[];

    const resolved = candidates[0] || DEFAULT_SUBSCRIPTION.planId;
    // "trial" is a status, not a billable plan card; show underlying plan as Starter if no concrete plan was selected.
    return resolved === "trial" ? "starter" : resolved;
}

function normalizeSubscriptionStatus(targetUserData: Record<string, any>, subscription: Record<string, any>) {
    const validStatuses = new Set(['active', 'trial', 'past_due', 'canceled', 'unpaid']);
    const rawStatus = subscription?.status || targetUserData?.subscriptionStatus;

    if (typeof rawStatus === "string" && validStatuses.has(rawStatus)) {
        return rawStatus;
    }

    const trialFlag = targetUserData?.entitlements?.trial?.isActive;
    if (trialFlag === true) return 'trial';
    if (trialFlag === false) return 'active';

    return DEFAULT_SUBSCRIPTION.status;
}

function normalizeBillingStatus(status: string, targetUserData: Record<string, any>, subscription: Record<string, any>) {
    const validBillingStatuses = new Set(['free', 'paid', 'pending', 'cancelled']);
    const rawBillingStatus = subscription?.billingStatus || targetUserData?.billingStatus;

    if (typeof rawBillingStatus === "string" && validBillingStatuses.has(rawBillingStatus)) {
        return rawBillingStatus;
    }

    return status === 'active' ? 'paid' : 'free';
}

function normalizeBillingPeriod(targetUserData: Record<string, any>, subscription: Record<string, any>) {
    const raw = subscription?.billingPeriod || targetUserData?.billingCycle || DEFAULT_SUBSCRIPTION.billingPeriod;
    return raw === 'yearly' ? 'yearly' : 'monthly';
}

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
        await getAuth().verifyIdToken(token);

        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
        }

        // Get target user ID from query
        const url = new URL(request.url);
        const targetUserId = url.searchParams.get("userId");

        if (!targetUserId) {
            return NextResponse.json({ error: "userId parameter is required" }, { status: 400 });
        }

        const authz = await authorizeTargetAccess(request, targetUserId, { enforcePartnerWorkspaceCapability: false });
        if (!authz.ok) {
            return authz.response;
        }
        if (!authz.isSuperAdmin && !authz.isAgencyAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Fetch target user data
        const targetUserDoc = await adminDb.collection("users").doc(targetUserId).get();
        if (!targetUserDoc.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const targetUserData = targetUserDoc.data();

        // Return user info with subscription (normalized from all known legacy + new fields)
        const rawSubscription = (targetUserData?.subscription && typeof targetUserData.subscription === "object")
            ? targetUserData.subscription
            : {};
        const normalizedStatus = normalizeSubscriptionStatus(targetUserData || {}, rawSubscription);
        const normalizedPlanId = normalizePlanIdFromUser(targetUserData || {}, rawSubscription);
        const normalizedBillingStatus = normalizeBillingStatus(normalizedStatus, targetUserData || {}, rawSubscription);
        const normalizedBillingPeriod = normalizeBillingPeriod(targetUserData || {}, rawSubscription);
        const normalizedTrialEndsAt =
            rawSubscription?.trialEndsAt ||
            targetUserData?.trialEndsAt ||
            targetUserData?.entitlements?.trial?.endAt ||
            null;
        const normalizedCurrentPeriodEnd =
            rawSubscription?.currentPeriodEnd ||
            targetUserData?.currentPeriodEnd ||
            null;

        const subscription = {
            ...DEFAULT_SUBSCRIPTION,
            ...rawSubscription,
            planId: normalizedPlanId,
            status: normalizedStatus,
            billingStatus: normalizedBillingStatus,
            billingPeriod: normalizedBillingPeriod,
            trialEndsAt: normalizedTrialEndsAt,
            currentPeriodEnd: normalizedCurrentPeriodEnd,
        };

        // Fetch detailed usage stats (parallel)
        const [knowledgeDocs, sessions, leads, appointments] = await Promise.all([
            adminDb.collection("knowledge_docs").where("chatbotId", "==", targetUserId).get(),
            adminDb.collection("chat_sessions").where("chatbotId", "==", targetUserId).get(), // Consider date filtering for 'monthly' later
            adminDb.collection("leads").where("chatbotId", "==", targetUserId).get(),
            adminDb.collection("appointments").where("chatbotId", "==", targetUserId).get()
        ]);

        // Calculate stats
        const filesCount = knowledgeDocs.docs.filter(d => d.data().type === 'file').length;
        const websitesCount = knowledgeDocs.docs.filter(d => d.data().type === 'url').length;
        
        // Sum messages from sessions (assuming 'messages' array exists)
        let totalMessages = 0;
        sessions.docs.forEach(doc => {
            const msgs = doc.data().messages;
            if (Array.isArray(msgs)) {
                totalMessages += msgs.length;
            }
        });

        const usageData = {
            messageCount: totalMessages,
            conversationCount: sessions.size,
            knowledgeFiles: filesCount,
            knowledgeWebsites: websitesCount,
            leadsCount: leads.size,
            appointmentsCount: appointments.size
        };

        return NextResponse.json({
            user: {
                id: targetUserDoc.id,
                email: targetUserData?.email,
                createdAt: targetUserData?.createdAt,
                role: targetUserData?.role,
                isActive: targetUserData?.isActive,
                isArchived: targetUserData?.isArchived
            },
            subscription,
            resourceUsage: usageData
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

        // Parse request body
        const body = await request.json()
        console.log("Admin Save Request Body:", JSON.stringify(body, null, 2))
        const { userId, subscription, billing } = body;

        if (!userId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 });
        }

        const authz = await authorizeTargetAccess(request, userId, { enforcePartnerWorkspaceCapability: false });
        if (!authz.ok) {
            return authz.response;
        }
        if (!authz.isSuperAdmin && !authz.isAgencyAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (!subscription) {
            return NextResponse.json({ error: "subscription data is required" }, { status: 400 });
        }

        // Validate target user exists
        const targetUserDoc = await adminDb.collection("users").doc(userId).get();
        if (!targetUserDoc.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Logic to enforce active status if paid (Fix for sync issue)
        let finalStatus = subscription.status;
        let finalTrialEndsAt = subscription.trialEndsAt;

        if (subscription.billingStatus === 'paid' && subscription.status === 'trial') {
             finalStatus = 'active';
             finalTrialEndsAt = null;
        }

        // Prepare subscription update with timestamp
        const subscriptionUpdate = {
            ...subscription,
            status: finalStatus,
            trialEndsAt: finalTrialEndsAt,
            updatedAt: new Date().toISOString(),
            updatedBy: decodedToken.uid
        };

        const targetUserData = targetUserDoc.data();

        // Create entitlements object (normalized)
        const entitlements = {
            planId: subscription.planId || 'starter',
            sectorId: targetUserData?.industry ? (targetUserData.industry.toLowerCase().includes('commerce') ? 'ecommerce' : targetUserData.industry.toLowerCase()) : 'ecommerce', // simple fallback
            trial: {
                isActive: finalStatus === 'trial',
                startAt: null, // Keep existing if possible, but for update we care about status/end
                endAt: finalTrialEndsAt || null
            },
            modules: {
                enabled: [], // Keep existing or default
                addOns: []
            },
            updatedAt: new Date().toISOString()
        };

        // Update user document with new subscription data AND root level fields for compatibility
        await adminDb.collection("users").doc(userId).update({
            subscription: subscriptionUpdate,
            // Sync critical fields to root level as functionality relies on them
            planId: subscription.planId || 'starter',
            subscriptionStatus: finalStatus || 'trial',
            isFrozen: subscription.isFrozen ?? false,
            // Also update trial info if present
            trialEndsAt: finalTrialEndsAt || null,
            currentPeriodEnd: subscription.currentPeriodEnd || null,
            // FORCE UPDATE entitlements to ensure extractEntitlementsFromDoc works
            "entitlements.planId": subscription.planId || 'starter',
            "entitlements.updatedAt": new Date().toISOString(),
            "entitlements.trial.isActive": finalStatus === 'trial',
            "entitlements.trial.endAt": finalTrialEndsAt || null
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
