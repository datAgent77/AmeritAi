import crypto from "crypto"
import type { InstagramChannelConfig, MessengerChannelConfig, WhatsAppChannelConfig } from "@/lib/omni/types"

const META_API_VERSION = process.env.META_API_VERSION || "v23.0"
const META_SUBSCRIBE_RETRY_MAX = 3
const META_SUBSCRIBE_RETRY_BASE_MS = 500

export type MetaChannelKey = "instagram" | "messenger" | "whatsapp"
export type MetaWizardStage = "prerequisites" | "token" | "discovery" | "draft" | "go_live" | "live"
export type MetaSetupStatus = "not_started" | "draft" | "ready_for_live" | "live" | "error"
export type MetaConnectionMode = "tenant_meta_app" | "platform_meta_app"

export interface MetaDiscoveryPage {
    id: string
    name: string
    pageAccessToken?: string | null
    messagingEligible?: boolean
    instagramAccount: {
        id: string
        username: string | null
        name: string | null
    } | null
}

export interface MetaWhatsAppDiscoveryPhone {
    id: string
    displayNumber: string | null
    verifiedName: string | null
}

export interface MetaWhatsAppDiscoveryBusiness {
    id: string
    name: string
    phoneNumbers: MetaWhatsAppDiscoveryPhone[]
}

export interface MetaDiscoveryResult {
    pages: MetaDiscoveryPage[]
    whatsappBusinesses: MetaWhatsAppDiscoveryBusiness[]
    errors: Record<MetaChannelKey, string | null>
}

export interface MetaSetupDraftState {
    stage?: MetaWizardStage
    selectedChannels?: MetaChannelKey[]
    discovery?: {
        pages?: MetaDiscoveryPage[]
        whatsappBusinesses?: MetaWhatsAppDiscoveryBusiness[]
        errors?: Partial<Record<MetaChannelKey, string | null>>
        discoveredAt?: string | null
    }
    secrets?: {
        accessToken?: string | null
        appSecret?: string | null
        appId?: string | null
    }
    oauth?: {
        lastConnectedAt?: string | null
        lastConnectedBy?: string | null
        connectionMode?: MetaConnectionMode
    }
    updatedAt?: string | null
}

export interface MetaChannelStatusPayload {
    enabled: boolean
    connected: boolean
    setupStatus: MetaSetupStatus
    setupStage: MetaWizardStage
    connectionMode: MetaConnectionMode
    webhookStatus: "connected" | "pending" | "disconnected"
    webhookUrl: string
    verifyToken: string | null
    lastHealthCheckAt: string | null
    lastSetupError: string | null
    readyForLive: boolean
    pageId?: string | null
    accountId?: string | null
    appId?: string | null
    businessAccountId?: string | null
    phoneNumberId?: string | null
    displayNumber?: string | null
}

export interface MetaSetupStatusPayload {
    wizard: {
        stage: MetaWizardStage
        selectedChannels: MetaChannelKey[]
        hasStoredAccessToken: boolean
        hasStoredAppSecret: boolean
        appId: string | null
        connectionMode: MetaConnectionMode
        discovery: {
            pages: Array<Omit<MetaDiscoveryPage, "pageAccessToken">>
            whatsappBusinesses: MetaWhatsAppDiscoveryBusiness[]
            errors: Record<MetaChannelKey, string | null>
            discoveredAt: string | null
        }
    }
    channels: {
        instagram: MetaChannelStatusPayload
        messenger: MetaChannelStatusPayload
        whatsapp: MetaChannelStatusPayload
    }
}

export interface MetaAutoSelectionResult {
    instagramPage: MetaDiscoveryPage | null
    messengerPage: MetaDiscoveryPage | null
    whatsappBusiness: MetaWhatsAppDiscoveryBusiness | null
    whatsappPhone: MetaWhatsAppDiscoveryPhone | null
}

const DEFAULT_META_CHANNELS: MetaChannelKey[] = ["instagram", "messenger", "whatsapp"]

interface MetaPlatformAppConfig {
    appId: string
    appSecret: string
    verifyToken: string
}

interface MetaOAuthAppConfigOverrides {
    appId?: string | null
    appSecret?: string | null
    verifyToken?: string | null
}

function getMissingMetaPlatformEnvVars() {
    const missing: string[] = []
    if (!(process.env.META_APP_ID || process.env.INSTAGRAM_APP_ID)) {
        missing.push("META_APP_ID")
    }
    if (!(process.env.META_APP_SECRET || process.env.INSTAGRAM_APP_SECRET || process.env.WHATSAPP_APP_SECRET)) {
        missing.push("META_APP_SECRET")
    }
    if (
        !(
            process.env.META_WEBHOOK_VERIFY_TOKEN ||
            process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ||
            process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
        )
    ) {
        missing.push("META_WEBHOOK_VERIFY_TOKEN")
    }
    return missing
}

function buildEmptyMetaErrors(): Record<MetaChannelKey, string | null> {
    return {
        instagram: null,
        messenger: null,
        whatsapp: null,
    }
}

