import { NextResponse } from "next/server"
import { authorizeCmpAccess } from "@/lib/cmp/server-auth"
import { nowIso } from "@/lib/cmp/utils"
import { shouldUseFirebaseOfflineFallback } from "@/lib/firebase-errors"

export const dynamic = "force-dynamic"

async function loadDomain(adminDb: FirebaseFirestore.Firestore, domainId: string) {
  const snapshot = await adminDb.collection("cmp_domains").doc(domainId).get()
  return snapshot.exists ? (snapshot.data() as any) : null
}

async function loadPolicy(adminDb: FirebaseFirestore.Firestore, policyId: string) {
  const snapshot = await adminDb.collection("cmp_policy_versions").doc(policyId).get()
  return snapshot.exists ? (snapshot.data() as any) : null
}

export async function POST(req: Request, context: { params: Promise<{ domainId: string; policyId: string }> }) {
  const authz = await authorizeCmpAccess(req)
  if (!authz.ok) return authz.response

  try {
    const { domainId, policyId } = await context.params
    const domain = await loadDomain(authz.adminDb, domainId)
    if (!domain) return NextResponse.json({ error: "Not Found" }, { status: 404 })
    if (!authz.isSuperAdmin && domain.tenantId !== authz.callerUid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const policy = await loadPolicy(authz.adminDb, policyId)
    if (!policy || policy.domainId !== domainId) return NextResponse.json({ error: "Not Found" }, { status: 404 })

    const now = nowIso()
    await authz.adminDb.collection("cmp_policy_versions").doc(policyId).set(
      {
        status: "published",
        publishedAt: now,
        updatedAt: now,
      },
      { merge: true }
    )

    await authz.adminDb.collection("cmp_banner_configs").doc(domainId).set(
      {
        publishedPolicyVersionId: policyId,
        updatedAt: now,
      },
      { merge: true }
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ error: "Offline" }, { status: 503 })
    }
    console.error("CMP policy publish error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
