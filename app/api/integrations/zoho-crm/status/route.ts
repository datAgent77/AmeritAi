import { NextResponse } from "next/server"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { loadZohoIntegration } from "@/lib/integrations/zoho/client"

export const runtime = "nodejs"

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const chatbotId = searchParams.get("chatbotId")
        if (!chatbotId) {
            return NextResponse.json({ error: "chatbotId is required" }, { status: 400 })
        }

        const authz = await authorizeTargetAccess(req, chatbotId)
        if (!authz.ok) return authz.response

        const doc = await loadZohoIntegration(chatbotId)
        if (!doc) {
            return NextResponse.json({ connected: false })
        }
        return NextResponse.json({
            connected: true,
            region: doc.region,
            apiDomain: doc.apiDomain,
            scope: doc.scope || null,
            connectedAt: doc.connectedAt || null,
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
