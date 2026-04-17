import { NextResponse } from "next/server"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { getAdminDb } from "@/lib/firebase-admin"
import {
    buildMetaSetupMergePayload,
    buildMetaSetupStatus,
    generateMetaVerifyToken,
    runMetaHealthCheck,
    sanitizeMetaSetupDraft,
    sanitizeSelectedChannels,
    selectInstagramPage,
    selectMessengerPage,
    selectWhatsAppPhone,
} from "@/lib/meta-setup"
import { getOmniChannelConfig, mergeOmniChannelConfig } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const body = await req.json().catch(() => null)
    const chatbotId = typeof body?.chatbotId === "string" ? body.chatbotId : ""
    const selectedChannels = sanitizeSelectedChannels(body?.selectedChannels)
    const instagramPageId = typeof body?.instagramPageId === "string" ? body.instagramPageId : ""
    const messengerPageId = typeof body?.messengerPageId === "string" ? body.messengerPageId : ""
    const whatsappBusinessAccountId = typeof body?.whatsappBusinessAccountId === "string" ? body.whatsappBusinessAccountId : ""
    const whatsappPhoneNumberId = typeof body?.whatsappPhoneNumberId === "string" ? body.whatsappPhoneNumberId : ""
    const whatsappDisplayNumber = typeof body?.whatsappDisplayNumber === "string" ? body.whatsappDisplayNumber : ""

    if (!chatbotId) {
        return NextResponse.json({ error: "chatbotId is required" }, { status: 400 })
    }

    const authz = await authorizeTargetAccess(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }

    const [chatbotSnapshot, currentConfig] = await Promise.all([
        adminDb.collection("chatbots").doc(chatbotId).get(),
        getOmniChannelConfig(adminDb, chatbotId),
    ])
    const draft = sanitizeMetaSetupDraft(currentConfig?.metaSetup)
    const accessToken = draft.secrets?.accessToken || ""

    if (!accessToken) {
        return NextResponse.json({ error: "Kayitli access token bulunamadi. Kesif adimini tekrar calistirin." }, { status: 400 })
    }

    const channelPayloads: Record<string, Record<string, unknown>> = {}

    if (selectedChannels.includes("instagram")) {
        const page = selectInstagramPage(draft.discovery, instagramPageId)
        if (!page) {
            return NextResponse.json({ error: "Instagram icin bir Facebook sayfasi secin." }, { status: 400 })
        }
        if (!page.instagramAccount) {
            return NextResponse.json({ error: "Secilen Facebook sayfasi bagli Instagram Business hesabina sahip degil." }, { status: 400 })
        }

        channelPayloads.instagram = {
            enabled: true,
            pageId: page.id,
            accountId: page.instagramAccount.id,
            appId: draft.secrets?.appId || currentConfig?.instagram?.appId || null,
            accessTokenRef: page.pageAccessToken || accessToken,
            appSecretRef: draft.secrets?.appSecret || currentConfig?.instagram?.appSecretRef || null,
            verifyToken: currentConfig?.instagram?.verifyToken || generateMetaVerifyToken(),
            webhookStatus: "pending",
            setupStatus: "draft",
            setupStage: "draft",
            connectionMode: "tenant_meta_app",
            lastSetupError: null,
        }
    }

    if (selectedChannels.includes("messenger")) {
        const page = selectMessengerPage(draft.discovery, messengerPageId || instagramPageId)
        if (!page) {
            return NextResponse.json({ error: "Messenger icin bir Facebook sayfasi secin." }, { status: 400 })
        }

        channelPayloads.messenger = {
            enabled: true,
            pageId: page.id,
            appId: draft.secrets?.appId || currentConfig?.messenger?.appId || null,
            accessTokenRef: page.pageAccessToken || accessToken,
            appSecretRef: draft.secrets?.appSecret || currentConfig?.messenger?.appSecretRef || null,
            verifyToken: currentConfig?.messenger?.verifyToken || generateMetaVerifyToken(),
            webhookStatus: "pending",
            setupStatus: "draft",
            setupStage: "draft",
            connectionMode: "tenant_meta_app",
            lastSetupError: null,
        }
    }

    if (selectedChannels.includes("whatsapp")) {
        const selectedPhone = selectWhatsAppPhone(draft.discovery, whatsappBusinessAccountId, whatsappPhoneNumberId)
        const manualBusinessId = whatsappBusinessAccountId || currentConfig?.whatsapp?.businessAccountId || ""
        const manualPhoneId = whatsappPhoneNumberId || currentConfig?.whatsapp?.phoneNumberId || ""

        const businessAccountId = selectedPhone.business?.id || manualBusinessId
        const phoneNumberId = selectedPhone.phoneNumber?.id || manualPhoneId
        const displayNumber = selectedPhone.phoneNumber?.displayNumber || whatsappDisplayNumber || currentConfig?.whatsapp?.displayNumber || null

        if (!businessAccountId || !phoneNumberId) {
            return NextResponse.json(
                { error: "WhatsApp icin businessAccountId ve phoneNumberId gerekli. Otomatik kesif olmadiysa manuel alanlari doldurun." },
                { status: 400 }
            )
        }

        channelPayloads.whatsapp = {
            enabled: true,
            businessAccountId,
            phoneNumberId,
            displayNumber,
            accessTokenRef: accessToken,
            appSecretRef: draft.secrets?.appSecret || currentConfig?.whatsapp?.appSecretRef || null,
            verifyToken: currentConfig?.whatsapp?.verifyToken || generateMetaVerifyToken(),
            webhookStatus: "pending",
            setupStatus: "draft",
            setupStage: "draft",
            connectionMode: "tenant_meta_app",
            lastSetupError: null,
        }
    }

    let nextConfig = await mergeOmniChannelConfig(
        adminDb,
        chatbotId,
        buildMetaSetupMergePayload({
            currentConfig,
            stage: "draft",
            selectedChannels,
            channels: channelPayloads,
        })
    )

    const results: Record<string, { ok: boolean; message: string; status: number }> = {}
    const finalChannelPayloads: Record<string, Record<string, unknown>> = {}

    for (const channel of selectedChannels) {
        const health = await runMetaHealthCheck(req, channel, chatbotId)
        results[channel] = {
            ok: health.ok,
            message: health.message,
            status: health.status,
        }
        finalChannelPayloads[channel] = {
            setupStatus: health.ok ? "ready_for_live" : "error",
            setupStage: "go_live",
            lastHealthCheckAt: new Date().toISOString(),
            lastSetupError: health.ok ? null : health.message,
            webhookStatus: "pending",
        }
    }

    nextConfig = await mergeOmniChannelConfig(
        adminDb,
        chatbotId,
        buildMetaSetupMergePayload({
            currentConfig: nextConfig,
            stage: "go_live",
            selectedChannels,
            channels: finalChannelPayloads,
        })
    )

    return NextResponse.json({
        results,
        status: buildMetaSetupStatus({
            origin: new URL(req.url).origin,
            omniConfig: nextConfig,
            legacyIntegrations: chatbotSnapshot.data()?.integrations || {},
        }),
    })
}
