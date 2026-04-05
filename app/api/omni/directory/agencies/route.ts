import { NextResponse } from "next/server"
import { listPartners } from "@/lib/management/partners"
import { authorizeOmniDirectoryRequest, authorizedForOmniPermission, jsonError } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    const authz = await authorizeOmniDirectoryRequest(req)
    if (!authz.ok) {
        return authz.response
    }

    if (!authorizedForOmniPermission(authz, "directory.agencies.view")) {
        return jsonError("Forbidden", 403)
    }

    const { searchParams } = new URL(req.url)
    const includeArchived = searchParams.get("includeArchived") === "true"

    const agencies = await listPartners(authz.adminDb, { includeArchived })
    return NextResponse.json({ agencies, partners: agencies })
}
