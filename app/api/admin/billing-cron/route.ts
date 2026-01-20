export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { createNotification } from "@/lib/notification-service";
import { sendInvoiceReminderToAdmin, sendPaymentReminderToCustomer, sendTrialExpiredAdminNotification, sendTrialExpiredCustomerNotification } from "@/lib/email-service";

// Super Admin email (should be from env or fetched from DB)
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "";

// Plan name mapping
const PLAN_NAMES: Record<string, string> = {
    trial: "Trial",
    starter: "Starter",
    pro: "Pro",
    enterprise: "Enterprise"
};

/**
 * Billing Cron Job
 * 
 * This endpoint should be called daily (e.g., via Vercel Cron, GitHub Actions, or external cron service)
 * 
 * It handles:
 * 1. Invoice reminders to Super Admin when nextInvoiceDate is approaching
 * 2. Payment reminders to customers when nextPaymentDueDate is approaching
 * 
 * Security: Requires CRON_SECRET header to prevent unauthorized access
 */
export async function GET(request: Request) {
    try {
        // Verify cron secret for security
        const cronSecret = request.headers.get("x-cron-secret") ||
            new URL(request.url).searchParams.get("secret");

        if (cronSecret !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        // Get Super Admin user(s) for notifications
        const superAdminSnapshot = await adminDb
            .collection("users")
            .where("role", "==", "SUPER_ADMIN")
            .limit(1)
            .get();

        const superAdmin = superAdminSnapshot.docs[0];
        const superAdminId = superAdmin?.id;
        const superAdminEmail = superAdmin?.data()?.email || SUPER_ADMIN_EMAIL;

        if (!superAdminId || !superAdminEmail) {
            console.warn("Billing Cron: No Super Admin found");
        }

        let invoiceRemindersProcessed = 0;
        let paymentRemindersProcessed = 0;

        // =========================================================================
        // 1. INVOICE REMINDERS TO SUPER ADMIN
        // Check for customers whose nextInvoiceDate is today or earlier
        // and invoiceReminderSent is false
        // =========================================================================

        const usersSnapshot = await adminDb.collection("users").get();

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const subscription = userData.subscription;

            if (!subscription || subscription.billingStatus === 'free') {
                continue; // Skip free users
            }

            const nextInvoiceDate = subscription.nextInvoiceDate;
            const reminderDaysBefore = subscription.reminderDaysBefore || 3;
            const invoiceReminderSent = subscription.invoiceReminderSent;

            if (nextInvoiceDate && !invoiceReminderSent) {
                const invoiceDate = new Date(nextInvoiceDate);
                const reminderDate = new Date(invoiceDate);
                reminderDate.setDate(reminderDate.getDate() - reminderDaysBefore);
                reminderDate.setHours(0, 0, 0, 0);

                // Check if today is the reminder date or we've passed it
                if (today >= reminderDate) {
                    console.log(`Billing Cron: Sending invoice reminder for ${userData.email}`);

                    // Send email to Super Admin
                    if (superAdminEmail) {
                        await sendInvoiceReminderToAdmin({
                            adminEmail: superAdminEmail,
                            customerEmail: userData.email,
                            customerName: userData.companyName || userData.email,
                            invoiceDate: nextInvoiceDate,
                            planName: PLAN_NAMES[subscription.planId] || subscription.planId,
                            amount: subscription.invoiceAmount,
                            currency: subscription.currency
                        });
                    }

                    // Create panel notification for Super Admin
                    if (superAdminId) {
                        await createNotification({
                            userId: superAdminId,
                            type: 'invoice_reminder',
                            title: 'Fatura Kesim Zamanı',
                            message: `${userData.email} müşterisi için fatura kesim zamanı geldi.`,
                            metadata: {
                                customerId: userDoc.id,
                                customerEmail: userData.email,
                                invoiceDate: nextInvoiceDate,
                                amount: subscription.invoiceAmount,
                                currency: subscription.currency
                            }
                        });
                    }

                    // Mark reminder as sent
                    await adminDb.collection("users").doc(userDoc.id).update({
                        "subscription.invoiceReminderSent": true
                    });

                    invoiceRemindersProcessed++;
                }
            }

            // =========================================================================
            // 2. PAYMENT REMINDERS TO CUSTOMERS
            // Check for customers whose nextPaymentDueDate is approaching
            // and paymentReminderSent is false
            // =========================================================================

            const nextPaymentDueDate = subscription.nextPaymentDueDate;
            const paymentReminderSent = subscription.paymentReminderSent;

            if (nextPaymentDueDate && !paymentReminderSent) {
                const paymentDate = new Date(nextPaymentDueDate);
                const reminderDate = new Date(paymentDate);
                reminderDate.setDate(reminderDate.getDate() - reminderDaysBefore);
                reminderDate.setHours(0, 0, 0, 0);

                // Check if today is the reminder date or we've passed it
                if (today >= reminderDate) {
                    console.log(`Billing Cron: Sending payment reminder to ${userData.email}`);

                    // Send email to customer
                    await sendPaymentReminderToCustomer({
                        customerEmail: userData.email,
                        customerName: userData.companyName,
                        paymentDueDate: nextPaymentDueDate,
                        planName: PLAN_NAMES[subscription.planId] || subscription.planId,
                        amount: subscription.invoiceAmount,
                        currency: subscription.currency
                    });

                    // Create panel notification for customer
                    await createNotification({
                        userId: userDoc.id,
                        type: 'payment_due',
                        title: 'Ödeme Hatırlatması',
                        message: `Ödemenizin son tarihi: ${new Date(nextPaymentDueDate).toLocaleDateString('tr-TR')}`,
                        metadata: {
                            paymentDueDate: nextPaymentDueDate,
                            amount: subscription.invoiceAmount,
                            currency: subscription.currency
                        }
                    });

                    // Mark reminder as sent
                    await adminDb.collection("users").doc(userDoc.id).update({
                        "subscription.paymentReminderSent": true
                    });

                    paymentRemindersProcessed++;
                }
            }


            // =========================================================================
            // 3. TRIAL EXPIRY NOTIFICATIONS TO SUPER ADMIN
            // Check for customers whose trialEndsAt has passed
            // and trialExpiredNotificationSent is false
            // =========================================================================

            const trialEndsAt = subscription.trialEndsAt;
            const trialExpiredNotificationSent = subscription.trialExpiredNotificationSent;

            if (trialEndsAt && subscription.status === 'trial' && !trialExpiredNotificationSent) {
                const trialEndDate = new Date(trialEndsAt);
                trialEndDate.setHours(0, 0, 0, 0);

                // Check if today is the trial end date or we've passed it
                if (today >= trialEndDate) {
                    console.log(`Billing Cron: Sending trial expired notification for ${userData.email}`);

                    // Send email to Super Admin
                    if (superAdminEmail) {
                        await sendTrialExpiredAdminNotification({
                            adminEmail: superAdminEmail,
                            customerEmail: userData.email,
                            customerName: userData.companyName || userData.email,
                            planName: PLAN_NAMES[subscription.planId] || subscription.planId,
                            trialEndDate: trialEndsAt
                        });
                    }

                    // Create panel notification for Super Admin
                    if (superAdminId) {
                        await createNotification({
                            userId: superAdminId,
                            type: 'trial_expired',
                            title: 'Deneme Süresi Sona Erdi',
                            message: `${userData.email} müşterisinin deneme süresi doldu.`,
                            metadata: {
                                customerId: userDoc.id,
                                customerEmail: userData.email,
                                invoiceDate: trialEndsAt // reusing field for display
                            }
                        });
                    }

                    // Send email to Customer
                    await sendTrialExpiredCustomerNotification({
                        customerEmail: userData.email,
                        customerName: userData.companyName || userData.email,
                        planName: PLAN_NAMES[subscription.planId] || subscription.planId,
                        trialEndDate: trialEndsAt
                    });

                    // Create panel notification for Customer
                    await createNotification({
                        userId: userDoc.id,
                        type: 'trial_expired',
                        title: '⚠️ Deneme Süreniz Doldu',
                        message: `14 günlük deneme süreniz sona erdi. Hizmet kesintisi yaşamamak için lütfen paketinizi yükseltin.`,
                        metadata: {
                            invoiceDate: trialEndsAt // reusing field
                        }
                    });

                    // Mark notification as sent
                    await adminDb.collection("users").doc(userDoc.id).update({
                        "subscription.trialExpiredNotificationSent": true
                    });
                }
            }
        }

        console.log(`Billing Cron completed: ${invoiceRemindersProcessed} invoice reminders, ${paymentRemindersProcessed} payment reminders`);

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            processed: {
                invoiceReminders: invoiceRemindersProcessed,
                paymentReminders: paymentRemindersProcessed
            }
        });

    } catch (error: any) {
        console.error("Billing Cron Error:", error);
        return NextResponse.json(
            { error: error.message || "Billing cron job failed" },
            { status: 500 }
        );
    }
}

