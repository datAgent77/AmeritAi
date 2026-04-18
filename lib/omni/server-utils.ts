import crypto from "crypto"
import { NextResponse } from "next/server"
import { authorizeTargetAccess } from "@/lib/api-auth"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { normalizeVoiceIntegrationConfig as normalizeVoiceIntegrationConfigValue } from "@/lib/omni/voice-config"
import { hasOmniPermissionOrDefault, resolveOmniPermissions, type OmniPermission } from "@/lib/omni/permissions"
import { resolveOmniWorkspaceEnabled } from "@/lib/omni/workspace-access"
import type { GuidedSkillState } from "@/lib/guided-skills/types"
import { isAgencyAdminRole, isSuperAdminRole, isTenantAdminRole, type UserRole } from "@/lib/user-roles"
import type {
    CallbackPriority,
    CallbackRequestRecord,
    CallbackRequestStatus,
    CallbackResolutionStatus,
    ContactGraphRecord,
    ContactAliasRecord,
    OmniChannel,
    VoiceIntegrationConfig,
} from "@/lib/omni/types"

type AuthorizedOmniRequest =
      | {
          ok: true
          adminDb: any
          callerUid: string
          callerRole: UserRole
          callerPermissions: OmniPermission[]
          isSuperAdmin: boolean
          isAgencyAdmin: boolean
      }
    | {
          ok: false
          response: Response
      }

type AuthorizedOmniDirectoryRequest =
      | {
          ok: true
          adminDb: any
          callerUid: string
          callerRole: UserRole
          callerPermissions: OmniPermission[]
          isSuperAdmin: boolean
          isAgencyAdmin: boolean
          isTenantAdmin: boolean
      }
    | {
          ok: false
          response: Response
      }

export function jsonError(message: string, status: number) {
    return NextResponse.json({ error: message }, { status })
}

export async function authorizeOmniRequest(req: Request, chatbotId: string): Promise<AuthorizedOmniRequest> {
    const adminDb = getAdminDb()
    if (!adminDb) {
        return {
            ok: false,
            response: jsonError("Firebase Admin SDK not initialized", 500),
        }
    }

    const authz = await authorizeTargetAccess(req, chatbotId)
    if (!authz.ok) {
        return authz
    }

    const callerSnapshot = await adminDb.collection("users").doc(authz.callerUid).get()
    const callerData = callerSnapshot.exists ? callerSnapshot.data() || {} : {}
    const callerRoleRaw = callerData.role || "USER"
    const callerRole = isSuperAdminRole(callerRoleRaw)
        ? "SUPER_ADMIN"
        : isAgencyAdminRole(callerRoleRaw)
          ? "AGENCY_ADMIN"
          : isTenantAdminRole(callerRoleRaw)
            ? "TENANT_ADMIN"
            : "USER"
    const callerPermissions = resolveOmniPermissions(callerRole, callerData.omniPermissions, callerData.omniDeniedPermissions)

    if (!authz.isSuperAdmin) {
        const targetSnapshot =
            authz.callerUid === chatbotId ? callerSnapshot : await adminDb.collection("users").doc(chatbotId).get()
        const targetData = targetSnapshot.exists ? targetSnapshot.data() : null
        const omniEnabled = resolveOmniWorkspaceEnabled(targetData, authz.isSuperAdmin ? "SUPER_ADMIN" : undefined)

        if (!omniEnabled) {
            return {
                ok: false,
                response: jsonError("Omni Channel not enabled", 403),
            }
        }
    }

    return {
        ok: true,
        adminDb,
        callerUid: authz.callerUid,
        callerRole,
        callerPermissions,
        isSuperAdmin: authz.isSuperAdmin,
        isAgencyAdmin: authz.isAgencyAdmin,
    }
}

