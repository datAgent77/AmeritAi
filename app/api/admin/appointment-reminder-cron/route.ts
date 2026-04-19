import { NextResponse } from "next/server"
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin"
import { sendAppointmentReminderEmail } from "@/lib/email-service"

export const dynamic = "force-dynamic"

function getCronSecret(request: Request) {
    return request.headers.get("x-cron-secret") || new URL(request.url).searchParams.get("secret")
}

export async function GET(request: Request) {
    const cronSecret = getCronSecret(request)
    if (cronSecret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminDb = getAdminDb()
    if (!adminDb) {
        return NextResponse.json({ error: "Database not initialized" }, { status: 500 })
    }

    // Compute tomorrow's date string in YYYY-MM-DD
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().slice(0, 10)

    const snapshot = await adminDb
        .collection("appointments")
        .where("date", "==", tomorrowStr)
        .where("status", "in", ["pending", "confirmed"])
        .get()

    let sent = 0
    let skipped = 0
    let errors = 0

    const adminAuth = getAdminAuth()

    for (const doc of snapshot.docs) {
        const data = doc.data()

        if (!data.customerEmail) {
            skipped++
            continue
        }

        // Skip if reminder already sent
        if (data.reminderSentAt) {
            skipped++
            continue
        }

        try {
            // Resolve company name from chatbot settings
            let companyName = "Vion AI"
            if (data.chatbotId) {
                const chatbotSnap = await adminDb.collection("chatbots").doc(data.chatbotId).get()
                const cd = chatbotSnap.data()
                companyName = cd?.companyName || cd?.businessName || cd?.name || "Vion AI"
            }

            const ok = await sendAppointmentReminderEmail({
                customerEmail: data.customerEmail,
                customerName: data.customerName || "Değerli Müşterimiz",
                date: data.date,
                time: data.time,
                companyName,
                notes: data.notes,
            })

            if (ok) {
                await doc.ref.update({ reminderSentAt: new Date().toISOString() })
                sent++
            } else {
                errors++
            }
        } catch (err) {
            console.error(`appointment-reminder-cron: error for ${doc.id}:`, err)
            errors++
        }
    }

    return NextResponse.json({ tomorrowStr, sent, skipped, errors })
}
