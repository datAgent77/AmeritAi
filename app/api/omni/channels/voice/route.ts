import { NextResponse } from "next/server"
import { getConfiguredCapabilitiesForChannel } from "@/lib/omni/assistant-capabilities"
import { getChannelPolicy } from "@/lib/omni/channel-policies"
import {
    buildVoiceReadiness,
    normalizeVoiceIntegrationConfig as normalizeVoiceIntegrationConfigValue,
    normalizeVoiceNumberRecord,
    normalizeVoiceNumberRecords,
    resolveVoiceChannelEnabled,
} from "@/lib/omni/voice-config"
import {
    authorizeOmniRequest,
    authorizedForOmniPermission,
    getOmniChannelConfig,
    getRequestOrigin,
    jsonError,
    maskSecret,
    mergeOmniChannelConfig,
    normalizeVoiceIntegrationConfig,
    toIsoOrNull,
} from "@/lib/omni/server-utils"

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
    if (!authorizedForOmniPermission(authz, "channels.view")) {
        return jsonError("Forbidden", 403)
    }

    const snapshot = await authz.adminDb.collection("voice_numbers").where("chatbotId", "==", chatbotId).get()
    const numbers = normalizeVoiceNumberRecords(snapshot.docs.map((doc: any) => {
        const data = doc.data() || {}
        return {
            id: doc.id,
            ...data,
            createdAt: toIsoOrNull(data.createdAt),
            updatedAt: toIsoOrNull(data.updatedAt),
        }
    }))

    const origin = getRequestOrigin(req)
    const config = await getOmniChannelConfig(authz.adminDb, chatbotId)
    const integration = normalizeVoiceIntegrationConfigValue(config.voiceIntegration)
    const readiness = buildVoiceReadiness({
        publicOrigin: !/localhost|127\.0\.0\.1/i.test(origin),
        integration,
        voiceNumbers: numbers,
    })
    const enabled = resolveVoiceChannelEnabled({ integration, voiceNumbers: numbers })

    return NextResponse.json({
        numbers,
        integration: {
            enabled,
            callControlProvider: integration.callControlProvider || "twilio",
            accountSid: integration.accountSid || null,
            authToken: maskSecret(integration.authToken),
            defaultByocTrunkSid: integration.defaultByocTrunkSid || null,
            elevenLabsManaged: integration.elevenLabsManaged !== false,
            elevenLabsApiKeyRef: integration.elevenLabsApiKeyRef || null,
            ttsProviderDefault: integration.ttsProviderDefault || "twilio",
            ttsFallbackProvider: integration.ttsFallbackProvider || "twilio",
        },
        policy: getChannelPolicy("voice"),
        capabilities: getConfiguredCapabilitiesForChannel("voice", config.assistantCore).map((capability) => ({
            id: capability.id,
            title: capability.title,
        })),
        health: {
            enabled,
            inboundWebhook: `${origin}/api/omni/channels/voice/inbound`,
            turnWebhook: `${origin}/api/omni/channels/voice/turn`,
            statusWebhook: `${origin}/api/omni/channels/voice/status`,
            transcriptRetention: "Transcript only",
            callbackMode: "Callback ticket",
            activeNumbers: numbers.filter((number: any) => number.routingStatus === "active").length,
            outboundReady: enabled && Boolean(integration.accountSid && integration.authToken),
            carrierConfigured: readiness.carrierConfigured,
            callControlConfigured: readiness.callControlConfigured,
            renderingConfigured: readiness.renderingConfigured,
            defaultRoutingMode: readiness.defaultRoutingMode,
            callControlProvider: readiness.callControlProvider,
            ttsProviderDefault: readiness.ttsProviderDefault,
            ttsFallbackProvider: readiness.ttsFallbackProvider,
        },
    })
}

