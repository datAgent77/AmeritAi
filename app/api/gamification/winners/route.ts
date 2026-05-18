import { NextResponse } from "next/server"
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin"
import { isWinningPrize } from "@/lib/gamification/spin-engine"

export const runtime = "nodejs"

export async function GET(req: Request) {
    try {
        const adminDb = getAdminDb()
        const adminAuth = getAdminAuth()
        if (!adminDb || !adminAuth) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

        // Verify auth
        const authHeader = req.headers.get("Authorization") || ""
        const token = authHeader.replace("Bearer ", "").trim()
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        let decodedToken: any
        try {
            decodedToken = await adminAuth.verifyIdToken(token)
        } catch {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const targetChatbotId = searchParams.get("chatbotId") || decodedToken.uid

        // Only allow access to own chatbotId unless super admin
        const isSuperAdmin = decodedToken.role === "SUPER_ADMIN"
        if (targetChatbotId !== decodedToken.uid && !isSuperAdmin) {
            // Also allow AGENCY_ADMIN to view tenant data
            const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get()
            const userRole = userDoc.data()?.role
            if (userRole !== "SUPER_ADMIN" && userRole !== "AGENCY_ADMIN") {
                return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
            }
        }

        const snap = await adminDb
            .collection("chatbots")
            .doc(targetChatbotId)
            .collection("gamification_winners")
            .orderBy("playedAt", "desc")
            .limit(200)
            .get()

        const winners = snap.docs.map(doc => {
            const data = doc.data()
            return {
                id: doc.id,
                email: data.email || "Anonim",
                prize: data.prize || "-",
                couponCode: data.couponCode || null,
                playedAt: data.playedAt?.toDate ? data.playedAt.toDate().toISOString() : data.playedAt,
                sessionId: data.sessionId || null,
                isWinner: typeof data.isWinner === "boolean"
                    ? data.isWinner
                    : isWinningPrize({ name: data.prize || "" }),
            }
        }).filter(winner => winner.isWinner)

        return NextResponse.json({ winners, total: winners.length })
    } catch (error: any) {
        console.error("gamification/winners GET:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
