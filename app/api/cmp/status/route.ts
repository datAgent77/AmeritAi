import { NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { resolveCookieConsentEnabled } from "@/lib/omni/workspace-access"
import { isSuperAdminRole } from "@/lib/user-roles"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    const adminAuth = getAdminAuth()
    const adminDb = getAdminDb()
    if (!adminAuth || !adminDb) {
        return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 })
    }

    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let decoded: any
    try {
        decoded = await adminAuth.verifyIdToken(authHeader.split("Bearer ")[1])
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const snapshot = await adminDb.collection("users").doc(decoded.uid).get()
    const userData = snapshot.exists ? snapshot.data() || {} : {}
    const role = userData.role || decoded.role || "USER"
    const enabled = resolveCookieConsentEnabled(userData, isSuperAdminRole(role) ? "SUPER_ADMIN" : undefined)

    if (!enabled) {
        return NextResponse.json({ error: "Cookie application not enabled" }, { status: 403 })
    }

    return NextResponse.json({
        enabled: true,
        collections: [
            "cmp_domains",
            "cmp_banner_configs",
            "cmp_cookie_catalog",
            "cmp_policy_versions",
            "cmp_consents",
            "cmp_scan_runs",
        ],
        v1: {
            googleConsentModeV2: true,
            gtmIntegration: true,
            iabTcf22: false,
        },
    })
}