function normalizeSetupStatus(value: unknown): MetaSetupStatus {
    return value === "draft" || value === "ready_for_live" || value === "live" || value === "error" ? value : "not_started"
}

function normalizeSetupStage(value: unknown, fallback: MetaWizardStage): MetaWizardStage {
    return value === "prerequisites" ||
        value === "token" ||
        value === "discovery" ||
        value === "draft" ||
        value === "go_live" ||
        value === "live"
        ? value
        : fallback
}

function asIsoString(value: unknown): string | null {
    if (!value) return null
    if (typeof value === "string") return value
    if (value instanceof Date) return value.toISOString()
    if (typeof (value as { toDate?: () => Date }).toDate === "function") {
        return (value as { toDate: () => Date }).toDate().toISOString()
    }
    return null
}

function normalizeConnectionMode(value: unknown, fallback: MetaConnectionMode = "tenant_meta_app"): MetaConnectionMode {
    return value === "platform_meta_app" ? "platform_meta_app" : fallback
}

export function sanitizeSelectedChannels(value: unknown): MetaChannelKey[] {
    if (!Array.isArray(value)) return [...DEFAULT_META_CHANNELS]
    const normalized = Array.from(
        new Set(
            value
                .map((item) => String(item))
                .filter((item): item is MetaChannelKey => item === "instagram" || item === "messenger" || item === "whatsapp")
        )
    )
    return normalized.length > 0 ? normalized : [...DEFAULT_META_CHANNELS]
}

export function buildMetaOAuthScopes(selectedChannels?: MetaChannelKey[]) {
    const normalizedChannels = sanitizeSelectedChannels(selectedChannels || DEFAULT_META_CHANNELS)
    const scopes = new Set<string>(["business_management", "pages_show_list"])

    if (normalizedChannels.includes("instagram")) {
        scopes.add("instagram_basic");
        scopes.add("instagram_manage_messages");
        scopes.add("pages_manage_metadata");
        scopes.add("pages_messaging");
        scopes.add("pages_show_list");
    }

    if (normalizedChannels.includes("messenger")) {
        scopes.add("pages_manage_metadata");
        scopes.add("pages_messaging");
        scopes.add("pages_show_list");
    }

    if (normalizedChannels.includes("whatsapp")) {
        scopes.add("whatsapp_business_management")
        scopes.add("whatsapp_business_messaging")
    }

    return Array.from(scopes)
}

function sanitizeDiscoveryPages(value: unknown): MetaDiscoveryPage[] {
    if (!Array.isArray(value)) return []
    return value
        .map((item) => {
            const id = String(item?.id || "").trim()
            if (!id) return null
            const pageAccessToken = typeof item?.pageAccessToken === "string" && item.pageAccessToken.trim() ? item.pageAccessToken.trim() : null
            const instagramAccount =
                item?.instagramAccount && typeof item.instagramAccount === "object" && item.instagramAccount.id
                    ? {
                          id: String(item.instagramAccount.id),
                          username: typeof item.instagramAccount.username === "string" ? item.instagramAccount.username : null,
                          name: typeof item.instagramAccount.name === "string" ? item.instagramAccount.name : null,
                      }
                    : null

            return {
                id,
                name: typeof item?.name === "string" && item.name.trim() ? item.name.trim() : `Page ${id}`,
                pageAccessToken,
                messagingEligible: item?.messagingEligible !== false,
                instagramAccount,
            } satisfies MetaDiscoveryPage
        })
        .filter(Boolean) as MetaDiscoveryPage[]
}

function sanitizeWhatsAppBusinesses(value: unknown): MetaWhatsAppDiscoveryBusiness[] {
    if (!Array.isArray(value)) return []
    return value
        .map((item) => {
            const id = String(item?.id || "").trim()
            if (!id) return null
            const phoneNumbers = Array.isArray(item?.phoneNumbers)
                ? item.phoneNumbers
                      .map((phone: any) => {
                          const phoneId = String(phone?.id || "").trim()
                          if (!phoneId) return null
                          return {
                              id: phoneId,
                              displayNumber: typeof phone?.displayNumber === "string" ? phone.displayNumber : null,
                              verifiedName: typeof phone?.verifiedName === "string" ? phone.verifiedName : null,
                          } satisfies MetaWhatsAppDiscoveryPhone
                      })
                      .filter(Boolean)
                : []

            return {
                id,
                name: typeof item?.name === "string" && item.name.trim() ? item.name.trim() : `WABA ${id}`,
                phoneNumbers,
            } satisfies MetaWhatsAppDiscoveryBusiness
        })
        .filter(Boolean) as MetaWhatsAppDiscoveryBusiness[]
}