export async function authorizeOmniDirectoryRequest(req: Request): Promise<AuthorizedOmniDirectoryRequest> {
    const adminAuth = getAdminAuth()
    const adminDb = getAdminDb()

    if (!adminAuth || !adminDb) {
        return {
            ok: false,
            response: jsonError("Firebase Admin SDK not initialized", 500),
        }
    }

    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
        return {
            ok: false,
            response: jsonError("Unauthorized", 401),
        }
    }

    const token = authHeader.split("Bearer ")[1]

    let decodedToken: any
    try {
        decodedToken = await adminAuth.verifyIdToken(token)
    } catch {
        return {
            ok: false,
            response: jsonError("Unauthorized", 401),
        }
    }

    const callerUid = decodedToken.uid
    const callerDoc = await adminDb.collection("users").doc(callerUid).get()
    const callerData = callerDoc.exists ? callerDoc.data() || {} : {}
    const callerRoleRaw = callerData.role || decodedToken.role || "USER"
    const callerRole = isSuperAdminRole(callerRoleRaw)
        ? "SUPER_ADMIN"
        : isAgencyAdminRole(callerRoleRaw)
          ? "AGENCY_ADMIN"
          : isTenantAdminRole(callerRoleRaw)
            ? "TENANT_ADMIN"
            : "USER"

    return {
        ok: true,
        adminDb,
        callerUid,
        callerRole,
        callerPermissions: resolveOmniPermissions(callerRole, callerData.omniPermissions, callerData.omniDeniedPermissions),
        isSuperAdmin: callerRole === "SUPER_ADMIN",
        isAgencyAdmin: callerRole === "AGENCY_ADMIN",
        isTenantAdmin: callerRole === "TENANT_ADMIN",
    }
}

export function authorizedForOmniPermission(
    authz: { callerPermissions?: OmniPermission[]; callerRole?: UserRole },
    permission: OmniPermission
) {
    const permissions =
        authz.callerPermissions ||
        (authz.callerRole ? resolveOmniPermissions(authz.callerRole, undefined, undefined) : undefined)
    return hasOmniPermissionOrDefault(permissions, permission)
}

export function toMillis(value: any): number {
    if (!value) return 0
    if (typeof value === "string" || typeof value === "number" || value instanceof Date) {
        const parsed = new Date(value).getTime()
        return Number.isFinite(parsed) ? parsed : 0
    }
    if (typeof value?.toDate === "function") {
        return value.toDate().getTime()
    }
    if (typeof value?._seconds === "number") {
        return value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1_000_000)
    }
    if (typeof value?.seconds === "number") {
        return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1_000_000)
    }
    return 0
}

export function toIsoOrNull(value: any): string | null {
    const millis = toMillis(value)
    if (!millis) return null
    return new Date(millis).toISOString()
}

export function normalizePhoneNumber(value?: string | null) {
    if (!value) return null
    const cleaned = value.replace(/[^\d+]/g, "")
    return cleaned || null
}

type ContactAliasInput = {
    aliasType: string
    aliasValue: string
    verified?: boolean
    sourceChannel?: OmniChannel | null
}

function uniqueStrings(values: Array<string | null | undefined>) {
    return Array.from(new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))) as string[]
}

function sanitizeDocSegment(value?: string | null, fallback = "unknown") {
    const normalized = String(value || "").trim()
    if (!normalized) return fallback
    return normalized.replace(/[^a-zA-Z0-9+@._:-]/g, "-")
}

function sanitizeAliasType(value?: string | null) {
    const normalized = String(value || "").trim().toLowerCase()
    if (!normalized) return "contact_key"
    return normalized.replace(/[^a-z0-9:_-]/g, "-")
}

export function normalizeContactAliasValue(aliasType: string, value?: string | null) {
    if (value === undefined || value === null) return null
    const raw = String(value).trim()
    if (!raw) return null

    const normalizedType = sanitizeAliasType(aliasType)

    if (normalizedType === "phone" || normalizedType === "whatsapp" || normalizedType === "voice") {
        return normalizePhoneNumber(raw) || raw
    }

    if (normalizedType === "email") {
        return raw.toLowerCase()
    }

    if (normalizedType === "contact_key") {
        return normalizePhoneNumber(raw) || raw.toLowerCase()
    }

    return raw.toLowerCase()
}

export function buildContactAliasDocId(chatbotId: string, aliasType: string, aliasValue?: string | null) {
    const normalized = normalizeContactAliasValue(aliasType, aliasValue)
    if (!normalized) return null
    return `${chatbotId}:alias:${sanitizeAliasType(aliasType)}:${sanitizeDocSegment(normalized)}`
}

