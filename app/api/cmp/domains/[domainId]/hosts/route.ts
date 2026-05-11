import { NextResponse } from "next/server"
import { authorizeCmpAccess } from "@/lib/cmp/server-auth"
import { cleanHostname, cleanString, nowIso, newId } from "@/lib/cmp/utils"
import { getDnsVerificationRecord, type CmpVerificationMethod } from "@/lib/cmp/verify"
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
    if (!authz.isSuperAdmin && domain.tenantId !== authz.callerUid) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const snapshot = await authz.adminDb
      .collection("cmp_domain_hosts")
      .where("domainId", "==", domainId)
      .limit(500)
      .get()

    const hosts = snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
      .sort((a, b) => (b.verifiedAt || b.updatedAt || b.createdAt || "").localeCompare(a.verifiedAt || a.updatedAt || a.createdAt || ""))

    return NextResponse.json({ hosts })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ hosts: [], offline: true })
    }
    console.error("CMP hosts list error:", error)
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
    if (!authz.isSuperAdmin && domain.tenantId !== authz.callerUid) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const hostname = cleanHostname(body?.hostname)
    const method = (cleanString(body?.method, 20) as CmpVerificationMethod) || "dns_txt"

    if (!hostname) return NextResponse.json({ error: "Missing hostname" }, { status: 400 })
    if (hostname === domain.primaryHostname) {
      return NextResponse.json({ error: "Primary hostname zaten kayıtlı" }, { status: 409 })
    }
    if (method !== "dns_txt" && method !== "http_file") {
      return NextResponse.json({ error: "Invalid method" }, { status: 400 })
    }

    const id = hostname
    const token = newId("vfy")
    const now = nowIso()

    await authz.adminDb.collection("cmp_domain_hosts").doc(id).set(
      {
        tenantId: domain.tenantId,
        domainId,
        hostname,
        method,
        status: "pending",
        token,
        createdAt: now,
        updatedAt: now,
        verifiedAt: null,
        lastCheckedAt: null,
      },
      { merge: true }
    )

    return NextResponse.json({
      id,
      token,
      instructions:
        method === "dns_txt"
          ? {
              type: "dns_txt",
              record: getDnsVerificationRecord(hostname),
              value: token,
            }
          : {
              type: "http_file",
              url: `https://${hostname}/.well-known/vion-cmp.txt`,
              content: token,
            },
    })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ error: "Offline" }, { status: 503 })
    }
    console.error("CMP hosts create error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

