import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { cleanHostname, cleanString } from "@/lib/cmp/utils"
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
    const lang = cleanString(searchParams.get("lang"), 8) || "tr"

    if (!hostname) {
      return NextResponse.json({ error: "Missing hostname" }, { status: 400 })
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
      return NextResponse.json({ error: "Paused" }, { status: 404 })
    }

    const configSnapshot = await adminDb.collection("cmp_banner_configs").doc(domainDoc.id).get()
    const config = configSnapshot.exists ? (configSnapshot.data() as any) : {}
    const publishedPolicyVersionId = config?.publishedPolicyVersionId || null

    let policy: any = null
    if (publishedPolicyVersionId) {
      const policySnapshot = await adminDb.collection("cmp_policy_versions").doc(publishedPolicyVersionId).get()
      if (policySnapshot.exists) {
        const data = policySnapshot.data() as any
        if (data?.status === "published") {
          policy = { id: policySnapshot.id, ...(data || {}) }
        }
      }
    }

    if (!policy) {
      const fallbackSnapshot = await adminDb
        .collection("cmp_policy_versions")
        .where("domainId", "==", domainDoc.id)
        .where("status", "==", "published")
        .where("language", "==", lang)
        .limit(5)
        .get()
      const docs = fallbackSnapshot.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
        .sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""))
      policy = docs[0] || null
    }

    return NextResponse.json({
      domain: {
        id: domainDoc.id,
        name: domain.name,
        primaryHostname: domain.primaryHostname,
        cookieDomain: domain.cookieDomain || null,
      },
      config: {
        bannerSettings: config?.bannerSettings || null,
        preferenceSettings: config?.preferenceSettings || null,
        publishedPolicyVersionId: config?.publishedPolicyVersionId || null,
      },
      policy: policy
        ? {
            id: policy.id,
            language: policy.language,
            content: policy.content,
            contentHash: policy.contentHash,
            publishedAt: policy.publishedAt,
          }
        : null,
    })
  } catch (error) {
    if (shouldUseFirebaseOfflineFallback(error)) {
      return NextResponse.json({ error: "Offline" }, { status: 503 })
    }
    console.error("CMP public config error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