function buildCanonicalContactDocId(params: {
    chatbotId: string
    verifiedPhone?: string | null
    whatsappNumber?: string | null
    email?: string | null
    channel: OmniChannel
    contactKey?: string | null
    instagramHandle?: string | null
}) {
    const verifiedPhone = normalizePhoneNumber(params.verifiedPhone)
    if (verifiedPhone) {
        return `${params.chatbotId}:phone:${sanitizeDocSegment(verifiedPhone)}`
    }

    const whatsappNumber = normalizePhoneNumber(params.whatsappNumber)
    if (whatsappNumber) {
        return `${params.chatbotId}:phone:${sanitizeDocSegment(whatsappNumber)}`
    }

    if (params.email) {
        return `${params.chatbotId}:email:${sanitizeDocSegment(params.email.toLowerCase())}`
    }

    if (params.instagramHandle) {
        return `${params.chatbotId}:instagram:${sanitizeDocSegment(params.instagramHandle.toLowerCase())}`
    }

    const stableKey = sanitizeDocSegment(params.contactKey || "unknown")
    return `${params.chatbotId}:${params.channel}:${stableKey}`
}

function buildContactAliasInputs(params: {
    channel?: OmniChannel | null
    contactKey?: string | null
    verifiedPhone?: string | null
    whatsappNumber?: string | null
    email?: string | null
    instagramHandle?: string | null
    aliases?: ContactAliasInput[]
}) {
    const items: ContactAliasInput[] = []

    if (params.contactKey) {
        items.push({
            aliasType: "contact_key",
            aliasValue: params.contactKey,
            sourceChannel: params.channel || null,
        })
        if (params.channel) {
            items.push({
                aliasType: `channel:${params.channel}`,
                aliasValue: params.contactKey,
                sourceChannel: params.channel,
            })
        }
    }

    if (params.verifiedPhone) {
        items.push({
            aliasType: "phone",
            aliasValue: params.verifiedPhone,
            verified: true,
            sourceChannel: params.channel || null,
        })
    }

    if (params.whatsappNumber) {
        items.push({
            aliasType: "whatsapp",
            aliasValue: params.whatsappNumber,
            sourceChannel: params.channel || null,
        })
        items.push({
            aliasType: "phone",
            aliasValue: params.whatsappNumber,
            sourceChannel: params.channel || null,
        })
    }

    if (params.email) {
        items.push({
            aliasType: "email",
            aliasValue: params.email,
            verified: true,
            sourceChannel: params.channel || null,
        })
    }

    if (params.instagramHandle) {
        items.push({
            aliasType: "instagram",
            aliasValue: params.instagramHandle,
            sourceChannel: params.channel || null,
        })
    }

    for (const alias of params.aliases || []) {
        if (!alias?.aliasType || !alias?.aliasValue) continue
        items.push({
            aliasType: alias.aliasType,
            aliasValue: alias.aliasValue,
            verified: alias.verified,
            sourceChannel: alias.sourceChannel ?? params.channel ?? null,
        })
    }

    const deduped = new Map<string, ContactAliasInput>()
    for (const item of items) {
        const normalizedValue = normalizeContactAliasValue(item.aliasType, item.aliasValue)
        if (!normalizedValue) continue
        const key = `${sanitizeAliasType(item.aliasType)}:${normalizedValue}`
        const existing = deduped.get(key)
        deduped.set(key, {
            aliasType: item.aliasType,
            aliasValue: normalizedValue,
            verified: item.verified || existing?.verified || false,
            sourceChannel: item.sourceChannel ?? existing?.sourceChannel ?? null,
        })
    }

    return Array.from(deduped.values())
}

function serializeContactGraphRecord(id: string, data: Record<string, any>): ContactGraphRecord {
    return {
        id,
        chatbotId: String(data.chatbotId || ""),
        canonicalContactId: data.canonicalContactId || id,
        displayName: data.displayName || null,
        verifiedPhone: data.verifiedPhone || null,
        whatsappNumber: data.whatsappNumber || null,
        email: data.email || null,
        instagramHandle: data.instagramHandle || null,
        linkedChannels: Array.isArray(data.linkedChannels) ? data.linkedChannels : [],
        contactKey: data.contactKey || null,
        matchingStrategy: data.matchingStrategy || "channel_handle",
        notes: data.notes || null,
        manualMergeReview: data.manualMergeReview ?? false,
        mergedInto: data.mergedInto || null,
        linkedContactIds: Array.isArray(data.linkedContactIds) ? data.linkedContactIds : [],
        linkedContactKeys: Array.isArray(data.linkedContactKeys) ? data.linkedContactKeys : [],
        createdAt: toIsoOrNull(data.createdAt),
        updatedAt: toIsoOrNull(data.updatedAt),
        lastInteractionAt: toIsoOrNull(data.lastInteractionAt),
    }
}

