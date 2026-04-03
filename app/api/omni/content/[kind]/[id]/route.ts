import { NextResponse } from "next/server"
import { authorizeOmniContentAdminRequest, deleteCmsContent, parseCmsKind, updateCmsContent } from "@/lib/omni/content-admin"
import { jsonError } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ kind: string; id: string }> }
) {
    const { kind: rawKind, id } = await params
    const kind = parseCmsKind(rawKind)
    if (!kind || !id) {
        return jsonError("Unsupported content request", 400)
    }

    const authz = await authorizeOmniContentAdminRequest(req)
    if (!authz.ok) {
        return authz.response
    }

    const body = await req.json()
    const item = await updateCmsContent(kind, id, body)
    return NextResponse.json({ item })
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ kind: string; id: string }> }
) {
    const { kind: rawKind, id } = await params
    const kind = parseCmsKind(rawKind)
    if (!kind || !id) {
        return jsonError("Unsupported content request", 400)
    }

    const authz = await authorizeOmniContentAdminRequest(req)
    if (!authz.ok) {
        return authz.response
    }

    await deleteCmsContent(kind, id)
    return NextResponse.json({ ok: true })
}
