import { NextResponse } from "next/server"
import { authorizeOmniContentAdminRequest, createCmsContent, listCmsContent, parseCmsKind } from "@/lib/omni/content-admin"
import { jsonError } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function GET(
    req: Request,
    { params }: { params: Promise<{ kind: string }> }
) {
    const { kind: rawKind } = await params
    const kind = parseCmsKind(rawKind)
    if (!kind) {
        return jsonError("Unsupported content kind", 400)
    }

    const authz = await authorizeOmniContentAdminRequest(req)
    if (!authz.ok) {
        return authz.response
    }

    const items = await listCmsContent(kind)
    return NextResponse.json({ items })
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ kind: string }> }
) {
    const { kind: rawKind } = await params
    const kind = parseCmsKind(rawKind)
    if (!kind) {
        return jsonError("Unsupported content kind", 400)
    }

    const authz = await authorizeOmniContentAdminRequest(req)
    if (!authz.ok) {
        return authz.response
    }

    const body = await req.json()
    const item = await createCmsContent(kind, body)
    return NextResponse.json({ item })
}
