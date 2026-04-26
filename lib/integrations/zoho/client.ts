import { getAdminDb } from "@/lib/firebase-admin"
import { decryptToken, encryptToken } from "@/lib/omni/token-cipher"
import { getAccountsServer, isZohoRegion, type ZohoRegion } from "./config"

export interface ZohoIntegrationDoc {
    connected: boolean
    region: ZohoRegion
    accessToken: string | null
    refreshToken: string | null
    apiDomain: string
    accountsServer: string
    expiresAt: number
    scope?: string
    connectedAt?: number
    lastError?: string | null
}

export interface ZohoTokenResponse {
    access_token: string
    refresh_token?: string
    api_domain: string
    expires_in: number
    token_type: string
    scope?: string
    error?: string
}

const REFRESH_BUFFER_MS = 60_000

function getEnvCreds(): { clientId: string; clientSecret: string; redirectUri: string } {
    const clientId = process.env.ZOHO_CLIENT_ID || ""
    const clientSecret = process.env.ZOHO_CLIENT_SECRET || ""
    const redirectUri = process.env.ZOHO_REDIRECT_URI || ""
    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error("Zoho OAuth credentials missing. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REDIRECT_URI.")
    }
    return { clientId, clientSecret, redirectUri }
}

export function getZohoEnvCreds() {
    return getEnvCreds()
}

export async function exchangeAuthCode(params: {
    code: string
    accountsServer: string
}): Promise<ZohoTokenResponse> {
    const { clientId, clientSecret, redirectUri } = getEnvCreds()
    const body = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: params.code,
    })

    const res = await fetch(`${params.accountsServer}/oauth/v2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
    })
    const data = (await res.json()) as ZohoTokenResponse
    if (!res.ok || data.error || !data.access_token) {
        throw new Error(`Zoho token exchange failed: ${data.error || res.statusText}`)
    }
    return data
}

export async function refreshAccessToken(params: {
    refreshToken: string
    accountsServer: string
}): Promise<ZohoTokenResponse> {
    const { clientId, clientSecret } = getEnvCreds()
    const body = new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: params.refreshToken,
    })

    const res = await fetch(`${params.accountsServer}/oauth/v2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
    })
    const data = (await res.json()) as ZohoTokenResponse
    if (!res.ok || data.error || !data.access_token) {
        throw new Error(`Zoho token refresh failed: ${data.error || res.statusText}`)
    }
    return data
}

