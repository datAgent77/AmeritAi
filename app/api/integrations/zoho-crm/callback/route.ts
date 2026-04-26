import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { consumeOAuthState } from "@/lib/oauth-state"
import {
    buildZohoIntegrationDoc,
    exchangeAuthCode,
} from "@/lib/integrations/zoho/client"
import {
    ZOHO_DEFAULT_REGION,
    getAccountsServer,
    getApiDomain,
    isZohoRegion,
    type ZohoRegion,
} from "@/lib/integrations/zoho/config"

export const runtime = "nodejs"

function popupResponse(payload: { success: boolean; error?: string }): Response {
    const safe = JSON.stringify(payload).replace(/</g, "\\u003c")
    const html = `<!DOCTYPE html><html><body><script>
(function(){
  try {
    if (window.opener) {
      window.opener.postMessage({ type: "vion-zoho-crm-oauth", payload: ${safe} }, "*");
    }
  } catch (e) {}
  setTimeout(function(){ try { window.close(); } catch(e){} }, 50);
})();
</script><p>${payload.success ? "Bağlantı tamam, bu pencereyi kapatabilirsiniz." : "Bağlantı başarısız: " + (payload.error || "")}</p></body></html>`
    return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } })
}

function deriveRegionFromAccountsServer(server: string | null): ZohoRegion {
    if (!server) return ZOHO_DEFAULT_REGION
    const match = server.match(/accounts\.zoho\.([a-z.]+)/i)
    if (match && isZohoRegion(match[1])) return match[1]
    return ZOHO_DEFAULT_REGION
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const code = searchParams.get("code")
        const state = searchParams.get("state")
        const errorParam = searchParams.get("error")
        const accountsServerParam = searchParams.get("accounts-server") || searchParams.get("accounts_server")
        const locationParam = searchParams.get("location")

        if (errorParam) {
            return popupResponse({ success: false, error: errorParam })
        }
        if (!code || !state) {
            return popupResponse({ success: false, error: "Missing code or state" })
        }

        const payload = await consumeOAuthState(state, "zoho-crm")
        if (!payload?.chatbotId) {
            return popupResponse({ success: false, error: "Invalid or expired state" })
        }
        const chatbotId = payload.chatbotId

        const region = isZohoRegion(locationParam)
            ? locationParam
            : deriveRegionFromAccountsServer(accountsServerParam)
        const accountsServer = accountsServerParam || getAccountsServer(region)

        const tokenRes = await exchangeAuthCode({ code, accountsServer })
        const apiDomain = tokenRes.api_domain || getApiDomain(region)

        const doc = buildZohoIntegrationDoc({
            region,
            accountsServer,
            apiDomain,
            accessToken: tokenRes.access_token,
            refreshToken: tokenRes.refresh_token || null,
            expiresIn: tokenRes.expires_in,
            scope: tokenRes.scope,
        })

        const adminDb = getAdminDb()
        if (!adminDb) {
            return popupResponse({ success: false, error: "Firestore unavailable" })
        }
        await adminDb.collection("chatbots").doc(chatbotId).set(
            { integrations: { zoho: doc } },
            { merge: true }
        )

        return popupResponse({ success: true })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error"
        return popupResponse({ success: false, error: message })
    }
}

export async function POST(req: Request) {
    return GET(req)
}
