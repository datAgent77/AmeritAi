import { NextResponse } from "next/server"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { disconnectZoho } from "@/lib/integrations/zoho/client"

export const runtime = "nodejs"

export async function POST(req: Request) {
    try {
        const { chatbotId } = (await req.json()) as { chatbotId?: string }
        if (!chatbotId) {
            return NextResponse.json({ error: "chatbotId is required" }, { status: 400 })
        }

        const authz = await authorizeTargetAccess(req, chatbotId)
        if (!authz.ok) return authz.response

        await disconnectZoho(chatbotId)
        return NextResponse.json({ success: true })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
