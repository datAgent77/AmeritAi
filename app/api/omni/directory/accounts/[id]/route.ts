import { NextResponse } from "next/server"
import { getPartnerDoc } from "@/lib/management/partners"
import { resolvePartnerLevel, resolvePartnerCapabilities } from "@/lib/management/access"
import { authorizeOmniDirectoryRequest, authorizedForOmniPermission, jsonError, toIsoOrNull } from "@/lib/omni/server-utils"
import { resolveOmniWorkspaceEnabled } from "@/lib/omni/workspace-access"
import type { OmniDirectoryAccountRecord } from "@/lib/omni/types"

export const dynamic = "force-dynamic"

function resolveOmniEnabled(data: any) {
    return resolveOmniWorkspaceEnabled(data)
}

function serializeAccount(id: string, data: any): OmniDirectoryAccountRecord {
    return {
        id,
        email: data.email || "",
        companyName: data.companyName || "",
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        phone: data.phone || "",
        industry: data.industry || "",
        agencyId: data.agencyId || null,
        agencyName: null,
        isActive: data.isActive !== false,
        isArchived: data.isArchived === true,
        omniEnabled: resolveOmniEnabled(data) === true,
        createdAt: toIsoOrNull(data.createdAt),
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const authz = await authorizeOmniDirectoryRequest(req)
    if (!authz.ok) {
        return authz.response
    }

    if (!authorizedForOmniPermission(authz, "directory.accounts.manage")) {
        return jsonError("Forbidden", 403)
    }

    const body = await req.json().catch(() => null)
    const omniEnabled = body?.omniEnabled
    if (typeof omniEnabled !== "boolean") {
        return jsonError("omniEnabled must be a boolean", 400)
    }

    const userRef = authz.adminDb.collection("users").doc(id)
    const snapshot = await userRef.get()
    if (!snapshot.exists) {
        return jsonError("Account not found", 404)
    }

    const existing = snapshot.data() || {}

    if (authz.isAgencyAdmin) {
        const partnerLevel = resolvePartnerLevel((await getPartnerDoc(authz.adminDb, authz.callerUid))?.partnerLevel)
        const partnerCapabilities = resolvePartnerCapabilities(partnerLevel)
        if (!partnerCapabilities.canAssignManagedAccounts) {
            return jsonError("Forbidden", 403)
        }
    }

    if (authz.isAgencyAdmin && String(existing.agencyId || "") !== authz.callerUid) {
        return jsonError("Forbidden", 403)
    }

    const nextEntitlements = {
        ...(existing.productEntitlements || {}),
        omniChannel: omniEnabled,
    }

    const updatePayload = {
        productEntitlements: nextEntitlements,
        enableOmniChannel: omniEnabled,
        visibleOmniChannel: omniEnabled,
        updatedAt: new Date(),
    }

    await userRef.set(updatePayload, { merge: true })

    const refreshed = {
        ...existing,
        ...updatePayload,
        productEntitlements: nextEntitlements,
    }

    return NextResponse.json({
        account: serializeAccount(id, refreshed),
    })
}
