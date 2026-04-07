import { NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { getPartnerDoc } from "@/lib/management/partners"
import { isAgencyAdminRole } from "@/lib/user-roles"

export const dynamic = "force-dynamic"

function normalizeOptionalText(value: unknown) {
    if (typeof value !== "string") return null
    const normalized = value.trim()
    return normalized.length > 0 ? normalized : null
}

async function authorizePartner(req: Request) {
    const adminAuth = getAdminAuth()
    const adminDb = getAdminDb()

    if (!adminAuth || !adminDb) {
        return { ok: false as const, response: NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 }) }
    }

    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
        return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
    }

    const decoded = await adminAuth.verifyIdToken(authHeader.split("Bearer ")[1])
    const callerDoc = await adminDb.collection("users").doc(decoded.uid).get()
    const callerRole = callerDoc.data()?.role
    const tokenRole = (decoded as any)?.role

    if (!isAgencyAdminRole(callerRole) && !isAgencyAdminRole(tokenRole)) {
        return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
    }

    const partner = await getPartnerDoc(adminDb, decoded.uid)
    return { ok: true as const, adminDb, decoded, partner }
}

export async function GET(req: Request) {
    const authz = await authorizePartner(req)
    if (!authz.ok) return authz.response

    return NextResponse.json({
        partner: authz.partner,
        capabilities: authz.partner?.capabilities || null,
    })
}

export async function PATCH(req: Request) {
    const authz = await authorizePartner(req)
    if (!authz.ok) return authz.response

    const body = await req.json().catch(() => null)
    const requestedLogoUpdate = body && Object.prototype.hasOwnProperty.call(body, "partnerLogoUrl")
    if (requestedLogoUpdate && !authz.partner?.capabilities.canUsePartnerBranding) {
        return NextResponse.json({ error: "Forbidden: Partner level cannot manage branding" }, { status: 403 })
    }

    const updatePayload: Record<string, string | null> = {
        updatedAt: new Date().toISOString(),
    }

    if (requestedLogoUpdate) {
        updatePayload.partnerLogoUrl = normalizeOptionalText(body?.partnerLogoUrl)
    }

    const editableFields = [
        "supportContactName",
        "supportEmail",
        "supportPhone",
        "supportWhatsapp",
        "supportHours",
        "supportNotes",
    ] as const

    editableFields.forEach((field) => {
        if (body && Object.prototype.hasOwnProperty.call(body, field)) {
            updatePayload[field] = normalizeOptionalText(body[field])
        }
    })

    await authz.adminDb.collection("users").doc(authz.decoded.uid).set(updatePayload, { merge: true })

    const partner = await getPartnerDoc(authz.adminDb, authz.decoded.uid)
    return NextResponse.json({
        partner,
        capabilities: partner?.capabilities || null,
    })
}
