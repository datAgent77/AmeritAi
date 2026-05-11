import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { cleanHostname, cleanString, sha256Hex } from "@/lib/cmp/utils"
import { shouldUseFirebaseOfflineFallback } from "@/lib/firebase-errors"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const adminDb = getAdminDb()
    if (!adminDb) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const hostname = cleanHostname(searchParams.get("hostname"))
    const deviceId = cleanString(searchParams.get("deviceId"), 240)

    if (!hostname || !deviceId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const deviceIdHash = sha256Hex(deviceId)
    const snapshot = await adminDb.collection("cmp_consents").where("deviceIdHash", "==", deviceIdHash).limit(2000).get()
    const events = snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
      .filter((row) => row.hostname === hostname)
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
      .map((row) => ({
        createdAt: row.createdAt || null,
        domainId: row.domainId || null,
        hostname: row.hostname || null,
        action: row.action || null,
        choices: row.choices || null,
        policyVersionId: row.policyVersionId || null,
      }))

    return NextResponse.json({ events })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ error: "Offline" }, { status: 503 })
    }
    console.error("CMP my-consents error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

