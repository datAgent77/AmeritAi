import { NextResponse } from "next/server"
import { authorizeCmpAccess } from "@/lib/cmp/server-auth"
import { cleanString, nowIso } from "@/lib/cmp/utils"
import { shouldUseFirebaseOfflineFallback } from "@/lib/firebase-errors"

export const dynamic = "force-dynamic"

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i

function cleanEmail(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return EMAIL_PATTERN.test(trimmed) ? trimmed : null
}

function cleanInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  const floored = Math.floor(parsed)
  return Math.max(min, Math.min(max, floored))
}

function cleanDeliveryMethod(value: unknown) {
  if (value === "attachment" || value === "link") return value
  return null
}

export async function GET(req: Request) {
  const authz = await authorizeCmpAccess(req)
  if (!authz.ok) return authz.response

  try {
    const { searchParams } = new URL(req.url)
    const tenantIdParam = cleanString(searchParams.get("tenantId"), 160)
    const effectiveTenantId = authz.isSuperAdmin && tenantIdParam ? tenantIdParam : authz.callerUid

    const snapshot = await authz.adminDb.collection("cmp_tenant_settings").doc(effectiveTenantId).get()
    const data = snapshot.exists ? (snapshot.data() as any) : null

    return NextResponse.json({
      tenantId: effectiveTenantId,
      settings: {
        backupEmail: typeof data?.backupEmail === "string" ? data.backupEmail : null,
        backupDeliveryMethod: typeof data?.backupDeliveryMethod === "string" ? data.backupDeliveryMethod : "attachment",
        backupLinkTtlHours: typeof data?.backupLinkTtlHours === "number" ? data.backupLinkTtlHours : 72,
        retentionDaysConsents: typeof data?.retentionDaysConsents === "number" ? data.retentionDaysConsents : 365,
        retentionDaysBackups: typeof data?.retentionDaysBackups === "number" ? data.retentionDaysBackups : 365,
      },
    })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ tenantId: authz.callerUid, settings: { backupEmail: null }, offline: true })
    }
    console.error("CMP tenant settings get error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const authz = await authorizeCmpAccess(req)
  if (!authz.ok) return authz.response

  try {
    const { searchParams } = new URL(req.url)
    const tenantIdParam = cleanString(searchParams.get("tenantId"), 160)
    const effectiveTenantId = authz.isSuperAdmin && tenantIdParam ? tenantIdParam : authz.callerUid

    const body = await req.json().catch(() => ({}))
    const backupEmail = body?.backupEmail === "" ? null : cleanEmail(body?.backupEmail)
    const backupDeliveryMethod = cleanDeliveryMethod(body?.backupDeliveryMethod) || "attachment"
    const backupLinkTtlHours = cleanInt(body?.backupLinkTtlHours, 72, 1, 168)
    const retentionDaysConsents = cleanInt(body?.retentionDaysConsents, 365, 7, 3650)
    const retentionDaysBackups = cleanInt(body?.retentionDaysBackups, 365, 7, 3650)

    if (body?.backupEmail != null && body?.backupEmail !== "" && !backupEmail) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }

    const now = nowIso()
    await authz.adminDb.collection("cmp_tenant_settings").doc(effectiveTenantId).set(
      {
        tenantId: effectiveTenantId,
        backupEmail,
        backupDeliveryMethod,
        backupLinkTtlHours,
        retentionDaysConsents,
        retentionDaysBackups,
        updatedAt: now,
      },
      { merge: true }
    )

    return NextResponse.json({
      ok: true,
      tenantId: effectiveTenantId,
      settings: {
        backupEmail,
        backupDeliveryMethod,
        backupLinkTtlHours,
        retentionDaysConsents,
        retentionDaysBackups,
      },
    })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ error: "Offline" }, { status: 503 })
    }
    console.error("CMP tenant settings update error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