export function sanitizeMetaSetupDraft(value: any): MetaSetupDraftState {
    const discoveryErrors = value?.discovery?.errors || {}
    const errors = buildEmptyMetaErrors()
    return {
        stage: normalizeSetupStage(value?.stage, "prerequisites"),
        selectedChannels: sanitizeSelectedChannels(value?.selectedChannels),
        discovery: {
            pages: sanitizeDiscoveryPages(value?.discovery?.pages || value?.discovery?.instagramPages),
            whatsappBusinesses: sanitizeWhatsAppBusinesses(value?.discovery?.whatsappBusinesses),
            errors: {
                ...errors,
                instagram: typeof discoveryErrors.instagram === "string" ? discoveryErrors.instagram : null,
                messenger: typeof discoveryErrors.messenger === "string" ? discoveryErrors.messenger : null,
                whatsapp: typeof discoveryErrors.whatsapp === "string" ? discoveryErrors.whatsapp : null,
            },
            discoveredAt: asIsoString(value?.discovery?.discoveredAt),
        },
        secrets: {
            accessToken: typeof value?.secrets?.accessToken === "string" ? value.secrets.accessToken : null,
            appSecret: typeof value?.secrets?.appSecret === "string" ? value.secrets.appSecret : null,
            appId: typeof value?.secrets?.appId === "string" ? value.secrets.appId : null,
        },
        oauth: {
            lastConnectedAt: asIsoString(value?.oauth?.lastConnectedAt),
            lastConnectedBy: typeof value?.oauth?.lastConnectedBy === "string" ? value.oauth.lastConnectedBy : null,
            connectionMode: normalizeConnectionMode(value?.oauth?.connectionMode, "tenant_meta_app"),
        },
        updatedAt: asIsoString(value?.updatedAt),
    }
}

export function normalizeInstagramSetupConfig(config: any): InstagramChannelConfig {
    return {
        enabled: config?.enabled === true,
        accountId: config?.accountId || null,
        pageId: config?.pageId || null,
        appId: config?.appId || null,
        appSecretRef: config?.appSecretRef || null,
        accessTokenRef: config?.accessTokenRef || null,
        verifyToken: config?.verifyToken || null,
        webhookStatus: config?.webhookStatus || "disconnected",
        responseWindow: config?.responseWindow || "24h",
        defaultReplyMode: config?.defaultReplyMode || "assistant",
        setupStatus: normalizeSetupStatus(config?.setupStatus),
        setupStage: normalizeSetupStage(config?.setupStage, "prerequisites"),
        connectionMode: normalizeConnectionMode(config?.connectionMode),
        lastHealthCheckAt: asIsoString(config?.lastHealthCheckAt),
        lastSetupError: typeof config?.lastSetupError === "string" ? config.lastSetupError : null,
    }
}

export function normalizeMessengerSetupConfig(config: any): MessengerChannelConfig {
    return {
        enabled: config?.enabled === true,
        pageId: config?.pageId || null,
        appId: config?.appId || null,
        appSecretRef: config?.appSecretRef || null,
        accessTokenRef: config?.accessTokenRef || null,
        verifyToken: config?.verifyToken || null,
        webhookStatus: config?.webhookStatus || "disconnected",
        defaultReplyMode: config?.defaultReplyMode || "assistant",
        setupStatus: normalizeSetupStatus(config?.setupStatus),
        setupStage: normalizeSetupStage(config?.setupStage, "prerequisites"),
        connectionMode: normalizeConnectionMode(config?.connectionMode),
        lastHealthCheckAt: asIsoString(config?.lastHealthCheckAt),
        lastSetupError: typeof config?.lastSetupError === "string" ? config.lastSetupError : null,
    }
}

export function normalizeWhatsAppSetupConfig(config: any): WhatsAppChannelConfig {
    return {
        enabled: config?.enabled === true,
        businessAccountId: config?.businessAccountId || null,
        phoneNumberId: config?.phoneNumberId || null,
        displayNumber: config?.displayNumber || null,
        appSecretRef: config?.appSecretRef || null,
        accessTokenRef: config?.accessTokenRef || null,
        verifyToken: config?.verifyToken || null,
        templateNamespace: config?.templateNamespace || null,
        webhookStatus: config?.webhookStatus || "disconnected",
        defaultReplyMode: config?.defaultReplyMode || "assistant",
        setupStatus: normalizeSetupStatus(config?.setupStatus),
        setupStage: normalizeSetupStage(config?.setupStage, "prerequisites"),
        connectionMode: normalizeConnectionMode(config?.connectionMode),
        lastHealthCheckAt: asIsoString(config?.lastHealthCheckAt),
        lastSetupError: typeof config?.lastSetupError === "string" ? config.lastSetupError : null,
    }
}

function sanitizePagesForClient(pages: MetaDiscoveryPage[]) {
    return pages.map(({ pageAccessToken: _pageAccessToken, ...page }) => page)
}