export async function revokeRefreshToken(params: {
    refreshToken: string
    accountsServer: string
}): Promise<void> {
    const body = new URLSearchParams({ token: params.refreshToken })
    await fetch(`${params.accountsServer}/oauth/v2/token/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
    }).catch(() => {})
}

export function buildZohoIntegrationDoc(input: {
    region: ZohoRegion
    accountsServer: string
    apiDomain: string
    accessToken: string
    refreshToken?: string | null
    expiresIn: number
    scope?: string
    previousRefreshToken?: string | null
}): ZohoIntegrationDoc {
    const refreshTokenPlain = input.refreshToken ?? input.previousRefreshToken ?? null
    return {
        connected: true,
        region: input.region,
        accessToken: encryptToken(input.accessToken),
        refreshToken: refreshTokenPlain ? encryptToken(refreshTokenPlain) : null,
        apiDomain: input.apiDomain,
        accountsServer: input.accountsServer,
        expiresAt: Date.now() + input.expiresIn * 1000,
        scope: input.scope,
        connectedAt: Date.now(),
        lastError: null,
    }
}

export async function loadZohoIntegration(chatbotId: string): Promise<ZohoIntegrationDoc | null> {
    const adminDb = getAdminDb()
    if (!adminDb) return null
    const snap = await adminDb.collection("chatbots").doc(chatbotId).get()
    const zoho = snap.data()?.integrations?.zoho
    if (!zoho || !zoho.connected) return null
    if (!isZohoRegion(zoho.region)) return null
    return zoho as ZohoIntegrationDoc
}

async function persistZohoTokens(chatbotId: string, doc: ZohoIntegrationDoc): Promise<void> {
    const adminDb = getAdminDb()
    if (!adminDb) return
    await adminDb.collection("chatbots").doc(chatbotId).set(
        { integrations: { zoho: doc } },
        { merge: true }
    )
}

async function getValidAccessToken(chatbotId: string): Promise<{ token: string; apiDomain: string } | null> {
    const doc = await loadZohoIntegration(chatbotId)
    if (!doc?.refreshToken) return null

    const refreshTokenPlain = decryptToken(doc.refreshToken)
    const accessTokenPlain = decryptToken(doc.accessToken)
    if (!refreshTokenPlain) return null

    if (accessTokenPlain && doc.expiresAt > Date.now() + REFRESH_BUFFER_MS) {
        return { token: accessTokenPlain, apiDomain: doc.apiDomain }
    }

    const refreshed = await refreshAccessToken({
        refreshToken: refreshTokenPlain,
        accountsServer: doc.accountsServer,
    })

    const updated = buildZohoIntegrationDoc({
        region: doc.region,
        accountsServer: doc.accountsServer,
        apiDomain: refreshed.api_domain || doc.apiDomain,
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token || null,
        previousRefreshToken: refreshTokenPlain,
        expiresIn: refreshed.expires_in,
        scope: refreshed.scope || doc.scope,
    })
    await persistZohoTokens(chatbotId, updated)
    return { token: refreshed.access_token, apiDomain: updated.apiDomain }
}

export interface ZohoLeadInput {
    name?: string | null
    email?: string | null
    phone?: string | null
    company?: string | null
    source?: string | null
    description?: string | null
}

function splitName(full: string | null | undefined): { firstName: string; lastName: string } {
    const trimmed = (full || "").trim()
    if (!trimmed) return { firstName: "", lastName: "Unknown" }
    const parts = trimmed.split(/\s+/)
    if (parts.length === 1) return { firstName: "", lastName: parts[0] }
    return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] }
}

export async function pushLeadToZoho(chatbotId: string, lead: ZohoLeadInput): Promise<{ ok: boolean; id?: string; error?: string }> {
    try {
        const auth = await getValidAccessToken(chatbotId)
        if (!auth) return { ok: false, error: "Zoho not connected" }

        const { firstName, lastName } = splitName(lead.name)
        const record: Record<string, unknown> = {
            Last_Name: lastName || "Unknown",
            Company: lead.company || lead.name || "Unknown",
            Lead_Source: lead.source || "Vion Chatbot",
        }
        if (firstName) record.First_Name = firstName
        if (lead.email) record.Email = lead.email
        if (lead.phone) record.Phone = lead.phone
        if (lead.description) record.Description = lead.description

        const res = await fetch(`${auth.apiDomain}/crm/v5/Leads`, {
            method: "POST",
            headers: {
                Authorization: `Zoho-oauthtoken ${auth.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ data: [record] }),
        })
        const json = (await res.json()) as { data?: Array<{ status: string; details?: { id?: string }; message?: string }> }
        const first = json.data?.[0]
        if (!res.ok || first?.status !== "success") {
            return { ok: false, error: first?.message || `HTTP ${res.status}` }
        }
        return { ok: true, id: first?.details?.id }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error"
        return { ok: false, error: message }
    }
}

export async function disconnectZoho(chatbotId: string): Promise<void> {
    const adminDb = getAdminDb()
    if (!adminDb) return
    const doc = await loadZohoIntegration(chatbotId)
    if (doc?.refreshToken) {
        const refreshTokenPlain = decryptToken(doc.refreshToken)
        if (refreshTokenPlain) {
            await revokeRefreshToken({ refreshToken: refreshTokenPlain, accountsServer: doc.accountsServer })
        }
    }
    await adminDb.collection("chatbots").doc(chatbotId).set(
        {
            integrations: {
                zoho: {
                    connected: false,
                    accessToken: null,
                    refreshToken: null,
                    expiresAt: 0,
                },
            },
        },
        { merge: true }
    )
}
