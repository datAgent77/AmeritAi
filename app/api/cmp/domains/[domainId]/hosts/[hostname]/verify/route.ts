import { NextResponse } from "next/server"
import { authorizeCmpAccess } from "@/lib/cmp/server-auth"
import { cleanHostname, nowIso } from "@/lib/cmp/utils"
import { httpBodyMatchesToken, verifyDnsTxt } from "@/lib/cmp/verify"
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

async function verifyHttpFile(hostname: string, token: string) {
  const urls = [`https://${hostname}/.well-known/vion-cmp.txt`, `http://${hostname}/.well-known/vion-cmp.txt`]
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: "GET", redirect: "follow" })
      if (!res.ok) continue
      const body = await res.text()
      if (httpBodyMatchesToken(body, token)) return true
    } catch {
      continue
    }
  }
  return false
}

export async function POST(req: Request, context: { params: Promise<{ domainId: string; hostname: string }> }) {
  const authz = await authorizeCmpAccess(req)
  if (!authz.ok) return authz.response

  try {
    const { domainId, hostname: rawHostname } = await context.params
    const hostname = cleanHostname(rawHostname)

    const domain = await loadDomain(authz.adminDb, domainId)
    if (!domain) return NextResponse.json({ error: "Not Found" }, { status: 404 })
    if (!authz.isSuperAdmin && domain.tenantId !== authz.callerUid) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const host = await loadHost(authz.adminDb, hostname)
    if (!host || host.domainId !== domainId) return NextResponse.json({ error: "Not Found" }, { status: 404 })

    const token = host.token
    const method = host.method
    if (!token || !method) return NextResponse.json({ error: "Invalid host" }, { status: 409 })

    const now = nowIso()
    let ok = false
    if (method === "dns_txt") {
      ok = await verifyDnsTxt(hostname, token)
    } else {
      ok = await verifyHttpFile(hostname, token)
    }

    await authz.adminDb.collection("cmp_domain_hosts").doc(hostname).set(
      {
        status: ok ? "verified" : "pending",
        lastCheckedAt: now,
        verifiedAt: ok ? now : null,
        updatedAt: now,
      },
      { merge: true }
    )

    if (ok) {
      const currentHostnames = Array.isArray(domain.hostnames) ? (domain.hostnames as unknown[]) : []
      const normalized = currentHostnames.filter((h) => typeof h === "string" && h)
      const nextHostnames = Array.from(new Set([domain.primaryHostname, ...normalized, hostname].filter(Boolean)))
      await authz.adminDb.collection("cmp_domains").doc(domainId).set({ hostnames: nextHostnames, updatedAt: now }, { merge: true })
    }

    return NextResponse.json({ ok })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ error: "Offline" }, { status: 503 })
    }
    console.error("CMP host verify error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