async function getContactGraphRecordById(adminDb: any, id?: string | null): Promise<ContactGraphRecord | null> {
    if (!id) return null
    const snapshot = await adminDb.collection("contact_graph").doc(id).get()
    if (!snapshot.exists) return null
    return serializeContactGraphRecord(snapshot.id, snapshot.data() || {})
}

async function resolveCanonicalContactRecord(adminDb: any, contactId?: string | null): Promise<ContactGraphRecord | null> {
    let currentId = contactId || null
    const visited = new Set<string>()

    while (currentId && !visited.has(currentId)) {
        visited.add(currentId)
        const current = await getContactGraphRecordById(adminDb, currentId)
        if (!current) return null
        if (!current.mergedInto || current.mergedInto === currentId) {
            return current
        }
        currentId = current.mergedInto
    }

    return null
}

async function upsertContactAliasDocs(adminDb: any, params: {
    chatbotId: string
    canonicalContactId: string
    aliases: ContactAliasInput[]
    sourceChannel?: OmniChannel | null
}) {
    await Promise.all(
        params.aliases.map(async (alias) => {
            const docId = buildContactAliasDocId(params.chatbotId, alias.aliasType, alias.aliasValue)
            const normalizedValue = normalizeContactAliasValue(alias.aliasType, alias.aliasValue)
            if (!docId || !normalizedValue) return

            const docRef = adminDb.collection("contact_aliases").doc(docId)
            const snapshot = await docRef.get()
            const existing = snapshot.exists ? snapshot.data() || {} : {}
            const payload: ContactAliasRecord = {
                id: docId,
                chatbotId: params.chatbotId,
                aliasType: sanitizeAliasType(alias.aliasType),
                aliasValue: normalizedValue,
                canonicalContactId: params.canonicalContactId,
                sourceChannel: alias.sourceChannel ?? params.sourceChannel ?? existing.sourceChannel ?? null,
                verified: alias.verified || existing.verified || false,
                createdAt: toIsoOrNull(existing.createdAt) || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }

            await docRef.set(
                sanitizeObject({
                    chatbotId: payload.chatbotId,
                    aliasType: payload.aliasType,
                    aliasValue: payload.aliasValue,
                    canonicalContactId: payload.canonicalContactId,
                    sourceChannel: payload.sourceChannel,
                    verified: payload.verified,
                    createdAt: existing.createdAt || new Date(),
                    updatedAt: new Date(),
                }),
                { merge: true }
            )
        })
    )
}

export async function resolveOmniContactIdentity(
    adminDb: any,
    params: {
        chatbotId: string
        canonicalContactId?: string | null
        channel?: OmniChannel | null
        contactKey?: string | null
        verifiedPhone?: string | null
        whatsappNumber?: string | null
        email?: string | null
        instagramHandle?: string | null
        aliases?: ContactAliasInput[]
    }
) {
    if (params.canonicalContactId) {
        const direct = await resolveCanonicalContactRecord(adminDb, params.canonicalContactId)
        if (direct) {
            return {
                canonicalContactId: direct.id || params.canonicalContactId,
                contact: direct,
                aliases: buildContactAliasInputs(params),
            }
        }
    }

    const aliases = buildContactAliasInputs(params)
    for (const alias of aliases) {
        const docId = buildContactAliasDocId(params.chatbotId, alias.aliasType, alias.aliasValue)
        if (!docId) continue
        const snapshot = await adminDb.collection("contact_aliases").doc(docId).get()
        if (!snapshot.exists) continue
        const data = snapshot.data() || {}
        const canonical = await resolveCanonicalContactRecord(adminDb, data.canonicalContactId || null)
        if (canonical) {
            return {
                canonicalContactId: canonical.id || data.canonicalContactId || null,
                contact: canonical,
                aliases,
            }
        }
    }

    return {
        canonicalContactId: null,
        contact: null,
        aliases,
    }
}

export function sanitizeObject<T extends Record<string, any>>(value: T): T {
    return Object.fromEntries(Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)) as T
}

export function maskSecret(value?: string | null) {
    if (!value) return null
    if (value.length <= 8) return "********"
    return `${value.slice(0, 4)}...${value.slice(-4)}`
}

