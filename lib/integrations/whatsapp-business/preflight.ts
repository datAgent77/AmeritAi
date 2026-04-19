import { discoverWhatsAppBusinesses } from "@/lib/meta-setup"
import type { WhatsAppBizPreflightResult } from "@/lib/omni/types"

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
    const resolvedAppId = (appId || "").trim()
    if (!resolvedAppId) return null
    const { response, payload } = await graphFetch(`${encodeURIComponent(resolvedAppId)}/subscriptions`, accessToken)
    if (!response.ok) return null
    const subscriptions = Array.isArray(payload?.data) ? payload.data : []
    return subscriptions.some((item: any) => item?.object === "whatsapp_business_account")
}

export async function runWhatsAppBizPreflight(
    accessToken: string,
    chatbotId: string,
    adminDb: FirebaseFirestore.Firestore
): Promise<{
    result: WhatsAppBizPreflightResult
    availableBusinesses: Array<{
        id: string
        name: string
        phoneNumbers: Array<{
            id: string
            displayNumber: string | null
            verifiedName: string | null
        }>
    }>
}> {
    const configSnapshot = await adminDb.collection("omni_channel_configs").doc(chatbotId).get()
    const omniConfig = configSnapshot.exists ? configSnapshot.data() || {} : {}
    const current = omniConfig?.whatsappBusiness || {}
    const legacyWhatsApp = omniConfig?.whatsapp || {}
    const discovery = await discoverWhatsAppBusinesses(accessToken)
    const availableBusinesses = discovery.businesses || []
    const currentBusiness =
        availableBusinesses.find((business) => business.id === current?.wabaId) ||
        availableBusinesses.find((business) => business.phoneNumbers.length > 0) ||
        null
    const currentPhone =
        currentBusiness?.phoneNumbers.find((item) => item.id === current?.phoneNumberId) ||
        currentBusiness?.phoneNumbers[0] ||
        null

    const embeddedSignupCompleted = availableBusinesses.length > 0
    const wabaPresent = availableBusinesses.length > 0
    const phoneNumberVerified = currentPhone ? true : availableBusinesses.some((item) => item.phoneNumbers.length > 0)
    const tokenPresent = Boolean(current?.accessTokenRef || legacyWhatsApp?.accessTokenRef || accessToken)
    const webhookActive =
        (await resolveWebhookStatus(
            accessToken,
            legacyWhatsApp?.appId || omniConfig?.metaSetup?.secrets?.appId || null
        )) ??
        (current?.webhookStatus === "connected" || legacyWhatsApp?.webhookStatus === "connected")

    const result: WhatsAppBizPreflightResult = {
        checkedAt: new Date().toISOString(),
        embeddedSignupCompleted,
        wabaPresent,
        phoneNumberVerified,
        tokenPresent,
        webhookActive,
        overallOk: Boolean(embeddedSignupCompleted && wabaPresent && phoneNumberVerified && tokenPresent && webhookActive),
        failureReason: null,
    }

    if (!embeddedSignupCompleted) {
        result.failureReason = "WhatsApp Business kurulumu tamamlanmamış."
    } else if (!wabaPresent) {
        result.failureReason = "WhatsApp İşletme Hesabı bulunamadı."
    } else if (!phoneNumberVerified) {
        result.failureReason = "Telefon numaranız doğrulanmamış veya kayıtlı değil."
    } else if (!tokenPresent) {
        result.failureReason = "Bağlantı bilgisi bulunamadı."
    } else if (webhookActive === false) {
        result.failureReason = "Mesaj akışı şu anda aktif görünmüyor."
    }

    return {
        result,
        availableBusinesses,
    }
}
