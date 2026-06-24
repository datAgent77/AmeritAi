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
            title: "New lead captured",
            message: `${name || "Anonymous"}${email || phone ? ` - ${email || phone}` : ""}`,
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
                    // Notification language: respect chatbot setting if tr/es, otherwise default to English
                    const rawLang = typeof settings?.language === "string" ? settings.language : "en";
                    const lang = rawLang === "tr" || rawLang === "es" ? rawLang : "en";
                    const p = (en: string, tr: string, es: string) => (lang === "tr" ? tr : lang === "es" ? es : en);

                    const L = {
                        notProvided: p("Not provided", "Belirtilmedi", "No proporcionado"),
                        intro: p(
                            "A new lead came in through your chatbot!",
                            "Chatbot'unuz aracılığıyla yeni bir lead geldi!",
                            "¡Un nuevo cliente potencial llegó a través de tu chatbot!"
                        ),
                        name: p("Name", "Ad", "Nombre"),
                        email: p("Email", "Email", "Correo"),
                        phone: p("Phone", "Telefon", "Teléfono"),
                        source: p("Source", "Kaynak", "Origen"),
                        extra: p("Additional details", "Ek Bilgiler", "Detalles adicionales"),
                        manage: p("Manage your leads in the dashboard", "Leadlerinizi yönetmek için paneli ziyaret edin", "Gestiona tus clientes potenciales en el panel"),
                        heading: p("New Lead Notification", "Yeni Lead Bildirimi", "Notificación de nuevo cliente potencial"),
                        visitPanel: p("visit the dashboard", "paneli ziyaret edin", "visita el panel"),
                        subject: p("New Lead", "Yeni Lead", "Nuevo cliente potencial"),
                    };

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
                        subject: `🎯 ${L.subject}: ${name || email || L.notProvided}`,
                        replyTo,
                        text: `
${L.intro}

${L.name}: ${name || L.notProvided}
${L.email}: ${email || L.notProvided}
${L.phone}: ${phone || L.notProvided}
${L.source}: ${source || 'Pre-chat Form'}
${customFieldsText ? `\n${L.extra}:\n` + customFieldsText : ''}

${L.manage}: ${leadsUrl}
                        `.trim(),
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: #6366f1;">🎯 ${L.heading}</h2>
                                <p>${L.intro}</p>
                                <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
                                    <p><strong>${L.name}:</strong> ${name || L.notProvided}</p>
                                    <p><strong>${L.email}:</strong> ${email || L.notProvided}</p>
                                    <p><strong>${L.phone}:</strong> ${phone || L.notProvided}</p>
                                    <p><strong>${L.source}:</strong> ${source || 'Pre-chat Form'}</p>
                                    ${customFieldsHtml}
                                </div>
                                <p style="color: #64748b; font-size: 14px;">
                                    ${L.manage} — <a href="${leadsUrl}" style="color: #6366f1;">${L.visitPanel}</a>.
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
                source: source || "AmeritAI Chatbot",
                description: sessionId ? `AmeritAI session: ${sessionId}` : null,
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
