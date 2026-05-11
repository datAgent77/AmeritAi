import { NextResponse } from "next/server"
import { getAdminAuth, getAdminDb, getAdminStorage } from "@/lib/firebase-admin"
import { shouldUseFirebaseOfflineFallback } from "@/lib/firebase-errors"
import { sendCmpConsentsBackupEmail } from "@/lib/email-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

function getCronSecret(request: Request) {
  return request.headers.get("x-cron-secret") || new URL(request.url).searchParams.get("secret")
}

function parseCsvValue(value: unknown) {
  const str = typeof value === "string" ? value : value == null ? "" : String(value)
  return `"${str.replace(/"/g, '""')}"`
}

function toCsvRow(values: unknown[]) {
  return values.map(parseCsvValue).join(",")
}

function getIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function safeEmailCandidate(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i.test(trimmed) ? trimmed : null
}

async function resolveTenantEmail(adminDb: FirebaseFirestore.Firestore, tenantId: string) {
  const userDoc = await adminDb.collection("users").doc(tenantId).get()
  const data = userDoc.exists ? (userDoc.data() as any) : null
  const candidates = [
    data?.notificationEmail,
    data?.billingEmail,
    data?.contactEmail,
    data?.email,
  ]

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

async function resolveTenantBackupEmail(adminDb: FirebaseFirestore.Firestore, tenantId: string) {
  const settingsSnap = await adminDb.collection("cmp_tenant_settings").doc(tenantId).get()
  const settings = settingsSnap.exists ? (settingsSnap.data() as any) : null
  const preferred = safeEmailCandidate(settings?.backupEmail)
  return preferred || (await resolveTenantEmail(adminDb, tenantId))
}

async function listCmpTenants(adminDb: FirebaseFirestore.Firestore) {
  const snapshot = await adminDb.collection("cmp_domains").limit(2000).get()
  const tenantIds = new Set<string>()
  snapshot.docs.forEach((doc) => {
    const data = doc.data() as any
    if (typeof data?.tenantId === "string" && data.tenantId.trim()) {
      tenantIds.add(data.tenantId.trim())
    }
  })
  return Array.from(tenantIds)
}

async function shouldRunForTenant(adminDb: FirebaseFirestore.Firestore, tenantId: string, intervalDays: number) {
  const doc = await adminDb.collection("cmp_consent_backup_runs").doc(tenantId).get()
  const data = doc.exists ? (doc.data() as any) : null
  const lastSentAt = typeof data?.lastSentAt === "string" ? Date.parse(data.lastSentAt) : NaN
  if (!Number.isFinite(lastSentAt)) return true
  const elapsedMs = Date.now() - lastSentAt
  return elapsedMs >= intervalDays * 24 * 60 * 60 * 1000
}

async function writeBackupCsvToStorage(options: {
  tenantId: string
  csv: string
  fromDate: string
  toDate: string
}) {
  const storage = getAdminStorage()
  if (!storage) return { ok: false as const, error: "Storage not initialized" }

  const bucket = storage.bucket()
  const safeTenantId = options.tenantId.replace(/[^a-zA-Z0-9_-]/g, "_")
  const objectPath = `cmp-backups/consents/${safeTenantId}/consents_${options.fromDate}_${options.toDate}.csv`

  const file = bucket.file(objectPath)
  await file.save(options.csv, {
    resumable: false,
    contentType: "text/csv; charset=utf-8",
    metadata: {
      cacheControl: "no-store, max-age=0",
      metadata: {
        tenantId: options.tenantId,
        fromDate: options.fromDate,
        toDate: options.toDate,
      },
    },
  })

  return { ok: true as const, objectPath }
}

export async function GET(request: Request) {
  const cronSecret = getCronSecret(request)
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const enabled = process.env.CMP_CONSENTS_BACKUP_ENABLED
    ? ["1", "true", "yes", "on"].includes(String(process.env.CMP_CONSENTS_BACKUP_ENABLED).toLowerCase())
    : true

  if (!enabled) {
    return NextResponse.json({ ok: true, skipped: true, reason: "disabled" })
  }

  const adminDb = getAdminDb()
  if (!adminDb) {
    return NextResponse.json({ error: "Database not initialized" }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const tenantIdOverride = searchParams.get("tenantId")

  const intervalDaysRaw = Number.parseInt(process.env.CMP_CONSENTS_BACKUP_INTERVAL_DAYS || "5", 10)
  const intervalDays = Number.isFinite(intervalDaysRaw) && intervalDaysRaw > 0 ? intervalDaysRaw : 5

  const now = new Date()
  const toDate = getIsoDate(now)
  const from = new Date(now)
  from.setDate(from.getDate() - intervalDays)
  const fromDate = getIsoDate(from)

  try {
    const tenantIds = tenantIdOverride ? [tenantIdOverride] : await listCmpTenants(adminDb)
    let processed = 0
    let emailed = 0
    let stored = 0
    let skipped = 0
    let errors = 0

    for (const tenantId of tenantIds) {
      processed++

      const shouldRun = tenantIdOverride ? true : await shouldRunForTenant(adminDb, tenantId, intervalDays)
      if (!shouldRun) {
        skipped++
        continue
      }

      const email = await resolveTenantBackupEmail(adminDb, tenantId)
      if (!email) {
        skipped++
        const attemptAt = new Date().toISOString()
        await adminDb.collection("cmp_consent_backup_history").add({
          tenantId,
          trigger: "cron",
          status: "missing_email",
          createdAt: attemptAt,
          fromDate,
          toDate,
        })
        await adminDb.collection("cmp_consent_backup_runs").doc(tenantId).set(
          {
            tenantId,
            lastAttemptAt: attemptAt,
            lastAttemptStatus: "missing_email",
            fromDate,
            toDate,
          },
          { merge: true }
        )
        continue
      }

      const snapshot = await adminDb.collection("cmp_consents").where("tenantId", "==", tenantId).limit(20000).get()
      const raw = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
      const events = raw
        .filter((e) => typeof e.createdAt === "string" && e.createdAt >= `${fromDate}T00:00:00.000Z` && e.createdAt < `${toDate}T23:59:59.999Z`)
        .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")))

      const header = [
        "createdAt",
        "domainId",
        "hostname",
        "action",
        "policyVersionId",
        "choices",
        "deviceIdHash",
        "userAgentHash",
        "ipHash",
      ]

      const rows = events.map((e) =>
        toCsvRow([
          e.createdAt,
          e.domainId,
          e.hostname,
          e.action,
          e.policyVersionId,
          JSON.stringify(e.choices || {}),
          e.deviceIdHash || "",
          e.userAgentHash || "",
          e.ipHash || "",
        ])
      )

      const csv = [toCsvRow(header), ...rows].join("\n")

      try {
        const storageResult = await writeBackupCsvToStorage({ tenantId, csv, fromDate, toDate })
        if (storageResult.ok) stored++

        const filename = `cmp_consents_${fromDate}_${toDate}.csv`
        const ok = await sendCmpConsentsBackupEmail({
          recipientEmail: email,
          tenantId,
          fromDate,
          toDate,
          attachmentFilename: filename,
          attachmentCsv: csv,
        })

        const attemptAt = new Date().toISOString()

        await adminDb.collection("cmp_consent_backup_history").add({
          tenantId,
          trigger: "cron",
          status: ok ? "sent" : "email_failed",
          createdAt: attemptAt,
          fromDate,
          toDate,
          consentCount: events.length,
          recipientEmail: email,
          storedObjectPath: storageResult.ok ? storageResult.objectPath : null,
          attachmentFilename: filename,
        })

        await adminDb.collection("cmp_consent_backup_runs").doc(tenantId).set(
          {
            tenantId,
            lastAttemptAt: attemptAt,
            lastAttemptStatus: ok ? "sent" : "email_failed",
            lastSentAt: ok ? attemptAt : null,
            fromDate,
            toDate,
            storedObjectPath: storageResult.ok ? storageResult.objectPath : null,
            consentCount: events.length,
            recipientEmail: email,
            attachmentFilename: filename,
          },
          { merge: true }
        )

        if (ok) emailed++
      } catch (error) {
        console.error("cmp-consents-backup-cron: tenant error", tenantId, error)
        errors++
        const attemptAt = new Date().toISOString()
        await adminDb.collection("cmp_consent_backup_history").add({
          tenantId,
          trigger: "cron",
          status: "error",
          createdAt: attemptAt,
          fromDate,
          toDate,
        })
        await adminDb.collection("cmp_consent_backup_runs").doc(tenantId).set(
          {
            tenantId,
            lastAttemptAt: attemptAt,
            lastAttemptStatus: "error",
            fromDate,
            toDate,
          },
          { merge: true }
        )
      }
    }

    return NextResponse.json({ ok: true, intervalDays, fromDate, toDate, processed, emailed, stored, skipped, errors })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ error: "Offline" }, { status: 503 })
    }
    console.error("cmp-consents-backup-cron error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