function deriveChannelStatus(
    channel: MetaChannelKey,
    origin: string,
    config: InstagramChannelConfig | MessengerChannelConfig | WhatsAppChannelConfig,
    fallbackConnected = false
): MetaChannelStatusPayload {
    const setupStatus =
        (config.setupStatus || "not_started") === "not_started"
            ? fallbackConnected || (config.enabled && config.webhookStatus === "connected")
                ? "live"
                : config.enabled || config.webhookStatus === "pending"
                  ? "draft"
                  : "not_started"
            : (config.setupStatus || "not_started")

    const setupStage =
        setupStatus === "live"
            ? "live"
            : setupStatus === "ready_for_live"
              ? "go_live"
              : config.setupStage || (config.enabled || config.webhookStatus === "pending" ? "draft" : "prerequisites")

    const readyForLive =
        setupStatus === "ready_for_live" ||
        (config.enabled &&
            Boolean(config.verifyToken) &&
            Boolean(config.accessTokenRef) &&
            (channel === "instagram"
                ? Boolean((config as InstagramChannelConfig).pageId && (config as InstagramChannelConfig).accountId)
                : channel === "messenger"
                  ? Boolean((config as MessengerChannelConfig).pageId)
                  : Boolean((config as WhatsAppChannelConfig).phoneNumberId)))

    return {
        enabled: config.enabled,
        connected: setupStatus === "live" || fallbackConnected || (config.enabled && config.webhookStatus === "connected"),
        setupStatus,
        setupStage,
        connectionMode: normalizeConnectionMode(config.connectionMode),
        webhookStatus: config.webhookStatus || "disconnected",
        webhookUrl: `${origin}/api/omni/channels/${channel}/webhook`,
        verifyToken: config.verifyToken || null,
        lastHealthCheckAt: config.lastHealthCheckAt || null,
        lastSetupError: config.lastSetupError || null,
        readyForLive,
        pageId: "pageId" in config ? config.pageId || null : undefined,
        accountId: "accountId" in config ? config.accountId || null : undefined,
        appId: "appId" in config ? config.appId || null : undefined,
        businessAccountId: "businessAccountId" in config ? config.businessAccountId || null : undefined,
        phoneNumberId: "phoneNumberId" in config ? config.phoneNumberId || null : undefined,
        displayNumber: "displayNumber" in config ? config.displayNumber || null : undefined,
    }
}

export function buildMetaSetupStatus(params: {
    origin: string
    omniConfig: any
    legacyIntegrations?: any
}): MetaSetupStatusPayload {
    const draft = sanitizeMetaSetupDraft(params.omniConfig?.metaSetup)
    const instagram = normalizeInstagramSetupConfig(params.omniConfig?.instagram)
    const messenger = normalizeMessengerSetupConfig(params.omniConfig?.messenger)
    const whatsapp = normalizeWhatsAppSetupConfig(params.omniConfig?.whatsapp)
    const legacyInstagramConnected = params.legacyIntegrations?.instagram?.connected === true
    const legacyMessengerConnected = params.legacyIntegrations?.messenger?.connected === true
    const legacyWhatsAppConnected = params.legacyIntegrations?.whatsapp?.connected === true

    const instagramStatus = deriveChannelStatus("instagram", params.origin, instagram, legacyInstagramConnected)
    const messengerStatus = deriveChannelStatus("messenger", params.origin, messenger, legacyMessengerConnected)
    const whatsappStatus = deriveChannelStatus("whatsapp", params.origin, whatsapp, legacyWhatsAppConnected)

    let stage = draft.stage || "prerequisites"
    const selectedChannels = draft.selectedChannels || ["instagram", "messenger", "whatsapp"]
    const selectedStates = selectedChannels.map((channel) =>
        channel === "instagram" ? instagramStatus : channel === "messenger" ? messengerStatus : whatsappStatus
    )

    if (selectedStates.length > 0 && selectedStates.every((channelStatus) => channelStatus.setupStatus === "live")) {
        stage = "live"
    } else if (selectedStates.some((channelStatus) => channelStatus.setupStatus === "ready_for_live")) {
        stage = "go_live"
    } else if (selectedStates.some((channelStatus) => channelStatus.setupStatus === "draft" || channelStatus.setupStatus === "error")) {
        stage = "draft"
    } else if (draft.secrets?.accessToken) {
        stage = "discovery"
    }

    return {
        wizard: {
            stage,
            selectedChannels,
            hasStoredAccessToken: Boolean(draft.secrets?.accessToken),
            hasStoredAppSecret: Boolean(draft.secrets?.appSecret),
            appId: draft.secrets?.appId || instagram.appId || messenger.appId || null,
            connectionMode: normalizeConnectionMode(
                draft.oauth?.connectionMode || messenger.connectionMode || instagram.connectionMode || whatsapp.connectionMode,
                "tenant_meta_app"
            ),
            discovery: {
                pages: sanitizePagesForClient(draft.discovery?.pages || []),
                whatsappBusinesses: draft.discovery?.whatsappBusinesses || [],
                errors: {
                    ...buildEmptyMetaErrors(),
                    ...(draft.discovery?.errors || {}),
                },
                discoveredAt: draft.discovery?.discoveredAt || null,
            },
        },
        channels: {
            instagram: instagramStatus,
            messenger: messengerStatus,
            whatsapp: whatsappStatus,
        },
    }
}

export function generateMetaVerifyToken() {
    return crypto.randomBytes(18).toString("hex")
}

function buildGraphUrl(pathname: string, accessToken: string, fields?: string) {
    const url = new URL(`https://graph.facebook.com/${META_API_VERSION}/${pathname.replace(/^\//, "")}`)
    url.searchParams.set("access_token", accessToken)
    if (fields) url.searchParams.set("fields", fields)
    return url
}

