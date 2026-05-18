import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { resolveGamificationRuntimeAccess } from "@/lib/gamification/runtime-access"

export const runtime = "nodejs"

export async function GET(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

        const { searchParams } = new URL(req.url)
        const chatbotId = searchParams.get("chatbotId")

        if (!chatbotId) return NextResponse.json({ error: "chatbotId zorunlu" }, { status: 400 })

        const access = await resolveGamificationRuntimeAccess(adminDb, chatbotId)
        const gamification = access.gamification

        if (!access.enabled || !gamification) {
            return NextResponse.json({ enabled: false })
        }

        return NextResponse.json({
            ...gamification,
            enabled: true,
            gameType: gamification.gameType || "wheel",
            requireEmail: gamification.requireEmail ?? true,
            cooldownHours: gamification.cooldownHours ?? 24,
            themeColor: gamification.themeColor || "#8b5cf6",
            prizes: gamification.prizes || [],
            triggers: gamification.triggers || {},
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
