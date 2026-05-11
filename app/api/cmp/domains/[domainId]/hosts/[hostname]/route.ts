import { NextResponse } from "next/server"
import { authorizeCmpAccess } from "@/lib/cmp/server-auth"
import { cleanHostname, nowIso } from "@/lib/cmp/utils"
import { shouldUseFirebaseOfflineFallback } from "@/lib/firebase-errors"

export const dynamic = "force-dynamic"

async function loadDomain(adminDb: FirebaseFirestore.Firestore, domainId: string) {
  const snapshot = await adminDb.collection("cmp_domains").doc(domainId).get()
  return snapshot.exists ? (snapshot.data() as any) : null
}

async function loadHost(adminDb: FirebaseFirestore.Firestore, hostname: string) {
  const snapshot = await adminDb.collection("cmp_domain_hosts").doc(hostname).get()
  return snapshot.exists ? (snapshot.data() as any) : null
}

export async function DELETE(req: Request, context: { params: Promise<{ domainId: string; hostname: string }> }) {
  const authz = await authorizeCmpAccess(req)
  if (!authz.ok) return authz.response

  try {
    const { domainId, hostname: rawHostname } = await context.params
    const hostname = cleanHostname(rawHostname)
    const domain = await loadDomain(authz.adminDb, domainId)
    if (!domain) return NextResponse.json({ error: "Not Found" }, { status: 404 })
    if (!authz.isSuperAdmin && domain.tenantId !== authz.callerUid) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    if (hostname === domain.primaryHostname) return NextResponse.json({ error: "Primary hostname silinemez" }, { status: 409 })

    const host = await loadHost(authz.adminDb, hostname)
    if (!host || host.domainId !== domainId) return NextResponse.json({ error: "Not Found" }, { status: 404 })

    await authz.adminDb.collection("cmp_domain_hosts").doc(hostname).delete()

    const now = nowIso()
    const currentHostnames = Array.isArray(domain.hostnames) ? (domain.hostnames as unknown[]) : []
    const normalized = currentHostnames.filter((h) => typeof h === "string" && h && h !== hostname)
    const nextHostnames = Array.from(new Set([domain.primaryHostname, ...normalized].filter(Boolean)))
    await authz.adminDb.collection("cmp_domains").doc(domainId).set({ hostnames: nextHostnames, updatedAt: now }, { merge: true })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ error: "Offline" }, { status: 503 })
    }
    console.error("CMP host delete error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