async function graphFetch(pathname: string, accessToken: string, fields?: string) {
    const response = await fetch(buildGraphUrl(pathname, accessToken, fields), { cache: "no-store" })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(payload?.error?.message || "Meta Graph API request failed")
    }
    return payload
}

function normalizeDiscoveryError(error: unknown, fallback: string) {
    const message = error instanceof Error ? error.message : ""
    if (!message) return fallback
    if (/permissions? error|permission/i.test(message)) return `${fallback} Yetki eksik olabilir: ${message}`
    if (/invalid oauth|session has expired|access token/i.test(message)) return `Access token dogrulanamadi: ${message}`
    return message
}

export async function discoverMetaPages(accessToken: string) {
    try {
        const payload = await graphFetch(
            "me/accounts",
            accessToken,
            "id,name,access_token,tasks,instagram_business_account{id,username,name}"
        )
        const pages = sanitizeDiscoveryPages(
            (payload?.data || []).map((page: any) => ({
                id: page?.id,
                name: page?.name,
                pageAccessToken: page?.access_token || null,
                messagingEligible: Array.isArray(page?.tasks) ? page.tasks.includes("MESSAGING") || page.tasks.includes("MANAGE") : true,
                instagramAccount: page?.instagram_business_account
                    ? {
                          id: page.instagram_business_account.id,
                          username: page.instagram_business_account.username || null,
                          name: page.instagram_business_account.name || null,
                      }
                    : null,
            }))
        )
        return { pages, error: null as string | null }
    } catch (error) {
        return {
            pages: [] as MetaDiscoveryPage[],
            error: normalizeDiscoveryError(error, "Meta sayfalari kesfedilemedi."),
        }
    }
}

async function fetchWhatsAppPhoneNumbers(accessToken: string, businessAccountId: string) {
    try {
        const payload = await graphFetch(
            `${encodeURIComponent(businessAccountId)}/phone_numbers`,
            accessToken,
            "id,display_phone_number,verified_name"
        )
        return sanitizeWhatsAppBusinesses([
            {
                id: businessAccountId,
                name: businessAccountId,
                phoneNumbers: (payload?.data || []).map((item: any) => ({
                    id: item?.id,
                    displayNumber: item?.display_phone_number || null,
                    verifiedName: item?.verified_name || null,
                })),
            },
        ])[0]?.phoneNumbers || []
    } catch {
        return []
    }
}

/**
 * Read the WABA IDs granted directly in the Facebook Login for Business consent
 * (including Meta-provided test WABAs) from the token's granular_scopes. These
 * frequently do NOT surface under me/businesses → owned_whatsapp_business_accounts,
 * so this is the reliable source for Business Login grants.
 */
async function fetchGrantedWabaIds(
    accessToken: string,
    appConfig?: { appId?: string; appSecret?: string }
): Promise<string[]> {
    if (!appConfig?.appId || !appConfig?.appSecret) return []
    try {
        const url = new URL(`https://graph.facebook.com/${META_API_VERSION}/debug_token`)
        url.searchParams.set("input_token", accessToken)
        url.searchParams.set("access_token", `${appConfig.appId}|${appConfig.appSecret}`)
        const response = await fetch(url, { cache: "no-store" })
        const payload = await response.json().catch(() => null)
        const scopes = payload?.data?.granular_scopes
        console.log("[WA discovery] debug_token granular_scopes:", JSON.stringify(scopes))
        if (!Array.isArray(scopes)) return []
        const ids = new Set<string>()
        for (const scope of scopes) {
            if (scope?.scope === "whatsapp_business_management" || scope?.scope === "whatsapp_business_messaging") {
                for (const target of Array.isArray(scope?.target_ids) ? scope.target_ids : []) {
                    const id = String(target || "").trim()
                    if (id) ids.add(id)
                }
            }
        }
        console.log("[WA discovery] granted WABA ids from debug_token:", Array.from(ids))
        return Array.from(ids)
    } catch (err) {
        console.warn("[WA discovery] debug_token failed:", err instanceof Error ? err.message : String(err))
        return []
    }
}

