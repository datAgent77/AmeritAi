import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { isWinningPrize, pickPrize } from "@/lib/gamification/spin-engine"
import { resolveGamificationRuntimeAccess } from "@/lib/gamification/runtime-access"
import { sendGamificationWinnerNotification } from "@/lib/email-service"

export const runtime = "nodejs"

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

        const body = await req.json()
        const { chatbotId, sessionId, visitorId, contactEmail, contactName, email } = body as {
            chatbotId: string
            sessionId?: string
            visitorId?: string
            contactEmail?: string
            contactName?: string
            email?: string // alias from overlay
        }

        // Support both contactEmail and email fields (from different overlays)
        const playerEmail = contactEmail || email || null

        if (!chatbotId) return NextResponse.json({ error: "chatbotId zorunlu" }, { status: 400 })

        const dedupKey = visitorId || sessionId
        if (!dedupKey) {
            return NextResponse.json({ error: "visitorId veya sessionId zorunlu" }, { status: 400 })
        }

        const chatbotSnap = await adminDb.collection("chatbots").doc(chatbotId).get()
        const chatbotData = chatbotSnap.data()
        const access = await resolveGamificationRuntimeAccess(adminDb, chatbotId, chatbotData)
        const gamification = access.gamification
        if (!access.enabled || !gamification) {
            return NextResponse.json({ error: "Gamification disabled" }, { status: 400 })
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
                const isWinner = typeof prev.isWinner === "boolean"
                    ? prev.isWinner
                    : isWinningPrize({ name: prev.prizeWon || "" })
                return NextResponse.json({
                    alreadySpun: true,
                    prize: prev.prizeWon,
                    couponCode: prev.couponCode,
                    isWinner,
                })
            }
        }

        const prizes = gamification.prizes || []
        if (!prizes.length) return NextResponse.json({ error: "No prizes configured" }, { status: 400 })

        const result = pickPrize(prizes)

        // Save to flat collection (dedup)
        await adminDb.collection("gamification_spins").add({
            chatbotId,
            sessionId: sessionId || null,
            dedupKey: dedupKey || null,
            prizeWon: result.prize.name,
            prizeIndex: result.prizeIndex,
            couponCode: result.couponCode || null,
            isWinner: result.isWinner,
            contactEmail: playerEmail,
            contactName: contactName || null,
            claimedAt: new Date().toISOString(),
        })

        if (result.isWinner) {
            // Save to per-chatbot sub-collection for winners page
            await adminDb.collection("chatbots").doc(chatbotId)
                .collection("gamification_winners")
                .add({
                    email: playerEmail || "anonymous",
                    prize: result.prize.name,
                    couponCode: result.couponCode || null,
                    playedAt: new Date(),
                    sessionId: sessionId || null,
                    isWinner: true,
                })

            // Send tenant notification email (non-blocking)
            const tenantEmail = chatbotData?.email || chatbotData?.ownerEmail || null
            const businessName = chatbotData?.businessName || chatbotData?.name || "Vion AI"
            if (tenantEmail) {
                sendGamificationWinnerNotification({
                    tenantEmail,
                    businessName,
                    playerEmail: playerEmail || "Anonim",
                    prize: result.prize.name,
                    couponCode: result.couponCode,
                    gameType: gamification.gameType || "wheel",
                }).catch((err) => console.error("Gamification email notification failed:", err))
            }
        }

        return NextResponse.json({
            alreadySpun: false,
            prizeIndex: result.prizeIndex,
            prize: result.prize.name,
            couponCode: result.couponCode,
            isWinner: result.isWinner,
        })
    } catch (error: any) {
        console.error("gamification/spin POST:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
