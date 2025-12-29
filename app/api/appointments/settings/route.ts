import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

export const runtime = 'nodejs'

// GET: Fetch settings for a chatbot
export async function GET(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) {
            return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
        }

        const { searchParams } = new URL(req.url)
        const chatbotId = searchParams.get("chatbotId")

        if (!chatbotId) {
            return NextResponse.json({ error: "chatbotId is required" }, { status: 400 })
        }

        const docRef = adminDb.collection("appointments_settings").doc(chatbotId)
        const docSnap = await docRef.get()

        if (docSnap.exists) {
            return NextResponse.json({ settings: docSnap.data() })
        } else {
            // Return default settings
            return NextResponse.json({
                settings: {
                    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                    workingHoursStart: '09:00',
                    workingHoursEnd: '18:00',
                    appointmentDuration: 30,
                    googleCalendarConnected: false,
                    outlookCalendarConnected: false
                }
            })
        }
    } catch (error) {
        console.error("Settings GET Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// POST: Save settings for a chatbot
export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) {
            return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
        }

        const body = await req.json()
        const { chatbotId, ...settings } = body

        if (!chatbotId) {
            return NextResponse.json({ error: "chatbotId is required" }, { status: 400 })
        }

        const docRef = adminDb.collection("appointments_settings").doc(chatbotId)
        await docRef.set(settings, { merge: true })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Settings POST Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
