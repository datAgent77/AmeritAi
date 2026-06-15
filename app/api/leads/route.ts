import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { getAppBaseUrl, sendTransactionalEmail } from "@/lib/email-service";
import { pushLeadToZoho } from "@/lib/integrations/zoho/client";
import { createNotification } from "@/lib/notification-service";
import { authorizeTargetAccess } from "@/lib/api-auth";

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i;

export async function POST(req: Request) {
    const adminDb = getAdminDb();
    try {
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
        }

        const body = await req.json();
        const { chatbotId, name, email, phone, source, customFields, sessionId, tcpaOptIn, tcpaConsentText } = body;

        if (!chatbotId) {
            return NextResponse.json({ error: "Chatbot ID is required" }, { status: 400 });
        }

        if (!name && !email && !phone) {
            return NextResponse.json({ error: "At least one contact field is required" }, { status: 400 });
        }

        const docRef = await adminDb.collection("leads").add({
            chatbotId,
            name: name || "Anonymous",
            email: email || "",
            phone: phone || "",
            source: source || "Pre-chat Form",
            customFields: customFields || {},
            sessionId: sessionId || null,
            // TCPA messaging consent record (US). Stored as an auditable opt-in snapshot.
            tcpaConsent: typeof tcpaOptIn === "boolean"
                ? {
                    optIn: tcpaOptIn,
                    text: typeof tcpaConsentText === "string" ? tcpaConsentText : "",
                    at: new Date().toISOString(),
                }
                : null,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await createNotification({
            userId: chatbotId,
            type: "lead_created",
            title: "Yeni lead kaydi",
            message: `${name || "Anonim"}${email || phone ? ` - ${email || phone}` : ""}`,
            metadata: {
                leadId: docRef.id,
                sessionId: sessionId || null,
                name: name || "",
                email: email || "",
                phone: phone || "",
                source: source || "Pre-chat Form",
            },
        });

        // Send email notification if enabled
        try {
            const chatbotSnap = await adminDb.collection("chatbots").doc(chatbotId).get();

            if (chatbotSnap.exists) {
                const settings = chatbotSnap.data();

                if (settings?.enableLeadNotifications && settings?.leadNotificationEmail) {
                    // Format custom fields for email
                    const customFieldsText = customFields && Object.keys(customFields).length > 0
                        ? Object.entries(customFields).map(([key, value]) => `${key}: ${value}`).join('\n')
                        : '';

                    const customFieldsHtml = customFields && Object.keys(customFields).length > 0
                        ? Object.entries(customFields).map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`).join('')
                        : '';
                    const leadsUrl = `${getAppBaseUrl()}/console/chatbot/leads`;
                    const replyTo = typeof email === "string" && EMAIL_PATTERN.test(email.trim())
                        ? email.trim().toLowerCase()
                        : undefined;

                    await sendTransactionalEmail({
                        to: settings.leadNotificationEmail,
                        subject: `🎯 Yeni Lead: ${name || email || 'Anonim'}`,
                        replyTo,
                        text: `
Yeni bir lead chatbot'unuz aracılığıyla geldi!

Ad: ${name || 'Belirtilmedi'}
Email: ${email || 'Belirtilmedi'}
Telefon: ${phone || 'Belirtilmedi'}
Kaynak: ${source || 'Pre-chat Form'}
${customFieldsText ? '\nEk Bilgiler:\n' + customFieldsText : ''}

Leadlerinizi yönetmek için paneli ziyaret edin: ${leadsUrl}
                        `.trim(),
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: #6366f1;">🎯 Yeni Lead Bildirimi</h2>
                                <p>Chatbot'unuz aracılığıyla yeni bir lead geldi!</p>
                                <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
                                    <p><strong>Ad:</strong> ${name || 'Belirtilmedi'}</p>
                                    <p><strong>Email:</strong> ${email || 'Belirtilmedi'}</p>
                                    <p><strong>Telefon:</strong> ${phone || 'Belirtilmedi'}</p>
                                    <p><strong>Kaynak:</strong> ${source || 'Pre-chat Form'}</p>
                                    ${customFieldsHtml}
                                </div>
                                <p style="color: #64748b; font-size: 14px;">
                                    Leadlerinizi yönetmek için <a href="${leadsUrl}" style="color: #6366f1;">paneli ziyaret edin</a>.
                                </p>
                            </div>
                        `
                    });
                }
            }
        } catch (emailError) {
            // Don't fail the request if email fails - just log it
            console.error("Failed to send lead notification email:", emailError);
        }

        // Forward to Zoho CRM if connected (fail-soft)
        try {
            const zohoResult = await pushLeadToZoho(chatbotId, {
                name,
                email,
                phone,
                company: customFields?.company || customFields?.Company,
                source: source || "Vion Chatbot",
                description: sessionId ? `Vion session: ${sessionId}` : null,
            });
            if (zohoResult.ok) {
                await docRef.set(
                    { zohoLeadId: zohoResult.id || null, zohoSyncedAt: admin.firestore.FieldValue.serverTimestamp() },
                    { merge: true }
                );
            } else if (zohoResult.error && zohoResult.error !== "Zoho not connected") {
                console.error("Zoho lead push failed:", zohoResult.error);
            }
        } catch (zohoError) {
            console.error("Zoho lead push exception:", zohoError);
        }

        return NextResponse.json({ success: true, id: docRef.id });

    } catch (error: any) {
        console.error("Error saving lead:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}


export async function GET(req: Request) {
    const adminDb = getAdminDb();
    try {
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
        }

        const { searchParams } = new URL(req.url);
        const chatbotId = searchParams.get("chatbotId");

        if (!chatbotId) {
            return NextResponse.json({ error: "Chatbot ID is required" }, { status: 400 });
        }

        // Leads contain PII. Only the owning tenant (chatbotId === owner uid) or a
        // super/agency admin may read them. Prevents IDOR via guessed chatbotId.
        const access = await authorizeTargetAccess(req, chatbotId);
        if (!access.ok) return access.response;

        const querySnapshot = await adminDb.collection("leads")
            .where("chatbotId", "==", chatbotId)
            .get();

        const leads = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() // Convert Timestamp to Date
        })).sort((a: any, b: any) => b.createdAt - a.createdAt); // Sort in memory

        return NextResponse.json({ leads });

    } catch (error: any) {
        console.error("Error fetching leads:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