export function timingSafeEqualString(left?: string | null, right?: string | null) {
    if (!left || !right) return false
    const leftBuffer = Buffer.from(left)
    const rightBuffer = Buffer.from(right)
    if (leftBuffer.length !== rightBuffer.length) return false
    return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

export function getRequestOrigin(req: Request) {
    const forwardedProto = req.headers.get("x-forwarded-proto")
    const forwardedHost = req.headers.get("x-forwarded-host")
    if (forwardedProto && forwardedHost) {
        return `${forwardedProto}://${forwardedHost}`
    }

    const host = req.headers.get("host")
    if (host) {
        const protocol = host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https"
        return `${protocol}://${host}`
    }

    return new URL(req.url).origin
}

export function getPublicRequestUrl(req: Request) {
    const url = new URL(req.url)
    return `${getRequestOrigin(req)}${url.pathname}${url.search}`
}

export function verifyMetaWebhookSignature(rawBody: string, signatureHeader: string | null, appSecret: string) {
    if (!signatureHeader?.startsWith("sha256=") || !appSecret) {
        return false
    }

    const providedSignature = signatureHeader.slice("sha256=".length)
    const expectedSignature = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")
    return timingSafeEqualString(providedSignature, expectedSignature)
}

export function verifyTwilioWebhookSignature(params: {
    requestUrl: string
    formEntries: Array<[string, string]>
    signatureHeader: string | null
    authToken: string
}) {
    if (!params.signatureHeader || !params.authToken) {
        return false
    }

    const payload = params.formEntries
        .slice()
        .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
            if (leftKey === rightKey) {
                return leftValue.localeCompare(rightValue)
            }
            return leftKey.localeCompare(rightKey)
        })
        .reduce((accumulator, [key, value]) => `${accumulator}${key}${value}`, params.requestUrl)

    const expectedSignature = crypto.createHmac("sha1", params.authToken).update(payload).digest("base64")
    return timingSafeEqualString(params.signatureHeader, expectedSignature)
}

export function appendMessage(existingMessages: any[], message?: Record<string, unknown> | null) {
    if (!message) return existingMessages

    const externalId = message.externalId
    const messageId = message.id

    const alreadyExists = existingMessages.some((existingMessage: any) => {
        if (externalId && existingMessage.externalId) {
            return existingMessage.externalId === externalId
        }
        if (messageId && existingMessage.id) {
            return existingMessage.id === messageId
        }
        return false
    })

    return alreadyExists ? existingMessages : [...existingMessages, message]
}

export async function upsertContactGraph(
    adminDb: any,
    params: {
        chatbotId: string
        channel: OmniChannel
        canonicalContactId?: string | null
        contactKey?: string | null
        displayName?: string | null
        verifiedPhone?: string | null
        whatsappNumber?: string | null
        email?: string | null
        instagramHandle?: string | null
        aliases?: ContactAliasInput[]
        notes?: string | null
        manualMergeReview?: boolean
    }
): Promise<ContactGraphRecord> {
    const identity = await resolveOmniContactIdentity(adminDb, {
        chatbotId: params.chatbotId,
        canonicalContactId: params.canonicalContactId || null,
        channel: params.channel,
        contactKey: params.contactKey,
        verifiedPhone: params.verifiedPhone,
        whatsappNumber: params.whatsappNumber,
        email: params.email,
        instagramHandle: params.instagramHandle,
        aliases: params.aliases,
    })
    const aliases = identity.aliases
    const docId =
        params.canonicalContactId ||
        identity.canonicalContactId ||
        buildCanonicalContactDocId({
            chatbotId: params.chatbotId,
            verifiedPhone: params.verifiedPhone,
            whatsappNumber: params.whatsappNumber,
            email: params.email,
            channel: params.channel,
            contactKey: params.contactKey,
            instagramHandle: params.instagramHandle,
        })
    const docRef = adminDb.collection("contact_graph").doc(docId)
    const snapshot = await docRef.get()
    const existing = snapshot.exists ? snapshot.data() || {} : {}
    const now = new Date()
    const linkedChannels = Array.from(new Set([...(existing.linkedChannels || []), params.channel]))

    const matchingStrategy = normalizePhoneNumber(params.verifiedPhone)
        ? "verified_phone"
        : normalizePhoneNumber(params.whatsappNumber)
          ? "whatsapp_number"
          : params.email
            ? "email"
            : "channel_handle"

    const nextRecord = sanitizeObject({
        chatbotId: params.chatbotId,
        canonicalContactId: docId,
        contactKey:
            params.contactKey ||
            existing.contactKey ||
            normalizePhoneNumber(params.verifiedPhone || params.whatsappNumber || null) ||
            (params.email ? params.email.toLowerCase() : null) ||
            params.instagramHandle ||
            null,
        displayName: params.displayName || existing.displayName || null,
        verifiedPhone: normalizePhoneNumber(params.verifiedPhone) || existing.verifiedPhone || null,
        whatsappNumber: normalizePhoneNumber(params.whatsappNumber) || existing.whatsappNumber || null,
        email: params.email || existing.email || null,
        instagramHandle: params.instagramHandle || existing.instagramHandle || null,
        linkedChannels,
        linkedContactIds: existing.linkedContactIds || [],
        linkedContactKeys: uniqueStrings([
            ...(existing.linkedContactKeys || []),
            ...aliases.map((alias) => alias.aliasValue),
            params.contactKey || null,
            normalizePhoneNumber(params.verifiedPhone || null),
            normalizePhoneNumber(params.whatsappNumber || null),
            params.email ? params.email.toLowerCase() : null,
            params.instagramHandle || null,
        ]),
        mergedInto: existing.mergedInto || null,
        matchingStrategy: matchingStrategy as ContactGraphRecord["matchingStrategy"],
        notes: params.notes ?? existing.notes ?? null,
        manualMergeReview:
            params.manualMergeReview ??
            existing.manualMergeReview ??
            (identity.canonicalContactId && identity.canonicalContactId !== docId ? true : false),
        createdAt: existing.createdAt || now,
        updatedAt: now,
        lastInteractionAt: now,
    })

    await docRef.set(nextRecord, { merge: true })

    await upsertContactAliasDocs(adminDb, {
        chatbotId: params.chatbotId,
        canonicalContactId: docId,
        aliases,
        sourceChannel: params.channel,
    })

    return serializeContactGraphRecord(docId, nextRecord)
}

