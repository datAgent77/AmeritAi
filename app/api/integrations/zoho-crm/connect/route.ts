import { NextResponse } from "next/server"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { createOAuthState } from "@/lib/oauth-state"
import { getZohoEnvCreds } from "@/lib/integrations/zoho/client"
import {
    ZOHO_DEFAULT_REGION,
    ZOHO_LEAD_SCOPE,
    getAccountsServer,
    isZohoRegion,
} from "@/lib/integrations/zoho/config"

export const runtime = "nodejs"

export async function POST(req: Request) {
    try {
        const { chatbotId, region: requestedRegion } = (await req.json()) as {
            chatbotId?: string
            region?: string
        }

        if (!chatbotId) {
            return NextResponse.json({ error: "chatbotId is required" }, { status: 400 })
        }

        const authz = await authorizeTargetAccess(req, chatbotId)
        if (!authz.ok) return authz.response

        let creds
        try {
            creds = getZohoEnvCreds()
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Zoho env not configured"
            return NextResponse.json({ error: message }, { status: 500 })
        }

        const region = isZohoRegion(requestedRegion) ? requestedRegion : ZOHO_DEFAULT_REGION

        const state = await createOAuthState({
            provider: "zoho-crm",
            userId: chatbotId,
            chatbotId,
        })

        const authUrl = new URL(`${getAccountsServer(region)}/oauth/v2/auth`)
        authUrl.searchParams.set("response_type", "code")
        authUrl.searchParams.set("client_id", creds.clientId)
        authUrl.searchParams.set("scope", ZOHO_LEAD_SCOPE)
        authUrl.searchParams.set("redirect_uri", creds.redirectUri)
        authUrl.searchParams.set("access_type", "offline")
        authUrl.searchParams.set("prompt", "consent")
        authUrl.searchParams.set("state", state)

        return NextResponse.json({ url: authUrl.toString() })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
