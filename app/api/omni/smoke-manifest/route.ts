import { NextResponse } from "next/server"
import { buildVoiceReadiness, normalizeVoiceNumberRecords } from "@/lib/omni/voice-config"
import {
    authorizeOmniRequest,
    authorizedForOmniPermission,
    getOmniChannelConfig,
    getRequestOrigin,
    jsonError,
    normalizeVoiceIntegrationConfig,
} from "@/lib/omni/server-utils"

function isPublicOrigin(origin: string) {
    return !/localhost|127\.0\.0\.1/i.test(origin)
}

function normalizeWhatsApp(config: any) {
    return {
        enabled: config?.enabled === true,
        phoneNumberId: config?.phoneNumberId || null,
        displayNumber: config?.displayNumber || null,
        accessTokenConfigured: Boolean(config?.accessTokenRef),
        appSecretConfigured: Boolean(config?.appSecretRef),
        verifyTokenConfigured: Boolean(config?.verifyToken),
        webhookStatus: config?.webhookStatus || "disconnected",
        defaultReplyMode: config?.defaultReplyMode || "assistant",
    }
}

function normalizeInstagram(config: any) {
    return {
        enabled: config?.enabled === true,
        accountId: config?.accountId || null,
        pageId: config?.pageId || null,
        accessTokenConfigured: Boolean(config?.accessTokenRef),
        appSecretConfigured: Boolean(config?.appSecretRef),
        verifyTokenConfigured: Boolean(config?.verifyToken),
        webhookStatus: config?.webhookStatus || "disconnected",
        defaultReplyMode: config?.defaultReplyMode || "assistant",
    }
}

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

    const origin = getRequestOrigin(req)
    const publicOrigin = isPublicOrigin(origin)
    const config = await getOmniChannelConfig(authz.adminDb, chatbotId)
    const voiceIntegration = normalizeVoiceIntegrationConfig(config.voiceIntegration)
    const whatsapp = normalizeWhatsApp(config.whatsapp)
    const instagram = normalizeInstagram(config.instagram)

    const voiceNumbersSnapshot = await authz.adminDb.collection("voice_numbers").where("chatbotId", "==", chatbotId).get()
    const voiceNumbers = normalizeVoiceNumberRecords(voiceNumbersSnapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) })))
    const voiceReadiness = buildVoiceReadiness({
        publicOrigin,
        integration: voiceIntegration,
        voiceNumbers,
    })

    return NextResponse.json({
        generatedAt: new Date().toISOString(),
        baseUrl: origin,
        publicOrigin,
        environmentHint: publicOrigin
            ? "Provider callbacks bu URL'ye gelebilir."
            : "Public tunnel veya preview gerekli. Localhost disaridan callback alamaz.",
        channels: {
            voice: {
                provider: "Carrier + Twilio Control",
                ready: voiceReadiness.ready,
                providerConsoleFields: [
                    {
                        label: "Carrier Routing Mode",
                        value: voiceReadiness.defaultRoutingMode,
                    },
                    {
                        label: "Incoming Call Webhook",
                        value: `${origin}/api/omni/channels/voice/inbound`,
                    },
                    {
                        label: "Status Callback URL",
                        value: `${origin}/api/omni/channels/voice/status`,
                    },
                    {
                        label: "Test Call Endpoint",
                        value: `${origin}/api/omni/channels/voice/test-call`,
                    },
                ],
                setupChecklist: [
                    "Carrier provider, phone number ve routing mode kayitli olmali.",
                    "Twilio Account SID, Auth Token ve gerekiyorsa default BYOC trunk SID kayitli olmali.",
                    "En az bir voice number active durumunda olmali.",
                    "ElevenLabs TTS kullaniliyorsa managed secret ve voice ID tanimli olmali.",
                    "Incoming voice webhook URL inbound endpoint'e, status callback URL status endpoint'e baglanmali.",
                ],
                expectedAuditEvents: [
                    "voice.webhook_signature",
                    "voice.carrier_routing",
                    "voice.tts.elevenlabs_success",
                    "voice.tts.elevenlabs_fallback",
                    "voice.byoc_missing",
                    "voice.test_call",
                    "voice.test_call_status",
                    "voice.webhook_replay",
                    "voice.callback_execute",
                ],
                readinessFacts: {
                    enabled: voiceReadiness.enabled,
                    carrierConfigured: voiceReadiness.carrierConfigured,
                    callControlConfigured: voiceReadiness.callControlConfigured,
                    renderingConfigured: voiceReadiness.renderingConfigured,
                    activeNumbers: voiceReadiness.activeNumbers,
                    defaultRoutingMode: voiceReadiness.defaultRoutingMode,
                    usesElevenLabs: voiceReadiness.usesElevenLabs,
                },
            },
            whatsapp: {
                provider: "Meta WhatsApp Cloud API",
                ready:
                    publicOrigin &&
                    whatsapp.enabled &&
                    Boolean(whatsapp.phoneNumberId) &&
                    whatsapp.accessTokenConfigured &&
                    whatsapp.appSecretConfigured &&
                    whatsapp.verifyTokenConfigured,
                providerConsoleFields: [
                    {
                        label: "Webhook URL",
                        value: `${origin}/api/omni/channels/whatsapp/webhook`,
                    },
                    {
                        label: "Verify Token",
                        value: whatsapp.verifyTokenConfigured ? "Use the saved verify token from channel settings." : "Missing verify token",
                    },
                    {
                        label: "Phone Number ID",
                        value: whatsapp.phoneNumberId || "Missing phoneNumberId",
                    },
                ],
                setupChecklist: [
                    "Meta webhook URL WhatsApp inbound endpoint ile eslesmeli.",
                    "Saved verify token Meta App tarafina ayni sekilde girilmeli.",
                    "Access token, app secret ve phoneNumberId kayitli olmali.",
                    "Health check ve test message sonrasi webhook event'leri inspector'da gorulmeli.",
                ],
                expectedAuditEvents: [
                    "whatsapp.webhook_signature",
                    "whatsapp.health_check",
                    "whatsapp.test_message",
                    "whatsapp.auto_reply",
                    "whatsapp.delivery_retry",
                ],
                readinessFacts: {
                    enabled: whatsapp.enabled,
                    webhookStatus: whatsapp.webhookStatus,
                    defaultReplyMode: whatsapp.defaultReplyMode,
                },
            },
            instagram: {
                provider: "Meta Instagram DM API",
                ready:
                    publicOrigin &&
                    instagram.enabled &&
                    Boolean(instagram.pageId) &&
                    Boolean(instagram.accountId) &&
                    instagram.accessTokenConfigured &&
                    instagram.appSecretConfigured &&
                    instagram.verifyTokenConfigured,
                providerConsoleFields: [
                    {
                        label: "Webhook URL",
                        value: `${origin}/api/omni/channels/instagram/webhook`,
                    },
                    {
                        label: "Verify Token",
                        value: instagram.verifyTokenConfigured ? "Use the saved verify token from channel settings." : "Missing verify token",
                    },
                    {
                        label: "Page ID",
                        value: instagram.pageId || "Missing pageId",
                    },
                ],
                setupChecklist: [
                    "Meta webhook URL Instagram inbound endpoint ile eslesmeli.",
                    "Saved verify token Meta App tarafina ayni sekilde girilmeli.",
                    "Page ID, account ID, access token ve app secret kayitli olmali.",
                    "Health check ve test message sonrasi webhook event'leri inspector'da gorulmeli.",
                ],
                expectedAuditEvents: [
                    "instagram.webhook_signature",
                    "instagram.health_check",
                    "instagram.test_message",
                    "instagram.auto_reply",
                    "instagram.delivery_retry",
                ],
                readinessFacts: {
                    enabled: instagram.enabled,
                    webhookStatus: instagram.webhookStatus,
                    defaultReplyMode: instagram.defaultReplyMode,
                },
            },
        },
    })
}
