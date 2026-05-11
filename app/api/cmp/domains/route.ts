import { NextResponse } from "next/server"
import { authorizeCmpAccess } from "@/lib/cmp/server-auth"
import { cleanHostname, cleanString, nowIso, newId } from "@/lib/cmp/utils"
import { shouldUseFirebaseOfflineFallback } from "@/lib/firebase-errors"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const authz = await authorizeCmpAccess(req)
  if (!authz.ok) return authz.response

  try {
    const { searchParams } = new URL(req.url)
    const tenantId = cleanString(searchParams.get("tenantId"), 160)
    const effectiveTenantId = authz.isSuperAdmin && tenantId ? tenantId : authz.callerUid

    const snapshot = await authz.adminDb
      .collection("cmp_domains")
      .where("tenantId", "==", effectiveTenantId)
      .limit(500)
      .get()

    const domains = snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
      .sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""))

    return NextResponse.json({ domains })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ domains: [], offline: true })
    }
    console.error("CMP domains list error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const authz = await authorizeCmpAccess(req)
  if (!authz.ok) return authz.response

  try {
    const body = await req.json().catch(() => ({}))
    const name = cleanString(body?.name, 120)
    const primaryHostname = cleanHostname(body?.primaryHostname)
    const cookieDomain = cleanString(body?.cookieDomain, 160)
    const status = body?.status === "paused" ? "paused" : "active"

    if (!name || !primaryHostname) {
      return NextResponse.json({ error: "Missing name or primaryHostname" }, { status: 400 })
    }

    const existing = await authz.adminDb
      .collection("cmp_domains")
      .where("tenantId", "==", authz.callerUid)
      .where("primaryHostname", "==", primaryHostname)
      .limit(1)
      .get()

    if (!existing.empty) {
      return NextResponse.json({ error: "Domain already exists" }, { status: 409 })
    }

    const id = newId("dom")
    const now = nowIso()

    await authz.adminDb.collection("cmp_domains").doc(id).set({
      tenantId: authz.callerUid,
      name,
      primaryHostname,
      hostnames: [primaryHostname],
      cookieDomain: cookieDomain || null,
      status,
      createdAt: now,
      updatedAt: now,
    })

    await authz.adminDb.collection("cmp_banner_configs").doc(id).set({
      tenantId: authz.callerUid,
      domainId: id,
      bannerSettings: {
        position: "bottom",
        theme: "light",
        primaryColor: "#111827",
      },
      preferenceSettings: {
        categories: {
          necessary: { required: true },
          analytics: { enabled: false },
          marketing: { enabled: false },
          functional: { enabled: false },
        },
        revisitDays: 180,
      },
      publishedPolicyVersionId: null,
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({ id })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ error: "Offline" }, { status: 503 })
    }
    console.error("CMP domains create error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