export async function upsertOmniSession(
    adminDb: any,
    params: {
        sessionId: string
        chatbotId: string
        channel: OmniChannel
        contactKey?: string | null
        canonicalContactId?: string | null
        channelMeta?: Record<string, unknown> | null
        visitorName?: string | null
        visitorEmail?: string | null
        message?: Record<string, unknown> | null
        transcriptSummary?: string | null
        lastDisposition?: string | null
        assistantProfileId?: string | null
        handoffStatus?: string | null
        guidedSkillState?: GuidedSkillState | null
    }
) {
    const sessionRef = adminDb.collection("chat_sessions").doc(params.sessionId)
    const snapshot = await sessionRef.get()
    const existing = snapshot.exists ? snapshot.data() || {} : {}
    const existingMessages = Array.isArray(existing.messages) ? existing.messages : []
    const nextMessages = appendMessage(existingMessages, params.message)

    await sessionRef.set(
        sanitizeObject({
            chatbotId: params.chatbotId,
            channel: params.channel,
            contactKey: params.contactKey || existing.contactKey || null,
            canonicalContactId: params.canonicalContactId ?? existing.canonicalContactId ?? null,
            channelMeta: {
                ...(existing.channelMeta || {}),
                ...(params.channelMeta || {}),
            },
            visitorName: params.visitorName || existing.visitorName || null,
            visitorEmail: params.visitorEmail || existing.visitorEmail || null,
            assistantProfileId: params.assistantProfileId || existing.assistantProfileId || null,
            transcriptSummary: params.transcriptSummary ?? existing.transcriptSummary ?? null,
            handoffStatus: params.handoffStatus ?? existing.handoffStatus ?? null,
            lastDisposition: params.lastDisposition ?? existing.lastDisposition ?? null,
            guidedSkillState: params.guidedSkillState === undefined ? existing.guidedSkillState ?? null : params.guidedSkillState,
            createdAt: existing.createdAt || new Date(),
            updatedAt: new Date(),
            messages: nextMessages,
        }),
        { merge: true }
    )
}

export async function getOmniChannelConfig(adminDb: any, chatbotId: string) {
    const snapshot = await adminDb.collection("omni_channel_configs").doc(chatbotId).get()
    return snapshot.exists ? snapshot.data() || {} : { chatbotId }
}

