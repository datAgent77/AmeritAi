import { NextResponse } from "next/server"
import { authorizeCmpAccess } from "@/lib/cmp/server-auth"
import { cleanString, nowIso, newId, sha256Hex, stableStringify } from "@/lib/cmp/utils"
import { shouldUseFirebaseOfflineFallback } from "@/lib/firebase-errors"
import { buildCmpPolicyContent } from "@/lib/cmp/policy-content"

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

    const snapshot = await authz.adminDb
      .collection("cmp_policy_versions")
      .where("domainId", "==", domainId)
      .limit(500)
      .get()

    const policies = snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
      .sort((a, b) => (b.publishedAt || b.createdAt || "").localeCompare(a.publishedAt || a.createdAt || ""))

    return NextResponse.json({ policies })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ policies: [], offline: true })
    }
    console.error("CMP policies list error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request, context: { params: Promise<{ domainId: string }> }) {
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
    const language = cleanString(body?.language, 8) || "tr"
    const content = buildCmpPolicyContent({ body })

    const id = newId("pol")
    const now = nowIso()
    const contentHash = sha256Hex(stableStringify(content))

    await authz.adminDb.collection("cmp_policy_versions").doc(id).set({
      tenantId: domain.tenantId,
      domainId,
      status: "draft",
      language,
      content,
      contentHash,
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
    })

    return NextResponse.json({ id })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ error: "Offline" }, { status: 503 })
    }
    console.error("CMP policies create error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
