const META_API_VERSION = process.env.META_GRAPH_API_VERSION || "v20.0"

function trimProviderMessage(data: any, fallback: string) {
    return data?.error?.message || JSON.stringify(data) || fallback
}

export async function sendVionWhatsAppText(params: {
    to?: string | null
    text: string
    phoneNumberId?: string | null
    accessToken?: string | null
}) {
    const recipient = params.to || null
    const phoneNumberId = params.phoneNumberId || null
    const accessToken = params.accessToken || null

    if (!recipient || !phoneNumberId || !accessToken) {
        throw new Error("WhatsApp configuration is incomplete")
    }

    const response = await fetch(`https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to: recipient,
            text: { body: params.text },
        }),
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(`WhatsApp delivery failed: ${trimProviderMessage(data, "WhatsApp delivery failed")}`)
    }

    return {
        messageId: data?.messages?.[0]?.id || null,
        recipient,
        phoneNumberId,
    }
}

export async function sendVionInstagramText(params: {
    recipientId?: string | null
    text: string
    endpointTarget?: string | null
    accessToken?: string | null
}) {
    const recipientId = params.recipientId || null
    const endpointTarget = params.endpointTarget || null
    const accessToken = params.accessToken || null

    if (!recipientId || !endpointTarget || !accessToken) {
        throw new Error("Instagram configuration is incomplete")
    }

    const response = await fetch(`https://graph.facebook.com/${META_API_VERSION}/${endpointTarget}/messages`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            recipient: { id: recipientId },
            messaging_type: "RESPONSE",
            message: { text: params.text },
        }),
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(`Instagram delivery failed: ${trimProviderMessage(data, "Instagram delivery failed")}`)
    }

    return {
        messageId: data?.message_id || data?.recipient_id || null,
        recipientId,
        endpointTarget,
    }
}
