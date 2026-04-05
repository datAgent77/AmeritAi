import { NextResponse } from "next/server"
import { listOmniSmokeRuns } from "@/lib/omni/smoke-runs"
import { buildVoiceReadiness, normalizeVoiceNumberRecords } from "@/lib/omni/voice-config"
import {
    authorizeOmniRequest,
    authorizedForOmniPermission,
    getOmniChannelConfig,
    getRequestOrigin,
    jsonError,
    normalizeVoiceIntegrationConfig,
} from "@/lib/omni/server-utils"

export const dynamic = "force-dynamic"

type RolloutStepStatus = "done" | "pending" | "blocked" | "disabled"
type RolloutChannelId = "web" | "voice" | "whatsapp" | "instagram"

interface RolloutStep {
    id: string
    label: string
    status: RolloutStepStatus
    description: string
    href?: string
}

function isPublicOrigin(origin: string) {
    return !/localhost|127\.0\.0\.1/i.test(origin)
}

function normalizeWeb(config: any) {
    return {
        enabled: config?.enabled !== false,
    }
}

function normalizeWhatsApp(config: any) {
    return {
        enabled: config?.enabled === true,
        phoneNumberId: config?.phoneNumberId || null,
        accessTokenRef: config?.accessTokenRef || null,
        appSecretRef: config?.appSecretRef || null,
        verifyToken: config?.verifyToken || null,
        webhookStatus: config?.webhookStatus || "disconnected",
    }
}

function normalizeInstagram(config: any) {
    return {
        enabled: config?.enabled === true,
        accountId: config?.accountId || null,
        pageId: config?.pageId || null,
        accessTokenRef: config?.accessTokenRef || null,
        appSecretRef: config?.appSecretRef || null,
        verifyToken: config?.verifyToken || null,
        webhookStatus: config?.webhookStatus || "disconnected",
    }
}

function summarizeStepStates(steps: RolloutStep[]) {
    return {
        total: steps.length,
        done: steps.filter((step) => step.status === "done").length,
        pending: steps.filter((step) => step.status === "pending").length,
        blocked: steps.filter((step) => step.status === "blocked").length,
        disabled: steps.filter((step) => step.status === "disabled").length,
    }
}

function resolveChannelState(enabled: boolean, steps: RolloutStep[]): "ready" | "pending" | "blocked" | "disabled" {
    if (!enabled) {
        return "disabled"
    }
    if (steps.some((step) => step.status === "blocked")) {
        return "blocked"
    }
    if (steps.some((step) => step.status === "pending")) {
        return "pending"
    }
    return "ready"
}

function getLatestRun(runs: any[], channel: RolloutChannelId) {
    return runs.find((run) => run.channel === channel) || null
}

function hasSuccessfulRun(runs: any[], channel: RolloutChannelId, actions: string[]) {
    return runs.some((run) => run.channel === channel && run.result === "success" && actions.includes(run.action))
}

