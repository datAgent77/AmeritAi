import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { DEFAULT_APPOINTMENT_SCHEDULING_SETTINGS } from "@/lib/appointment-scheduling"

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

        const authz = await authorizeTargetAccess(req, chatbotId)
        if (!authz.ok) {
            return authz.response
        }

        const docRef = adminDb.collection("appointments_settings").doc(chatbotId)
        const docSnap = await docRef.get()

        if (docSnap.exists) {
            return NextResponse.json({ settings: docSnap.data() })
        } else {
            // Return default settings
            return NextResponse.json({
                settings: {
                    ...DEFAULT_APPOINTMENT_SCHEDULING_SETTINGS,
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

        const authz = await authorizeTargetAccess(req, chatbotId)
        if (!authz.ok) {
            return authz.response
        }

        const docRef = adminDb.collection("appointments_settings").doc(chatbotId)
        await docRef.set(settings, { merge: true })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Settings POST Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
