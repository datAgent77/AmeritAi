import { NextResponse } from "next/server"
import { authorizeOmniContentAdminRequest, getAnnouncementSettings, saveAnnouncementSettings } from "@/lib/omni/content-admin"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    const authz = await authorizeOmniContentAdminRequest(req)
    if (!authz.ok) {
        return authz.response
    }

    const announcement = await getAnnouncementSettings()
    return NextResponse.json({ announcement })
}

export async function POST(req: Request) {
    const authz = await authorizeOmniContentAdminRequest(req)
    if (!authz.ok) {
        return authz.response
    }

    const body = await req.json()
    const announcement = await saveAnnouncementSettings({
        isActive: body.isActive,
        message: body.message,
        updatedBy: authz.callerUid,
    })
    return NextResponse.json({ announcement })
}
