import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { requireSuperAdmin } from "@/lib/api-auth"
import { DEFAULT_EDUCATION_ITEMS } from "@/lib/cms-content"

export async function GET(req: NextRequest) {
    try {
        const db = getAdminDb()
        if (!db) {
            return NextResponse.json({ error: "Database unavailable" }, { status: 500 })
        }

        const snapshot = await db.collection("cms_education").get()
        let items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

        // Auto-seed only when empty (first run). The previous `?reset=true` path
        // allowed UNAUTHENTICATED deletion of all content and has been removed.
        if (items.length === 0) {
            const batch = db.batch()
            DEFAULT_EDUCATION_ITEMS.forEach((item) => {
                const docRef = db.collection("cms_education").doc()
                batch.set(docRef, item)
            })
            await batch.commit()
            const seededSnapshot = await db.collection("cms_education").get()
            items = seededSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        }

        return NextResponse.json(items)
    } catch (error) {
        console.error("Error fetching education items:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const authz = await requireSuperAdmin(req)
        if (!authz.ok) return authz.response

        const db = getAdminDb()
        if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 500 })

        const body = await req.json()
        const docRef = await db.collection("cms_education").add(body)
        return NextResponse.json({ id: docRef.id, ...body })
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