function buildNextAction(params: { channel?: RolloutChannelId | "global"; step?: RolloutStep | null }) {
    if (!params.step) {
        return null
    }
    return {
        channel: params.channel || "global",
        label: params.step.label,
        description: params.step.description,
        href: params.step.href || null,
    }
}

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
    const web = normalizeWeb(config.web)
    const whatsapp = normalizeWhatsApp(config.whatsapp)
    const instagram = normalizeInstagram(config.instagram)

    const [voiceNumbersSnapshot, smokeRuns] = await Promise.all([
        authz.adminDb.collection("voice_numbers").where("chatbotId", "==", chatbotId).get(),
        listOmniSmokeRuns(authz.adminDb, { chatbotId, limit: 60 }),
    ])

    const voiceNumbers = normalizeVoiceNumberRecords(voiceNumbersSnapshot.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) })))
    const voiceReadiness = buildVoiceReadiness({
        publicOrigin,
        integration: voiceIntegration,
        voiceNumbers,
    })

    const globalSteps: RolloutStep[] = [
        {
            id: "public-url",
            label: "Public URL",
            status: publicOrigin ? "done" : "blocked",
            description: publicOrigin
                ? "Provider webhook callback'leri disaridan bu URL'ye ulasabiliyor."
                : "Public tunnel veya preview domain gerekli. Localhost ile canli webhook smoke yapilamaz.",
            href: "/omni/settings",
        },
    ]

    const webSteps: RolloutStep[] = web.enabled
        ? [
              {
                  id: "enabled",
                  label: "Channel enabled",
                  status: "done",
                  description: "Web widget aktif ve embed/runtime tarafina servis veriyor.",
                  href: "/omni/channels/web-widget",
              },
              {
                  id: "install",
                  label: "Install and snippet",
                  status: "pending",
                  description: "Snippet'i hedef siteye koyup gercek browser smoke calistirin.",
                  href: "/omni/channels/web-widget",
              },
          ]
        : [
              {
                  id: "enabled",
                  label: "Channel enabled",
                  status: "disabled",
                  description: "Web widget bilincli olarak kapali.",
                  href: "/omni/channels/web-widget",
              },
          ]

    const voiceHasSmoke = hasSuccessfulRun(smokeRuns, "voice", ["health_check", "test_call", "test_call_status"])
    const voiceSteps: RolloutStep[] = voiceReadiness.enabled
        ? [
              {
                  id: "enabled",
                  label: "Channel enabled",
                  status: "done",
                  description: "Voice channel aktif durumda.",
                  href: "/omni/channels/voice-calls",
              },
              {
                  id: "carrier",
                  label: "Carrier routing",
                  status: voiceReadiness.carrierConfigured && voiceReadiness.activeNumbers > 0 ? "done" : "blocked",
                  description:
                      voiceReadiness.carrierConfigured && voiceReadiness.activeNumbers > 0
                          ? "Aktif numara ve carrier bilgileri kayitli."
                          : "Carrier provider, phone number veya aktif routing satiri eksik.",
                  href: "/omni/channels/voice-calls",
              },
              {
                  id: "control",
                  label: "Twilio call control",
                  status: voiceReadiness.callControlConfigured ? "done" : "blocked",
                  description: voiceReadiness.callControlConfigured
                      ? "Twilio control credential'lari kayitli."
                      : "Twilio Account SID/Auth Token veya BYOC trunk eksik.",
                  href: "/omni/channels/voice-calls",
              },
              {
                  id: "rendering",
                  label: "Voice rendering",
                  status: voiceReadiness.renderingConfigured ? "done" : "blocked",
                  description: voiceReadiness.renderingConfigured
                      ? "Aktif numaralar icin Twilio veya ElevenLabs rendering hazir."
                      : "Twilio fallback voice veya ElevenLabs voice/model ayarlari eksik.",
                  href: "/omni/channels/voice-calls",
              },
              {
                  id: "public",
                  label: "Public callbacks",
                  status: publicOrigin ? "done" : "blocked",
                  description: publicOrigin
                      ? "Inbound/status callback URL'leri public origin ile eslesebilir."
                      : "Canli voice webhook testi icin public origin gerekli.",
                  href: "/omni/settings",
              },
              {
                  id: "test",
                  label: "Live smoke",
                  status: voiceHasSmoke ? "done" : "pending",
                  description: voiceHasSmoke
                      ? "En az bir basarili voice smoke run kaydi var."
                      : "Health check ve test call calistirip smoke sonucunu kaydet.",
                  href: "/omni/channels/voice-calls",
              },
          ]
        : [
              {
                  id: "enabled",
                  label: "Channel enabled",
                  status: "disabled",
                  description: "Voice channel bilincli olarak kapali.",
                  href: "/omni/channels/voice-calls",
              },
          ]

    const whatsappConfigReady =
        Boolean(whatsapp.phoneNumberId) && Boolean(whatsapp.accessTokenRef) && Boolean(whatsapp.appSecretRef) && Boolean(whatsapp.verifyToken)
    const whatsappHasSmoke = hasSuccessfulRun(smokeRuns, "whatsapp", ["health_check", "test_message"])
    const whatsappSteps: RolloutStep[] = whatsapp.enabled
        ? [
              {
                  id: "enabled",
                  label: "Channel enabled",
                  status: "done",
                  description: "WhatsApp channel aktif durumda.",
                  href: "/omni/channels/whatsapp",
              },
              {
                  id: "config",
                  label: "Meta credentials",
                  status: whatsappConfigReady ? "done" : "blocked",
                  description: whatsappConfigReady
                      ? "phoneNumberId, token, app secret ve verify token mevcut."
                      : "WhatsApp credential veya verify token eksik.",
                  href: "/omni/channels/whatsapp",
              },
              {
                  id: "public",
                  label: "Public webhook",
                  status: publicOrigin ? "done" : "blocked",
                  description: publicOrigin
                      ? "Meta webhook callback URL'si public origin ile eslesebilir."
                      : "WhatsApp webhook dogrulamasi icin public origin gerekli.",
                  href: "/omni/settings",
              },
              {
                  id: "verify",
                  label: "Webhook connected",
                  status: whatsapp.webhookStatus === "connected" ? "done" : "blocked",
                  description:
                      whatsapp.webhookStatus === "connected"
                          ? "Meta webhook baglantisi connected."
                          : "Webhook status connected degil; Meta callback mapping'ini kontrol et.",
                  href: "/omni/channels/whatsapp",
              },
              {
                  id: "test",
                  label: "Live smoke",
                  status: whatsappHasSmoke ? "done" : "pending",
                  description: whatsappHasSmoke
                      ? "Basarili WhatsApp smoke run mevcut."
                      : "Health check ve test message calistirip sonucunu dogrula.",
                  href: "/omni/channels/whatsapp",
              },
          ]
        : [
              {
                  id: "enabled",
                  label: "Channel enabled",
                  status: "disabled",
                  description: "WhatsApp channel bilincli olarak kapali.",
                  href: "/omni/channels/whatsapp",
              },
          ]

    const instagramConfigReady =
        Boolean(instagram.accountId) &&
        Boolean(instagram.pageId) &&
        Boolean(instagram.accessTokenRef) &&
        Boolean(instagram.appSecretRef) &&
        Boolean(instagram.verifyToken)
    const instagramHasSmoke = hasSuccessfulRun(smokeRuns, "instagram", ["health_check", "test_message"])
    const instagramSteps: RolloutStep[] = instagram.enabled
        ? [
              {
                  id: "enabled",
                  label: "Channel enabled",
                  status: "done",
                  description: "Instagram DM channel aktif durumda.",
                  href: "/omni/channels/instagram-dm",
              },
              {
                  id: "config",
                  label: "Meta credentials",
                  status: instagramConfigReady ? "done" : "blocked",
                  description: instagramConfigReady
                      ? "pageId, accountId, token, app secret ve verify token mevcut."
                      : "Instagram credential veya verify token eksik.",
                  href: "/omni/channels/instagram-dm",
              },
              {
                  id: "public",
                  label: "Public webhook",
                  status: publicOrigin ? "done" : "blocked",
                  description: publicOrigin
                      ? "Meta webhook callback URL'si public origin ile eslesebilir."
                      : "Instagram webhook dogrulamasi icin public origin gerekli.",
                  href: "/omni/settings",
              },
              {
                  id: "verify",
                  label: "Webhook connected",
                  status: instagram.webhookStatus === "connected" ? "done" : "blocked",
                  description:
                      instagram.webhookStatus === "connected"
                          ? "Meta webhook baglantisi connected."
                          : "Webhook status connected degil; Meta callback mapping'ini kontrol et.",
                  href: "/omni/channels/instagram-dm",
              },
              {
                  id: "test",
                  label: "Live smoke",
                  status: instagramHasSmoke ? "done" : "pending",
                  description: instagramHasSmoke
                      ? "Basarili Instagram smoke run mevcut."
                      : "Health check ve test message calistirip sonucunu dogrula.",
                  href: "/omni/channels/instagram-dm",
              },
          ]
        : [
              {
                  id: "enabled",
                  label: "Channel enabled",
                  status: "disabled",
                  description: "Instagram DM channel bilincli olarak kapali.",
                  href: "/omni/channels/instagram-dm",
              },
          ]

    const channels = {
        web: {
            channel: "web" as const,
            state: resolveChannelState(web.enabled, webSteps),
            latestSmokeAt: getLatestRun(smokeRuns, "web")?.createdAt || null,
            steps: webSteps,
            summary: summarizeStepStates(webSteps),
        },
        voice: {
            channel: "voice" as const,
            state: resolveChannelState(voiceReadiness.enabled, voiceSteps),
            latestSmokeAt: getLatestRun(smokeRuns, "voice")?.createdAt || null,
            steps: voiceSteps,
            summary: summarizeStepStates(voiceSteps),
        },
        whatsapp: {
            channel: "whatsapp" as const,
            state: resolveChannelState(whatsapp.enabled, whatsappSteps),
            latestSmokeAt: getLatestRun(smokeRuns, "whatsapp")?.createdAt || null,
            steps: whatsappSteps,
            summary: summarizeStepStates(whatsappSteps),
        },
        instagram: {
            channel: "instagram" as const,
            state: resolveChannelState(instagram.enabled, instagramSteps),
            latestSmokeAt: getLatestRun(smokeRuns, "instagram")?.createdAt || null,
            steps: instagramSteps,
            summary: summarizeStepStates(instagramSteps),
        },
    }

    const enabledChannels = Object.values(channels).filter((channel) => channel.state !== "disabled")
    const readyChannels = enabledChannels.filter((channel) => channel.state === "ready")
    const pendingChannels = enabledChannels.filter((channel) => channel.state === "pending")
    const blockedChannels = enabledChannels.filter((channel) => channel.state === "blocked")
    const disabledChannels = Object.values(channels).filter((channel) => channel.state === "disabled")

    const relevantSteps = [...globalSteps, ...enabledChannels.flatMap((channel) => channel.steps.filter((step) => step.status !== "disabled"))]
    const doneSteps = relevantSteps.filter((step) => step.status === "done").length
    const progress = relevantSteps.length === 0 ? 100 : Math.round((doneSteps / relevantSteps.length) * 100)

    const nextActions = [
        buildNextAction({ channel: "global", step: globalSteps.find((step) => step.status !== "done") || null }),
        ...enabledChannels.map((channel) => buildNextAction({ channel: channel.channel, step: channel.steps.find((step) => step.status !== "done") || null })),
    ].filter(Boolean)

    return NextResponse.json({
        generatedAt: new Date().toISOString(),
        baseUrl: origin,
        publicOrigin,
        overallReady: publicOrigin && blockedChannels.length === 0 && pendingChannels.length === 0,
        summary: {
            progress,
            totalSteps: relevantSteps.length,
            doneSteps,
            channelsReady: readyChannels.length,
            channelsPending: pendingChannels.length,
            channelsBlocked: blockedChannels.length,
            channelsDisabled: disabledChannels.length,
        },
        globalSteps,
        nextActions,
        channels,
    })
}
