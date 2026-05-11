import { NextResponse } from "next/server"
import { authorizeCmpAccess } from "@/lib/cmp/server-auth"
import { cleanHostname, cleanString, nowIso } from "@/lib/cmp/utils"
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

    return NextResponse.json({ domain: { id: domainId, ...domain } })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ error: "Offline" }, { status: 503 })
    }
    console.error("CMP domain get error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ domainId: string }> }) {
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
    const name = cleanString(body?.name, 120)
    const primaryHostname = cleanHostname(body?.primaryHostname)
    const cookieDomain = cleanString(body?.cookieDomain, 160)
    const status = body?.status === "paused" ? "paused" : "active"

    const update: Record<string, any> = {
      updatedAt: nowIso(),
    }
    if (name) update.name = name
    if (primaryHostname) {
      update.primaryHostname = primaryHostname

      const currentHostnames = Array.isArray(domain.hostnames) ? (domain.hostnames as unknown[]) : []
      const normalized = currentHostnames.filter((h) => typeof h === "string" && h)
      const withoutOld = domain.primaryHostname
        ? normalized.filter((h) => h !== domain.primaryHostname)
        : normalized
      const nextHostnames = Array.from(new Set([primaryHostname, ...withoutOld]))
      update.hostnames = nextHostnames
    }
    if (body?.cookieDomain !== undefined) update.cookieDomain = cookieDomain || null
    if (body?.status !== undefined) update.status = status

    await authz.adminDb.collection("cmp_domains").doc(domainId).set(update, { merge: true })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ error: "Offline" }, { status: 503 })
    }
    console.error("CMP domain patch error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ domainId: string }> }) {
  const authz = await authorizeCmpAccess(req)
  if (!authz.ok) return authz.response

  try {
    const { domainId } = await context.params
    const domain = await loadDomain(authz.adminDb, domainId)
    if (!domain) return NextResponse.json({ error: "Not Found" }, { status: 404 })

    if (!authz.isSuperAdmin && domain.tenantId !== authz.callerUid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await authz.adminDb.collection("cmp_domains").doc(domainId).delete()
    await authz.adminDb.collection("cmp_banner_configs").doc(domainId).delete()

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ error: "Offline" }, { status: 503 })
    }
    console.error("CMP domain delete error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