export async function discoverWhatsAppBusinesses(
    accessToken: string,
    appConfig?: { appId?: string; appSecret?: string }
) {
    try {
        const seen = new Set<string>()
        const results: MetaWhatsAppDiscoveryBusiness[] = []

        // 1) Classic path: businesses the user owns/manages, with their WABAs.
        const businessesPayload = await graphFetch(
            "me/businesses",
            accessToken,
            "id,name,owned_whatsapp_business_accounts{id,name},client_whatsapp_business_accounts{id,name}"
        )
        const rawBusinesses = Array.isArray(businessesPayload?.data) ? businessesPayload.data : []
        console.log("[WA discovery] me/businesses count:", rawBusinesses.length, "names:", rawBusinesses.map((b: any) => b?.name))
        for (const business of rawBusinesses) {
            const wabas = [
                ...(Array.isArray(business?.owned_whatsapp_business_accounts) ? business.owned_whatsapp_business_accounts : []),
                ...(Array.isArray(business?.client_whatsapp_business_accounts) ? business.client_whatsapp_business_accounts : []),
            ]
            for (const waba of wabas) {
                const id = String(waba?.id || "").trim()
                if (!id || seen.has(id)) continue
                seen.add(id)
                const phoneNumbers = await fetchWhatsAppPhoneNumbers(accessToken, id)
                results.push({
                    id,
                    name: typeof waba?.name === "string" && waba.name.trim() ? waba.name.trim() : `WABA ${id}`,
                    phoneNumbers,
                })
            }
        }

        // 2) Business Login grants: WABA IDs (incl. test WABAs) selected in the
        //    consent that aren't returned by me/businesses. Fetch each directly.
        const grantedIds = await fetchGrantedWabaIds(accessToken, appConfig)
        for (const id of grantedIds) {
            if (seen.has(id)) continue
            seen.add(id)
            let name = `WABA ${id}`
            try {
                const wabaInfo = await graphFetch(encodeURIComponent(id), accessToken, "id,name")
                if (typeof wabaInfo?.name === "string" && wabaInfo.name.trim()) name = wabaInfo.name.trim()
            } catch {
                // name lookup is best-effort
            }
            const phoneNumbers = await fetchWhatsAppPhoneNumbers(accessToken, id)
            results.push({ id, name, phoneNumbers })
        }

        console.log("[WA discovery] final WABA results:", results.map((r) => ({ id: r.id, phones: r.phoneNumbers.length })))
        return { businesses: sanitizeWhatsAppBusinesses(results), error: null as string | null }
    } catch (error) {
        console.warn("[WA discovery] error:", error instanceof Error ? error.message : String(error))
        return {
            businesses: [] as MetaWhatsAppDiscoveryBusiness[],
            error: normalizeDiscoveryError(error, "WhatsApp hesaplari kesfedilemedi."),
        }
    }
}

export async function discoverMetaAssets(accessToken: string): Promise<MetaDiscoveryResult> {
    console.log("[MetaDiscovery] Starting discovery with token sample:", accessToken.slice(0, 10) + "...")
    const [pageDiscovery, whatsapp] = await Promise.all([
        discoverMetaPages(accessToken),
        discoverWhatsAppBusinesses(accessToken),
    ])
    const pages = pageDiscovery.pages
    const messengerPages = pages.filter((page) => page.messagingEligible !== false)
    const instagramPages = pages.filter((page) => Boolean(page.instagramAccount))

    const messengerError = pageDiscovery.error || (messengerPages.length === 0 ? "Messenger için uygun, mesajlaşma yetkisi olan bir Facebook sayfası bulunamadı. Lütfen Facebook Login sırasında ilgili sayfayı seçtiğinizden emin olun." : null);
    const instagramError = pageDiscovery.error || (instagramPages.length === 0 ? "Instagram Business hesabına bağlı bir Facebook sayfası bulunamadı. Hesabınızın 'Professional' olduğundan ve bir sayfaya bağlı olduğundan emin olun." : null);

    return {
        pages,
        whatsappBusinesses: whatsapp.businesses,
        errors: {
            instagram: instagramError,
            messenger: messengerError,
            whatsapp:
                whatsapp.error ||
                (whatsapp.businesses.some((business) => business.phoneNumbers.length > 0)
                    ? null
                    : "WhatsApp numaralari otomatik kesfedilemedi. Advanced altindan manuel fallback kullanin."),
        },
    }
}

export function selectInstagramPage(discovery: MetaSetupDraftState["discovery"], pageId: string) {
    return (discovery?.pages || []).find((page) => page.id === pageId && page.instagramAccount) || null
}

export function selectMessengerPage(discovery: MetaSetupDraftState["discovery"], pageId: string) {
    return (discovery?.pages || []).find((page) => page.id === pageId && page.messagingEligible !== false) || null
}

export function selectWhatsAppPhone(discovery: MetaSetupDraftState["discovery"], businessAccountId: string, phoneNumberId: string) {
    const business = (discovery?.whatsappBusinesses || []).find((item) => item.id === businessAccountId) || null
    const phoneNumber = business?.phoneNumbers.find((item) => item.id === phoneNumberId) || null
    return { business, phoneNumber }
}

export function autoSelectMetaAssets(discovery: MetaDiscoveryResult, selectedChannels: MetaChannelKey[]): MetaAutoSelectionResult {
    const pages = discovery.pages || []
    const instagramPages = pages.filter((page) => Boolean(page.instagramAccount))
    const messengerPages = pages.filter((page) => page.messagingEligible !== false)
    const sharedPage =
        messengerPages.find((page) => Boolean(page.instagramAccount)) ||
        instagramPages.find((page) => page.messagingEligible !== false) ||
        null
    const instagramPage =
        selectedChannels.includes("instagram")
            ? sharedPage?.instagramAccount
                ? sharedPage
                : instagramPages[0] || null
            : null
    const messengerPage =
        selectedChannels.includes("messenger")
            ? sharedPage?.messagingEligible !== false
                ? sharedPage
                : messengerPages[0] || null
            : null
    const whatsappBusiness =
        selectedChannels.includes("whatsapp")
            ? discovery.whatsappBusinesses.find((business) => business.phoneNumbers.length > 0) || discovery.whatsappBusinesses[0] || null
            : null
    const whatsappPhone = whatsappBusiness?.phoneNumbers[0] || null
    return {
        instagramPage,
        messengerPage,
        whatsappBusiness,
        whatsappPhone,
    }
}