export async function POST(req: Request) {
    const body = await req.json()
    const chatbotId = body.chatbotId

    if (!chatbotId || !body.phoneNumber) {
        return jsonError("chatbotId and phoneNumber are required", 400)
    }

    const authz = await authorizeOmniRequest(req, chatbotId)
    if (!authz.ok) {
        return authz.response
    }
    if (!authorizedForOmniPermission(authz, "channels.manage")) {
        return jsonError("Forbidden", 403)
    }

    const current = await getOmniChannelConfig(authz.adminDb, chatbotId)
    const existingIntegration = normalizeVoiceIntegrationConfigValue(current.voiceIntegration)
    const existingNumbersSnapshot = await authz.adminDb.collection("voice_numbers").where("chatbotId", "==", chatbotId).get()
    const existingNumbers = normalizeVoiceNumberRecords(existingNumbersSnapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) })))
    const resolvedEnabled =
        typeof body.enabled === "boolean"
            ? body.enabled
            : resolveVoiceChannelEnabled({
                  integration: existingIntegration,
                  voiceNumbers: existingNumbers,
              })

    const now = new Date()
    const normalizedRecord = normalizeVoiceNumberRecord({
        chatbotId,
        phoneNumber: body.phoneNumber,
        carrierProvider: body.carrierProvider,
        carrierLabel: body.carrierLabel,
        carrierRouteRef: body.carrierRouteRef,
        routingMode: body.routingMode || "twilio_byoc",
        providerNumberId: body.providerNumberId || body.twilioNumberSid || null,
        twilioNumberSid: body.twilioNumberSid || body.providerNumberId || null,
        defaultLocale: body.defaultLocale || "tr-TR",
        ttsVoice: body.ttsVoice || body.twilioFallbackVoice || "alice",
        ttsProvider: body.ttsProvider || "elevenlabs",
        twilioFallbackVoice: body.twilioFallbackVoice || body.ttsVoice || "alice",
        elevenLabsVoiceId: body.elevenLabsVoiceId || null,
        elevenLabsModelId: body.elevenLabsModelId || null,
        byocTrunkSidOverride: body.byocTrunkSidOverride || null,
        routingStatus: body.routingStatus || "draft",
        businessHours: body.businessHours || null,
        callbackEnabled: body.callbackEnabled ?? true,
        greetingMessage: body.greetingMessage || null,
        fallbackChannel: body.fallbackChannel || "voice",
        createdAt: now,
        updatedAt: now,
    })

    await mergeOmniChannelConfig(authz.adminDb, chatbotId, {
        voiceIntegration: {
            enabled: resolvedEnabled,
            callControlProvider: "twilio",
            accountSid: body.accountSid ? body.accountSid : existingIntegration.accountSid,
            authToken: body.authToken ? body.authToken : existingIntegration.authToken,
            defaultByocTrunkSid:
                body.defaultByocTrunkSid !== undefined ? body.defaultByocTrunkSid || null : existingIntegration.defaultByocTrunkSid || null,
            elevenLabsManaged: true,
            elevenLabsApiKeyRef: existingIntegration.elevenLabsApiKeyRef || (process.env.ELEVENLABS_API_KEY ? "env:ELEVENLABS_API_KEY" : null),
            ttsProviderDefault:
                body.ttsProviderDefault !== undefined ? (body.ttsProviderDefault === "elevenlabs" ? "elevenlabs" : "twilio") : existingIntegration.ttsProviderDefault || "twilio",
            ttsFallbackProvider: "twilio",
            updatedAt: new Date(),
        },
    })

    if (body.id) {
        const existingSnapshot = await authz.adminDb.collection("voice_numbers").doc(body.id).get()
        const existing = existingSnapshot.exists ? existingSnapshot.data() || {} : {}
        await authz.adminDb.collection("voice_numbers").doc(body.id).set(
            {
                ...normalizedRecord,
                createdAt: existing.createdAt || now,
                updatedAt: now,
            },
            { merge: true }
        )

        return NextResponse.json({
            number: normalizeVoiceNumberRecord({
                id: body.id,
                ...existing,
                ...normalizedRecord,
                createdAt: toIsoOrNull(existing.createdAt || now),
                updatedAt: now.toISOString(),
            }),
        })
    }

    const ref = await authz.adminDb.collection("voice_numbers").add(normalizedRecord)

    return NextResponse.json({
        number: normalizeVoiceNumberRecord({
            id: ref.id,
            ...normalizedRecord,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        }),
        integration: {
            enabled: resolvedEnabled,
            callControlProvider: "twilio",
            accountSid: body.accountSid ? body.accountSid : existingIntegration.accountSid || null,
            authToken: maskSecret(body.authToken ? body.authToken : existingIntegration.authToken),
            defaultByocTrunkSid:
                body.defaultByocTrunkSid !== undefined ? body.defaultByocTrunkSid || null : existingIntegration.defaultByocTrunkSid || null,
            elevenLabsManaged: true,
            elevenLabsApiKeyRef: existingIntegration.elevenLabsApiKeyRef || (process.env.ELEVENLABS_API_KEY ? "env:ELEVENLABS_API_KEY" : null),
            ttsProviderDefault:
                body.ttsProviderDefault !== undefined ? (body.ttsProviderDefault === "elevenlabs" ? "elevenlabs" : "twilio") : existingIntegration.ttsProviderDefault || "twilio",
            ttsFallbackProvider: "twilio",
        },
    })
}
