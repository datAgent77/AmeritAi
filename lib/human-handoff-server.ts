import { createNotification } from "@/lib/notification-service"
import { sendHumanHandoffNotificationEmail } from "@/lib/email-service"
import { upsertCallbackRequest, type VionChannel } from "@/lib/vion-callbacks"
import { decryptToken } from "@/lib/vion-token-cipher"
import { sendVionInstagramText, sendVionWhatsAppText } from "@/lib/vion-meta-dispatch"

import type { HumanHandoffTriggerSource, HumanHandoffSettings } from "./human-handoff"

function appendHandoffNote(existingNotes: string | null | undefined, input: {
    triggerSource: HumanHandoffTriggerSource
    userText?: string | null
}) {
    const nextLine = `[${new Date().toISOString()}] ${input.triggerSource === "assistant_trigger" ? "Assistant-triggered" : "User-requested"} handoff${input.userText ? `: ${input.userText}` : ""}`
    return [String(existingNotes || "").trim(), nextLine].filter(Boolean).join("\n")
}

export async function upsertHumanHandoffRequest(input: {
    adminDb: any
    chatbotId: string
    sessionId: string
    sourceChannel?: VionChannel | null
    contactKey?: string | null
    canonicalContactId?: string | null
    displayName?: string | null
    triggerSource: HumanHandoffTriggerSource
    userText?: string | null
    notificationEmail?: string | null
}) {
    const callbackId = input.sessionId || undefined
    let existingNotes: string | null = null

    if (callbackId) {
        const existingSnapshot = await input.adminDb.collection("callback_requests").doc(callbackId).get()
        if (existingSnapshot.exists) {
            existingNotes = existingSnapshot.data()?.notes || null
        }
    }

    return upsertCallbackRequest(input.adminDb, {
        id: callbackId,
        chatbotId: input.chatbotId,
        contactKey: input.contactKey || input.sessionId,
        canonicalContactId: input.canonicalContactId || null,
        displayName: input.displayName || null,
        priority: "high",
        status: "pending",
        sourceSessionId: input.sessionId,
        sourceChannel: input.sourceChannel || "web",
        resolutionStatus: "open",
        notes: appendHandoffNote(existingNotes, {
            triggerSource: input.triggerSource,
            userText: input.userText || null,
        }),
        triggerSource: input.triggerSource,
        notificationEmail: input.notificationEmail || null,
    })
}

export async function dispatchHumanHandoffNotifications(input: {
    adminDb: any
    chatbotId: string
    callbackId: string
    companyName?: string | null
    notificationEmail?: string | null
    triggerSource: HumanHandoffTriggerSource
    userText?: string | null
    settings: HumanHandoffSettings
}) {
    const results = {
        emailSent: false,
        notificationCreated: false,
        whatsappSent: false,
        instagramSent: false,
    }

    if (input.settings.notifyInApp) {
        const notificationId = await createNotification({
            userId: input.chatbotId,
            type: "human_handoff_request",
            title: "Musteri temsilcisi talebi",
            message: input.triggerSource === "assistant_trigger"
                ? "Assistant bir gorusmeyi insan temsilciye aktardi."
                : "Bir ziyaretci musteri temsilcisi talebinde bulundu.",
            metadata: {
                callbackId: input.callbackId,
                source: "web_chat",
                triggerSource: input.triggerSource,
                companyName: input.companyName || undefined,
            },
        })
        results.notificationCreated = Boolean(notificationId)
    }

    if (input.settings.notifyEmail && input.notificationEmail) {
        results.emailSent = await sendHumanHandoffNotificationEmail({
            recipientEmail: input.notificationEmail,
            companyName: input.companyName || "Vion AI",
            callbackId: input.callbackId,
            triggerSource: input.triggerSource,
            transcriptSnippet: input.userText || "",
        })
    }

    const dashboardLink = `https://app.vion.ai/console/chatbot/chats?sessionId=${input.callbackId}`
    const notificationMessage = `Yeni Müşteri Temsilcisi Talebi!\n\nKaynak: ${input.triggerSource === "assistant_trigger" ? "Asistan Yönlendirmesi" : "Kullanıcı Talebi"}\nMesaj: "${input.userText || "-"}"\n\nYanıtlamak için tıklayın: ${dashboardLink}`

    let omniConfig: any = {}
    if (input.settings.notifyWhatsApp || input.settings.notifyInstagram) {
        const omniConfigSnapshot = await input.adminDb.collection("omni_channel_configs").doc(input.chatbotId).get()
        omniConfig = omniConfigSnapshot.exists ? omniConfigSnapshot.data() || {} : {}
    }

    if (input.settings.notifyWhatsApp && input.settings.whatsappNumber) {
        const whatsappConfig = omniConfig.whatsapp || {}
        try {
            await sendVionWhatsAppText({
                to: input.settings.whatsappNumber,
                text: notificationMessage,
                phoneNumberId: whatsappConfig.phoneNumberId || null,
                accessToken: decryptToken(whatsappConfig.accessTokenRef) || null,
            })
            results.whatsappSent = true
        } catch (error) {
            console.error("[HumanHandoff] WhatsApp notification failed:", error)
        }
    }

    if (input.settings.notifyInstagram && input.settings.instagramAccountId) {
        const igConfig = omniConfig.instagram || {}
        try {
            await sendVionInstagramText({
                recipientId: input.settings.instagramAccountId,
                text: notificationMessage,
                endpointTarget: igConfig.accountId || igConfig.pageId || null,
                accessToken: decryptToken(igConfig.accessTokenRef) || null,
            })
            results.instagramSent = true
        } catch (error) {
            console.error("[HumanHandoff] Instagram notification failed:", error)
        }
    }

    return results
}

export async function createAndNotifyHumanHandoff(input: {
    adminDb: any
    chatbotId: string
    sessionId: string
    sourceChannel?: VionChannel | null
    contactKey?: string | null
    canonicalContactId?: string | null
    displayName?: string | null
    triggerSource: HumanHandoffTriggerSource
    userText?: string | null
    companyName?: string | null
    notificationEmail?: string | null
    settings: HumanHandoffSettings
}) {
    const callback = await upsertHumanHandoffRequest({
        adminDb: input.adminDb,
        chatbotId: input.chatbotId,
        sessionId: input.sessionId,
        sourceChannel: input.sourceChannel || "web",
        contactKey: input.contactKey || null,
        canonicalContactId: input.canonicalContactId || null,
        displayName: input.displayName || null,
        triggerSource: input.triggerSource,
        userText: input.userText || null,
        notificationEmail: input.notificationEmail || null,
    })

    const notificationResult = await dispatchHumanHandoffNotifications({
        adminDb: input.adminDb,
        chatbotId: input.chatbotId,
        callbackId: callback.id || input.sessionId,
        companyName: input.companyName || "Vion AI",
        notificationEmail: input.notificationEmail || null,
        triggerSource: input.triggerSource,
        userText: input.userText || null,
        settings: input.settings,
    })

    if (notificationResult.emailSent || notificationResult.notificationCreated) {
        await upsertCallbackRequest(input.adminDb, {
            id: callback.id || input.sessionId,
            chatbotId: input.chatbotId,
            sourceSessionId: input.sessionId,
            sourceChannel: input.sourceChannel || "web",
            emailNotifiedAt: notificationResult.emailSent ? new Date().toISOString() : undefined,
            inAppNotifiedAt: notificationResult.notificationCreated ? new Date().toISOString() : undefined,
        })
    }

    return {
        callback,
        notificationResult,
    }
}
