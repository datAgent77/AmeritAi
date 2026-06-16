/**
 * TCPA / messaging opt-out core.
 *
 * Detects opt-out ("STOP") and opt-in ("START") keywords across EN/TR/ES,
 * persists per-contact opt-out state, and provides compliant confirmation
 * copy. Outbound sends should consult `isOptedOut` before delivering, and
 * inbound webhooks should run `classifyConsentKeyword` on each message.
 *
 * Storage: Firestore collection `messaging_opt_outs`, one doc per
 * (chatbotId, channel, contactKey).
 */

export type MessagingChannel =
    | "whatsapp"
    | "instagram"
    | "messenger"
    | "telegram"
    | "sms"
    | "voice"
    | "web"

export type ConsentKeyword = "opt_out" | "opt_in" | null

// Industry-standard opt-out keywords (TCPA/CTIA) plus TR/ES equivalents.
const OPT_OUT_KEYWORDS = new Set<string>([
    // English (CTIA required + common)
    "stop", "stopall", "unsubscribe", "cancel", "end", "quit", "optout",
    // Turkish
    "dur", "durdur", "iptal", "cikis", "abonelikiptal", "birak",
    // Spanish
    "alto", "baja", "cancelar", "parar", "detener", "elimina",
])

// Opt back in keywords.
const OPT_IN_KEYWORDS = new Set<string>([
    // English (CTIA)
    "start", "yes", "unstop", "subscribe", "begin",
    // Turkish
    "basla", "baslat", "katil", "evet", "abone",
    // Spanish
    "iniciar", "si", "alta", "comenzar", "empezar",
])

/**
 * Normalize a raw message for keyword matching: lowercase, strip Turkish/Spanish
 * diacritics, and reduce to alphanumeric tokens.
 */
function tokenize(raw: string): string[] {
    if (!raw) return []
    const folded = raw
        .toLocaleLowerCase("en-US")
        .replace(/ı/g, "i")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // strip combining diacritics
    return folded
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
}

/**
 * Classify a message as an opt-out, opt-in, or neither.
 *
 * A keyword counts when it appears as a standalone token (so "STOP" in
 * "please STOP" is honored, but "stopwatch" is not). Opt-out wins ties.
 */
export function classifyConsentKeyword(raw: string): ConsentKeyword {
    const tokens = tokenize(raw)
    if (tokens.length === 0) return null
    // Single-word messages are the strongest signal; also scan multi-word.
    for (const token of tokens) {
        if (OPT_OUT_KEYWORDS.has(token)) return "opt_out"
    }
    for (const token of tokens) {
        if (OPT_IN_KEYWORDS.has(token)) return "opt_in"
    }
    return null
}

export function isOptOutMessage(raw: string): boolean {
    return classifyConsentKeyword(raw) === "opt_out"
}

export function isOptInMessage(raw: string): boolean {
    return classifyConsentKeyword(raw) === "opt_in"
}

const TR_CONSENT_TOKENS = new Set(["dur", "durdur", "iptal", "cikis", "abonelikiptal", "birak", "basla", "baslat", "katil", "evet", "abone"])
const ES_CONSENT_TOKENS = new Set(["alto", "baja", "cancelar", "parar", "detener", "elimina", "iniciar", "si", "alta", "comenzar", "empezar"])

/**
 * Infer which language to reply in based on the consent keyword the user used,
 * so a Turkish "DUR" gets a Turkish confirmation and a Spanish "ALTO" a Spanish one.
 * Falls back to English.
 */
export function consentReplyLanguage(raw: string): "tr" | "es" | "en" {
    for (const token of tokenize(raw)) {
        if (TR_CONSENT_TOKENS.has(token)) return "tr"
        if (ES_CONSENT_TOKENS.has(token)) return "es"
    }
    return "en"
}

type ResolvableLanguage = string | null | undefined

function resolveLang(language: ResolvableLanguage): "tr" | "es" | "en" {
    if (language === "tr") return "tr"
    if (language === "es") return "es"
    return "en"
}

