import { buildMetaSetupMergePayload, generateMetaVerifyToken } from "@/lib/meta-setup"
import { listOmniAuditEvents } from "@/lib/omni/audit-log"
import { decryptToken, encryptToken } from "@/lib/omni/token-cipher"
import type { OmniChannelConfigDocument } from "@/lib/omni/types"
import { getWhatsAppBizWizardStep, resolveWhatsAppBizState, WHATSAPP_BIZ_STATE_MESSAGES } from "@/lib/integrations/whatsapp-business/state-machine"
import type { WhatsAppBizStatusPayload } from "@/lib/integrations/whatsapp-business/types"
import type { WhatsAppBizChannelConfig, WhatsAppBizPreflightResult } from "@/lib/omni/types"

export function buildDefaultWhatsAppBizConfig(): WhatsAppBizChannelConfig {
    return {
        state: "not_started",
        preflightResult: null,
        wabaId: null,
        phoneNumberId: null,
        displayNumber: null,
        accessTokenRef: null,
        tokenExpiresAt: null,
        webhookStatus: "disconnected",
        lastConnectedAt: null,
        lastTestedAt: null,
        wizardStep: 0,
    }
}

export function normalizeWhatsAppBizConfig(config: any): WhatsAppBizChannelConfig {
    const normalized = buildDefaultWhatsAppBizConfig()
    const next: WhatsAppBizChannelConfig = {
        ...normalized,
        ...config,
        state: typeof config?.state === "string" ? config.state : normalized.state,
        preflightResult: config?.preflightResult || null,
        wabaId: config?.wabaId || null,
        phoneNumberId: config?.phoneNumberId || null,
        displayNumber: config?.displayNumber || null,
        accessTokenRef: config?.accessTokenRef || null,
        tokenExpiresAt: config?.tokenExpiresAt || null,
        webhookStatus:
            config?.webhookStatus === "connected" || config?.webhookStatus === "pending" ? config.webhookStatus : "disconnected",
        lastConnectedAt: config?.lastConnectedAt || null,
        lastTestedAt: config?.lastTestedAt || null,
        wizardStep: typeof config?.wizardStep === "number" ? config.wizardStep : normalized.wizardStep,
    }

    next.state = resolveWhatsAppBizState({ config: next })
    next.wizardStep = getWhatsAppBizWizardStep(next.state, next)
    return next
}

export function getWhatsAppUserAccessToken(omniConfig: OmniChannelConfigDocument) {
    const metaAccessToken = (omniConfig?.metaSetup as any)?.secrets?.accessToken
    return decryptToken(metaAccessToken) || metaAccessToken || decryptToken(omniConfig?.whatsappBusiness?.accessTokenRef) || null
}

export function buildWhatsAppBizMergePayload(input: {
    omniConfig: OmniChannelConfigDocument
    accessToken?: string | null
    wabaId?: string | null
    phoneNumberId?: string | null
    displayNumber?: string | null
    tokenExpiresAt?: string | null
    preflightResult?: WhatsAppBizPreflightResult | null
    webhookStatus?: WhatsAppBizChannelConfig["webhookStatus"]
    lastConnectedAt?: string | null
    lastTestedAt?: string | null
    state?: WhatsAppBizChannelConfig["state"]
}) {
    const current = normalizeWhatsAppBizConfig(input.omniConfig?.whatsappBusiness)
    const accessTokenRef = input.accessToken ? encryptToken(input.accessToken) : current.accessTokenRef

    const next: WhatsAppBizChannelConfig = {
        ...current,
        wabaId: input.wabaId ?? current.wabaId,
        phoneNumberId: input.phoneNumberId ?? current.phoneNumberId,
        displayNumber: input.displayNumber ?? current.displayNumber,
        accessTokenRef,
        tokenExpiresAt: input.tokenExpiresAt ?? current.tokenExpiresAt,
        preflightResult: input.preflightResult ?? current.preflightResult,
        webhookStatus: input.webhookStatus ?? current.webhookStatus,
        lastConnectedAt: input.lastConnectedAt ?? current.lastConnectedAt,
        lastTestedAt: input.lastTestedAt ?? current.lastTestedAt,
        state: input.state ?? current.state,
        wizardStep: current.wizardStep,
    }

    next.state = resolveWhatsAppBizState({ config: next, preflightResult: next.preflightResult })
    next.wizardStep = getWhatsAppBizWizardStep(next.state, next)

    return {
        ...buildMetaSetupMergePayload({
            currentConfig: input.omniConfig,
            stage: next.state === "connected" ? "live" : "draft",
            selectedChannels: ["whatsapp"],
            channels: {
                whatsapp: {
                    enabled: Boolean(next.wabaId && next.phoneNumberId && next.accessTokenRef),
                    businessAccountId: next.wabaId,
                    phoneNumberId: next.phoneNumberId,
                    displayNumber: next.displayNumber,
                    accessTokenRef: next.accessTokenRef,
                    verifyToken: input.omniConfig?.whatsapp?.verifyToken || generateMetaVerifyToken(),
                    webhookStatus: next.webhookStatus,
                    setupStatus: next.state === "connected" ? "live" : next.phoneNumberId ? "draft" : "not_started",
                    setupStage: next.state === "connected" ? "live" : next.phoneNumberId ? "go_live" : "prerequisites",
                    lastHealthCheckAt: next.preflightResult?.checkedAt || null,
                    lastSetupError: next.preflightResult?.failureReason || null,
                },
            },
            secrets: input.accessToken
                ? {
                      accessToken: encryptToken(input.accessToken),
                  }
                : undefined,
        }),
        whatsappBusiness: next,
    }
}

export async function buildWhatsAppBizStatus(params: {
    adminDb: FirebaseFirestore.Firestore
    chatbotId: string
    origin: string
    omniConfig: OmniChannelConfigDocument
    availableBusinesses: WhatsAppBizStatusPayload["availableBusinesses"]
    includeDiagnostics?: boolean
    legacyIntegrations?: Record<string, any>
}): Promise<WhatsAppBizStatusPayload> {
    const config = normalizeWhatsAppBizConfig(params.omniConfig?.whatsappBusiness)
    const recentAuditEvents = params.includeDiagnostics
        ? await listOmniAuditEvents(params.adminDb, {
              chatbotId: params.chatbotId,
              channel: "whatsapp",
              limit: 12,
          })
        : []
    const lastWebhookAt =
        recentAuditEvents.find((event: any) => String(event.eventType || "").startsWith("whatsapp.webhook"))?.createdAt || null

    return {
        channel: "whatsapp-business",
        config,
        stateMessage: WHATSAPP_BIZ_STATE_MESSAGES[config.state],
        webhookUrl: `${params.origin}/api/omni/channels/whatsapp/webhook`,
        availableBusinesses: params.availableBusinesses,
        diagnostics: params.includeDiagnostics
            ? {
                  rawConfig: ((params.omniConfig?.whatsappBusiness as unknown) as Record<string, unknown>) || {},
                  rawLegacyConfig: ((params.omniConfig?.whatsapp as unknown) as Record<string, unknown>) || {},
                  rawIntegration: ((params.legacyIntegrations?.whatsapp as unknown) as Record<string, unknown>) || {},
                  lastWebhookAt,
                  recentAuditEvents,
              }
            : undefined,
    }
}
