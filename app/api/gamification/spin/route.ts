import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { pickPrize } from "@/lib/gamification/spin-engine"

export const runtime = "nodejs"

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

        const body = await req.json()
        const { chatbotId, sessionId, visitorId, contactEmail, contactName } = body as {
            chatbotId: string
            sessionId?: string
            visitorId?: string
            contactEmail?: string
            contactName?: string
        }

        if (!chatbotId) return NextResponse.json({ error: "chatbotId zorunlu" }, { status: 400 })

        const dedupKey = visitorId || sessionId
        if (!dedupKey) {
            return NextResponse.json({ error: "visitorId veya sessionId zorunlu" }, { status: 400 })
        }

        if (dedupKey) {
            const existing = await adminDb
                .collection("gamification_spins")
                .where("chatbotId", "==", chatbotId)
                .where("dedupKey", "==", dedupKey)
                .limit(1)
                .get()

            if (!existing.empty) {
                const prev = existing.docs[0].data()
                return NextResponse.json({
                    alreadySpun: true,
                    prize: prev.prizeWon,
                    couponCode: prev.couponCode,
                })
            }
        }

        const chatbotSnap = await adminDb.collection("chatbots").doc(chatbotId).get()
        const gamification = chatbotSnap.data()?.gamification
        if (!gamification?.enabled) {
            return NextResponse.json({ error: "Gamification disabled" }, { status: 400 })
        }

        const prizes = gamification.prizes || []
        if (!prizes.length) return NextResponse.json({ error: "No prizes configured" }, { status: 400 })

        const result = pickPrize(prizes)

        await adminDb.collection("gamification_spins").add({
            chatbotId,
            sessionId: sessionId || null,
            dedupKey: dedupKey || null,
            prizeWon: result.prize.name,
            prizeIndex: result.prizeIndex,
            couponCode: result.couponCode || null,
            contactEmail: contactEmail || null,
            contactName: contactName || null,
            claimedAt: new Date().toISOString(),
        })

        return NextResponse.json({
            alreadySpun: false,
            prizeIndex: result.prizeIndex,
            prize: result.prize.name,
            couponCode: result.couponCode,
        })
    } catch (error: any) {
        console.error("gamification/spin POST:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
