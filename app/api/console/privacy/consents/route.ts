import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { shouldUseFirebaseOfflineFallback } from "@/lib/firebase-errors"

function cleanString(value: unknown, maxLength = 200) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

function cleanInt(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.floor(parsed)
}

export async function GET(req: Request) {
  try {
    const adminDb = getAdminDb()
    if (!adminDb) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const chatbotId = cleanString(searchParams.get("chatbotId"), 160)
    const limit = Math.max(1, Math.min(500, cleanInt(searchParams.get("limit"), 200)))
    const eventType = cleanString(searchParams.get("eventType"), 80)
    const purpose = cleanString(searchParams.get("purpose"), 80)

    if (!chatbotId) {
      return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 })
    }

    const authz = await authorizeTargetAccess(req, chatbotId)
    if (!authz.ok) return authz.response

    const baseQuery = adminDb
      .collection("privacy_consent_events")
      .where("chatbotId", "==", chatbotId)

    let query: FirebaseFirestore.Query = baseQuery

    if (eventType) {
      query = query.where("eventType", "==", eventType)
    }

    if (purpose) {
      query = query.where("purpose", "==", purpose)
    }

    const fetchWithIndex = async () => query.orderBy("createdAt", "desc").limit(limit).get()

    const snapshot = await (async () => {
      try {
        return await fetchWithIndex()
      } catch (error: any) {
        const msg = typeof error?.message === "string" ? error.message : ""
        const isIndexError = msg.includes("requires an index") || error?.code === 9
        if (!isIndexError) throw error

        const fallbackSnapshot = await baseQuery.limit(Math.min(500, limit)).get()
        return fallbackSnapshot
      }
    })()

    const events = snapshot.docs.map((doc) => {
      const data = doc.data() || {}
      const createdAt = (data as any).createdAt
      const createdAtMs = typeof createdAt?.toMillis === "function" ? createdAt.toMillis() : null

      return {
        id: doc.id,
        chatbotId: data.chatbotId || chatbotId,
        sessionId: data.sessionId || null,
        visitorId: data.visitorId || null,
        eventType: data.eventType || null,
        purpose: data.purpose || null,
        legalFramework: data.legalFramework || null,
        documentType: data.documentType || null,
        documentVersionHash: data.documentVersionHash || null,
        textHash: data.textHash || null,
        origin: data.origin || null,
        createdAtMs,
      }
    })

    const filteredEvents = events
      .filter((row) => (eventType ? row.eventType === eventType : true))
      .filter((row) => (purpose ? row.purpose === purpose : true))
      .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
      .slice(0, limit)

    return NextResponse.json({ events: filteredEvents })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ events: [], offline: true })
    }

    console.error("Error fetching privacy consents:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
