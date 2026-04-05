import { NextResponse } from "next/server"
import { authorizeOmniRequest, authorizedForOmniPermission, getOmniChannelConfig, jsonError } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const chatbotId = searchParams.get("chatbotId")

    if (!chatbotId) {
        return jsonError("chatbotId is required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "settings.view")) {
        return jsonError("Forbidden", 403)
    }

    const [chatbotSnapshot, userSnapshot, omniConfig, sessionsSnapshot, contactsSnapshot, callbacksSnapshot] = await Promise.all([
        authz.adminDb.collection("chatbots").doc(chatbotId).get(),
        authz.adminDb.collection("users").doc(chatbotId).get(),
        getOmniChannelConfig(authz.adminDb, chatbotId),
        authz.adminDb.collection("chat_sessions").where("chatbotId", "==", chatbotId).limit(200).get(),
        authz.adminDb.collection("contact_graph").where("chatbotId", "==", chatbotId).limit(200).get(),
        authz.adminDb.collection("callback_requests").where("chatbotId", "==", chatbotId).limit(200).get(),
    ])

    const chatbotData = chatbotSnapshot.exists ? chatbotSnapshot.data() || {} : {}
    const userData = userSnapshot.exists ? userSnapshot.data() || {} : {}
    const legacyWhatsApp = chatbotData.integrations?.whatsapp || {}
    const omniWhatsApp = omniConfig.whatsapp || {}
    const assistantCore = omniConfig.assistantCore || {}
    const operations = omniConfig.operations || {}

    const companyName = chatbotData.companyName || userData.companyName || userData.displayName || ""
    const welcomeMessage = chatbotData.welcomeMessage || ""
    const customPrompts = chatbotData.customPrompts || ""
    const legacyBrandContextPresent = Boolean(companyName || welcomeMessage || customPrompts)
    const legacyWhatsAppPresent = Boolean(
        legacyWhatsApp.connected || legacyWhatsApp.phoneNumberId || legacyWhatsApp.accessToken || legacyWhatsApp.verifyToken
    )

    const sessionCounts = sessionsSnapshot.docs.reduce((accumulator: Record<string, number>, doc: any) => {
        const data = doc.data() || {}
        const channel = data.channel || "legacy"
        accumulator[channel] = (accumulator[channel] || 0) + 1
        return accumulator
    }, {})

    const blockers = [
        legacyWhatsAppPresent && !omniWhatsApp.phoneNumberId ? "Legacy WhatsApp config var, Omni tarafina alinmamis." : null,
        legacyBrandContextPresent && !assistantCore.brandVoicePrompt ? "Legacy brand/context bilgisi Omni brand voice'a alinmamis." : null,
        !operations.workspaceLabel && companyName ? "Workspace label eksik." : null,
    ].filter(Boolean)

    return NextResponse.json({
        chatbotId,
        legacy: {
            companyName,
            welcomeMessage,
            customPrompts,
            whatsapp: {
                present: legacyWhatsAppPresent,
                connected: legacyWhatsApp.connected === true,
                phoneNumberId: legacyWhatsApp.phoneNumberId || null,
                verifyToken: Boolean(legacyWhatsApp.verifyToken),
            },
        },
        omni: {
            workspaceLabel: operations.workspaceLabel || "",
            brandVoicePrompt: assistantCore.brandVoicePrompt || "",
            whatsapp: {
                enabled: omniWhatsApp.enabled === true,
                phoneNumberId: omniWhatsApp.phoneNumberId || null,
                verifyToken: Boolean(omniWhatsApp.verifyToken),
            },
        },
        parity: {
            whatsappConfigSynced: !legacyWhatsAppPresent || Boolean(omniWhatsApp.phoneNumberId && omniWhatsApp.accessTokenRef && omniWhatsApp.verifyToken),
            brandContextSynced: !legacyBrandContextPresent || Boolean(assistantCore.brandVoicePrompt),
            workspaceLabelSynced: !companyName || Boolean(operations.workspaceLabel),
        },
        stats: {
            sessions: {
                total: sessionsSnapshot.docs.length,
                byChannel: sessionCounts,
            },
            contacts: contactsSnapshot.docs.length,
            callbacks: callbacksSnapshot.docs.length,
        },
        blockers,
        recommendedActions: [
            !legacyWhatsAppPresent ? null : "sync_legacy_whatsapp",
            !legacyBrandContextPresent ? null : "sync_brand_context",
            companyName ? "sync_workspace_label" : null,
        ].filter(Boolean),
    })
}
