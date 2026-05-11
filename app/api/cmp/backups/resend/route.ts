import { NextResponse } from "next/server"
import { authorizeCmpAccess } from "@/lib/cmp/server-auth"
import { cleanString, nowIso } from "@/lib/cmp/utils"
import { shouldUseFirebaseOfflineFallback } from "@/lib/firebase-errors"
import { getAdminAuth, getAdminStorage } from "@/lib/firebase-admin"
import { sendCmpConsentsBackupEmail } from "@/lib/email-service"

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i

function safeEmailCandidate(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return EMAIL_PATTERN.test(trimmed) ? trimmed : null
}

async function resolveFallbackTenantEmail(adminDb: FirebaseFirestore.Firestore, tenantId: string) {
  const userDoc = await adminDb.collection("users").doc(tenantId).get()
  const data = userDoc.exists ? (userDoc.data() as any) : null
  const candidates = [data?.notificationEmail, data?.billingEmail, data?.contactEmail, data?.email]
  for (const c of candidates) {
    const resolved = safeEmailCandidate(c)
    if (resolved) return resolved
  }

  const adminAuth = getAdminAuth()
  if (adminAuth) {
    try {
      const user = await adminAuth.getUser(tenantId)
      const resolved = safeEmailCandidate(user.email)
      if (resolved) return resolved
    } catch {
      return null
    }
  }

  return null
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  const authz = await authorizeCmpAccess(req)
  if (!authz.ok) return authz.response

  try {
    const body = await req.json().catch(() => ({}))
    const historyId = cleanString(body?.historyId, 240)
    if (!historyId) {
      return NextResponse.json({ error: "Missing historyId" }, { status: 400 })
    }

    const historySnap = await authz.adminDb.collection("cmp_consent_backup_history").doc(historyId).get()
    if (!historySnap.exists) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 })
    }

    const history = historySnap.data() as any
    const tenantId = typeof history?.tenantId === "string" ? history.tenantId : ""
    if (!tenantId) {
      return NextResponse.json({ error: "Invalid history item" }, { status: 400 })
    }

    if (!authz.isSuperAdmin && tenantId !== authz.callerUid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const storedObjectPath = typeof history?.storedObjectPath === "string" ? history.storedObjectPath : ""
    const fromDate = typeof history?.fromDate === "string" ? history.fromDate : ""
    const toDate = typeof history?.toDate === "string" ? history.toDate : ""
    const attachmentFilename = typeof history?.attachmentFilename === "string" ? history.attachmentFilename : `cmp_consents_${fromDate}_${toDate}.csv`

    if (!storedObjectPath || !fromDate || !toDate) {
      return NextResponse.json({ error: "History item missing storedObjectPath/fromDate/toDate" }, { status: 400 })
    }

    const settingsSnap = await authz.adminDb.collection("cmp_tenant_settings").doc(tenantId).get()
    const settings = settingsSnap.exists ? (settingsSnap.data() as any) : null
    const preferredEmail = safeEmailCandidate(settings?.backupEmail)
    const fallbackEmail = safeEmailCandidate(history?.recipientEmail) || (await resolveFallbackTenantEmail(authz.adminDb, tenantId))
    const recipientEmail = preferredEmail || fallbackEmail

    if (!recipientEmail) {
      return NextResponse.json({ error: "Missing backup email" }, { status: 400 })
    }

    const storage = getAdminStorage()
    if (!storage) {
      return NextResponse.json({ error: "Storage not initialized" }, { status: 500 })
    }

    const bucket = storage.bucket()
    const file = bucket.file(storedObjectPath)
    const [buffer] = await file.download()
    const csv = buffer.toString("utf8")

    const ok = await sendCmpConsentsBackupEmail({
      recipientEmail,
      tenantId,
      fromDate,
      toDate,
      attachmentFilename,
      attachmentCsv: csv,
    })

    const now = nowIso()
    await authz.adminDb.collection("cmp_consent_backup_history").add({
      tenantId,
      trigger: "manual",
      status: ok ? "sent" : "email_failed",
      createdAt: now,
      fromDate,
      toDate,
      consentCount: typeof history?.consentCount === "number" ? history.consentCount : null,
      recipientEmail,
      storedObjectPath,
      attachmentFilename,
      sourceHistoryId: historyId,
    })

    await authz.adminDb.collection("cmp_consent_backup_runs").doc(tenantId).set(
      {
        tenantId,
        lastAttemptAt: now,
        lastAttemptStatus: ok ? "sent" : "email_failed",
        lastSentAt: ok ? now : null,
        fromDate,
        toDate,
        storedObjectPath,
      },
      { merge: true }
    )

    return NextResponse.json({ ok })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ error: "Offline" }, { status: 503 })
    }
    console.error("CMP backup resend error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

