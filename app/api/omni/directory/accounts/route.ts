import { NextResponse } from "next/server"
import { listManagedAccountsForViewer } from "@/lib/management/accounts"
import { getPartnerDoc } from "@/lib/management/partners"
import { authorizeOmniDirectoryRequest, authorizedForOmniPermission, jsonError } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    const authz = await authorizeOmniDirectoryRequest(req)
    if (!authz.ok) {
        return authz.response
    }

    if (!authz.isTenantAdmin && !authorizedForOmniPermission(authz, "directory.accounts.view")) {
        return jsonError("Forbidden", 403)
    }

    const { searchParams } = new URL(req.url)
    const includeArchived = searchParams.get("includeArchived") === "true"

    const partner = authz.isAgencyAdmin ? await getPartnerDoc(authz.adminDb, authz.callerUid) : null
    const result = await listManagedAccountsForViewer({
        adminDb: authz.adminDb,
        viewerId: authz.callerUid,
        viewerRole: authz.callerRole,
        canSwitchOmniAccounts: authz.isSuperAdmin ? true : partner?.capabilities.canSwitchOmniAccounts,
        includeArchived,
    })

    return NextResponse.json({
        accounts: result.accounts,
        managedAccounts: result.accounts,
        meta: {
            callerRole: authz.callerRole,
            canSwitchAccounts: result.meta.canSwitchAccounts,
            viewerCapabilities: partner?.capabilities || null,
        },
    })
}
