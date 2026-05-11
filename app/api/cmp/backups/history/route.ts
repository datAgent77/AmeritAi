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
    const tenantIdParam = cleanString(searchParams.get("tenantId"), 160)
    const effectiveTenantId = authz.isSuperAdmin && tenantIdParam ? tenantIdParam : authz.callerUid

    const limitRaw = Number(searchParams.get("limit"))
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.floor(limitRaw))) : 50

    const snapshot = await authz.adminDb
      .collection("cmp_consent_backup_history")
      .where("tenantId", "==", effectiveTenantId)
      .limit(500)
      .get()

    const items = snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
      .slice(0, limit)

    return NextResponse.json({ tenantId: effectiveTenantId, items })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ tenantId: authz.callerUid, items: [], offline: true })
    }
    console.error("CMP backup history list error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

