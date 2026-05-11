import { NextResponse } from "next/server"
import { authorizeCmpAccess } from "@/lib/cmp/server-auth"
import { cleanString } from "@/lib/cmp/utils"
import { shouldUseFirebaseOfflineFallback } from "@/lib/firebase-errors"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const authz = await authorizeCmpAccess(req)
  if (!authz.ok) return authz.response

  try {
    const { searchParams } = new URL(req.url)
    const domainId = cleanString(searchParams.get("domainId"), 200)
    const action = cleanString(searchParams.get("action"), 80)
    const limitRaw = Number(searchParams.get("limit"))
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, Math.floor(limitRaw))) : 200

    const snapshot = await authz.adminDb
      .collection("cmp_consents")
      .where("tenantId", "==", authz.callerUid)
      .limit(1000)
      .get()

    const events = snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
      .filter((row) => (domainId ? row.domainId === domainId : true))
      .filter((row) => (action ? row.action === action : true))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
      .slice(0, limit)

    return NextResponse.json({ events })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ events: [], offline: true })
    }
    console.error("CMP consents list error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
