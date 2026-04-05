import { NextResponse } from "next/server"
import { authorizeOmniRequest, authorizedForOmniPermission, getOmniChannelConfig, jsonError, mergeOmniChannelConfig } from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

function buildBrandVoicePrompt(params: {
    existingPrompt?: string | null
    companyName?: string | null
    welcomeMessage?: string | null
    customPrompts?: string | null
}) {
    if (params.existingPrompt) {
        return params.existingPrompt
    }

    return [
        params.companyName ? `Company: ${params.companyName}` : null,
        params.welcomeMessage ? `Welcome message: ${params.welcomeMessage}` : null,
        params.customPrompts ? `Legacy custom prompts: ${params.customPrompts}` : null,
    ]
        .filter(Boolean)
        .join("\n")
}

export async function POST(req: Request) {
    const body = await req.json()
    const chatbotId = body.chatbotId
    const action = body.action || "run_all"

    if (!chatbotId) {
        return jsonError("chatbotId is required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "settings.manage")) {
        return jsonError("Forbidden", 403)
    }

    const [chatbotSnapshot, userSnapshot, currentOmni] = await Promise.all([
        authz.adminDb.collection("chatbots").doc(chatbotId).get(),
        authz.adminDb.collection("users").doc(chatbotId).get(),
        getOmniChannelConfig(authz.adminDb, chatbotId),
    ])

    const chatbotData = chatbotSnapshot.exists ? chatbotSnapshot.data() || {} : {}
    const userData = userSnapshot.exists ? userSnapshot.data() || {} : {}
    const legacyWhatsApp = chatbotData.integrations?.whatsapp || {}
    const assistantCore = currentOmni.assistantCore || {}
    const operations = currentOmni.operations || {}
    const companyName = chatbotData.companyName || userData.companyName || userData.displayName || ""
    const welcomeMessage = chatbotData.welcomeMessage || ""
    const customPrompts = chatbotData.customPrompts || ""

    const nextPayload: Record<string, any> = {}
    const applied: string[] = []

    if (action === "sync_legacy_whatsapp" || action === "run_all") {
        if (legacyWhatsApp.phoneNumberId || legacyWhatsApp.accessToken || legacyWhatsApp.verifyToken) {
            nextPayload.whatsapp = {
                enabled: currentOmni.whatsapp?.enabled ?? legacyWhatsApp.connected === true,
                phoneNumberId: currentOmni.whatsapp?.phoneNumberId || legacyWhatsApp.phoneNumberId || null,
                accessTokenRef: currentOmni.whatsapp?.accessTokenRef || legacyWhatsApp.accessToken || null,
                verifyToken: currentOmni.whatsapp?.verifyToken || legacyWhatsApp.verifyToken || null,
                webhookStatus: currentOmni.whatsapp?.webhookStatus || (legacyWhatsApp.connected ? "connected" : "disconnected"),
                updatedAt: new Date(),
            }
            applied.push("sync_legacy_whatsapp")
        }
    }

    if (action === "sync_brand_context" || action === "run_all") {
        const prompt = buildBrandVoicePrompt({
            existingPrompt: assistantCore.brandVoicePrompt,
            companyName,
            welcomeMessage,
            customPrompts,
        })

        nextPayload.assistantCore = {
            ...assistantCore,
            brandVoicePrompt: prompt,
        }
        applied.push("sync_brand_context")
    }

    if (action === "sync_workspace_label" || action === "run_all") {
        nextPayload.operations = {
            ...operations,
            workspaceLabel: operations.workspaceLabel || companyName || operations.workspaceLabel || "",
        }
        applied.push("sync_workspace_label")
    }

    nextPayload.migration = {
        lastSyncedAt: new Date(),
        lastAppliedActions: applied,
    }

    const snapshotRef = await authz.adminDb.collection("omni_migration_snapshots").add({
        chatbotId,
        source: "migration-sync",
        action,
        applied,
        config: {
            whatsapp: currentOmni.whatsapp || {},
            assistantCore: currentOmni.assistantCore || {},
            operations: currentOmni.operations || {},
            migration: currentOmni.migration || {},
        },
        createdAt: new Date(),
    })

    const merged = await mergeOmniChannelConfig(authz.adminDb, chatbotId, nextPayload)

    return NextResponse.json({
        ok: true,
        applied,
        snapshotId: snapshotRef.id,
        migration: merged.migration || {},
        whatsapp: merged.whatsapp || {},
        assistantCore: merged.assistantCore || {},
        operations: merged.operations || {},
    })
}