export function buildMetaSetupMergePayload(input: {
    currentConfig: any
    channels: Partial<Record<MetaChannelKey, Partial<InstagramChannelConfig & MessengerChannelConfig & WhatsAppChannelConfig>>>
    stage?: MetaWizardStage
    selectedChannels?: MetaChannelKey[]
    discovery?: MetaSetupDraftState["discovery"]
    secrets?: MetaSetupDraftState["secrets"]
    oauth?: MetaSetupDraftState["oauth"]
}) {
    const currentDraft = sanitizeMetaSetupDraft(input.currentConfig?.metaSetup)
    const mergedErrors = {
        ...buildEmptyMetaErrors(),
        ...(currentDraft.discovery?.errors || {}),
        ...(input.discovery?.errors || {}),
    }

    return {
        metaSetup: {
            stage: input.stage || currentDraft.stage,
            selectedChannels: input.selectedChannels || currentDraft.selectedChannels,
            discovery: {
                pages: input.discovery?.pages || currentDraft.discovery?.pages || [],
                whatsappBusinesses: input.discovery?.whatsappBusinesses || currentDraft.discovery?.whatsappBusinesses || [],
                errors: mergedErrors,
                discoveredAt: input.discovery?.discoveredAt || currentDraft.discovery?.discoveredAt || new Date().toISOString(),
            },
            secrets: {
                accessToken: input.secrets?.accessToken ?? currentDraft.secrets?.accessToken ?? null,
                appSecret: input.secrets?.appSecret ?? currentDraft.secrets?.appSecret ?? null,
                appId: input.secrets?.appId ?? currentDraft.secrets?.appId ?? null,
            },
            oauth: {
                lastConnectedAt: input.oauth?.lastConnectedAt ?? currentDraft.oauth?.lastConnectedAt ?? null,
                lastConnectedBy: input.oauth?.lastConnectedBy ?? currentDraft.oauth?.lastConnectedBy ?? null,
                connectionMode: normalizeConnectionMode(input.oauth?.connectionMode ?? currentDraft.oauth?.connectionMode ?? "tenant_meta_app"),
            },
            updatedAt: new Date().toISOString(),
        },
        ...input.channels,
    }
}

export async function runMetaHealthCheck(req: Request, channel: MetaChannelKey, chatbotId: string) {
    const url = new URL(`/api/omni/channels/${channel}/health`, req.url)
    const response = await fetch(url, {
        method: "POST",
        headers: {
            authorization: req.headers.get("authorization") || "",
            "content-type": "application/json",
        },
        body: JSON.stringify({ chatbotId }),
        cache: "no-store",
    })

    const payload = await response.json().catch(() => null)
    const errorMsg = payload?.message || payload?.error || (response.ok ? "OK" : `Meta API hatası (HTTP ${response.status})`);
    
    return {
        ok: response.ok && payload?.ok !== false,
        status: response.status,
        payload,
        message: errorMsg,
    }
}

export function isMetaPlatformAppAvailable(): boolean {
    return getMissingMetaPlatformEnvVars().length === 0
}

export function getMetaPlatformAppConfig(): MetaPlatformAppConfig {
    const missing = getMissingMetaPlatformEnvVars()
    const appId = process.env.META_APP_ID || process.env.INSTAGRAM_APP_ID || ""
    const appSecret = process.env.META_APP_SECRET || process.env.INSTAGRAM_APP_SECRET || process.env.WHATSAPP_APP_SECRET || ""
    const verifyToken =
        process.env.META_WEBHOOK_VERIFY_TOKEN ||
        process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ||
        process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
        ""

    if (missing.length > 0) {
        throw new Error(`Meta OAuth platform app ortam degiskenleri eksik: ${missing.join(", ")}`)
    }

    return { appId, appSecret, verifyToken }
}

export function resolveMetaOAuthAppConfig(overrides?: MetaOAuthAppConfigOverrides): MetaPlatformAppConfig {
    const overrideAppId = overrides?.appId?.trim()
    const overrideAppSecret = overrides?.appSecret?.trim()
    const overrideVerifyToken = overrides?.verifyToken?.trim()

    if (overrideAppId && overrideAppSecret && overrideVerifyToken) {
        return {
            appId: overrideAppId,
            appSecret: overrideAppSecret,
            verifyToken: overrideVerifyToken,
        }
    }

    if (!isMetaPlatformAppAvailable()) {
        throw new Error("Meta entegrasyonu için gerekli uygulama bilgileri (App ID / App Secret) bulunamadı. Lütfen Meta platform ayarlarını kontrol edin veya bu chatbot için kendi uygulama bilgilerinizi girin.")
    }

    return getMetaPlatformAppConfig()
}

