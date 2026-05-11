import { NextResponse } from "next/server"
import { authorizeCmpAccess } from "@/lib/cmp/server-auth"
import { cleanHostname, cleanString, nowIso, newId } from "@/lib/cmp/utils"
import { parseSetCookieHeaders } from "@/lib/cmp/scan"
import { shouldUseFirebaseOfflineFallback } from "@/lib/firebase-errors"

export const dynamic = "force-dynamic"

async function loadDomain(adminDb: FirebaseFirestore.Firestore, domainId: string) {
  const snapshot = await adminDb.collection("cmp_domains").doc(domainId).get()
  return snapshot.exists ? (snapshot.data() as any) : null
}

function getAllowedHostnames(domain: any) {
  const list = Array.isArray(domain?.hostnames) ? domain.hostnames : []
  const normalized = list.filter((h: any) => typeof h === "string" && h)
  const primary = typeof domain?.primaryHostname === "string" ? domain.primaryHostname : ""
  return Array.from(new Set([primary, ...normalized].filter(Boolean)))
}

async function fetchSetCookies(url: string) {
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  })

  const setCookies = (res.headers as any).getSetCookie?.() as string[] | undefined
  const single = res.headers.get("set-cookie")
  const headers = Array.isArray(setCookies) && setCookies.length > 0 ? setCookies : single ? [single] : []
  return {
    ok: res.ok,
    status: res.status,
    finalUrl: res.url || url,
    cookies: parseSetCookieHeaders(headers),
  }
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
      .collection("cmp_scan_runs")
      .where("domainId", "==", domainId)
      .limit(200)
      .get()

    const runs = snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))

    return NextResponse.json({ runs })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ runs: [], offline: true })
    }
    console.error("CMP scans list error:", error)
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
    const url = cleanString(body?.url, 600) || (hostname ? `https://${hostname}/` : "")

    if (!hostname) return NextResponse.json({ error: "Missing hostname" }, { status: 400 })

    const allowed = getAllowedHostnames(domain)
    if (!allowed.includes(hostname)) {
      return NextResponse.json({ error: "Hostname not allowed" }, { status: 403 })
    }

    const id = newId("scan")
    const startedAt = nowIso()
    await authz.adminDb.collection("cmp_scan_runs").doc(id).set({
      tenantId: domain.tenantId,
      domainId,
      hostname,
      url,
      status: "running",
      createdAt: startedAt,
      startedAt,
      endedAt: null,
      error: null,
      result: null,
    })

    let result: any
    try {
      result = await fetchSetCookies(url)
    } catch (error: any) {
      const endedAt = nowIso()
      await authz.adminDb.collection("cmp_scan_runs").doc(id).set(
        {
          status: "failed",
          endedAt,
          error: cleanString(error?.message || "Scan failed", 400),
        },
        { merge: true }
      )
      return NextResponse.json({ id, status: "failed" })
    }

    const endedAt = nowIso()
    await authz.adminDb.collection("cmp_scan_runs").doc(id).set(
      {
        status: "completed",
        endedAt,
        result,
      },
      { merge: true }
    )

    return NextResponse.json({ id, status: "completed", result })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ error: "Offline" }, { status: 503 })
    }
    console.error("CMP scans create error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

