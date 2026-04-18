import { buildMetaSetupMergePayload, generateMetaVerifyToken } from "@/lib/meta-setup"
import { listOmniAuditEvents } from "@/lib/omni/audit-log"
import { decryptToken, encryptToken } from "@/lib/omni/token-cipher"
import type { OmniChannelConfigDocument } from "@/lib/omni/types"
import { getInstagramDMWizardStep, INSTAGRAM_DM_STATE_MESSAGES, resolveInstagramDMState } from "@/lib/integrations/instagram-dm/state-machine"
import type { InstagramDMStatusPayload } from "@/lib/integrations/instagram-dm/types"
import type { InstagramDMChannelConfig, InstagramDMPreflightResult } from "@/lib/omni/types"

export function buildDefaultInstagramDMConfig(): InstagramDMChannelConfig {
    return {
        state: "not_started",
        preflightResult: null,
        pageId: null,
        pageName: null,
        instagramAccountId: null,
        instagramUsername: null,
        accessTokenRef: null,
        tokenExpiresAt: null,
        webhookStatus: "disconnected",
        lastConnectedAt: null,
        lastTestedAt: null,
        wizardStep: 0,
    }
}

export function normalizeInstagramDMConfig(config: any): InstagramDMChannelConfig {
    const normalized = buildDefaultInstagramDMConfig()
    const next: InstagramDMChannelConfig = {
        ...normalized,
        ...config,
        state: typeof config?.state === "string" ? config.state : normalized.state,
        preflightResult: config?.preflightResult || null,
        pageId: config?.pageId || null,
        pageName: config?.pageName || null,
        instagramAccountId: config?.instagramAccountId || null,
        instagramUsername: config?.instagramUsername || null,
        accessTokenRef: config?.accessTokenRef || null,
        tokenExpiresAt: config?.tokenExpiresAt || null,
        webhookStatus:
            config?.webhookStatus === "connected" || config?.webhookStatus === "pending" ? config.webhookStatus : "disconnected",
        lastConnectedAt: config?.lastConnectedAt || null,
        lastTestedAt: config?.lastTestedAt || null,
        wizardStep: typeof config?.wizardStep === "number" ? config.wizardStep : normalized.wizardStep,
    }

    next.state = resolveInstagramDMState({ config: next })
    next.wizardStep = getInstagramDMWizardStep(next.state, next)
    return next
}

export function getInstagramUserAccessToken(omniConfig: OmniChannelConfigDocument) {
    const metaAccessToken = (omniConfig?.metaSetup as any)?.secrets?.accessToken
    return decryptToken(metaAccessToken) || metaAccessToken || decryptToken(omniConfig?.instagramDM?.accessTokenRef) || null
}

export function buildInstagramDMMergePayload(input: {
    omniConfig: OmniChannelConfigDocument
    accessToken?: string | null
    pageId?: string | null
    pageName?: string | null
    instagramAccountId?: string | null
    instagramUsername?: string | null
    pageAccessToken?: string | null
    tokenExpiresAt?: string | null
    preflightResult?: InstagramDMPreflightResult | null
    webhookStatus?: InstagramDMChannelConfig["webhookStatus"]
    lastConnectedAt?: string | null
    lastTestedAt?: string | null
    state?: InstagramDMChannelConfig["state"]
}) {
    const current = normalizeInstagramDMConfig(input.omniConfig?.instagramDM)
    const accessTokenRef = input.pageAccessToken
        ? encryptToken(input.pageAccessToken)
        : input.accessToken
          ? encryptToken(input.accessToken)
          : current.accessTokenRef

    const next: InstagramDMChannelConfig = {
        ...current,
        pageId: input.pageId ?? current.pageId,
        pageName: input.pageName ?? current.pageName,
        instagramAccountId: input.instagramAccountId ?? current.instagramAccountId,
        instagramUsername: input.instagramUsername ?? current.instagramUsername,
        accessTokenRef,
        tokenExpiresAt: input.tokenExpiresAt ?? current.tokenExpiresAt,
        preflightResult: input.preflightResult ?? current.preflightResult,
        webhookStatus: input.webhookStatus ?? current.webhookStatus,
        lastConnectedAt: input.lastConnectedAt ?? current.lastConnectedAt,
        lastTestedAt: input.lastTestedAt ?? current.lastTestedAt,
        state: input.state ?? current.state,
        wizardStep: current.wizardStep,
    }

    next.state = resolveInstagramDMState({ config: next, preflightResult: next.preflightResult })
    next.wizardStep = getInstagramDMWizardStep(next.state, next)

    return {
        ...buildMetaSetupMergePayload({
            currentConfig: input.omniConfig,
            stage: next.state === "connected" ? "live" : "draft",
            selectedChannels: ["instagram"],
            channels: {
                instagram: {
                    enabled: Boolean(next.pageId && next.instagramAccountId && next.accessTokenRef),
                    pageId: next.pageId,
                    accountId: next.instagramAccountId,
                    accessTokenRef: next.accessTokenRef,
                    verifyToken: input.omniConfig?.instagram?.verifyToken || generateMetaVerifyToken(),
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
        instagramDM: next,
    }
}

export async function buildInstagramDMStatus(params: {
    adminDb: FirebaseFirestore.Firestore
    chatbotId: string
    origin: string
    omniConfig: OmniChannelConfigDocument
    availablePages: InstagramDMStatusPayload["availablePages"]
    includeDiagnostics?: boolean
    legacyIntegrations?: Record<string, any>
}): Promise<InstagramDMStatusPayload> {
    const config = normalizeInstagramDMConfig(params.omniConfig?.instagramDM)
    const recentAuditEvents = params.includeDiagnostics
        ? await listOmniAuditEvents(params.adminDb, {
              chatbotId: params.chatbotId,
              channel: "instagram",
              limit: 12,
          })
        : []
    const lastWebhookAt =
        recentAuditEvents.find((event: any) => String(event.eventType || "").startsWith("instagram.webhook"))?.createdAt || null

    return {
        channel: "instagram-dm",
        config,
        stateMessage: INSTAGRAM_DM_STATE_MESSAGES[config.state],
        webhookUrl: `${params.origin}/api/omni/channels/instagram/webhook`,
        availablePages: params.availablePages,
        diagnostics: params.includeDiagnostics
            ? {
                  rawConfig: ((params.omniConfig?.instagramDM as unknown) as Record<string, unknown>) || {},
                  rawLegacyConfig: ((params.omniConfig?.instagram as unknown) as Record<string, unknown>) || {},
                  rawIntegration: ((params.legacyIntegrations?.instagram as unknown) as Record<string, unknown>) || {},
                  lastWebhookAt,
                  recentAuditEvents,
              }
            : undefined,
    }
}
