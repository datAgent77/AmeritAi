import { classifyOmniDeliveryError, recordOmniDeliveryAttempt } from "@/lib/omni/delivery-attempts"
import { getMessengerPageAccessToken, getMessengerPageId } from "@/lib/integrations/messenger/setup"
import { getEvolutionApiKey, normalizeEvolutionApiConfig, sendEvolutionText } from "@/lib/integrations/evolution-api/setup"

const META_API_VERSION = "v23.0"

interface OmniDispatchOptions {
    source: string
    sessionId?: string | null
    callbackId?: string | null
    retryOfAttemptId?: string | null
    attemptNumber?: number
    metadata?: Record<string, unknown>
}

interface OmniTextDispatchResult {
    messageId: string | null
    deliveryAttemptId: string | null
}

interface SendWhatsAppTextParams extends OmniDispatchOptions {
    adminDb: any
    chatbotId: string
    to: string | null
    text: string
    phoneNumberId?: string | null
    accessToken?: string | null
    metadata?: Record<string, unknown>
}

interface SendInstagramTextParams extends OmniDispatchOptions {
    adminDb: any
    chatbotId: string
    recipientId: string | null
    text: string
    endpointTarget?: string | null
    accessToken?: string | null
    metadata?: Record<string, unknown>
}

interface SendMessengerTextParams extends OmniDispatchOptions {
    adminDb: any
    chatbotId: string
    recipientId: string | null
    text: string
    pageId?: string | null
    accessToken?: string | null
    metadata?: Record<string, unknown>
}

interface SendEvolutionWhatsAppTextParams extends OmniDispatchOptions {
    adminDb: any
    chatbotId: string
    to: string | null
    text: string
    baseUrl?: string | null
    apiKey?: string | null
    instanceName?: string | null
    metadata?: Record<string, unknown>
}

function trimProviderMessage(data: any, fallback: string) {
    return data?.error?.message || JSON.stringify(data) || fallback
}

