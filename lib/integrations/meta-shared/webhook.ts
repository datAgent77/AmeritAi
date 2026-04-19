import { subscribeMetaAppToPage, subscribeMetaAppToWhatsAppBusiness } from "@/lib/meta-setup"
import { verifyMetaWebhookSignature } from "@/lib/omni/server-utils"

export { verifyMetaWebhookSignature }

export async function subscribeWebhook(params: {
    channel: "instagram" | "messenger" | "whatsapp"
    pageId?: string | null
    businessAccountId?: string | null
    accessToken: string
}) {
    if (params.channel === "instagram" || params.channel === "messenger") {
        if (!params.pageId) {
            throw new Error(`${params.channel === "messenger" ? "Messenger" : "Instagram"} için Facebook sayfası seçilmedi.`)
        }
        await subscribeMetaAppToPage(params.pageId, params.accessToken)
        return
    }

    if (!params.businessAccountId) {
        throw new Error("WhatsApp Business hesabı seçilmedi.")
    }

    await subscribeMetaAppToWhatsAppBusiness(params.businessAccountId, params.accessToken)
}
