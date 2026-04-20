import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"

// GET: visitor wishlist
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
            .collection("visitor_wishlists")
            .where("chatbotId", "==", chatbotId)
            .where("visitorId", "==", visitorId)
            .get()

        const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        return NextResponse.json({ items })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST: add item to wishlist
export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

        const body = await req.json()
        const { chatbotId, visitorId, productId, productName, productUrl, price, imageUrl } = body

        if (!chatbotId || !visitorId || !productId) {
            return NextResponse.json({ error: "chatbotId, visitorId, productId zorunlu" }, { status: 400 })
        }

        // Dedup
        const existing = await adminDb
            .collection("visitor_wishlists")
            .where("chatbotId", "==", chatbotId)
            .where("visitorId", "==", visitorId)
            .where("productId", "==", productId)
            .limit(1)
            .get()

        if (!existing.empty) {
            return NextResponse.json({ id: existing.docs[0].id, alreadyAdded: true })
        }

        const ref = await adminDb.collection("visitor_wishlists").add({
            chatbotId,
            visitorId,
            productId,
            productName: productName || "",
            productUrl: productUrl || "",
            price: price ?? null,
            imageUrl: imageUrl || null,
            addedAt: new Date().toISOString(),
        })

        return NextResponse.json({ id: ref.id, alreadyAdded: false })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// DELETE: remove item from wishlist
export async function DELETE(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")
        if (!id) return NextResponse.json({ error: "id zorunlu" }, { status: 400 })

        await adminDb.collection("visitor_wishlists").doc(id).delete()
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
