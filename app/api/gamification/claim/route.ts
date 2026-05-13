import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { isWinningPrize } from "@/lib/gamification/spin-engine"

export const runtime = "nodejs"

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

        const body = await req.json()
        const { chatbotId, sessionId, visitorId, name, email, phone, kvkk } = body

        if (!chatbotId || !email || !name) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const dedupKey = visitorId || sessionId
        if (!dedupKey) {
            return NextResponse.json({ error: "Missing session info" }, { status: 400 })
        }

        // Find the spin record to update it
        const spinSnap = await adminDb
            .collection("gamification_spins")
            .where("chatbotId", "==", chatbotId)
            .where("dedupKey", "==", dedupKey)
            .limit(1)
            .get()

        if (spinSnap.empty) {
            return NextResponse.json({ error: "Spin record not found" }, { status: 404 })
        }

        const spinData = spinSnap.docs[0].data()
        const isWinner = typeof spinData.isWinner === "boolean"
            ? spinData.isWinner
            : isWinningPrize({ name: spinData.prizeWon || "" })
        if (!isWinner) {
            return NextResponse.json({ error: "Prize is not claimable" }, { status: 400 })
        }

        const spinDocId = spinSnap.docs[0].id
        await adminDb.collection("gamification_spins").doc(spinDocId).update({
            contactName: name,
            contactEmail: email,
            contactPhone: phone,
            kvkkAccepted: kvkk,
            updatedAt: new Date().toISOString()
        })

        // Also update the winner record in the sub-collection
        const winnerSnap = await adminDb
            .collection("chatbots")
            .doc(chatbotId)
            .collection("gamification_winners")
            .where("sessionId", "==", sessionId)
            .limit(1)
            .get()
        
        if (!winnerSnap.empty) {
            const docId = winnerSnap.docs[0].id
            await adminDb.collection("chatbots").doc(chatbotId)
                .collection("gamification_winners")
                .doc(docId)
                .update({
                    name,
                    email,
                    phone,
                    kvkkAccepted: kvkk,
                    updatedAt: new Date().toISOString()
                })
        } else {
            // If winner record doesn't exist (maybe different sessionId logic), create one
            // only after verifying the spin result is claimable.
             await adminDb.collection("chatbots").doc(chatbotId)
                .collection("gamification_winners")
                .add({
                    name,
                    email,
                    phone,
                    kvkkAccepted: kvkk,
                    prize: spinData.prizeWon || "-",
                    couponCode: spinData.couponCode || null,
                    isWinner: true,
                    playedAt: new Date(),
                    sessionId: sessionId || null,
                    leadSource: "gamification_claim"
                })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("gamification/claim POST:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
