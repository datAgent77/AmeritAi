import { NextResponse } from "next/server"
import { getAdminDb, getAdminStorage } from "@/lib/firebase-admin"
import { shouldUseFirebaseOfflineFallback } from "@/lib/firebase-errors"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

function getCronSecret(request: Request) {
  return request.headers.get("x-cron-secret") || new URL(request.url).searchParams.get("secret")
}

function cleanInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  const floored = Math.floor(parsed)
  return Math.max(min, Math.min(max, floored))
}

function isoDaysAgo(days: number) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

async function listTenants(adminDb: FirebaseFirestore.Firestore) {
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

async function getTenantRetention(adminDb: FirebaseFirestore.Firestore, tenantId: string) {
  const defaultsConsents = cleanInt(process.env.CMP_DEFAULT_RETENTION_DAYS_CONSENTS, 365, 7, 3650)
  const defaultsBackups = cleanInt(process.env.CMP_DEFAULT_RETENTION_DAYS_BACKUPS, 365, 7, 3650)

  const snap = await adminDb.collection("cmp_tenant_settings").doc(tenantId).get()
  const data = snap.exists ? (snap.data() as any) : null

  const retentionDaysConsents = cleanInt(data?.retentionDaysConsents, defaultsConsents, 7, 3650)
  const retentionDaysBackups = cleanInt(data?.retentionDaysBackups, defaultsBackups, 7, 3650)
  return { retentionDaysConsents, retentionDaysBackups }
}

async function deleteOldConsents(adminDb: FirebaseFirestore.Firestore, tenantId: string, cutoffIso: string, limit: number) {
  const snapshot = await adminDb
    .collection("cmp_consents")
    .where("tenantId", "==", tenantId)
    .where("createdAt", "<", cutoffIso)
    .limit(limit)
    .get()

  if (snapshot.empty) return 0
  const batch = adminDb.batch()
  snapshot.docs.forEach((doc) => batch.delete(doc.ref))
  await batch.commit()
  return snapshot.size
}

async function deleteOldBackupHistory(adminDb: FirebaseFirestore.Firestore, tenantId: string, cutoffIso: string, limit: number) {
  const storage = getAdminStorage()
  const bucket = storage ? storage.bucket() : null

  const snapshot = await adminDb
    .collection("cmp_consent_backup_history")
    .where("tenantId", "==", tenantId)
    .where("createdAt", "<", cutoffIso)
    .limit(limit)
    .get()

  if (snapshot.empty) return { deleted: 0, storageDeleted: 0 }

  let storageDeleted = 0
  if (bucket) {
    const uniquePaths = new Set<string>()
    snapshot.docs.forEach((doc) => {
      const data = doc.data() as any
      if (typeof data?.storedObjectPath === "string" && data.storedObjectPath) {
        uniquePaths.add(data.storedObjectPath)
      }
    })

    for (const p of uniquePaths) {
      try {
        await bucket.file(p).delete({ ignoreNotFound: true })
        storageDeleted++
      } catch {
        continue
      }
    }
  }

  const batch = adminDb.batch()
  snapshot.docs.forEach((doc) => batch.delete(doc.ref))
  await batch.commit()

  return { deleted: snapshot.size, storageDeleted }
}

export async function GET(request: Request) {
  const cronSecret = getCronSecret(request)
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const enabled = process.env.CMP_RETENTION_ENABLED
    ? ["1", "true", "yes", "on"].includes(String(process.env.CMP_RETENTION_ENABLED).toLowerCase())
    : true

  if (!enabled) {
    return NextResponse.json({ ok: true, skipped: true, reason: "disabled" })
  }

  const adminDb = getAdminDb()
  if (!adminDb) {
    return NextResponse.json({ error: "Database not initialized" }, { status: 500 })
  }

  try {
    const tenantIds = await listTenants(adminDb)
    let tenants = 0
    let consentsDeleted = 0
    let historyDeleted = 0
    let storageDeleted = 0

    for (const tenantId of tenantIds) {
      tenants++
      const retention = await getTenantRetention(adminDb, tenantId)
      const consentsCutoff = isoDaysAgo(retention.retentionDaysConsents)
      const backupsCutoff = isoDaysAgo(retention.retentionDaysBackups)

      consentsDeleted += await deleteOldConsents(adminDb, tenantId, consentsCutoff, 500)

      const hist = await deleteOldBackupHistory(adminDb, tenantId, backupsCutoff, 200)
      historyDeleted += hist.deleted
      storageDeleted += hist.storageDeleted
    }

    return NextResponse.json({ ok: true, tenants, consentsDeleted, historyDeleted, storageDeleted })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ error: "Offline" }, { status: 503 })
    }
    console.error("cmp-retention-cron error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

