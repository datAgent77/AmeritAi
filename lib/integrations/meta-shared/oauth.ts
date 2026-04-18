import {
    buildMetaOAuthScopes,
    exchangeMetaShortLivedForLongLivedToken,
    resolveMetaOAuthAppConfig,
    type MetaChannelKey,
} from "@/lib/meta-setup"
import type { MetaSharedAppConfigOverrides } from "@/lib/integrations/meta-shared/types"

const META_API_VERSION = process.env.META_API_VERSION || "v23.0"

export function buildMetaOAuthUrl(params: {
    origin: string
    state: string
    callbackPath: string
    appConfig?: MetaSharedAppConfigOverrides
    selectedChannels?: MetaChannelKey[]
}) {
    const platform = resolveMetaOAuthAppConfig(params.appConfig)
    const redirectUri = `${params.origin}${params.callbackPath}`
    const authUrl = new URL(`https://www.facebook.com/${META_API_VERSION}/dialog/oauth`)
    authUrl.searchParams.set("client_id", platform.appId)
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("state", params.state)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("scope", buildMetaOAuthScopes(params.selectedChannels).join(","))
    return authUrl.toString()
}

export async function exchangeMetaCode(params: {
    origin: string
    callbackPath: string
    code: string
    appConfig?: MetaSharedAppConfigOverrides
}) {
    const platform = resolveMetaOAuthAppConfig(params.appConfig)
    const redirectUri = `${params.origin}${params.callbackPath}`
    const tokenUrl = new URL(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`)
    tokenUrl.searchParams.set("client_id", platform.appId)
    tokenUrl.searchParams.set("client_secret", platform.appSecret)
    tokenUrl.searchParams.set("redirect_uri", redirectUri)
    tokenUrl.searchParams.set("code", params.code)

    const response = await fetch(tokenUrl, { cache: "no-store" })
    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.access_token) {
        throw new Error(payload?.error?.message || "Meta OAuth token alınamadı.")
    }

    const shortLivedToken = String(payload.access_token)
    const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : null

    const longLived = await exchangeMetaShortLivedForLongLivedToken({
        shortLivedToken,
        appConfig: params.appConfig,
    }).catch(() => null)

    return {
        accessToken: longLived?.accessToken || shortLivedToken,
        expiresIn: longLived?.expiresIn ?? expiresIn,
        tokenType: longLived ? "long_lived" : "short_lived",
    }
}