/**
 * POST: Reset reminder flags for a customer (called after invoice is created or payment is received)
 * 
 * Body: { userId: string, resetType: 'invoice' | 'payment' | 'both', advanceToNextPeriod?: boolean }
 */
export async function POST(request: Request) {
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

        const body = await request.json();
        const { userId, resetType, advanceToNextPeriod } = body;

        if (!userId || !resetType) {
            return NextResponse.json({ error: "userId and resetType are required" }, { status: 400 });
        }

        const userDoc = await adminDb.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userData = userDoc.data()!;
        const subscription = userData.subscription || {};
        const updates: Record<string, any> = {};

        // Reset invoice reminder
        if (resetType === 'invoice' || resetType === 'both') {
            updates["subscription.invoiceReminderSent"] = false;
            updates["subscription.lastInvoiceDate"] = new Date().toISOString();

            // Advance to next invoice date if requested
            if (advanceToNextPeriod && subscription.nextInvoiceDate) {
                const currentInvoiceDate = new Date(subscription.nextInvoiceDate);
                const nextDate = new Date(currentInvoiceDate);

                if (subscription.billingPeriod === 'yearly') {
                    nextDate.setFullYear(nextDate.getFullYear() + 1);
                } else {
                    nextDate.setMonth(nextDate.getMonth() + 1);
                }

                updates["subscription.nextInvoiceDate"] = nextDate.toISOString();
            }
        }

        // Reset payment reminder
        if (resetType === 'payment' || resetType === 'both') {
            updates["subscription.paymentReminderSent"] = false;
            updates["subscription.lastPaymentDate"] = new Date().toISOString();

            // Advance to next payment date if requested
            if (advanceToNextPeriod && subscription.nextPaymentDueDate) {
                const currentPaymentDate = new Date(subscription.nextPaymentDueDate);
                const nextDate = new Date(currentPaymentDate);

                if (subscription.billingPeriod === 'yearly') {
                    nextDate.setFullYear(nextDate.getFullYear() + 1);
                } else {
                    nextDate.setMonth(nextDate.getMonth() + 1);
                }

                updates["subscription.nextPaymentDueDate"] = nextDate.toISOString();
            }
        }

        await adminDb.collection("users").doc(userId).update(updates);

        return NextResponse.json({
            success: true,
            message: "Billing flags reset successfully",
            updates
        });

    } catch (error: any) {
        console.error("Reset billing flags error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to reset billing flags" },
            { status: 500 }
        );
    }
}
