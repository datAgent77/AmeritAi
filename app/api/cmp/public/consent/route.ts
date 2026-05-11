import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { cleanHostname, cleanString, nowIso, parseIp, parseUserAgent, sha256Hex } from "@/lib/cmp/utils"
import { shouldUseFirebaseOfflineFallback } from "@/lib/firebase-errors"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const adminDb = getAdminDb()
    if (!adminDb) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
    }

    const body = await req.json().catch(() => ({}))
    const hostname = cleanHostname(body?.hostname)
    const action = cleanString(body?.action, 80)
    const choices = body?.choices && typeof body.choices === "object" ? body.choices : {}
    const policyVersionId = cleanString(body?.policyVersionId, 240)
    const deviceId = cleanString(body?.deviceId, 240)

    if (!hostname || !action || !policyVersionId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const domainSnapshot = await adminDb
      .collection("cmp_domains")
      .where("hostnames", "array-contains", hostname)
      .limit(1)
      .get()

    let effectiveSnapshot = domainSnapshot
    if (effectiveSnapshot.empty) {
      effectiveSnapshot = await adminDb
        .collection("cmp_domains")
        .where("primaryHostname", "==", hostname)
        .limit(1)
        .get()
    }

    if (effectiveSnapshot.empty) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 })
    }

    const domainDoc = effectiveSnapshot.docs[0]
    const domain = domainDoc.data() as any
    if (domain.status !== "active") {
      return NextResponse.json({ error: "Not Found" }, { status: 404 })
    }

    const configSnapshot = await adminDb.collection("cmp_banner_configs").doc(domainDoc.id).get()
    const config = configSnapshot.exists ? (configSnapshot.data() as any) : {}
    const publishedPolicyVersionId = config?.publishedPolicyVersionId || null
    if (publishedPolicyVersionId && policyVersionId !== publishedPolicyVersionId) {
      return NextResponse.json({ error: "Policy version mismatch" }, { status: 409 })
    }

    const now = nowIso()
    const ua = parseUserAgent(req)
    const ip = parseIp(req)

    await adminDb.collection("cmp_consents").add({
      tenantId: domain.tenantId,
      domainId: domainDoc.id,
      hostname,
      action,
      choices,
      policyVersionId,
      deviceIdHash: deviceId ? sha256Hex(deviceId) : null,
      userAgentHash: ua ? sha256Hex(ua) : null,
      ipHash: ip ? sha256Hex(ip) : null,
      createdAt: now,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ error: "Offline" }, { status: 503 })
    }
    console.error("CMP public consent error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
