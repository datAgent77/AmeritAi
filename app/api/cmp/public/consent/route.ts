import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { cleanHostname, cleanString, nowIso, parseIp, parseUserAgent, sha256Hex } from "@/lib/cmp/utils"
import { shouldUseFirebaseOfflineFallback } from "@/lib/firebase-errors"
import crypto from "crypto"

export const dynamic = "force-dynamic"

function base64UrlDecode(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4)
  return Buffer.from(padded, "base64").toString("utf8")
}

function sign(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

function verifyWriteToken(input: { token: string; hostname: string; policyVersionId: string }) {
  const secret = process.env.CMP_PUBLIC_WRITE_SECRET
  if (!secret) return { ok: false as const, reason: "missing_secret" }

  const parts = input.token.split(".")
  if (parts.length !== 2) return { ok: false as const, reason: "bad_format" }

  const [payloadB64, sig] = parts
  const expected = sign(payloadB64, secret)
  if (!timingSafeEqual(sig, expected)) return { ok: false as const, reason: "bad_sig" }

  const parsed = JSON.parse(base64UrlDecode(payloadB64))
  const exp = typeof parsed?.exp === "number" ? parsed.exp : 0
  const hostname = typeof parsed?.hostname === "string" ? parsed.hostname : ""
  const policyVersionId = typeof parsed?.policyVersionId === "string" ? parsed.policyVersionId : ""

  if (!exp || Date.now() > exp) return { ok: false as const, reason: "expired" }
  if (hostname !== input.hostname) return { ok: false as const, reason: "hostname_mismatch" }
  if (policyVersionId !== input.policyVersionId) return { ok: false as const, reason: "policy_mismatch" }

  return { ok: true as const }
}

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
    const writeToken = cleanString(body?.writeToken, 1000)

    if (!hostname || !action || !policyVersionId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    if (process.env.CMP_PUBLIC_WRITE_SECRET) {
      if (!writeToken) {
        return NextResponse.json({ error: "Missing write token" }, { status: 401 })
      }
      const verified = verifyWriteToken({ token: writeToken, hostname, policyVersionId })
      if (!verified.ok) {
        return NextResponse.json({ error: "Invalid write token" }, { status: 401 })
      }
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