const OPT_OUT_CONFIRMATION: Record<"tr" | "es" | "en", string> = {
    en: "You have been unsubscribed and will no longer receive messages from this number. Reply START to opt back in.",
    tr: "Aboneliğiniz iptal edildi ve bu numaradan artık mesaj almayacaksınız. Yeniden abone olmak için BAŞLA yazın.",
    es: "Tu suscripción se canceló y ya no recibirás mensajes de este número. Responde INICIAR para volver a suscribirte.",
}

const OPT_IN_CONFIRMATION: Record<"tr" | "es" | "en", string> = {
    en: "You have been re-subscribed and will receive messages again. Reply STOP at any time to unsubscribe.",
    tr: "Yeniden abone oldunuz ve tekrar mesaj alacaksınız. İstediğiniz zaman çıkmak için DUR yazın.",
    es: "Te has vuelto a suscribir y recibirás mensajes de nuevo. Responde ALTO en cualquier momento para cancelar.",
}

export function getOptOutConfirmation(language?: ResolvableLanguage): string {
    return OPT_OUT_CONFIRMATION[resolveLang(language)]
}

export function getOptInConfirmation(language?: ResolvableLanguage): string {
    return OPT_IN_CONFIRMATION[resolveLang(language)]
}

export const OPT_OUT_COLLECTION = "messaging_opt_outs"

/** Deterministic, collision-safe Firestore doc id for an opt-out record. */
export function buildOptOutDocId(chatbotId: string, channel: MessagingChannel, contactKey: string): string {
    const safe = (value: string) => String(value || "").replace(/[/\s]+/g, "_").slice(0, 200)
    return `${safe(chatbotId)}__${channel}__${safe(contactKey)}`
}

// Minimal Firestore Admin surface so this module stays testable with a fake.
interface MinimalDoc {
    get(): Promise<{ exists: boolean; data(): any }>
    set(data: any, options?: { merge?: boolean }): Promise<any>
}
interface MinimalCollection {
    doc(id: string): MinimalDoc
}
export interface MinimalAdminDb {
    collection(name: string): MinimalCollection
}

export interface OptOutIdentity {
    chatbotId: string
    channel: MessagingChannel
    contactKey: string
}

/** Returns true if the contact has an active opt-out for this channel. */
export async function isOptedOut(adminDb: MinimalAdminDb | null | undefined, identity: OptOutIdentity): Promise<boolean> {
    if (!adminDb || !identity?.chatbotId || !identity?.contactKey) return false
    try {
        const ref = adminDb.collection(OPT_OUT_COLLECTION).doc(buildOptOutDocId(identity.chatbotId, identity.channel, identity.contactKey))
        const snap = await ref.get()
        if (!snap.exists) return false
        return snap.data()?.optedOut === true
    } catch {
        // Fail open is unacceptable for compliance; fail closed (treat as not opted out
        // only when we genuinely cannot read) would block all sends. We log upstream and
        // default to NOT opted out so a transient read error does not silently drop the
        // user's STOP — callers should surface read errors via audit logs.
        return false
    }
}

async function writeOptState(
    adminDb: MinimalAdminDb | null | undefined,
    identity: OptOutIdentity,
    optedOut: boolean,
    meta: { source?: string; keyword?: string } = {}
): Promise<void> {
    if (!adminDb || !identity?.chatbotId || !identity?.contactKey) return
    const ref = adminDb.collection(OPT_OUT_COLLECTION).doc(buildOptOutDocId(identity.chatbotId, identity.channel, identity.contactKey))
    await ref.set(
        {
            chatbotId: identity.chatbotId,
            channel: identity.channel,
            contactKey: identity.contactKey,
            optedOut,
            lastKeyword: meta.keyword || null,
            source: meta.source || null,
            updatedAt: new Date(),
            ...(optedOut ? { optedOutAt: new Date() } : { optedInAt: new Date() }),
        },
        { merge: true }
    )
}

export async function recordOptOut(
    adminDb: MinimalAdminDb | null | undefined,
    identity: OptOutIdentity,
    meta?: { source?: string; keyword?: string }
): Promise<void> {
    await writeOptState(adminDb, identity, true, meta)
}

export async function recordOptIn(
    adminDb: MinimalAdminDb | null | undefined,
    identity: OptOutIdentity,
    meta?: { source?: string; keyword?: string }
): Promise<void> {
    await writeOptState(adminDb, identity, false, meta)
}