export async function sendOmniWhatsAppText(params: SendWhatsAppTextParams): Promise<OmniTextDispatchResult & { recipient: string; phoneNumberId: string | null }> {
    const recipient = params.to || null
    const phoneNumberId = params.phoneNumberId || null
    const accessToken = params.accessToken || null

    if (!recipient || !phoneNumberId || !accessToken) {
        const errorMessage = "WhatsApp configuration is incomplete"
        const attempt = await recordOmniDeliveryAttempt(params.adminDb, {
            chatbotId: params.chatbotId,
            channel: "whatsapp",
            provider: "meta",
            direction: "outbound",
            source: params.source,
            status: "failed",
            sessionId: params.sessionId || null,
            callbackId: params.callbackId || null,
            destination: recipient,
            payloadText: params.text,
            providerTargetId: phoneNumberId,
            retryOfAttemptId: params.retryOfAttemptId || null,
            attemptNumber: params.attemptNumber,
            errorClass: "config",
            errorMessage,
            metadata: params.metadata,
        })
        const error = new Error(errorMessage) as Error & { deliveryAttemptId?: string | null }
        error.deliveryAttemptId = attempt.id || null
        throw error
    }

    try {
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

        const attempt = await recordOmniDeliveryAttempt(params.adminDb, {
            chatbotId: params.chatbotId,
            channel: "whatsapp",
            provider: "meta",
            direction: "outbound",
            source: params.source,
            status: "success",
            sessionId: params.sessionId || null,
            callbackId: params.callbackId || null,
            destination: recipient,
            payloadText: params.text,
            providerMessageId: data?.messages?.[0]?.id || null,
            providerTargetId: phoneNumberId,
            retryOfAttemptId: params.retryOfAttemptId || null,
            attemptNumber: params.attemptNumber,
            metadata: params.metadata,
        })

        return {
            messageId: data?.messages?.[0]?.id || null,
            recipient,
            phoneNumberId,
            deliveryAttemptId: attempt.id || null,
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "WhatsApp delivery failed"
        const attempt = await recordOmniDeliveryAttempt(params.adminDb, {
            chatbotId: params.chatbotId,
            channel: "whatsapp",
            provider: "meta",
            direction: "outbound",
            source: params.source,
            status: "failed",
            sessionId: params.sessionId || null,
            callbackId: params.callbackId || null,
            destination: recipient,
            payloadText: params.text,
            providerTargetId: phoneNumberId,
            retryOfAttemptId: params.retryOfAttemptId || null,
            attemptNumber: params.attemptNumber,
            errorClass: classifyOmniDeliveryError(error),
            errorMessage,
            metadata: params.metadata,
        })
        const nextError = error instanceof Error ? error : new Error(errorMessage)
        ;(nextError as Error & { deliveryAttemptId?: string | null }).deliveryAttemptId = attempt.id || null
        throw nextError
    }
}

export async function sendOmniInstagramText(params: SendInstagramTextParams): Promise<OmniTextDispatchResult & { recipientId: string; endpointTarget: string | null }> {
    const recipientId = params.recipientId || null
    const endpointTarget = params.endpointTarget || null
    const accessToken = params.accessToken || null

    if (!recipientId || !endpointTarget || !accessToken) {
        const errorMessage = "Instagram configuration is incomplete"
        const attempt = await recordOmniDeliveryAttempt(params.adminDb, {
            chatbotId: params.chatbotId,
            channel: "instagram",
            provider: "meta",
            direction: "outbound",
            source: params.source,
            status: "failed",
            sessionId: params.sessionId || null,
            callbackId: params.callbackId || null,
            destination: recipientId,
            payloadText: params.text,
            providerTargetId: endpointTarget,
            retryOfAttemptId: params.retryOfAttemptId || null,
            attemptNumber: params.attemptNumber,
            errorClass: "config",
            errorMessage,
            metadata: params.metadata,
        })
        const error = new Error(errorMessage) as Error & { deliveryAttemptId?: string | null }
        error.deliveryAttemptId = attempt.id || null
        throw error
    }

    try {
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

        const attempt = await recordOmniDeliveryAttempt(params.adminDb, {
            chatbotId: params.chatbotId,
            channel: "instagram",
            provider: "meta",
            direction: "outbound",
            source: params.source,
            status: "success",
            sessionId: params.sessionId || null,
            callbackId: params.callbackId || null,
            destination: recipientId,
            payloadText: params.text,
            providerMessageId: data?.message_id || data?.recipient_id || null,
            providerTargetId: endpointTarget,
            retryOfAttemptId: params.retryOfAttemptId || null,
            attemptNumber: params.attemptNumber,
            metadata: params.metadata,
        })

        return {
            messageId: data?.message_id || data?.recipient_id || null,
            recipientId,
            endpointTarget,
            deliveryAttemptId: attempt.id || null,
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Instagram delivery failed"
        const attempt = await recordOmniDeliveryAttempt(params.adminDb, {
            chatbotId: params.chatbotId,
            channel: "instagram",
            provider: "meta",
            direction: "outbound",
            source: params.source,
            status: "failed",
            sessionId: params.sessionId || null,
            callbackId: params.callbackId || null,
            destination: recipientId,
            payloadText: params.text,
            providerTargetId: endpointTarget,
            retryOfAttemptId: params.retryOfAttemptId || null,
            attemptNumber: params.attemptNumber,
            errorClass: classifyOmniDeliveryError(error),
            errorMessage,
            metadata: params.metadata,
        })
        const nextError = error instanceof Error ? error : new Error(errorMessage)
        ;(nextError as Error & { deliveryAttemptId?: string | null }).deliveryAttemptId = attempt.id || null
        throw nextError
    }
}

export async function sendOmniMessengerText(
    params: SendMessengerTextParams
): Promise<OmniTextDispatchResult & { recipientId: string; pageId: string | null }> {
    const recipientId = params.recipientId || null
    const pageId = params.pageId || null
    const accessToken = params.accessToken || null

    if (!recipientId || !pageId || !accessToken) {
        const errorMessage = "Messenger configuration is incomplete"
        const attempt = await recordOmniDeliveryAttempt(params.adminDb, {
            chatbotId: params.chatbotId,
            channel: "messenger",
            provider: "meta",
            direction: "outbound",
            source: params.source,
            status: "failed",
            sessionId: params.sessionId || null,
            callbackId: params.callbackId || null,
            destination: recipientId,
            payloadText: params.text,
            providerTargetId: pageId,
            retryOfAttemptId: params.retryOfAttemptId || null,
            attemptNumber: params.attemptNumber,
            errorClass: "config",
            errorMessage,
            metadata: params.metadata,
        })
        const error = new Error(errorMessage) as Error & { deliveryAttemptId?: string | null }
        error.deliveryAttemptId = attempt.id || null
        throw error
    }

    try {
        const response = await fetch(`https://graph.facebook.com/${META_API_VERSION}/${pageId}/messages`, {
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
            throw new Error(`Messenger delivery failed: ${trimProviderMessage(data, "Messenger delivery failed")}`)
        }

        const attempt = await recordOmniDeliveryAttempt(params.adminDb, {
            chatbotId: params.chatbotId,
            channel: "messenger",
            provider: "meta",
            direction: "outbound",
            source: params.source,
            status: "success",
            sessionId: params.sessionId || null,
            callbackId: params.callbackId || null,
            destination: recipientId,
            payloadText: params.text,
            providerMessageId: data?.message_id || data?.recipient_id || null,
            providerTargetId: pageId,
            retryOfAttemptId: params.retryOfAttemptId || null,
            attemptNumber: params.attemptNumber,
            metadata: params.metadata,
        })

        return {
            messageId: data?.message_id || data?.recipient_id || null,
            recipientId,
            pageId,
            deliveryAttemptId: attempt.id || null,
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Messenger delivery failed"
        const attempt = await recordOmniDeliveryAttempt(params.adminDb, {
            chatbotId: params.chatbotId,
            channel: "messenger",
            provider: "meta",
            direction: "outbound",
            source: params.source,
            status: "failed",
            sessionId: params.sessionId || null,
            callbackId: params.callbackId || null,
            destination: recipientId,
            payloadText: params.text,
            providerTargetId: pageId,
            retryOfAttemptId: params.retryOfAttemptId || null,
            attemptNumber: params.attemptNumber,
            errorClass: classifyOmniDeliveryError(error),
            errorMessage,
            metadata: params.metadata,
        })
        const nextError = error instanceof Error ? error : new Error(errorMessage)
        ;(nextError as Error & { deliveryAttemptId?: string | null }).deliveryAttemptId = attempt.id || null
        throw nextError
    }
}

export async function sendOmniEvolutionWhatsAppText(
    params: SendEvolutionWhatsAppTextParams
): Promise<OmniTextDispatchResult & { recipient: string; instanceName: string | null }> {
    const recipient = params.to || null
    const instanceName = params.instanceName || null
    const baseUrl = params.baseUrl || null
    const apiKey = params.apiKey || null

    if (!recipient || !instanceName || !baseUrl || !apiKey) {
        const errorMessage = "Evolution API WhatsApp configuration is incomplete"
        const attempt = await recordOmniDeliveryAttempt(params.adminDb, {
            chatbotId: params.chatbotId,
            channel: "whatsapp",
            provider: "evolution-api",
            direction: "outbound",
            source: params.source,
            status: "failed",
            sessionId: params.sessionId || null,
            callbackId: params.callbackId || null,
            destination: recipient,
            payloadText: params.text,
            providerTargetId: instanceName,
            retryOfAttemptId: params.retryOfAttemptId || null,
            attemptNumber: params.attemptNumber,
            errorClass: "config",
            errorMessage,
            metadata: params.metadata,
        })
        const error = new Error(errorMessage) as Error & { deliveryAttemptId?: string | null }
        error.deliveryAttemptId = attempt.id || null
        throw error
    }

    try {
        const data = await sendEvolutionText({
            baseUrl,
            apiKey,
            instanceName,
            to: recipient,
            text: params.text,
        })
        const messageId = data?.key?.id || data?.messageId || data?.id || null
        const attempt = await recordOmniDeliveryAttempt(params.adminDb, {
            chatbotId: params.chatbotId,
            channel: "whatsapp",
            provider: "evolution-api",
            direction: "outbound",
            source: params.source,
            status: "success",
            sessionId: params.sessionId || null,
            callbackId: params.callbackId || null,
            destination: recipient,
            payloadText: params.text,
            providerMessageId: messageId,
            providerTargetId: instanceName,
            retryOfAttemptId: params.retryOfAttemptId || null,
            attemptNumber: params.attemptNumber,
            metadata: params.metadata,
        })

        return {
            messageId,
            recipient,
            instanceName,
            deliveryAttemptId: attempt.id || null,
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Evolution API WhatsApp delivery failed"
        const attempt = await recordOmniDeliveryAttempt(params.adminDb, {
            chatbotId: params.chatbotId,
            channel: "whatsapp",
            provider: "evolution-api",
            direction: "outbound",
            source: params.source,
            status: "failed",
            sessionId: params.sessionId || null,
            callbackId: params.callbackId || null,
            destination: recipient,
            payloadText: params.text,
            providerTargetId: instanceName,
            retryOfAttemptId: params.retryOfAttemptId || null,
            attemptNumber: params.attemptNumber,
            errorClass: classifyOmniDeliveryError(error),
            errorMessage,
            metadata: params.metadata,
        })
        const nextError = error instanceof Error ? error : new Error(errorMessage)
        ;(nextError as Error & { deliveryAttemptId?: string | null }).deliveryAttemptId = attempt.id || null
        throw nextError
    }
}

export async function dispatchOmniWhatsAppMessage(
    adminDb: any,
    chatbotId: string,
    sessionData: any,
    content: string,
    options: OmniDispatchOptions
) {
    const omniConfigSnapshot = await adminDb.collection("omni_channel_configs").doc(chatbotId).get()
    const omniConfig = omniConfigSnapshot.exists ? omniConfigSnapshot.data() || {} : {}
    const omniWhatsapp = omniConfig.whatsapp || {}
    const evolutionApi = normalizeEvolutionApiConfig(omniConfig.evolutionApi)
    const evolutionApiKey = getEvolutionApiKey(evolutionApi)

    if (
        evolutionApi.enabled &&
        (sessionData.channelMeta?.provider === "evolution-api" || omniWhatsapp.connectionMode === "evolution_api_qr")
    ) {
        return sendOmniEvolutionWhatsAppText({
            adminDb,
            chatbotId,
            to: sessionData.contactKey || sessionData.channelMeta?.remoteJid || null,
            text: content,
            baseUrl: evolutionApi.baseUrl || null,
            apiKey: evolutionApiKey,
            instanceName: sessionData.channelMeta?.instanceName || evolutionApi.instanceName || null,
            source: options.source,
            sessionId: options.sessionId || null,
            callbackId: options.callbackId || null,
            retryOfAttemptId: options.retryOfAttemptId || null,
            attemptNumber: options.attemptNumber,
            metadata: {
                channelMeta: sessionData.channelMeta || {},
                ...(options.metadata || {}),
            },
        })
    }

    const chatbotSnapshot = await adminDb.collection("chatbots").doc(chatbotId).get()
    const chatbotData = chatbotSnapshot.exists ? chatbotSnapshot.data() || {} : {}
    const legacyWhatsapp = chatbotData.integrations?.whatsapp || {}

    return sendOmniWhatsAppText({
        adminDb,
        chatbotId,
        to: sessionData.contactKey || null,
        text: content,
        phoneNumberId: sessionData.channelMeta?.phoneNumberId || omniWhatsapp.phoneNumberId || legacyWhatsapp.phoneNumberId || null,
        accessToken: omniWhatsapp.accessTokenRef || legacyWhatsapp.accessToken || null,
        source: options.source,
        sessionId: options.sessionId || null,
        callbackId: options.callbackId || null,
        retryOfAttemptId: options.retryOfAttemptId || null,
        attemptNumber: options.attemptNumber,
        metadata: {
            channelMeta: sessionData.channelMeta || {},
            ...(options.metadata || {}),
        },
    })
}

export async function dispatchOmniInstagramMessage(
    adminDb: any,
    chatbotId: string,
    sessionData: any,
    content: string,
    options: OmniDispatchOptions
) {
    const omniConfigSnapshot = await adminDb.collection("omni_channel_configs").doc(chatbotId).get()
    const omniConfig = omniConfigSnapshot.exists ? omniConfigSnapshot.data() || {} : {}
    const instagram = omniConfig.instagram || {}

    return sendOmniInstagramText({
        adminDb,
        chatbotId,
        recipientId: sessionData.contactKey || sessionData.channelMeta?.senderId || null,
        text: content,
        endpointTarget: instagram.accountId || instagram.pageId || sessionData.channelMeta?.pageId || null,
        accessToken: instagram.accessTokenRef || null,
        source: options.source,
        sessionId: options.sessionId || null,
        callbackId: options.callbackId || null,
        retryOfAttemptId: options.retryOfAttemptId || null,
        attemptNumber: options.attemptNumber,
        metadata: {
            channelMeta: sessionData.channelMeta || {},
            ...(options.metadata || {}),
        },
    })
}

export async function dispatchOmniMessengerMessage(
    adminDb: any,
    chatbotId: string,
    sessionData: any,
    content: string,
    options: OmniDispatchOptions
) {
    const omniConfigSnapshot = await adminDb.collection("omni_channel_configs").doc(chatbotId).get()
    const omniConfig = omniConfigSnapshot.exists ? omniConfigSnapshot.data() || {} : {}
    const pageId = getMessengerPageId(omniConfig) || sessionData.channelMeta?.pageId || null
    const accessToken = getMessengerPageAccessToken(omniConfig)

    return sendOmniMessengerText({
        adminDb,
        chatbotId,
        recipientId: sessionData.contactKey || sessionData.channelMeta?.senderId || null,
        text: content,
        pageId,
        accessToken,
        source: options.source,
        sessionId: options.sessionId || null,
        callbackId: options.callbackId || null,
        retryOfAttemptId: options.retryOfAttemptId || null,
        attemptNumber: options.attemptNumber,
        metadata: {
            channelMeta: sessionData.channelMeta || {},
            ...(options.metadata || {}),
        },
    })
}
