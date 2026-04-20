import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"

// GET: list price/stock alerts for a visitor
export async function GET(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

        const { searchParams } = new URL(req.url)
        const chatbotId = searchParams.get("chatbotId")
        const visitorId = searchParams.get("visitorId")

        if (!chatbotId || !visitorId) {
            return NextResponse.json({ error: "chatbotId ve visitorId zorunlu" }, { status: 400 })
        }

        const snap = await adminDb
            .collection("product_alerts")
            .where("chatbotId", "==", chatbotId)
            .where("visitorId", "==", visitorId)
            .where("fired", "==", false)
            .get()

        const alerts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        return NextResponse.json({ alerts })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST: register a price or stock alert
export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

        const body = await req.json()
        const {
            chatbotId, visitorId, productId, productName,
            alertType,      // "price" | "stock"
            targetPrice,    // for price alerts: notify when price <= this
            contactEmail,
            contactPhone,
        } = body

        if (!chatbotId || !visitorId || !productId || !alertType) {
            return NextResponse.json({ error: "chatbotId, visitorId, productId, alertType zorunlu" }, { status: 400 })
        }

        if (!contactEmail && !contactPhone) {
            return NextResponse.json({ error: "contactEmail veya contactPhone zorunlu" }, { status: 400 })
        }

        // Dedup
        const existing = await adminDb
            .collection("product_alerts")
            .where("chatbotId", "==", chatbotId)
            .where("visitorId", "==", visitorId)
            .where("productId", "==", productId)
            .where("alertType", "==", alertType)
            .where("fired", "==", false)
            .limit(1)
            .get()

        if (!existing.empty) {
            return NextResponse.json({ id: existing.docs[0].id, alreadyRegistered: true })
        }

        const ref = await adminDb.collection("product_alerts").add({
            chatbotId,
            visitorId,
            productId,
            productName: productName || "",
            alertType,
            targetPrice: targetPrice ?? null,
            contactEmail: contactEmail || null,
            contactPhone: contactPhone || null,
            fired: false,
            createdAt: new Date().toISOString(),
        })

        return NextResponse.json({ id: ref.id, alreadyRegistered: false })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
