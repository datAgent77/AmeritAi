import { buildMetaSetupMergePayload, generateMetaVerifyToken } from "@/lib/meta-setup"
import { listOmniAuditEvents } from "@/lib/omni/audit-log"
import { decryptToken, encryptToken } from "@/lib/omni/token-cipher"
import type { OmniChannelConfigDocument } from "@/lib/omni/types"
import { getMessengerDMWizardStep, MESSENGER_DM_STATE_MESSAGES, resolveMessengerDMState } from "@/lib/integrations/messenger/state-machine"
import type { MessengerDMStatusPayload } from "@/lib/integrations/messenger/types"
import type { MessengerDMChannelConfig, MessengerDMPreflightResult } from "@/lib/omni/types"

export function buildDefaultMessengerDMConfig(): MessengerDMChannelConfig {
    return {
        state: "not_started",
        preflightResult: null,
        pageId: null,
        pageName: null,
        accessTokenRef: null,
        tokenExpiresAt: null,
        webhookStatus: "disconnected",
        lastConnectedAt: null,
        lastTestedAt: null,
        wizardStep: 0,
    }
}

export function normalizeMessengerDMConfig(config: any): MessengerDMChannelConfig {
    const normalized = buildDefaultMessengerDMConfig()
    const next: MessengerDMChannelConfig = {
        ...normalized,
        ...config,
        state: typeof config?.state === "string" ? config.state : normalized.state,
        preflightResult: config?.preflightResult || null,
        pageId: config?.pageId || null,
        pageName: config?.pageName || null,
        accessTokenRef: config?.accessTokenRef || null,
        tokenExpiresAt: config?.tokenExpiresAt || null,
        webhookStatus:
            config?.webhookStatus === "connected" || config?.webhookStatus === "pending" ? config.webhookStatus : "disconnected",
        lastConnectedAt: config?.lastConnectedAt || null,
        lastTestedAt: config?.lastTestedAt || null,
        wizardStep: typeof config?.wizardStep === "number" ? config.wizardStep : normalized.wizardStep,
    }

    next.state = resolveMessengerDMState({ config: next })
    next.wizardStep = getMessengerDMWizardStep(next.state, next)
    return next
}

export function getMessengerUserAccessToken(omniConfig: OmniChannelConfigDocument) {
    const metaAccessToken = (omniConfig?.metaSetup as any)?.secrets?.accessToken
    return decryptToken(metaAccessToken) || metaAccessToken || decryptToken(omniConfig?.messengerDM?.accessTokenRef) || null
}

export function buildMessengerDMMergePayload(input: {
    omniConfig: OmniChannelConfigDocument
    accessToken?: string | null
    pageId?: string | null
    pageName?: string | null
    pageAccessToken?: string | null
    tokenExpiresAt?: string | null
    preflightResult?: MessengerDMPreflightResult | null
    webhookStatus?: MessengerDMChannelConfig["webhookStatus"]
    lastConnectedAt?: string | null
    lastTestedAt?: string | null
    state?: MessengerDMChannelConfig["state"]
}) {
    const current = normalizeMessengerDMConfig(input.omniConfig?.messengerDM)
    const accessTokenRef = input.pageAccessToken
        ? encryptToken(input.pageAccessToken)
        : input.accessToken
          ? encryptToken(input.accessToken)
          : current.accessTokenRef

    const next: MessengerDMChannelConfig = {
        ...current,
        pageId: input.pageId ?? current.pageId,
        pageName: input.pageName ?? current.pageName,
        accessTokenRef,
        tokenExpiresAt: input.tokenExpiresAt ?? current.tokenExpiresAt,
        preflightResult: input.preflightResult ?? current.preflightResult,
        webhookStatus: input.webhookStatus ?? current.webhookStatus,
        lastConnectedAt: input.lastConnectedAt ?? current.lastConnectedAt,
        lastTestedAt: input.lastTestedAt ?? current.lastTestedAt,
        state: input.state ?? current.state,
        wizardStep: current.wizardStep,
    }

    next.state = resolveMessengerDMState({ config: next, preflightResult: next.preflightResult })
    next.wizardStep = getMessengerDMWizardStep(next.state, next)

    return {
        ...buildMetaSetupMergePayload({
            currentConfig: input.omniConfig,
            stage: next.state === "connected" ? "live" : "draft",
            selectedChannels: ["messenger"],
            channels: {
                messenger: {
                    enabled: Boolean(next.pageId && next.accessTokenRef),
                    pageId: next.pageId,
                    accessTokenRef: next.accessTokenRef,
                    verifyToken: input.omniConfig?.messenger?.verifyToken || generateMetaVerifyToken(),
                    webhookStatus: next.webhookStatus,
                    setupStatus: next.state === "connected" ? "live" : next.pageId ? "draft" : "not_started",
                    setupStage: next.state === "connected" ? "live" : next.pageId ? "go_live" : "prerequisites",
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
        messengerDM: next,
    }
}

export async function buildMessengerDMStatus(params: {
    adminDb: FirebaseFirestore.Firestore
    chatbotId: string
    origin: string
    omniConfig: OmniChannelConfigDocument
    availablePages: MessengerDMStatusPayload["availablePages"]
    includeDiagnostics?: boolean
    legacyIntegrations?: Record<string, any>
}): Promise<MessengerDMStatusPayload> {
    const config = normalizeMessengerDMConfig(params.omniConfig?.messengerDM)
    const recentAuditEvents = params.includeDiagnostics
        ? await listOmniAuditEvents(params.adminDb, {
              chatbotId: params.chatbotId,
              channel: "messenger",
              limit: 12,
          })
        : []
    const lastWebhookAt =
        recentAuditEvents.find((event: any) => String(event.eventType || "").startsWith("messenger.webhook"))?.createdAt || null

    return {
        channel: "messenger-dm",
        config,
        stateMessage: MESSENGER_DM_STATE_MESSAGES[config.state],
        webhookUrl: `${params.origin}/api/omni/channels/messenger/webhook`,
        availablePages: params.availablePages,
        diagnostics: params.includeDiagnostics
            ? {
                  rawConfig: ((params.omniConfig?.messengerDM as unknown) as Record<string, unknown>) || {},
                  rawLegacyConfig: ((params.omniConfig?.messenger as unknown) as Record<string, unknown>) || {},
                  rawIntegration: ((params.legacyIntegrations?.messenger as unknown) as Record<string, unknown>) || {},
                  lastWebhookAt,
                  recentAuditEvents,
              }
            : undefined,
    }
}
