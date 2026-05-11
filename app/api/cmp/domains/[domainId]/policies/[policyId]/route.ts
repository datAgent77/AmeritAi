import { NextResponse } from "next/server"
import { authorizeCmpAccess } from "@/lib/cmp/server-auth"
import { cleanString, nowIso, sha256Hex, stableStringify } from "@/lib/cmp/utils"
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

export async function GET(req: Request, context: { params: Promise<{ domainId: string; policyId: string }> }) {
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

    return NextResponse.json({ policy: { id: policyId, ...policy } })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ error: "Offline" }, { status: 503 })
    }
    console.error("CMP policy get error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(req: Request, context: { params: Promise<{ domainId: string; policyId: string }> }) {
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
    if (policy.status === "published") {
      return NextResponse.json({ error: "Published policies cannot be edited" }, { status: 409 })
    }

    const body = await req.json().catch(() => ({}))
    const title = cleanString(body?.title, 120) || cleanString(policy?.content?.title, 120) || "Çerez Aydınlatma Metni"
    const policyUrl = cleanString(body?.policyUrl, 500)
    const content = {
      title,
      bannerDescription: cleanString(body?.bannerDescription, 800),
      policyUrl: policyUrl || null,
      categories: body?.categories || null,
    }

    const update = {
      content,
      contentHash: sha256Hex(stableStringify(content)),
      updatedAt: nowIso(),
    }

    await authz.adminDb.collection("cmp_policy_versions").doc(policyId).set(update, { merge: true })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ error: "Offline" }, { status: 503 })
    }
    console.error("CMP policy update error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
