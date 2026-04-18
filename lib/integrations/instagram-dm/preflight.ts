import { discoverMetaPages, getMetaPlatformAppConfig } from "@/lib/meta-setup"
import type { InstagramDMPreflightResult } from "@/lib/omni/types"
import { CHANNEL_ERROR_MESSAGES } from "@/lib/integrations/instagram-dm/types"

const META_API_VERSION = process.env.META_API_VERSION || "v23.0"

async function graphFetch(path: string, accessToken: string) {
    const response = await fetch(`https://graph.facebook.com/${META_API_VERSION}/${path}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
    })
    const payload = await response.json().catch(() => null)
    return { response, payload }
}

async function resolveWebhookStatus(accessToken: string, appId?: string | null) {
    const resolvedAppId = appId || getMetaPlatformAppConfig().appId
    if (!resolvedAppId) return null
    const { response, payload } = await graphFetch(`${encodeURIComponent(resolvedAppId)}/subscriptions`, accessToken)
    if (!response.ok) return null
    const subscriptions = Array.isArray(payload?.data) ? payload.data : []
    return subscriptions.some((item: any) => item?.object === "page")
}

export async function runInstagramDMPreflight(
    accessToken: string,
    chatbotId: string,
    adminDb: FirebaseFirestore.Firestore
): Promise<{
    result: InstagramDMPreflightResult
    availablePages: Array<{
        id: string
        name: string
        instagramAccountId: string | null
        instagramUsername: string | null
    }>
}> {
    const configSnapshot = await adminDb.collection("omni_channel_configs").doc(chatbotId).get()
    const omniConfig = configSnapshot.exists ? configSnapshot.data() || {} : {}
    const current = omniConfig?.instagramDM || {}
    const legacyInstagram = omniConfig?.instagram || {}
    const pageDiscovery = await discoverMetaPages(accessToken)
    const allPages = pageDiscovery.pages || []
    const availablePages = allPages
        .filter((page) => page.instagramAccount)
        .map((page) => ({
            id: page.id,
            name: page.name,
            instagramAccountId: page.instagramAccount?.id || null,
            instagramUsername: page.instagramAccount?.username || null,
        }))

    const selectedPage =
        allPages.find((page) => page.id === current?.pageId && page.instagramAccount) ||
        allPages.find((page) => Boolean(page.instagramAccount)) ||
        null

    const hasFacebookPage = allPages.length > 0
    const instagramLinkedToPage = selectedPage ? Boolean(selectedPage.instagramAccount) : availablePages.length > 0

    let instagramIsProfessional: boolean | null = null
    let messageAccessEnabled: boolean | null = null

    if (selectedPage?.instagramAccount?.id) {
        const { response, payload } = await graphFetch(
            `${encodeURIComponent(selectedPage.instagramAccount.id)}?fields=account_type,messaging_feature_status,username`,
            accessToken
        )

        if (response.ok) {
            const accountType = String(payload?.account_type || "").toUpperCase()
            instagramIsProfessional = accountType === "BUSINESS" || accountType === "CREATOR"
            const messagingStatus = String(payload?.messaging_feature_status || "").toUpperCase()
            messageAccessEnabled = messagingStatus
                ? messagingStatus === "ENABLED"
                : selectedPage.instagramAccount ? true : null
        }
    }

    const tokenPresent = Boolean(current?.accessTokenRef || legacyInstagram?.accessTokenRef || accessToken)
    const webhookActive =
        (await resolveWebhookStatus(accessToken, legacyInstagram?.appId || null)) ??
        (current?.webhookStatus === "connected" || legacyInstagram?.webhookStatus === "connected")

    const result: InstagramDMPreflightResult = {
        checkedAt: new Date().toISOString(),
        hasFacebookPage,
        instagramLinkedToPage,
        instagramIsProfessional,
        messageAccessEnabled,
        tokenPresent,
        webhookActive,
        overallOk: Boolean(
            hasFacebookPage &&
                instagramLinkedToPage &&
                instagramIsProfessional !== false &&
                messageAccessEnabled !== false &&
                tokenPresent &&
                webhookActive
        ),
        failureReason: null,
    }

    if (!hasFacebookPage) {
        result.failureReason = CHANNEL_ERROR_MESSAGES.no_facebook_page
    } else if (!instagramLinkedToPage) {
        result.failureReason = CHANNEL_ERROR_MESSAGES.instagram_not_linked
    } else if (instagramIsProfessional === false) {
        result.failureReason = CHANNEL_ERROR_MESSAGES.instagram_not_professional
    } else if (messageAccessEnabled === false) {
        result.failureReason = CHANNEL_ERROR_MESSAGES.message_access_disabled
    } else if (!tokenPresent) {
        result.failureReason = "Bağlantı bilgisi bulunamadı, yeniden bağlanın."
    } else if (webhookActive === false) {
        result.failureReason = "Mesaj akışı şu anda aktif görünmüyor."
    }

    return {
        result,
        availablePages,
    }
}
