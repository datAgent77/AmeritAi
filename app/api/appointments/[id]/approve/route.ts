import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendAppointmentConfirmationEmail } from "@/lib/email-service";
import { authorizeTargetAccess } from "@/lib/api-auth";

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json(
                { error: "Database not available" },
                { status: 503 }
            );
        }

        const { id } = params;

        if (!id) {
            return NextResponse.json(
                { error: "Appointment ID is required" },
                { status: 400 }
            );
        }

        // Get the appointment
        const appointmentRef = adminDb.collection("appointments").doc(id);
        const appointmentSnap = await appointmentRef.get();

        if (!appointmentSnap.exists) {
            return NextResponse.json(
                { error: "Appointment not found" },
                { status: 404 }
            );
        }

        const appointment = appointmentSnap.data();
        const chatbotId = appointment?.chatbotId;
        if (!chatbotId) {
            return NextResponse.json(
                { error: "Appointment chatbotId is missing" },
                { status: 400 }
            );
        }

        const authz = await authorizeTargetAccess(req, chatbotId);
        if (!authz.ok) {
            return authz.response;
        }

        // Update status to confirmed
        await appointmentRef.update({
            status: "confirmed",
            confirmedAt: new Date().toISOString()
        });

        // Resolve company name from chatbot settings
        const chatbotSnap = await adminDb.collection("chatbots").doc(chatbotId).get();
        const chatbotData = chatbotSnap.data();
        const companyName: string = chatbotData?.companyName || chatbotData?.businessName || chatbotData?.name || "AmeritAI";

        // Send confirmation email if customer email exists
        let emailSent = false;
        if (appointment?.customerEmail) {
            try {
                const companyEmail: string | undefined = chatbotData?.leadNotificationEmail || chatbotData?.email || undefined;
                emailSent = await sendAppointmentConfirmationEmail({
                    customerEmail: appointment.customerEmail,
                    customerName: appointment.customerName || "Değerli Müşterimiz",
                    date: appointment.date,
                    time: appointment.time,
                    companyName,
                    companyEmail,
                    notes: appointment.notes,
                    appointmentId: id,
                    location: appointment.location,
                });
            } catch (emailError) {
                console.error("Approve API: Email send failed:", emailError);
                // Don't fail the request if email fails
            }
        }

        return NextResponse.json({
            success: true,
            message: "Appointment confirmed successfully",
            emailSent,
            appointment: {
                id,
                status: "confirmed",
                customerEmail: appointment?.customerEmail || null
            }
        });

    } catch (error: any) {
        console.error("Approve API: Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to approve appointment" },
            { status: 500 }
        );
    }
}
