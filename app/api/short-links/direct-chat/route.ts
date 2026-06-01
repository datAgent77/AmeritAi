import { NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
const CODE_LENGTH = 6

function generateCode() {
    let code = ""
    for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
    }
    return code
}

async function authorize(req: Request, chatbotId: string) {
    const adminAuth = getAdminAuth()
    const adminDb = getAdminDb()
    if (!adminAuth || !adminDb) {
        return { ok: false as const, response: NextResponse.json({ error: "Service unavailable" }, { status: 503 }) }
    }

    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
        return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
    }

    const decoded = await adminAuth.verifyIdToken(authHeader.slice("Bearer ".length))
    if (decoded.uid === chatbotId) return { ok: true as const, adminDb, callerUid: decoded.uid }

    const callerDoc = await adminDb.collection("users").doc(decoded.uid).get()
    const callerRole = String(callerDoc.data()?.role || (decoded as any).role || "").toUpperCase()
    if (callerRole === "SUPER_ADMIN" || callerRole === "AGENCY_ADMIN") {
        return { ok: true as const, adminDb, callerUid: decoded.uid }
    }

    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
}

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}))
        const chatbotId = typeof body?.chatbotId === "string" ? body.chatbotId.trim() : ""
        if (!chatbotId) {
            return NextResponse.json({ error: "chatbotId is required" }, { status: 400 })
        }

        const access = await authorize(req, chatbotId)
        if (!access.ok) return access.response

        const existing = await access.adminDb
            .collection("short_links")
            .where("type", "==", "direct_chat")
            .where("chatbotId", "==", chatbotId)
            .limit(1)
            .get()

        if (!existing.empty) {
            const doc = existing.docs[0]
            return NextResponse.json({ code: doc.id })
        }

        for (let attempt = 0; attempt < 12; attempt++) {
            const code = generateCode()
            const ref = access.adminDb.collection("short_links").doc(code)
            const snap = await ref.get()
            if (snap.exists) continue

            await ref.set({
                type: "direct_chat",
                chatbotId,
                createdBy: access.callerUid,
                createdAt: new Date().toISOString(),
            })

            return NextResponse.json({ code })
        }

        return NextResponse.json({ error: "Could not allocate short link" }, { status: 409 })
    } catch (error) {
        console.error("[short-links/direct-chat] Failed:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
