import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"

// GET: visitor profile
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
            .collection("visitor_profiles")
            .where("chatbotId", "==", chatbotId)
            .where("visitorId", "==", visitorId)
            .limit(1)
            .get()

        if (snap.empty) return NextResponse.json({ profile: null })
        return NextResponse.json({ profile: { id: snap.docs[0].id, ...snap.docs[0].data() } })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST: upsert visitor profile (called by chat engine on each session)
export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

        const body = await req.json()
        const {
            chatbotId,
            visitorId,
            // Behavioral signals
            viewedProductIds,
            searchQueries,
            clickedCategories,
            // Contact
            contactEmail,
            contactPhone,
            // Inferred
            preferredCategories,
            priceRange,
        } = body

        if (!chatbotId || !visitorId) {
            return NextResponse.json({ error: "chatbotId ve visitorId zorunlu" }, { status: 400 })
        }

        const now = new Date().toISOString()

        const existing = await adminDb
            .collection("visitor_profiles")
            .where("chatbotId", "==", chatbotId)
            .where("visitorId", "==", visitorId)
            .limit(1)
            .get()

        const updateData: Record<string, any> = {
            chatbotId,
            visitorId,
            updatedAt: now,
        }

        if (viewedProductIds?.length) updateData.viewedProductIds = viewedProductIds
        if (searchQueries?.length) updateData.searchQueries = searchQueries
        if (clickedCategories?.length) updateData.clickedCategories = clickedCategories
        if (contactEmail) updateData.contactEmail = contactEmail
        if (contactPhone) updateData.contactPhone = contactPhone
        if (preferredCategories?.length) updateData.preferredCategories = preferredCategories
        if (priceRange) updateData.priceRange = priceRange

        if (existing.empty) {
            updateData.createdAt = now
            updateData.sessionCount = 1
            await adminDb.collection("visitor_profiles").add(updateData)
        } else {
            const prevData = existing.docs[0].data()
            // Merge arrays
            if (viewedProductIds?.length) {
                const merged = [...new Set([...(prevData.viewedProductIds || []), ...viewedProductIds])]
                updateData.viewedProductIds = merged.slice(-100) // keep last 100
            }
            if (searchQueries?.length) {
                const merged = [...new Set([...(prevData.searchQueries || []), ...searchQueries])]
                updateData.searchQueries = merged.slice(-50)
            }
            updateData.sessionCount = (prevData.sessionCount || 0) + 1
            await existing.docs[0].ref.update(updateData)
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
