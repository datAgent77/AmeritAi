import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { hashMobileClientToken } from "@/lib/integrations/mobile-support"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function toDate(value: any): Date | null {
    if (!value) return null
    if (typeof value.toDate === "function") return value.toDate()
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
}

export async function GET(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

        const { searchParams } = new URL(req.url)
        const chatbotId = String(searchParams.get("chatbotId") || "").trim()
        const mobileSession = String(searchParams.get("mobileSession") || "").trim()

        if (!chatbotId) return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 })
        if (!mobileSession) return NextResponse.json({ error: "Missing mobileSession" }, { status: 400 })

        const sessionHash = hashMobileClientToken(mobileSession)
        const sessionRef = adminDb.collection("mobile_app_sessions").doc(sessionHash)
        const sessionSnap = await sessionRef.get()
        if (!sessionSnap.exists) return NextResponse.json({ error: "Mobile session not found" }, { status: 404 })

        const data = sessionSnap.data() || {}
        if (data.chatbotId !== chatbotId) return NextResponse.json({ error: "Mobile session does not belong to chatbot" }, { status: 403 })

        const expiresAt = toDate(data.expiresAt)
        if (!expiresAt || expiresAt.getTime() < Date.now()) {
            return NextResponse.json({ error: "Mobile session expired" }, { status: 410 })
        }

        await sessionRef.set({ usedAt: new Date() }, { merge: true })

        return NextResponse.json({
            success: true,
            sessionId: data.sessionId || null,
            language: data.language || null,
            context: data.pageContext || null,
        })
    } catch (error: any) {
        console.error("[mobile-assistant/session-context GET]", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}
