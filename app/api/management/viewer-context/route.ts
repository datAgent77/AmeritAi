import { NextResponse } from "next/server"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { resolvePartnerBranding } from "@/lib/management/access"
import { getLinkedPartnerForManagedAccount, resolveManagedAccountPartnerBranding } from "@/lib/management/accounts"
import { getPartnerDoc } from "@/lib/management/partners"
import { isAgencyAdminRole, isSuperAdminRole, isTenantAdminRole, type UserRole } from "@/lib/user-roles"

export const dynamic = "force-dynamic"

function resolveUserRole(role: unknown): UserRole {
    if (isSuperAdminRole(role)) return "SUPER_ADMIN"
    if (isAgencyAdminRole(role)) return "AGENCY_ADMIN"
    if (isTenantAdminRole(role)) return "TENANT_ADMIN"
    return "USER"
}

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

    const decoded = await adminAuth.verifyIdToken(authHeader.split("Bearer ")[1])
    const callerDoc = await adminDb.collection("users").doc(decoded.uid).get()
    const callerData = callerDoc.data() || {}
    const viewerRole = resolveUserRole(callerData.role || (decoded as any)?.role)

    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get("accountId")

    if (accountId && accountId !== decoded.uid) {
        const authz = await authorizeTargetAccess(req, accountId)
        if (!authz.ok) {
            return authz.response
        }
    }

    const linkedAccountId =
        typeof accountId === "string" && accountId.trim().length > 0
            ? accountId
            : viewerRole === "TENANT_ADMIN"
              ? decoded.uid
              : null

    const partner = viewerRole === "AGENCY_ADMIN"
        ? await getPartnerDoc(adminDb, decoded.uid)
        : linkedAccountId
          ? await getLinkedPartnerForManagedAccount(adminDb, linkedAccountId)
          : null

    let resolvedPartnerBranding = resolvePartnerBranding({
        viewerRole,
        viewerPartnerId: partner?.id,
        viewerPartnerName: partner?.partnerName || null,
        viewerPartnerLevel: partner?.partnerLevel || null,
        viewerPartnerLogoUrl: partner?.partnerLogoUrl || null,
    })

    if (!resolvedPartnerBranding.show && viewerRole !== "SUPER_ADMIN") {
        const brandingAccountId = accountId || (viewerRole === "TENANT_ADMIN" ? decoded.uid : null)
        if (brandingAccountId) {
            resolvedPartnerBranding = await resolveManagedAccountPartnerBranding(adminDb, brandingAccountId)
        }
    }

    return NextResponse.json({
        viewerRole,
        partner,
        partnerCapabilities: partner?.capabilities || null,
        resolvedPartnerBranding,
    })
}
