import { NextResponse } from "next/server"
import { authorizeCmpAccess } from "@/lib/cmp/server-auth"
import { nowIso } from "@/lib/cmp/utils"
import { shouldUseFirebaseOfflineFallback } from "@/lib/firebase-errors"

export const dynamic = "force-dynamic"

async function loadDomain(adminDb: FirebaseFirestore.Firestore, domainId: string) {
  const snapshot = await adminDb.collection("cmp_domains").doc(domainId).get()
  return snapshot.exists ? (snapshot.data() as any) : null
}

export async function GET(req: Request, context: { params: Promise<{ domainId: string }> }) {
  const authz = await authorizeCmpAccess(req)
  if (!authz.ok) return authz.response

  try {
    const { domainId } = await context.params
    const domain = await loadDomain(authz.adminDb, domainId)
    if (!domain) return NextResponse.json({ error: "Not Found" }, { status: 404 })
    if (!authz.isSuperAdmin && domain.tenantId !== authz.callerUid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const snapshot = await authz.adminDb.collection("cmp_banner_configs").doc(domainId).get()
    const config = snapshot.exists ? snapshot.data() || {} : {}
    return NextResponse.json({ config })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ config: {}, offline: true })
    }
    console.error("CMP config get error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(req: Request, context: { params: Promise<{ domainId: string }> }) {
  const authz = await authorizeCmpAccess(req)
  if (!authz.ok) return authz.response

  try {
    const { domainId } = await context.params
    const domain = await loadDomain(authz.adminDb, domainId)
    if (!domain) return NextResponse.json({ error: "Not Found" }, { status: 404 })
    if (!authz.isSuperAdmin && domain.tenantId !== authz.callerUid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const update: Record<string, any> = { updatedAt: nowIso() }
    if (body?.bannerSettings) update.bannerSettings = body.bannerSettings
    if (body?.preferenceSettings) update.preferenceSettings = body.preferenceSettings
    if (body?.publishedPolicyVersionId !== undefined) update.publishedPolicyVersionId = body.publishedPolicyVersionId

    await authz.adminDb.collection("cmp_banner_configs").doc(domainId).set(update, { merge: true })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ error: "Offline" }, { status: 503 })
    }
    console.error("CMP config update error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