export function buildMetaOAuthUrl(params: {
    origin: string
    state: string
    appConfig?: MetaOAuthAppConfigOverrides
    selectedChannels?: MetaChannelKey[]
}) {
    const platform = resolveMetaOAuthAppConfig(params.appConfig)
    const redirectUri = `${params.origin}/api/integrations/meta/callback`
    const authUrl = new URL("https://www.facebook.com/v23.0/dialog/oauth")
    authUrl.searchParams.set("client_id", platform.appId)
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("state", params.state)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("scope", buildMetaOAuthScopes(params.selectedChannels).join(","))
    return authUrl.toString()
}

export async function exchangeMetaCodeForAccessToken(params: {
    origin: string
    code: string
    appConfig?: MetaOAuthAppConfigOverrides
}) {
    const platform = resolveMetaOAuthAppConfig(params.appConfig)
    const redirectUri = `${params.origin}/api/integrations/meta/callback`
    const tokenUrl = new URL(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`)
    tokenUrl.searchParams.set("client_id", platform.appId)
    tokenUrl.searchParams.set("client_secret", platform.appSecret)
    tokenUrl.searchParams.set("redirect_uri", redirectUri)
    tokenUrl.searchParams.set("code", params.code)

    const response = await fetch(tokenUrl, { cache: "no-store" })
    const payload = await response.json().catch(() => null)
    console.log("[MetaOAuth] Token exchange response:", { ok: response.ok, status: response.status, payload })
    if (!response.ok || !payload?.access_token) {
        throw new Error(payload?.error?.message || "Meta OAuth token exchange basarisiz.")
    }
    const shortLivedToken = String(payload.access_token)
    const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : null

    const longLived = await exchangeMetaShortLivedForLongLivedToken({
        shortLivedToken,
        appConfig: params.appConfig,
    }).catch(() => null)

    return {
        accessToken: longLived?.accessToken || shortLivedToken,
        expiresIn: longLived?.expiresIn ?? expiresIn,
        tokenType: longLived ? "long_lived" : "short_lived",
    }
}

export async function exchangeMetaShortLivedForLongLivedToken(params: {
    shortLivedToken: string
    appConfig?: MetaOAuthAppConfigOverrides
}) {
    const platform = resolveMetaOAuthAppConfig(params.appConfig)
    const url = new URL(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`)
    url.searchParams.set("grant_type", "fb_exchange_token")
    url.searchParams.set("client_id", platform.appId)
    url.searchParams.set("client_secret", platform.appSecret)
    url.searchParams.set("fb_exchange_token", params.shortLivedToken)

    const response = await fetch(url, { cache: "no-store" })
    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.access_token) {
        throw new Error(payload?.error?.message || "Meta long-lived token exchange basarisiz.")
    }
    return {
        accessToken: String(payload.access_token),
        expiresIn: typeof payload.expires_in === "number" ? payload.expires_in : null,
    }
}

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function retryableFetch(label: string, requestFn: () => Promise<Response>) {
    let lastError: Error | null = null
    for (let attempt = 0; attempt < META_SUBSCRIBE_RETRY_MAX; attempt++) {
        try {
            const response = await requestFn()
            const payload = await response.json().catch(() => null)
            if (response.ok && payload?.success !== false) {
                return payload
            }
            const message = payload?.error?.message || `${label} basarisiz (HTTP ${response.status}).`
            const code = payload?.error?.code
            const isPermissionError = code === 10 || code === 200 || code === 190
            if (isPermissionError) {
                throw new Error(message)
            }
            lastError = new Error(message)
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))
            const permanent = /permission|invalid oauth|access token/i.test(lastError.message)
            if (permanent) throw lastError
        }
        if (attempt < META_SUBSCRIBE_RETRY_MAX - 1) {
            await sleep(META_SUBSCRIBE_RETRY_BASE_MS * Math.pow(2, attempt))
        }
    }
    throw lastError || new Error(`${label} basarisiz.`)
}

export async function subscribeMetaAppToPage(pageId: string, accessToken: string) {
    console.log("[MetaSubscribe] Subscribing app to page:", pageId)
    await retryableFetch("Page subscribed_apps", () =>
        fetch(`https://graph.facebook.com/${META_API_VERSION}/${encodeURIComponent(pageId)}/subscribed_apps`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                subscribed_fields: ["messages", "messaging_postbacks", "message_reads", "message_deliveries"],
            }),
        })
    ).then(res => console.log("[MetaSubscribe] Page subscription success:", res))
    .catch(err => console.error("[MetaSubscribe] Page subscription failed:", err))
}

export async function subscribeMetaAppToWhatsAppBusiness(businessAccountId: string, accessToken: string) {
    await retryableFetch("WhatsApp subscribed_apps", () =>
        fetch(
            `https://graph.facebook.com/${META_API_VERSION}/${encodeURIComponent(businessAccountId)}/subscribed_apps`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({}),
            }
        )
    )
}

export function resolveReturnPath(input?: string | null) {
    const value = String(input || "").trim()
    if (!value.startsWith("/")) return "/console/chatbot/integration"
    return value
}
