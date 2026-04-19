import { discoverMetaPages } from "@/lib/meta-setup"
import type { MessengerDMPreflightResult } from "@/lib/omni/types"

const META_API_VERSION = process.env.META_API_VERSION || "v23.0"

async function resolveWebhookStatus(accessToken: string, appId?: string | null) {
    const resolvedAppId = (appId || "").trim()
    if (!resolvedAppId) return null
    const response = await fetch(`https://graph.facebook.com/${META_API_VERSION}/${encodeURIComponent(resolvedAppId)}/subscriptions`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) return null
    const subscriptions = Array.isArray(payload?.data) ? payload.data : []
    return subscriptions.some((item: any) => item?.object === "page")
}

export async function runMessengerDMPreflight(
    accessToken: string,
    chatbotId: string,
    adminDb: FirebaseFirestore.Firestore
): Promise<{
    result: MessengerDMPreflightResult
    availablePages: Array<{ id: string; name: string }>
}> {
    const configSnapshot = await adminDb.collection("omni_channel_configs").doc(chatbotId).get()
    const omniConfig = configSnapshot.exists ? configSnapshot.data() || {} : {}
    const current = omniConfig?.messengerDM || {}

    const pageDiscovery = await discoverMetaPages(accessToken)
    const allPages = pageDiscovery.pages || []
    const availablePages = allPages
        .filter((page) => page.messagingEligible !== false)
        .map((page) => ({ id: page.id, name: page.name }))

    const selectedPage =
        allPages.find((page) => page.id === current?.pageId && page.messagingEligible !== false) ||
        allPages.find((page) => page.messagingEligible !== false) ||
        null

    const hasFacebookPage = allPages.length > 0
    const pageIsMessagingEligible = selectedPage ? selectedPage.messagingEligible !== false : availablePages.length > 0

    const tokenPresent = Boolean(current?.accessTokenRef || accessToken)
    const webhookActive =
        (await resolveWebhookStatus(
            accessToken,
            omniConfig?.messenger?.appId || omniConfig?.metaSetup?.secrets?.appId || null
        )) ?? (current?.webhookStatus === "connected" || omniConfig?.messenger?.webhookStatus === "connected")

    const overallOk = Boolean(hasFacebookPage && pageIsMessagingEligible && tokenPresent && webhookActive)

    let failureReason: string | null = null
    if (!hasFacebookPage) {
        failureReason = "Hesabınıza bağlı bir Facebook Sayfası bulunamadı."
    } else if (!pageIsMessagingEligible) {
        failureReason = "Seçili sayfa Messenger mesajlaşmasına uygun değil."
    } else if (!tokenPresent) {
        failureReason = "Bağlantı bilgisi bulunamadı, yeniden bağlanın."
    } else if (webhookActive === false) {
        failureReason = "Mesaj akışı şu anda aktif görünmüyor."
    }

    const result: MessengerDMPreflightResult = {
        checkedAt: new Date().toISOString(),
        hasFacebookPage,
        pageIsMessagingEligible,
        tokenPresent,
        webhookActive,
        overallOk,
        failureReason,
    }

    return { result, availablePages }
}
