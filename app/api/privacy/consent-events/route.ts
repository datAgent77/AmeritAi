import { createHash } from "crypto"
import { NextResponse } from "next/server"
import * as admin from "firebase-admin"
import { getAdminDb } from "@/lib/firebase-admin"
import { resolvePrivacyCompliancePayload, type PrivacyConsentEventType, type PrivacyConsentPurpose, type PrivacyDocumentType } from "@/lib/privacy-compliance"
import { getPublishedContract } from "@/lib/contracts"

export const dynamic = "force-dynamic"

const VALID_EVENT_TYPES = new Set<PrivacyConsentEventType>([
    "notice_shown",
    "notice_acknowledged",
    "continued_after_notice",
    "explicit_consent_granted",
    "explicit_consent_rejected",
    "withdrawn",
])

const VALID_PURPOSES = new Set<PrivacyConsentPurpose>([
    "basic_chat",
    "chat_transcript_storage",
    "lead_capture",
    "appointment_request",
    "marketing_contact",
    "ai_processing",
    "international_transfer",
    "special_category_data",
])

const VALID_DOCUMENT_TYPES = new Set<PrivacyDocumentType>([
    "kvkkNotice",
    "gdprPrivacyNotice",
    "explicitConsentLead",
    "explicitConsentAppointment",
    "explicitConsentMarketing",
    "explicitConsentSpecialCategory",
    "explicitConsentInternationalTransfer",
])

function hashValue(value: string) {
    const salt = process.env.PRIVACY_EVENT_HASH_SALT || process.env.NEXTAUTH_SECRET || "vion-privacy-event"
    return createHash("sha256").update(`${salt}:${value}`).digest("hex").slice(0, 32)
}

function getRequesterIp(req: Request) {
    return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || req.headers.get("x-real-ip")
        || "unknown"
}

function getOrigin(req: Request) {
    const origin = req.headers.get("origin")
    if (origin) return origin
    try {
        return new URL(req.headers.get("referer") || "").origin
    } catch {
        return null
    }
}

function cleanString(value: unknown, maxLength = 500) {
    return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb()
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 })
        }

        const body = await req.json().catch(() => ({}))
        const chatbotId = cleanString(body.chatbotId, 160)
        const sessionId = cleanString(body.sessionId, 180)
        const eventType = cleanString(body.eventType, 80) as PrivacyConsentEventType
        const purpose = cleanString(body.purpose, 80) as PrivacyConsentPurpose
        const documentType = cleanString(body.documentType, 120) as PrivacyDocumentType
        const documentVersionHash = cleanString(body.documentVersionHash, 120)
        const textHash = cleanString(body.textHash, 120)
        const language = cleanString(body.language, 16)
        const visitorId = cleanString(body.visitorId, 180)

        if (!chatbotId || !sessionId || !VALID_EVENT_TYPES.has(eventType) || !VALID_PURPOSES.has(purpose)) {
            return NextResponse.json({ error: "Invalid consent event payload" }, { status: 400 })
        }

        if (documentType && !VALID_DOCUMENT_TYPES.has(documentType)) {
            return NextResponse.json({ error: "Invalid document type" }, { status: 400 })
        }

        const [userSnapshot, chatbotSnapshot, publishedKvkkContract] = await Promise.all([
            adminDb.collection("users").doc(chatbotId).get(),
            adminDb.collection("chatbots").doc(chatbotId).get(),
            getPublishedContract(adminDb, "kvkkDefault").catch(() => null),
        ])
        const mergedData = {
            ...(userSnapshot.exists ? userSnapshot.data() || {} : {}),
            ...(chatbotSnapshot.exists ? chatbotSnapshot.data() || {} : {}),
        }
        const privacyCompliance = resolvePrivacyCompliancePayload({
            mergedData,
            publishedKvkkContract,
            language,
        })

        if (!privacyCompliance.enabled) {
            return NextResponse.json({ error: "Privacy compliance module is not enabled" }, { status: 409 })
        }

        const userAgent = req.headers.get("user-agent") || "unknown"
        const record = {
            chatbotId,
            sessionId,
            visitorId: visitorId || null,
            eventType,
            purpose,
            language: privacyCompliance.language,
            legalFramework: purpose === "basic_chat" ? "kvkk_gdpr_notice" : "explicit_consent",
            documentType: documentType || null,
            documentVersionHash: documentVersionHash || null,
            textHash: textHash || null,
            origin: getOrigin(req),
            ipHash: hashValue(getRequesterIp(req)),
            userAgentHash: hashValue(userAgent),
            countryOrLocaleHint: cleanString(req.headers.get("accept-language"), 160) || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }

        const docRef = await adminDb.collection("privacy_consent_events").add(record)
        return NextResponse.json({ success: true, id: docRef.id })
    } catch (error: any) {
        console.error("Privacy consent event route error:", error)
        return NextResponse.json({ error: error?.message || "Failed to record consent event" }, { status: 500 })
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    })
}
