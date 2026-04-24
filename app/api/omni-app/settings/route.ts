import { NextResponse } from "next/server"
import { authorizedForOmniPermission } from "@/lib/omni/server-utils"
import { authorizeOmniAppRequest, fetchUpstreamJson } from "@/lib/omni-app/server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    const authz = await authorizeOmniAppRequest(req)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "settings.view")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const settings = await fetchUpstreamJson<any>(req, "/api/omni/settings")
    if (!settings.ok) {
        return settings.response
    }

    return NextResponse.json({
        workspaceLabel: settings.data.operations?.workspaceLabel || "Omni workspace",
        readiness: {
            readyChannels: Object.values(settings.data.channels || {}).filter((item: any) => item?.enabled && item?.ready).length,
            enabledChannels: Object.values(settings.data.channels || {}).filter((item: any) => item?.enabled).length,
            attentionRequired: (settings.data.suggestedNextSteps || []).length > 0,
        },
        consoleLinks: [
            {
                label: "Accounts",
                href: "/admin/end-users",
                description: "Tenant and account administration stays in Console.",
            },
            {
                label: "Agencies",
                href: "/admin/agencies",
                description: "Agency ownership remains in the Console admin flow.",
            },
            {
                label: "Content",
                href: "/admin/content/blog",
                description: "Site content and editorial operations remain Console-owned.",
            },
        ],
        checklist: settings.data.suggestedNextSteps || [],
    })
}