export async function mergeOmniChannelConfig(
    adminDb: any,
    chatbotId: string,
    payload: Record<string, unknown>
) {
    const docRef = adminDb.collection("omni_channel_configs").doc(chatbotId)
    await docRef.set(
        sanitizeObject({
            chatbotId,
            ...payload,
            updatedAt: new Date(),
        }),
        { merge: true }
    )

    const snapshot = await docRef.get()
    return snapshot.exists ? snapshot.data() || {} : { chatbotId }
}

export async function upsertCallbackRequest(
    adminDb: any,
    params: {
        id?: string
        chatbotId: string
        contactKey?: string | null
        canonicalContactId?: string | null
        displayName?: string | null
        owner?: string | null
        priority?: CallbackPriority
        status?: CallbackRequestStatus
        dueAt?: string | Date | null
        sourceSessionId?: string | null
        sourceChannel: OmniChannel
        resolutionStatus?: CallbackResolutionStatus
        notes?: string | null
        voiceNumberId?: string | null
        activeCallSid?: string | null
        lastAttemptAt?: string | Date | null
    }
): Promise<CallbackRequestRecord> {
    const docId = params.id || params.sourceSessionId || adminDb.collection("callback_requests").doc().id
    const docRef = adminDb.collection("callback_requests").doc(docId)
    const snapshot = await docRef.get()
    const existing = snapshot.exists ? snapshot.data() || {} : {}
    const now = new Date()

    const dueAt =
        params.dueAt === undefined
            ? existing.dueAt || null
            : params.dueAt
              ? new Date(params.dueAt)
              : null

    const lastAttemptAt =
        params.lastAttemptAt === undefined
            ? existing.lastAttemptAt || null
            : params.lastAttemptAt
              ? new Date(params.lastAttemptAt)
              : null

    const nextRecord = sanitizeObject({
        chatbotId: params.chatbotId,
        contactKey: params.contactKey ?? existing.contactKey ?? null,
        canonicalContactId: params.canonicalContactId ?? existing.canonicalContactId ?? null,
        displayName: params.displayName ?? existing.displayName ?? null,
        owner: params.owner ?? existing.owner ?? null,
        priority: params.priority ?? existing.priority ?? "normal",
        status: params.status ?? existing.status ?? "pending",
        dueAt,
        sourceSessionId: params.sourceSessionId ?? existing.sourceSessionId ?? null,
        sourceChannel: params.sourceChannel ?? existing.sourceChannel ?? "voice",
        resolutionStatus: params.resolutionStatus ?? existing.resolutionStatus ?? "open",
        notes: params.notes ?? existing.notes ?? null,
        voiceNumberId: params.voiceNumberId ?? existing.voiceNumberId ?? null,
        activeCallSid: params.activeCallSid ?? existing.activeCallSid ?? null,
        lastAttemptAt,
        createdAt: existing.createdAt || now,
        updatedAt: now,
    })

    await docRef.set(nextRecord, { merge: true })

    return {
        id: docId,
        ...nextRecord,
        createdAt: toIsoOrNull(nextRecord.createdAt),
        updatedAt: toIsoOrNull(nextRecord.updatedAt),
        dueAt: toIsoOrNull(nextRecord.dueAt),
        lastAttemptAt: toIsoOrNull(nextRecord.lastAttemptAt),
    }
}

export function normalizeVoiceIntegrationConfig(config: any): VoiceIntegrationConfig {
    return normalizeVoiceIntegrationConfigValue(config)
}

export async function createTwilioVoiceCall(params: {
    accountSid: string
    authToken: string
    to: string
    from: string
    url: string
    statusCallback?: string | null
    byocTrunkSid?: string | null
}) {
    const body = new URLSearchParams({
        To: params.to,
        From: params.from,
        Url: params.url,
        Method: "POST",
    })

    if (params.statusCallback) {
        body.set("StatusCallback", params.statusCallback)
        body.set("StatusCallbackMethod", "POST")
        body.append("StatusCallbackEvent", "initiated")
        body.append("StatusCallbackEvent", "ringing")
        body.append("StatusCallbackEvent", "answered")
        body.append("StatusCallbackEvent", "completed")
    }

    if (params.byocTrunkSid) {
        body.set("Byoc", params.byocTrunkSid)
    }

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${params.accountSid}/Calls.json`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${Buffer.from(`${params.accountSid}:${params.authToken}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
        const message = data?.message || "Twilio call creation failed"
        throw new Error(message)
    }

    return data
}

export function escapeXml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&apos;")
}
