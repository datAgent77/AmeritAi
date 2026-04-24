import { NextResponse } from "next/server"
import { authorizedForOmniPermission } from "@/lib/omni/server-utils"
import { authorizeOmniAppRequest, fetchUpstreamJson } from "@/lib/omni-app/server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    const authz = await authorizeOmniAppRequest(req)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "analytics.view")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const analytics = await fetchUpstreamJson<any>(req, "/api/omni/analytics")
    if (!analytics.ok) {
        return analytics.response
    }

    return NextResponse.json({
        summary: {
            conversations: analytics.data.overview.sessions,
            contacts: analytics.data.overview.contacts,
            callbacksOpen: analytics.data.overview.callbacksOpen,
            deliveryFailures: analytics.data.overview.deliveryFailures,
            channelsReady: analytics.data.overview.channelsReady,
        },
        dispositions: analytics.data.dispositions || [],
    })
}
